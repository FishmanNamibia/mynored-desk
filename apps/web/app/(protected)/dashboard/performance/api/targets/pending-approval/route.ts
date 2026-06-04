import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch tasks that have been submitted for approval (submittedForApproval is set)
    // and are still awaiting a decision (approvalStatus is PENDING).
    const whereClause: any = {
      submittedForApproval: { not: null },
      approvalStatus: 'PENDING',
    }

    const pendingTasks = await prisma.target.findMany({
      where: whereClause,
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            departmentName: true,
            divisionName: true,
          },
        },
        initiative: {
          select: {
            id: true,
            title: true,
            objective: {
              select: {
                id: true,
                title: true,
                goal: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        submittedForApproval: 'asc', // Oldest first
      },
    })

    return NextResponse.json(pendingTasks)
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error)
    return NextResponse.json({ error: 'Failed to fetch pending approvals' }, { status: 500 })
  }
}
