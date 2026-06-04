import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

const NSA_COMPETENCY_NAMES = [
  'Integrity',
  'Excellent Performance',
  'Professionalism',
  'Accountability',
  'Partnership',
  'Customer-focussed',
]

function avgScores(scores: Record<string, number>): number | null {
  const vals = Object.values(scores).filter((v) => typeof v === 'number' && v >= 1 && v <= 5)
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { rateeId, raterType, competencyScores, comments, peerRating360Id } = body

    if (!raterType || !competencyScores) {
      return NextResponse.json({ error: 'raterType and competencyScores are required' }, { status: 400 })
    }
    if (raterType !== 'self' && !rateeId) {
      return NextResponse.json({ error: 'rateeId is required for non-self ratings' }, { status: 400 })
    }
    const valid = ['self', 'supervisor', 'dept_random', 'org_random']
    if (!valid.includes(raterType)) {
      return NextResponse.json({ error: 'Invalid raterType' }, { status: 400 })
    }

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const raterId = meDb?.id ?? user.id

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
            createdById: raterId,
          },
        })
      } catch {
        cycle = await prisma.rating360Cycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        if (!cycle) return NextResponse.json({ error: 'No active cycle' }, { status: 400 })
      }
    }

    const effectiveRateeId = raterType === 'self' ? raterId : rateeId
    const scoresJson = JSON.stringify({ raterType, scores: competencyScores, comments: comments || '' })
    const avg = avgScores(competencyScores)

    if (raterType === 'self') {
      // Upsert Rating360 for self
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { id: crypto.randomUUID(), cycleId: cycle.id, userId: effectiveRateeId, status: 'PENDING' },
        update: {},
      })
      await prisma.rating360.update({
        where: { id: r360.id },
        data: { selfRating: avg, selfComments: scoresJson, selfCompletedAt: new Date() },
      })
    } else if (raterType === 'supervisor') {
      // Upsert Rating360 for ratee, set supervisorId + supervisorRating
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { id: crypto.randomUUID(), cycleId: cycle.id, userId: effectiveRateeId, supervisorId: raterId, status: 'PENDING' },
        update: {},
      })
      await prisma.rating360.update({
        where: { id: r360.id },
        data: {
          supervisorId: raterId,
          supervisorRating: avg,
          supervisorComments: scoresJson,
          supervisorCompletedAt: new Date(),
        },
      })
    } else {
      // org_random or dept_random — update existing PeerRating360 or create
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { id: crypto.randomUUID(), cycleId: cycle.id, userId: effectiveRateeId, status: 'PENDING' },
        update: {},
      })

      // Prefer updating an existing assignment (by peerRating360Id or raterId+rating360Id)
      const existing = peerRating360Id
        ? await prisma.peerRating360.findUnique({ where: { id: peerRating360Id } })
        : await prisma.peerRating360.findFirst({ where: { rating360Id: r360.id, raterId } })

      if (existing) {
        await prisma.peerRating360.update({
          where: { id: existing.id },
          data: { rating: avg, comments: scoresJson, completedAt: new Date() },
        })
      } else {
        await prisma.peerRating360.create({
          data: {
            id: crypto.randomUUID(),
            rating360Id: r360.id,
            raterId,
            rating: avg,
            comments: scoresJson,
            completedAt: new Date(),
          },
        })
      }
    }

    // Recalculate overall average for ratee's Rating360
    const r360final = await prisma.rating360.findUnique({
      where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
      include: { peerRatings: true },
    })
    if (r360final) {
      const allRatings: number[] = []
      if (r360final.selfRating != null) allRatings.push(r360final.selfRating)
      if (r360final.supervisorRating != null) allRatings.push(r360final.supervisorRating)
      const peerAvgs = r360final.peerRatings
        .filter((p) => p.rating != null)
        .map((p) => p.rating as number)
      if (peerAvgs.length > 0) allRatings.push(peerAvgs.reduce((a, b) => a + b, 0) / peerAvgs.length)
      const overall = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null
      await prisma.rating360.update({
        where: { id: r360final.id },
        data: { averageRating: overall, status: overall != null ? 'IN_PROGRESS' : 'PENDING' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting rating:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 })
  }
}
