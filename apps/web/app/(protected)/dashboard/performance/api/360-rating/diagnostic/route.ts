import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET /api/360-rating/diagnostic
// Shows current state of 360 assignments and identifies issues
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobTitle = (user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const canManage =
      jobTitle.includes('human capital') ||
      jobTitle.includes('od specialist') ||
      userRoles.some((r) => ['ADMIN', 'SG'].includes(r))
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) return NextResponse.json({ error: 'No active cycle found' }, { status: 400 })

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: { 
        id: true, 
        managerId: true, 
        departmentName: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true
      },
    })

    // Get all 360 ratings for this cycle
    const rating360Records = await prisma.rating360.findMany({
      where: { cycleId: cycle.id },
      include: {
        peerRatings: {
          include: {
            rater: {
              select: { email: true, firstName: true, lastName: true, departmentName: true }
            }
          }
        },
        user: {
          select: { email: true, firstName: true, lastName: true, departmentName: true, isActive: true }
        }
      }
    })

    // Analyze assignments
    const deptAssignments = new Map<string, string>() // raterId -> rateeId
    const orgAssignments = new Map<string, string>() // raterId -> rateeId
    const issues: string[] = []
    const assignmentDetails: any[] = []

    let usersWithoutAssignments = 0
    let usersWithIncompleteAssignments = 0
    let duplicateDeptAssignments = 0
    let duplicateOrgAssignments = 0

    for (const r360 of rating360Records) {
      const ratee = r360.user
      const peerAssignments = r360.peerRatings

      const hasDeptAssignment = peerAssignments.some(p => {
        try { return JSON.parse(p.comments || '{}').raterType === 'dept_random' } catch { return false }
      })
      const hasOrgAssignment = peerAssignments.some(p => {
        try { return JSON.parse(p.comments || '{}').raterType === 'org_random' } catch { return false }
      })

      if (!hasDeptAssignment && !hasOrgAssignment) {
        usersWithoutAssignments++
        issues.push(`${ratee.firstName} ${ratee.lastName} has no random assignments`)
      }
      if (!hasDeptAssignment || !hasOrgAssignment) {
        usersWithIncompleteAssignments++
      }

      // Check each assignment
      for (const peer of peerAssignments) {
        let raterType = 'unknown'
        try { 
          raterType = JSON.parse(peer.comments || '{}').raterType || 'unknown' 
        } catch {}

        const assignment = {
          ratee: `${ratee.firstName} ${ratee.lastName} (${ratee.departmentName})`,
          rater: `${peer.rater.firstName} ${peer.rater.lastName} (${peer.rater.departmentName})`,
          type: raterType,
          isCompleted: peer.completedAt != null,
          hasRating: peer.rating != null
        }
        assignmentDetails.push(assignment)

        // Check for duplicates
        if (raterType === 'dept_random') {
          if (deptAssignments.has(peer.raterId)) {
            duplicateDeptAssignments++
            issues.push(`${peer.rater.firstName} ${peer.rater.lastName} is assigned to multiple people for dept_random`)
          } else {
            deptAssignments.set(peer.raterId, r360.userId)
          }
        } else if (raterType === 'org_random') {
          if (orgAssignments.has(peer.raterId)) {
            duplicateOrgAssignments++
            issues.push(`${peer.rater.firstName} ${peer.rater.lastName} is assigned to multiple people for org_random`)
          } else {
            orgAssignments.set(peer.raterId, r360.userId)
          }
        }
      }
    }

    // Department analysis
    const deptStats = new Map<string, { total: number; withAssignments: number; withoutAssignments: string[] }>()
    allUsers.forEach(user => {
      if (user.departmentName) {
        if (!deptStats.has(user.departmentName)) {
          deptStats.set(user.departmentName, { total: 0, withAssignments: 0, withoutAssignments: [] })
        }
        const stats = deptStats.get(user.departmentName)!
        stats.total++
        
        const hasAssignment = rating360Records.some(r360 => 
          r360.userId === user.id && r360.peerRatings.length > 0
        )
        if (hasAssignment) {
          stats.withAssignments++
        } else {
          stats.withoutAssignments.push(`${user.firstName} ${user.lastName}`)
        }
      }
    })

    return NextResponse.json({
      success: true,
      cycle: {
        name: cycle.name,
        id: cycle.id
      },
      summary: {
        totalUsers: allUsers.length,
        totalRating360Records: rating360Records.length,
        usersWithoutAssignments,
        usersWithIncompleteAssignments,
        duplicateDeptAssignments,
        duplicateOrgAssignments,
        totalDeptAssignments: deptAssignments.size,
        totalOrgAssignments: orgAssignments.size
      },
      issues: issues.slice(0, 100), // Limit issues
      departmentStats: Object.fromEntries(deptStats),
      sampleAssignments: assignmentDetails.slice(0, 50), // Limit sample size
      recommendations: [
        duplicateDeptAssignments > 0 ? 'Use the fixed initialization API to resolve duplicate department assignments' : null,
        duplicateOrgAssignments > 0 ? 'Use the fixed initialization API to resolve duplicate organization assignments' : null,
        usersWithoutAssignments > 0 ? 'Use the fixed initialization API with force=true to assign missing users' : null,
        usersWithIncompleteAssignments > 0 ? 'Some users have incomplete assignments (missing dept or org rater)' : null
      ].filter(Boolean)
    })
  } catch (error) {
    console.error('Error running 360 diagnostic:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}
