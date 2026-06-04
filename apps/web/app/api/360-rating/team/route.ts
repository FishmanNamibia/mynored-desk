import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active 360 cycle
    let activeCycle: any = null
    try {
      activeCycle = await prisma.rating360Cycle.findFirst({
        where: { isActive: true }
      })
    } catch (e: any) {
      console.error('[360 team] Error finding active cycle:', e.message)
      return NextResponse.json([])
    }

    if (!activeCycle) {
      return NextResponse.json([])
    }

    // Get ratings for users managed by this user
    const teamRatings = await prisma.rating360.findMany({
      where: {
        cycleId: activeCycle.id,
        supervisorId: user.id
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        peerRatings: {
          include: {
            rater: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        subordinateRatings: {
          include: {
            rater: { select: { id: true, firstName: true, lastName: true } }
          }
        }
      }
    })

    const formatted = teamRatings.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || r.user.email,
      userEmail: r.user.email,
      selfRating: r.selfRating,
      supervisorRating: r.supervisorRating,
      peerRatings: r.peerRatings
        .filter((pr) => pr.rating !== null)
        .map((pr) => ({
          raterId: pr.raterId,
          raterName: `${pr.rater.firstName || ''} ${pr.rater.lastName || ''}`.trim(),
          rating: pr.rating!
        })),
      subordinateRatings: r.subordinateRatings
        .filter((sr) => sr.rating !== null)
        .map((sr) => ({
          raterId: sr.raterId,
          raterName: `${sr.rater.firstName || ''} ${sr.rater.lastName || ''}`.trim(),
          rating: sr.rating!
        })),
      averageRating: r.averageRating,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      cycleId: activeCycle.id
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error('[360 team] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
