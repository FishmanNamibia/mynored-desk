import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    // Try server-side auth first (works when cookies are forwarded)
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const { user } = await getAuthenticatedUser(req)
      if (user?.id) {
        userId = user.id
        userEmail = user.email || null
      }
    } catch { /* ignore */ }

    // Fallback: accept userId query param
    if (!userId) {
      const url = new URL(req.url)
      userId = url.searchParams.get('userId')
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual database user ID by email
    if (userEmail) {
      const dbUser = await prisma.user.findFirst({
        where: { email: userEmail },
        select: { id: true }
      })
      if (dbUser) userId = dbUser.id
    }

    const now = new Date()

    // Fetch all data in parallel
    const [
      activePeriod,
      userAgreements,
      allApprovedAgreements,
      allAdhocTasks,
      allUserWeights,
      currentUser,
      allUsers,
    ] = await Promise.all([
      prisma.performancePeriod.findFirst({
        where: { isActive: true },
        select: { id: true, submissionDeadline: true, adhocWeight: true, projectsWeight: true, riskManagementWeight: true, rating360Weight: true },
      }),
      prisma.performanceAgreement.findMany({
        where: { userId, isAdhocContainer: false },
        select: { id: true, approvalStatus: true },
      }),
      prisma.performanceAgreement.findMany({
        where: { isAdhocContainer: false, rating: { not: null } },
        select: { id: true, userId: true, rating: true, weight: true, approvalStatus: true },
      }),
      prisma.adhocTask.findMany({
        where: { approvalStatus: 'APPROVED' },
        select: { id: true, assignedToId: true, status: true },
      }),
      prisma.userTaskWeight.findMany({
        select: { userId: true, periodId: true, categories: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          department: true,
          // @ts-ignore
          roles: { include: { role: true } },
        },
      }),
      prisma.user.findMany({
        select: { id: true, departmentId: true, departmentName: true, divisionName: true },
      }),
    ])

    const total = userAgreements.length
    const approved = userAgreements.filter(a => a.approvalStatus === 'APPROVED').length
    const pending = userAgreements.filter(a => a.approvalStatus === 'PENDING').length
    const complete = approved
    const incomplete = total - approved

    let overdue = 0
    if (activePeriod?.submissionDeadline) {
      if (now > new Date(activePeriod.submissionDeadline) && incomplete > 0) {
        overdue = incomplete
      }
    }

    const roleNames = (currentUser?.roles || []).map((r: any) => r.role.name.toUpperCase())
    const userRole = roleNames[0] || 'USER'
    const canSeeAllLevels = roleNames.some((r: string) =>
      r.includes('SG') || r.includes('EXECUTIVE') || r.includes('ADMIN') || r.includes('HUMAN_CAPITAL')
    )

    // ============================================================
    // MULTI-COMPONENT RATING CALCULATION (matches my-rate API)
    // ============================================================
    const defaultAdhocWeight = activePeriod?.adhocWeight || 10
    const defaultProjectsWeight = activePeriod?.projectsWeight || 10
    const defaultRiskWeight = activePeriod?.riskManagementWeight || 10
    const defaultAuditWeight = 0
    const defaultPerfWeight = 100 - defaultAdhocWeight - defaultProjectsWeight - defaultRiskWeight - defaultAuditWeight

    const calculateUserFinalRating = (uid: string): number => {
      // Determine user's weight allocation
      let perfWeight = defaultPerfWeight
      let adhocW = defaultAdhocWeight
      let projectsW = defaultProjectsWeight
      let riskW = defaultRiskWeight
      let auditW = defaultAuditWeight

      const userWeight = allUserWeights.find((w: any) =>
        w.userId === uid && (w.periodId === activePeriod?.id || w.periodId === null)
      )
      if (userWeight) {
        try {
          const categories = JSON.parse(userWeight.categories as string) as { id: string; weight: number }[]
          const getW = (id: string) => categories.find(c => c.id === id)?.weight ?? 0
          const rawPerf = getW('perf')
          const rawAdhoc = getW('adhoc')
          const rawRisk = getW('risk')
          const rawProject = getW('project')
          const rawAudit = getW('audit')
          const rawTotal = rawPerf + rawAdhoc + rawRisk + rawProject + rawAudit
          const scale = rawTotal > 0 ? 100 / rawTotal : 0
          perfWeight = Math.round(rawPerf * scale * 100) / 100
          adhocW = Math.round(rawAdhoc * scale * 100) / 100
          projectsW = Math.round(rawProject * scale * 100) / 100
          riskW = Math.round(rawRisk * scale * 100) / 100
          auditW = Math.round(rawAudit * scale * 100) / 100
        } catch { /* use defaults */ }
      }

      // Component 1: Performance Agreement Rating (weighted avg of all rated agreements)
      const uAgreements = allApprovedAgreements.filter(a => a.userId === uid)
      let perfTotalScore = 0
      let perfTotalWeight = 0
      uAgreements.forEach(a => {
        if (a.weight) {
          perfTotalWeight += a.weight
          if (a.rating) {
            perfTotalScore += a.rating * a.weight
          }
        }
      })
      const perfRating = perfTotalWeight > 0 ? perfTotalScore / perfTotalWeight : 0

      // Component 2: Ad-Hoc Tasks Rating (completion rate * 5)
      const uAdhocTasks = allAdhocTasks.filter((t: any) => t.assignedToId === uid)
      const completedAdhoc = uAdhocTasks.filter((t: any) => t.status === 'COMPLETED').length
      const adhocRating = uAdhocTasks.length > 0 ? (completedAdhoc / uAdhocTasks.length) * 5 : 0

      // Components 3-5: Projects, Risk, Audit (placeholders)
      const projectsRating = 0
      const riskRating = 0
      const auditRating = 0

      // Final weighted score
      const weightedScore =
        (perfRating * perfWeight) +
        (adhocRating * adhocW) +
        (projectsRating * projectsW) +
        (riskRating * riskW) +
        (auditRating * auditW)

      return weightedScore / 100
    }

    // Calculate ratings for all users who have approved agreements or adhoc tasks
    const allUserIds = [...new Set([
      ...allApprovedAgreements.map(a => a.userId),
      ...allAdhocTasks.map((t: any) => t.assignedToId),
    ])]

    const userFinalRatings = allUserIds.map(uid => {
      const usr = allUsers.find(u => u.id === uid)
      return {
        userId: uid,
        rating: calculateUserFinalRating(uid),
        departmentId: usr?.departmentId,
        departmentName: usr?.departmentName,
        divisionName: usr?.divisionName,
      }
    }).filter(u => u.rating > 0)

    // Current user's rating
    const userAverageRating = Math.round(calculateUserFinalRating(userId) * 100) / 100

    // Organization average
    const organizationAverageRating = userFinalRatings.length > 0
      ? Math.round((userFinalRatings.reduce((sum, u) => sum + u.rating, 0) / userFinalRatings.length) * 10) / 10
      : 0

    // Department average - match by departmentId OR departmentName (Entra AD string)
    let departmentAverageRating = 0
    const userDepartmentId = currentUser?.departmentId
    const userDepartmentName = (currentUser as any)?.departmentName || currentUser?.department?.name || null
    if (userDepartmentId || userDepartmentName) {
      const deptRatings = userFinalRatings.filter(u => {
        if (userDepartmentId && u.departmentId === userDepartmentId) return true
        if (userDepartmentName && u.departmentName === userDepartmentName) return true
        return false
      })
      departmentAverageRating = deptRatings.length > 0
        ? Math.round((deptRatings.reduce((sum, u) => sum + u.rating, 0) / deptRatings.length) * 10) / 10
        : 0
    }

    // Division average
    let divisionAverageRating = 0
    const userDivisionName = (currentUser as any)?.divisionName || null
    if (userDivisionName) {
      const divRatings = userFinalRatings.filter(u => u.divisionName === userDivisionName)
      divisionAverageRating = divRatings.length > 0
        ? Math.round((divRatings.reduce((sum, u) => sum + u.rating, 0) / divRatings.length) * 10) / 10
        : 0
    }

    return NextResponse.json({
      canSeeAllLevels,
      userRole,
      personalStats: { totalAgreements: total, approved, pending, complete, incomplete, overdue },
      totalStaff: canSeeAllLevels ? allUsers.length : 1,
      submittedAgreements: canSeeAllLevels ? new Set(allApprovedAgreements.map(a => a.userId)).size : (total > 0 ? 1 : 0),
      pendingApprovals: canSeeAllLevels ? 0 : pending,
      approvedAgreements: canSeeAllLevels ? 0 : approved,
      averageCompletion: 0,
      overdueSubmissions: overdue,
      averageRating: organizationAverageRating,
      userAverageRating,
      departmentAverageRating,
      divisionAverageRating,
      userContext: {
        departmentId: currentUser?.departmentId || userDepartmentName,
        divisionId: userDivisionName,
        departmentName: userDepartmentName,
        divisionName: userDivisionName,
      },
    })
  } catch (error: any) {
    console.error('my-dashboard-stats error:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
