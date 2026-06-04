import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobTitleLower = (user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const isHC =
      jobTitleLower.includes('human capital') ||
      jobTitleLower.includes('od specialist') ||
      userRoles.some((r) => ['ADMIN', 'SG'].includes(r))
    if (!isHC) return NextResponse.json({ error: 'Forbidden — HC Executive or OD Specialist only' }, { status: 403 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    // Get or create active cycle
    let cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) {
      const year = new Date().getFullYear()
      try {
        cycle = await prisma.rating360Cycle.create({
          data: {
            id: crypto.randomUUID(),
            name: `${year} Behavioural Competency Review`,
            startDate: new Date(`${year}-01-01`),
            endDate: new Date(`${year}-12-31`),
            isActive: true,
            createdById: myId,
          },
        })
      } catch {
        cycle = await prisma.rating360Cycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        if (!cycle) return NextResponse.json({ error: 'No active cycle found and could not create one' }, { status: 400 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const force = body?.force === true

    // Get all users with their departments
    const allUsers = await prisma.user.findMany({
      select: { 
        id: true, 
        managerId: true, 
        departmentName: true,
        email: true,
        firstName: true,
        lastName: true
      },
    })

    // Group users by department
    const usersByDept = new Map<string, typeof allUsers>()
    allUsers.forEach(user => {
      if (user.departmentName) {
        if (!usersByDept.has(user.departmentName)) {
          usersByDept.set(user.departmentName, [])
        }
        usersByDept.get(user.departmentName)!.push(user)
      }
    })

    // If force reset: delete ALL PeerRating360 entries for this cycle
    if (force) {
      const r360Ids = (
        await prisma.rating360.findMany({ where: { cycleId: cycle.id }, select: { id: true } })
      ).map((r) => r.id)
      if (r360Ids.length > 0) {
        await prisma.peerRating360.deleteMany({
          where: { rating360Id: { in: r360Ids } },
        })
        // Also reset average ratings
        await prisma.rating360.updateMany({
          where: { id: { in: r360Ids } },
          data: { averageRating: null },
        })
      }
    }

    let initialized = 0
    let skippedOrg = 0
    let skippedDept = 0
    const assignmentLog: string[] = []

    // Track global assignments to ensure 1-to-1
    const globalDeptAssignments = new Map<string, string>() // raterId -> rateeId
    const globalOrgAssignments = new Map<string, string>() // raterId -> rateeId

    for (const ratee of allUsers) {
      // Get or create Rating360
      let r360 = await prisma.rating360.findUnique({
        where: { cycleId_userId: { cycleId: cycle.id, userId: ratee.id } },
      })
      if (!r360) {
        r360 = await prisma.rating360.create({
          data: {
            id: crypto.randomUUID(),
            cycleId: cycle.id,
            userId: ratee.id,
            supervisorId: ratee.managerId || null,
            status: 'PENDING',
          },
        })
      } else if (ratee.managerId && !r360.supervisorId) {
        await prisma.rating360.update({
          where: { id: r360.id },
          data: { supervisorId: ratee.managerId },
        })
      }

      // Check existing assignments
      const existingPeers = await prisma.peerRating360.findMany({ 
        where: { rating360Id: r360.id },
        include: { rater: { select: { email: true, firstName: true, lastName: true } } }
      })
      
      const existingTypes = existingPeers.map((p) => {
        try { return JSON.parse(p.comments || '{}').raterType } catch { return null }
      })
      const existingRaterIds = new Set(existingPeers.map((p) => p.raterId))

      // Update global assignment tracking
      existingPeers.forEach(peer => {
        const raterType = JSON.parse(peer.comments || '{}').raterType
        if (raterType === 'dept_random') {
          globalDeptAssignments.set(peer.raterId, ratee.id)
        } else if (raterType === 'org_random') {
          globalOrgAssignments.set(peer.raterId, ratee.id)
        }
      })

      // ── 1. dept_random: one same-dept person who hasn't been assigned as dept rater yet ──
      if (!existingTypes.includes('dept_random') && ratee.departmentName) {
        const deptUsers = usersByDept.get(ratee.departmentName) || []
        
        // Find eligible dept rater (not already assigned, not self, not manager)
        const eligibleDeptRaters = deptUsers.filter(
          u => 
            u.id !== ratee.id &&
            u.id !== ratee.managerId &&
            !existingRaterIds.has(u.id) &&
            !globalDeptAssignments.has(u.id)
        )

        if (eligibleDeptRaters.length > 0) {
          // Pick the first eligible (could be randomized)
          const selectedRater = eligibleDeptRaters[0]
          
          await prisma.peerRating360.create({
            data: {
              id: crypto.randomUUID(),
              rating360Id: r360.id,
              raterId: selectedRater.id,
              comments: JSON.stringify({ raterType: 'dept_random', scores: {} }),
            },
          })
          
          globalDeptAssignments.set(selectedRater.id, ratee.id)
          existingRaterIds.add(selectedRater.id)
          
          assignmentLog.push(
            `DEPT: ${selectedRater.firstName} ${selectedRater.lastName} -> ${ratee.firstName} ${ratee.lastName} (${ratee.departmentName})`
          )
        } else {
          skippedDept++
          assignmentLog.push(
            `SKIPPED DEPT: No eligible rater for ${ratee.firstName} ${ratee.lastName} in ${ratee.departmentName}`
          )
        }
      }

      // ── 2. org_random: one different-dept person who hasn't been assigned as org rater yet ──
      if (!existingTypes.includes('org_random') && ratee.departmentName) {
        // Find eligible org rater (different dept, not already assigned, not self, not manager)
        const eligibleOrgRaters = allUsers.filter(
          u => 
            u.id !== ratee.id &&
            u.id !== ratee.managerId &&
            u.departmentName !== ratee.departmentName &&
            u.departmentName != null &&
            !existingRaterIds.has(u.id) &&
            !globalOrgAssignments.has(u.id)
        )

        if (eligibleOrgRaters.length > 0) {
          // Pick the first eligible (could be randomized)
          const selectedRater = eligibleOrgRaters[0]
          
          await prisma.peerRating360.create({
            data: {
              id: crypto.randomUUID(),
              rating360Id: r360.id,
              raterId: selectedRater.id,
              comments: JSON.stringify({ raterType: 'org_random', scores: {} }),
            },
          })
          
          globalOrgAssignments.set(selectedRater.id, ratee.id)
          
          assignmentLog.push(
            `ORG: ${selectedRater.firstName} ${selectedRater.lastName} (${selectedRater.departmentName}) -> ${ratee.firstName} ${ratee.lastName} (${ratee.departmentName})`
          )
        } else {
          skippedOrg++
          assignmentLog.push(
            `SKIPPED ORG: No eligible rater for ${ratee.firstName} ${ratee.lastName} from different department`
          )
        }
      }

      initialized++
    }

    return NextResponse.json({
      success: true,
      initialized,
      skippedOrg,
      skippedDept,
      wasForceReset: force,
      totalDeptAssignments: globalDeptAssignments.size,
      totalOrgAssignments: globalOrgAssignments.size,
      assignmentLog: assignmentLog.slice(0, 50), // Limit log size
      message: force
        ? `Force re-initialized assignments for ${initialized} employees with 1-to-1 constraints`
        : `Initialized random rater assignments for ${initialized} employees with 1-to-1 constraints`,
    })
  } catch (error) {
    console.error('Error initializing random raters:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 })
  }
}
