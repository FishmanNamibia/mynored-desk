import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's approved performance agreements (excluding ad-hoc container)
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: user.id,
        approvalStatus: 'APPROVED',
        isAdhocContainer: false
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
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    })

    // Get user display info for the response
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, firstName: true, lastName: true, email: true }
    })

    const displayName = currentUser
      ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() || currentUser.email
      : user.email

    // Attach user info to each agreement
    const agreementsWithUser = agreements.map(a => ({
      ...a,
      user: {
        id: user.id,
        name: displayName,
        email: user.email
      }
    }))

    // Fetch user's adhoc tasks (completed and rated)
    const adhocTasks = await prisma.adhocTask.findMany({
      where: {
        assignedToId: user.id,
        status: 'COMPLETED',
        rating: { not: null }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    // Format adhoc tasks to match frontend expectations (name field)
    const formattedAdhocTasks = adhocTasks.map(t => ({
      ...t,
      createdBy: t.createdBy ? {
        id: t.createdBy.id,
        name: [t.createdBy.firstName, t.createdBy.lastName].filter(Boolean).join(' ').trim() || t.createdBy.email,
        email: t.createdBy.email
      } : undefined,
      approvedBy: t.approvedBy ? {
        id: t.approvedBy.id,
        name: [t.approvedBy.firstName, t.approvedBy.lastName].filter(Boolean).join(' ').trim() || t.approvedBy.email,
        email: t.approvedBy.email
      } : undefined
    }))

    const response = NextResponse.json({
      agreements: agreementsWithUser,
      adhocTasks: formattedAdhocTasks
    })
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  } catch (error: any) {
    console.error('Error fetching my reviews:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
