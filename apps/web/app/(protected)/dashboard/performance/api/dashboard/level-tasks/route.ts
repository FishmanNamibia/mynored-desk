import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const levelId = searchParams.get('levelId')

    // Get all users in the organizational level (same logic as level-stats)
    let userIds: string[] = []

    if (level === 'organization') {
      // Get all users across the entire organization
      const users = await prisma.user.findMany({
        where: {
          isApproved: true,
          role: {
            notIn: ['ADMIN', 'SG', 'DEPUTY_SG']
          }
        },
        select: { id: true }
      })
      userIds = users.map(u => u.id)
    } else if (level === 'department' && levelId) {
      // Get all users in divisions within this department + executives
      const [divisionUsers, executives] = await Promise.all([
        // Users in divisions within this department
        prisma.user.findMany({
          where: {
            isApproved: true,
            division: {
              departmentId: levelId
            }
          },
          select: { id: true }
        }),
        // All executives (they oversee all departments)
        prisma.user.findMany({
          where: {
            isApproved: true,
            role: 'EXECUTIVE'
          },
          select: { id: true }
        })
      ])

      const allDeptUsers = [...divisionUsers, ...executives]
      userIds = allDeptUsers.map(u => u.id)
    } else if (level === 'division' && levelId) {
      // Get all users directly in this division
      const users = await prisma.user.findMany({
        where: {
          isApproved: true,
          divisionId: levelId
        },
        select: { id: true }
      })
      userIds = users.map(u => u.id)
    }

    if (userIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch all task types for these users (same as level-stats)
    const [performanceAgreements, adhocTasks, projectTasks, riskTasks] = await Promise.all([
      // Performance Agreements - only approved individual actions (exclude containers)
      prisma.performanceAgreement.findMany({
        where: {
          userId: { in: userIds },
          isDiscontinued: false,
          approvalStatus: 'APPROVED',
          isAdhocContainer: false
        },
        include: {
          supervisor: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      }),
      // Adhoc Tasks - all of them
      prisma.adhocTask.findMany({
        where: {
          assignedToId: { in: userIds }
        },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      }),
      // Project Tasks - all assigned project tasks
      prisma.projectTask.findMany({
        where: {
          assignedToId: { in: userIds }
        },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      }),
      // Risk Management Tasks - all risk management tasks assigned to users
      prisma.projectRisk.findMany({
        where: {
          ownerId: { in: userIds }
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      })
    ])

    // Normalize all tasks to have consistent structure for the dialog
    const normalizedTasks = [
      ...performanceAgreements.map(pa => ({
        id: pa.id,
        title: pa.customAction || pa.title,
        status: pa.approvalStatus,
        dueDate: pa.dueDate,
        type: 'performance_agreement',
        description: pa.description,
        responsible: pa.supervisor ? { name: pa.supervisor.name } : null,
        priority: 'MEDIUM',
        percentComplete: pa.status === 'COMPLETED' ? 100 : 50
      })),
      ...adhocTasks.map(at => ({
        id: at.id,
        title: at.title,
        status: at.status,
        dueDate: at.dueDate,
        type: 'adhoc_task',
        description: at.description,
        responsible: at.assignedTo ? { name: at.assignedTo.name } : null,
        priority: at.priority || 'MEDIUM',
        percentComplete: at.percentComplete || 0
      })),
      ...projectTasks.map(pt => ({
        id: pt.id,
        title: pt.title,
        status: pt.status,
        dueDate: pt.plannedEndDate,
        type: 'project_task',
        description: pt.description,
        responsible: pt.assignedTo ? { name: pt.assignedTo.name } : null,
        priority: 'HIGH',
        percentComplete: pt.percentComplete || 0,
        initiative: null
      })),
      ...riskTasks.map(rt => ({
        id: rt.id,
        title: rt.title,
        status: rt.status,
        dueDate: null,
        type: 'risk_task',
        description: rt.description,
        responsible: rt.owner ? { name: rt.owner.name } : null,
        priority: 'CRITICAL',
        percentComplete: rt.status === 'CLOSED' ? 100 : rt.status === 'MITIGATED' ? 75 : 25,
        initiative: null
      }))
    ]

    return NextResponse.json(normalizedTasks)
  } catch (error) {
    console.error('Error fetching level tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
