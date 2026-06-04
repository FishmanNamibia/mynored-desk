import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the active performance period with submission deadline
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { submissionDeadline: true }
    })

    // Get all users with their performance agreements
    // Schema uses departmentName and divisionName as string fields
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        performanceAgreements: {
          where: {
            isAdhocContainer: false
          },
          select: {
            id: true,
            approvalStatus: true
          }
        }
      }
    })

    // Calculate stats for each user
    const userStats = users.map(user => {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
      
      const totalAgreements = user.performanceAgreements.length
      const approvedAgreements = user.performanceAgreements.filter(
        a => a.approvalStatus === 'APPROVED'
      ).length
      const submittedAgreements = user.performanceAgreements.filter(
        a => a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED' || a.approvalStatus === 'REJECTED'
      ).length
      
      // Overdue: User has agreements but hasn't submitted all by HC deadline
      // User is overdue if:
      // 1. There is an active period with a submission deadline
      // 2. Today is past the deadline
      // 3. User has agreements but not all are approved
      const hasDeadline = activePeriod && activePeriod.submissionDeadline
      const isPastDeadline = hasDeadline && today > new Date(activePeriod.submissionDeadline)
      const hasIncompleteAgreements = totalAgreements > 0 && approvedAgreements < totalAgreements
      const isOverdue = isPastDeadline && hasIncompleteAgreements
      
      // Mutually exclusive categories (priority order):
      // 1. Overdue (highest priority - past HC deadline with incomplete agreements)
      // 2. Complete (all agreements approved)
      // 3. In Progress (has agreements, some submitted but not complete)
      // 4. Not Started (has agreements but none submitted, or no agreements at all)
      const isComplete = !isOverdue && totalAgreements > 0 && approvedAgreements === totalAgreements
      const isInProgress = !isOverdue && !isComplete && totalAgreements > 0 && submittedAgreements > 0
      const notStarted = !isOverdue && !isComplete && !isInProgress

      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'

      return {
        userId: user.id,
        userName,
        email: user.email,
        jobTitle: user.jobTitle,
        departmentName: user.departmentName,
        divisionName: user.divisionName,
        totalAgreements,
        approvedAgreements,
        isComplete,
        isInProgress,
        notStarted,
        isOverdue
      }
    })

    // Calculate organizational stats
    const usersWithAgreements = userStats.filter(u => u.totalAgreements > 0).length
    const orgStats = {
      totalUsers: userStats.length,
      usersWithAgreements,
      usersWithCompleteAgreements: userStats.filter(u => u.isComplete).length,
      usersInProgress: userStats.filter(u => u.isInProgress).length,
      usersNotStarted: userStats.filter(u => u.notStarted).length,
      usersOverdue: userStats.filter(u => u.isOverdue).length,
      totalAgreements: userStats.reduce((sum, u) => sum + u.totalAgreements, 0),
      totalApproved: userStats.reduce((sum, u) => sum + u.approvedAgreements, 0),
      completionRate: usersWithAgreements > 0
        ? (userStats.filter(u => u.isComplete).length / usersWithAgreements) * 100
        : 0
    }

    // Get unique department names from users
    const uniqueDepartments = Array.from(
      new Set(userStats.filter(u => u.departmentName).map(u => u.departmentName))
    )

    // Calculate departmental stats using departmentName strings
    const departmentStats = uniqueDepartments.map(deptName => {
      const deptUsers = userStats.filter(u => u.departmentName === deptName)
      
      return {
        departmentName: deptName,
        totalUsers: deptUsers.length,
        usersWithAgreements: deptUsers.filter(u => u.totalAgreements > 0).length,
        usersWithCompleteAgreements: deptUsers.filter(u => u.isComplete).length,
        usersInProgress: deptUsers.filter(u => u.isInProgress).length,
        usersNotStarted: deptUsers.filter(u => u.notStarted).length,
        usersOverdue: deptUsers.filter(u => u.isOverdue).length,
        totalAgreements: deptUsers.reduce((sum, u) => sum + u.totalAgreements, 0),
        totalApproved: deptUsers.reduce((sum, u) => sum + u.approvedAgreements, 0),
        completionRate: deptUsers.filter(u => u.totalAgreements > 0).length > 0
          ? (deptUsers.filter(u => u.isComplete).length / deptUsers.filter(u => u.totalAgreements > 0).length) * 100
          : 0,
        completedUsers: deptUsers.filter(u => u.isComplete).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        inProgressUsers: deptUsers.filter(u => u.isInProgress).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        notStartedUsers: deptUsers.filter(u => u.notStarted).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        noAgreementsUsers: deptUsers.filter(u => u.totalAgreements === 0).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        overdueUsers: deptUsers.filter(u => u.isOverdue).map(u => ({ id: u.userId, name: u.userName, email: u.email }))
      }
    }).filter(dept => dept.totalUsers > 0)

    // Calculate divisional stats using divisionName strings
    const uniqueDivisions = Array.from(
      new Set(userStats.filter(u => u.divisionName).map(u => u.divisionName))
    )
    const divisionStats = uniqueDivisions.map(divName => {
      const divUsers = userStats.filter(u => u.divisionName === divName)
      
      return {
        divisionName: divName,
        totalUsers: divUsers.length,
        usersWithAgreements: divUsers.filter(u => u.totalAgreements > 0).length,
        usersWithCompleteAgreements: divUsers.filter(u => u.isComplete).length,
        usersInProgress: divUsers.filter(u => u.isInProgress).length,
        usersNotStarted: divUsers.filter(u => u.notStarted).length,
        usersOverdue: divUsers.filter(u => u.isOverdue).length,
        totalAgreements: divUsers.reduce((sum, u) => sum + u.totalAgreements, 0),
        totalApproved: divUsers.reduce((sum, u) => sum + u.approvedAgreements, 0),
        completionRate: divUsers.filter(u => u.totalAgreements > 0).length > 0
          ? (divUsers.filter(u => u.isComplete).length / divUsers.filter(u => u.totalAgreements > 0).length) * 100
          : 0,
        completedUsers: divUsers.filter(u => u.isComplete).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        inProgressUsers: divUsers.filter(u => u.isInProgress).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        notStartedUsers: divUsers.filter(u => u.notStarted).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        noAgreementsUsers: divUsers.filter(u => u.totalAgreements === 0).map(u => ({ id: u.userId, name: u.userName, email: u.email })),
        overdueUsers: divUsers.filter(u => u.isOverdue).map(u => ({ id: u.userId, name: u.userName, email: u.email }))
      }
    })

    return NextResponse.json({
      organization: orgStats,
      departments: departmentStats.sort((a, b) => b.completionRate - a.completionRate),
      divisions: divisionStats.sort((a, b) => b.completionRate - a.completionRate)
    })
  } catch (error) {
    console.error('Error fetching performance agreement stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
