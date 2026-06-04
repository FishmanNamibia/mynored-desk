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
      console.error('[360 my-rating] Error finding active cycle:', e.message)
      return NextResponse.json(null)
    }

    if (!activeCycle) {
      console.log('[360 my-rating] No active cycle found')
      return NextResponse.json(null)
    }
    console.log('[360 my-rating] Active cycle:', activeCycle.id, activeCycle.name)

    // Get user's 360 rating for the active cycle
    const rating = await prisma.rating360.findFirst({
      where: {
        cycleId: activeCycle.id,
        userId: user.id
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        supervisor: {
          select: { id: true, firstName: true, lastName: true }
        },
        peerRatings: {
          include: {
            rater: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        subordinateRatings: {
          include: {
            rater: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    })

    if (!rating) {
      console.log('[360 my-rating] No Rating360 record found for user:', user.id, 'in cycle:', activeCycle.id)
      
      // Auto-create the Rating360 record for this user if cycle is active
      // This handles users who were missed during cycle activation
      try {
        const dbUser = await prisma.user.findUnique({ 
          where: { id: user.id }, 
          select: { id: true, status: true, email: true, managerId: true } 
        })
        console.log('[360 my-rating] User from DB:', dbUser?.id, 'status:', dbUser?.status, 'email:', dbUser?.email)
        
        if (dbUser) {
          const newRating = await prisma.rating360.create({
            data: {
              cycleId: activeCycle.id,
              userId: user.id,
              supervisorId: dbUser.managerId || null,
              status: 'PENDING'
            }
          })
          console.log('[360 my-rating] Auto-created Rating360 record:', newRating.id)
          
          // Re-fetch with includes
          const freshRating = await prisma.rating360.findUnique({
            where: { id: newRating.id },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              },
              supervisor: {
                select: { id: true, firstName: true, lastName: true }
              },
              peerRatings: {
                include: {
                  rater: {
                    select: { id: true, firstName: true, lastName: true }
                  }
                }
              },
              subordinateRatings: {
                include: {
                  rater: {
                    select: { id: true, firstName: true, lastName: true }
                  }
                }
              }
            }
          })
          
          if (freshRating) {
            const userName = `${freshRating.user.firstName || ''} ${freshRating.user.lastName || ''}`.trim() || freshRating.user.email
            return NextResponse.json({
              id: freshRating.id,
              cycleId: activeCycle.id,
              userId: freshRating.userId,
              userName,
              userEmail: freshRating.user.email,
              selfRating: freshRating.selfRating,
              supervisorRating: freshRating.supervisorRating,
              peerRatings: [],
              subordinateRatings: [],
              averageRating: freshRating.averageRating,
              status: freshRating.status,
              createdAt: freshRating.createdAt.toISOString()
            })
          }
        }
      } catch (createErr: any) {
        console.error('[360 my-rating] Error auto-creating Rating360:', createErr.message)
      }
      
      return NextResponse.json(null)
    }

    const userName = `${rating.user.firstName || ''} ${rating.user.lastName || ''}`.trim() || rating.user.email

    return NextResponse.json({
      id: rating.id,
      cycleId: activeCycle.id,
      userId: rating.userId,
      userName,
      userEmail: rating.user.email,
      selfRating: rating.selfRating,
      supervisorRating: rating.supervisorRating,
      peerRatings: rating.peerRatings
        .filter((pr) => pr.rating !== null)
        .map((pr) => ({
          raterId: pr.raterId,
          raterName: `${pr.rater.firstName || ''} ${pr.rater.lastName || ''}`.trim(),
          rating: pr.rating!
        })),
      subordinateRatings: rating.subordinateRatings
        .filter((sr) => sr.rating !== null)
        .map((sr) => ({
          raterId: sr.raterId,
          raterName: `${sr.rater.firstName || ''} ${sr.rater.lastName || ''}`.trim(),
          rating: sr.rating!
        })),
      averageRating: rating.averageRating,
      status: rating.status,
      createdAt: rating.createdAt.toISOString()
    })
  } catch (error: any) {
    console.error('[360 my-rating] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
