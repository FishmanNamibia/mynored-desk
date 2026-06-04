import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user ID by email (auth session ID may differ from DB ID)
    let actualUserId = user.id
    if (user.email) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          select: { id: true }
        })
        if (dbUser) actualUserId = dbUser.id
      } catch (e) {
        console.error('[MY-REVIEWS] Error resolving DB user by email:', e)
      }
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    // Fetch user's approved performance agreements for ACTIVE period only
    // These are agreements where the user is the reviewee
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: actualUserId,
        approvalStatus: 'APPROVED',
        isAdhocContainer: false,
        ...(activePeriod?.id ? { performancePeriodId: activePeriod.id } : {})
      },
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: {
                  select: {
                    goalNumber: true,
                    title: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    })

    // Fetch user's adhoc tasks (completed and rated)
    const adhocTasks = await prisma.adhocTask.findMany({
      where: {
        assignedToId: actualUserId,
        status: 'COMPLETED',
        rating: { not: null }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    return NextResponse.json({
      agreements,
      adhocTasks
    })
  } catch (error) {
    console.error('Error fetching my reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
