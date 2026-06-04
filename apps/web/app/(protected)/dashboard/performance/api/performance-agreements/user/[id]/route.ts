import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's performance agreements
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: userId,
        isAdhocContainer: false
      },
      select: {
        id: true,
        title: true,
        description: true,
        kpi: true,
        target: true,
        weight: true,
        dueDate: true,
        status: true,
        percentComplete: true,
        approvalStatus: true,
        evidenceUrl: true,
        evidenceNotes: true,
        rating: true,
        createdAt: true,
        updatedAt: true,
        initiative: {
          select: {
            id: true,
            title: true,
            number: true,
            objective: {
              select: {
                title: true,
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
        createdAt: 'desc'
      }
    })

    return NextResponse.json(agreements)
  } catch (error) {
    console.error('Error fetching user performance agreements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
