import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active 360 cycle
    const activeCycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true }
    })

    if (!activeCycle) {
      return NextResponse.json(null)
    }

    // Get user's 360 rating for the active cycle
    const rating = await prisma.rating360.findUnique({
      where: {
        cycleId_userId: {
          cycleId: activeCycle.id,
          userId: user.id
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true
          }
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        peerRatings: {
          include: {
            rater: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        subordinateRatings: {
          include: {
            rater: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!rating) {
      return NextResponse.json(null)
    }

    // Format the response
    return NextResponse.json({
      id: rating.id,
      userId: rating.userId,
      userName: rating.user.name,
      userEmail: rating.user.email,
      selfRating: rating.selfRating,
      supervisorRating: rating.supervisorRating,
      peerRatings: rating.peerRatings
        .filter((pr: typeof rating.peerRatings[number]) => pr.rating !== null)
        .map((pr: typeof rating.peerRatings[number]) => ({
          raterId: pr.raterId,
          raterName: pr.rater.name,
          rating: pr.rating!
        })),
      subordinateRatings: rating.subordinateRatings
        .filter((sr: typeof rating.subordinateRatings[number]) => sr.rating !== null)
        .map((sr: typeof rating.subordinateRatings[number]) => ({
          raterId: sr.raterId,
          raterName: sr.rater.name,
          rating: sr.rating!
        })),
      averageRating: rating.averageRating,
      status: rating.status,
      createdAt: rating.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error fetching 360 rating:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
