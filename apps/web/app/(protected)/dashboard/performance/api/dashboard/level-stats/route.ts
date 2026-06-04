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
    const level = searchParams.get('level') || 'organization'
    const levelId = searchParams.get('levelId')

    // Get current user's details including role and organizational hierarchy
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        division: {
          include: {
            department: true
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRole = currentUser.role
    const userDepartmentId = currentUser.division?.departmentId
    const userDivisionId = currentUser.divisionId

    // Check permissions based on user role and requested level
    if (level === 'organization') {
      // Organization level is accessible to all users - shows all organizational tasks
      // No restrictions here
    } else if (level === 'department') {
      if (levelId) {
        // Check if user has access to this department
        if (userRole === 'ADMIN' || userRole === 'SG' || userRole === 'DEPUTY_SG') {
          // Admins and special roles can view any department
        } else if (userRole === 'EXECUTIVE') {
          // Executives can view any department they oversee
        } else if (userRole === 'MANAGER' && userDepartmentId === levelId) {
          // Managers can only view their own department
        } else if (userDivisionId) {
          // Regular users can view the department their division belongs to
          const division = await prisma.division.findUnique({
            where: { id: userDivisionId },
            select: { departmentId: true }
          })
          if (division?.departmentId !== levelId) {
            return NextResponse.json({ error: 'Access denied: Cannot view departments outside your organization' }, { status: 403 })
          }
        } else {
          return NextResponse.json({ error: 'Access denied: Cannot view this department' }, { status: 403 })
        }
      }
    } else if (level === 'division') {
      if (levelId) {
        // Division level is personal - users can only view their own division
        if (userDivisionId !== levelId) {
          return NextResponse.json({ error: 'Access denied: Can only view your own division' }, { status: 403 })
        }
      }
    }

    // Get all users in the organizational hierarchy based on level
    let userIds: string[] = []

    if (level === 'organization') {
      // Get all users across the entire organization
      const users = await prisma.user.findMany({
        where: {
          isApproved: true,
          // Exclude special roles that don't belong to departments/divisions
          role: {
            notIn: ['ADMIN', 'SG', 'DEPUTY_SG']
          }
        },
        select: { id: true, firstName: true, lastName: true, role: true }
      })
      userIds = users.map(u => u.id)
      console.log(`[LEVEL-STATS] Organization level: Found ${users.length} users:`, users.map(u => `${u.name} (${u.role})`))
    } else if (level === 'department' && levelId) {
      // Get all users in all divisions within this department + all executives (since they oversee departments)
      const [divisionUsers, executives] = await Promise.all([
        // Users in divisions within this department
        prisma.user.findMany({
          where: {
            isApproved: true,
            division: {
              departmentId: levelId
            }
          },
          select: { id: true, firstName: true, lastName: true, role: true }
        }),
        // All executives (they oversee all departments)
        prisma.user.findMany({
          where: {
            isApproved: true,
            role: 'EXECUTIVE'
          },
          select: { id: true, firstName: true, lastName: true, role: true }
        })
      ])
      
      // Combine division users and executives
      const allDeptUsers = [...divisionUsers, ...executives]
      userIds = allDeptUsers.map(u => u.id)
      console.log(`[LEVEL-STATS] Department level (${levelId}): Found ${allDeptUsers.length} users:`, allDeptUsers.map(u => `${u.name} (${u.role})`))
    } else if (level === 'division' && levelId) {
      // Get all users directly in this division
      const users = await prisma.user.findMany({
        where: {
          isApproved: true,
          divisionId: levelId
        },
        select: { id: true, firstName: true, lastName: true, role: true }
      })
      userIds = users.map(u => u.id)
      console.log(`[LEVEL-STATS] Division level (${levelId}): Found ${users.length} users:`, users.map(u => `${u.name} (${u.role})`))
    }

    if (userIds.length === 0) {
      return NextResponse.json({
        totals: { targets: 0 },
        statusBreakdown: {},
        overdue: 0,
        dueSoon: 0,
        completionRate: 0,
        timeline: { tasksDueThisWeek: 0, tasksDueThisMonth: 0 },
        risks: { blockedTasks: 0 }
      })
    }

    // Fetch all tasks for users in this organizational level
    // This includes: Performance Agreements (approved individual actions only), Adhoc Tasks (all), Project Tasks, Risk Management Tasks
    const [performanceAgreements, adhocTasks, projectTasks, riskTasks] = await Promise.all([
      // Performance Agreements - only approved individual actions (explicitly APPROVED, exclude containers)
      prisma.performanceAgreement.findMany({
        where: {
          userId: { in: userIds },
          isDiscontinued: false,
          approvalStatus: 'APPROVED',
          isAdhocContainer: false // Exclude container agreements (they're grouping mechanisms, not tasks)
        },
        select: {
          id: true,
          status: true,
          dueDate: true,
        }
      }),
      // Adhoc Tasks - all of them (no approval needed)
      prisma.adhocTask.findMany({
        where: {
          assignedToId: { in: userIds }
        },
        select: {
          id: true,
          status: true,
          dueDate: true,
        }
      }),
      // Project Tasks - all assigned project tasks
      prisma.projectTask.findMany({
        where: {
          assignedToId: { in: userIds }
        },
        select: {
          id: true,
          status: true,
          plannedEndDate: true,
        }
      }),
      // Risk Management Tasks - all risk management tasks assigned to users
      prisma.projectRisk.findMany({
        where: {
          ownerId: { in: userIds }
        },
        select: {
          id: true,
          status: true,
          // No due date field, so we'll use createdAt or omit timeline
        }
      })
    ])

    console.log(`[LEVEL-STATS] Task counts for ${userIds.length} users:`)
    console.log(`  - Performance Agreements: ${performanceAgreements.length}`)
    console.log(`  - Adhoc Tasks: ${adhocTasks.length}`)
    console.log(`  - Project Tasks: ${projectTasks.length}`)
    console.log(`  - Risk Management Tasks: ${riskTasks.length}`)
    console.log(`  - TOTAL: ${performanceAgreements.length + adhocTasks.length + projectTasks.length + riskTasks.length}`)

    // Combine all tasks into a single array
    const allTasks = [
      ...performanceAgreements.map(task => ({ ...task, type: 'performance_agreement', dueDate: task.dueDate })),
      ...adhocTasks.map(task => ({ ...task, type: 'adhoc_task', dueDate: task.dueDate })),
      ...projectTasks.map(task => ({ ...task, type: 'project_task', dueDate: task.plannedEndDate })),
      ...riskTasks.map(task => ({ ...task, type: 'risk_task', dueDate: null })) // Risk tasks don't have due dates
    ]

    // Calculate stats from combined tasks
    const now = new Date()
    const statusBreakdown: Record<string, number> = {}
    let overdue = 0
    let dueSoon = 0
    let dueThisWeek = 0
    let dueThisMonth = 0
    let blockedTasks = 0

    allTasks.forEach(task => {
      // Count by status (normalize status values)
      const normalizedStatus = task.status === 'NOT_STARTED' ? 'NOT_STARTED' :
                              task.status === 'IN_PROGRESS' ? 'IN_PROGRESS' :
                              task.status === 'COMPLETED' ? 'COMPLETED' :
                              task.status === 'OVERDUE' ? 'OVERDUE' :
                              task.status === 'BLOCKED' ? 'BLOCKED' :
                              task.status === 'OPEN' ? 'NOT_STARTED' : // Risk management OPEN = NOT_STARTED
                              task.status === 'MITIGATED' ? 'COMPLETED' : // Risk management MITIGATED = COMPLETED
                              task.status === 'CLOSED' ? 'COMPLETED' : // Risk management CLOSED = COMPLETED
                              'OTHER'
      statusBreakdown[normalizedStatus] = (statusBreakdown[normalizedStatus] || 0) + 1

      // Check if overdue
      if (normalizedStatus !== 'COMPLETED' && task.dueDate) {
        const dueDate = new Date(task.dueDate)
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 0) {
          overdue++
        } else if (daysDiff <= 3) {
          dueSoon++
        }

        if (daysDiff <= 7 && daysDiff >= 0) {
          dueThisWeek++
        }

        if (daysDiff <= 30 && daysDiff >= 0) {
          dueThisMonth++
        }
      }

      // Count blocked tasks
      if (normalizedStatus === 'BLOCKED') {
        blockedTasks++
      }
    })

    const totalTasks = allTasks.length
    const completed = statusBreakdown.COMPLETED || 0
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0

    return NextResponse.json({
      totals: {
        targets: totalTasks // Using 'targets' key for backward compatibility
      },
      statusBreakdown,
      overdue,
      dueSoon,
      completionRate,
      timeline: {
        tasksDueThisWeek: dueThisWeek,
        tasksDueThisMonth: dueThisMonth
      },
      risks: {
        blockedTasks
      }
    })
  } catch (error) {
    console.error('Error fetching level stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
