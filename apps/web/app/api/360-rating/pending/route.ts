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
      console.error('[360 pending] Error finding active cycle:', e.message)
      // Table may not exist yet — return empty array
      return NextResponse.json([])
    }

    if (!activeCycle) {
      return NextResponse.json([])
    }

    const pendingRatings: any[] = []

    // Find peer ratings where I'm the rater and haven't completed
    try {
      const peerRatings = await prisma.peerRating360.findMany({
        where: {
          raterId: user.id,
          rating: null,
          rating360: {
            cycleId: activeCycle.id
          }
        },
        include: {
          rating360: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      })

      peerRatings.forEach((pr) => {
        const name = `${pr.rating360.user.firstName || ''} ${pr.rating360.user.lastName || ''}`.trim() || pr.rating360.user.email
        pendingRatings.push({
          id: pr.id,
          type: 'peer',
          name,
          email: pr.rating360.user.email,
          relationship: 'Peer'
        })
      })
    } catch (e: any) {
      console.error('[360 pending] Error fetching peer ratings:', e.message)
    }

    // Find subordinate ratings where I'm the rater and haven't completed
    try {
      const subordinateRatings = await prisma.subordinateRating360.findMany({
        where: {
          raterId: user.id,
          rating: null,
          rating360: {
            cycleId: activeCycle.id
          }
        },
        include: {
          rating360: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      })

      subordinateRatings.forEach((sr) => {
        const name = `${sr.rating360.user.firstName || ''} ${sr.rating360.user.lastName || ''}`.trim() || sr.rating360.user.email
        pendingRatings.push({
          id: sr.id,
          type: 'subordinate',
          name,
          email: sr.rating360.user.email,
          relationship: 'Team Member'
        })
      })
    } catch (e: any) {
      console.error('[360 pending] Error fetching subordinate ratings:', e.message)
    }

    // Find ratings where I'm the supervisor and haven't rated
    try {
      const supervisorRatings = await prisma.rating360.findMany({
        where: {
          supervisorId: user.id,
          supervisorRating: null,
          cycleId: activeCycle.id
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      })

      supervisorRatings.forEach((sr) => {
        const name = `${sr.user.firstName || ''} ${sr.user.lastName || ''}`.trim() || sr.user.email
        pendingRatings.push({
          id: sr.id,
          type: 'supervisor',
          name,
          email: sr.user.email,
          relationship: 'Direct Report'
        })
      })
    } catch (e: any) {
      console.error('[360 pending] Error fetching supervisor ratings:', e.message)
    }

    return NextResponse.json(pendingRatings)
  } catch (error: any) {
    console.error('[360 pending] Error:', error.message)
    console.error('[360 pending] Stack:', error.stack)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
