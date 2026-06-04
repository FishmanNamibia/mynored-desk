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

    const allUsers = await prisma.user.findMany({
      select: { id: true, managerId: true, departmentName: true },
    })

    // If force reset: delete all unrated PeerRating360 entries for this cycle so we can re-assign correctly
    if (force) {
      const r360Ids = (
        await prisma.rating360.findMany({ where: { cycleId: cycle.id }, select: { id: true } })
      ).map((r) => r.id)
      if (r360Ids.length > 0) {
        await prisma.peerRating360.deleteMany({
          where: { rating360Id: { in: r360Ids }, rating: null },
        })
      }
    }

    // ── Pre-compute global rater pools (each person rates at most ONE other person per type) ──
    function shuffle<T>(arr: T[]): T[] {
      const a = [...arr]
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }

    // Shuffled pools — we pick from the front and track who's been used
    const shuffledForOrg = shuffle([...allUsers])
    const shuffledForDept = shuffle([...allUsers])

    // Global tracking: who has already been assigned as a rater for each type
    const usedAsOrgRater = new Set<string>()
    const usedAsDeptRater = new Set<string>()

    // Pre-load existing rater assignments so we don't double-assign across reruns
    if (!force) {
      const allPeers = await prisma.peerRating360.findMany({
        where: { rating360Id: { in: (await prisma.rating360.findMany({ where: { cycleId: cycle.id }, select: { id: true } })).map((r) => r.id) } },
      })
      for (const p of allPeers) {
        let parsed: any = {}
        try { parsed = JSON.parse(p.comments || '{}') } catch {}
        if (parsed.raterType === 'org_random') usedAsOrgRater.add(p.raterId)
        if (parsed.raterType === 'dept_random') usedAsDeptRater.add(p.raterId)
      }
    }

    let initialized = 0
    let skippedOrg = 0
    let skippedDept = 0

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

      const existingPeers = await prisma.peerRating360.findMany({ where: { rating360Id: r360.id } })
      const existingTypes = existingPeers.map((p) => {
        try { return JSON.parse(p.comments || '{}').raterType } catch { return null }
      })
      const existingRaterIds = new Set(existingPeers.map((p) => p.raterId))

      // ── 1. dept_random: one same-dept person who hasn't been used as dept rater yet ──
      if (!existingTypes.includes('dept_random')) {
        const pick = shuffledForDept.find(
          (u) =>
            u.id !== ratee.id &&
            u.id !== ratee.managerId &&
            !existingRaterIds.has(u.id) &&
            u.departmentName === ratee.departmentName &&
            ratee.departmentName != null &&
            !usedAsDeptRater.has(u.id)
        )
        if (pick) {
          await prisma.peerRating360.create({
            data: {
              id: crypto.randomUUID(),
              rating360Id: r360.id,
              raterId: pick.id,
              comments: JSON.stringify({ raterType: 'dept_random', scores: {} }),
            },
          })
          usedAsDeptRater.add(pick.id)
          existingRaterIds.add(pick.id)
        } else {
          skippedDept++
        }
      }

      // ── 2. org_random: one different-dept person who hasn't been used as org rater yet ──
      if (!existingTypes.includes('org_random')) {
        // Must be from a different department — no fallback
        const pick = shuffledForOrg.find(
          (u) =>
            u.id !== ratee.id &&
            u.id !== ratee.managerId &&
            !existingRaterIds.has(u.id) &&
            u.departmentName !== ratee.departmentName &&
            ratee.departmentName != null &&
            u.departmentName != null &&
            !usedAsOrgRater.has(u.id)
        )
        if (pick) {
          await prisma.peerRating360.create({
            data: {
              id: crypto.randomUUID(),
              rating360Id: r360.id,
              raterId: pick.id,
              comments: JSON.stringify({ raterType: 'org_random', scores: {} }),
            },
          })
          usedAsOrgRater.add(pick.id)
        } else {
          skippedOrg++
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
      message: force
        ? `Force re-initialized assignments for ${initialized} employees (unrated assignments were cleared and reassigned)`
        : `Initialized random rater assignments for ${initialized} employees`,
    })
  } catch (error) {
    console.error('Error initializing random raters:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 })
  }
}
