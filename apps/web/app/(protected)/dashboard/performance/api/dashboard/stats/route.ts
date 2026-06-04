import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Fetch activePeriod and activeCycleId first so we can use their IDs as filters below
    const [activePeriod, activeCycleRecord] = await Promise.all([
      prisma.performancePeriod.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          adhocWeight: true,
          projectsWeight: true,
          riskManagementWeight: true,
          rating360Weight: true,
          submissionDeadline: true,
        },
      }),
      prisma.rating360Cycle.findFirst({
        where: { isActive: true },
        select: { id: true },
      }),
    ])
    const activePeriodId = activePeriod?.id
    const activeCycleId = (activeCycleRecord as any)?.id

    // Fetch all data in parallel
    const [
      goalsCount,
      objectivesCount,
      initiativesCount,
      targetsCount,
      targets,
      initiatives,
      departments,
      divisions,
      users,
      goals,
      performanceAgreements,
      allAdhocTasks,
      allUserWeights,
      allRating360Records
    ] = await Promise.all([
      prisma.goal.count(),
      prisma.objective.count(),
      prisma.initiative.count(),
      prisma.target.count(),
      prisma.target.findMany({
        include: {
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              departmentId: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.initiative.findMany(),
      prisma.department.findMany(),
      // Division model doesn't exist in schema - return empty array
      [] as any,
      prisma.user.findMany({
        include: {
          department: { select: { id: true, name: true } },
          // @ts-ignore
          roles: { include: { role: true } },
        },
      }),
      prisma.goal.findMany({
        include: {
          objectives: {
            include: {
              initiatives: {
                include: {
                  targets: true,
                },
              },
            },
          },
        },
      }),
      prisma.performanceAgreement.findMany({
        where: {
          isAdhocContainer: false,
          ...(activePeriodId ? { performancePeriodId: activePeriodId } : {}),
        },
        select: {
          id: true,
          userId: true,
          approvalStatus: true,
          rating: true,
          weight: true,
          dueDate: true,
        },
      }),
      // Fetch adhoc tasks for all users (for multi-component rating calculation)
      prisma.adhocTask.findMany({
        where: {
          approvalStatus: 'APPROVED',
        },
        select: {
          id: true,
          assignedToId: true,
          status: true,
        },
      }),
      // Fetch user-specific weight allocations
      prisma.userTaskWeight.findMany({
        select: {
          userId: true,
          periodId: true,
          categories: true,
        },
      }).catch(() => [] as any[]),
      prisma.rating360.findMany({
        where: activeCycleId ? { cycleId: activeCycleId } : {},
        select: { userId: true, selfRating: true, supervisorRating: true, averageRating: true },
      }),
    ])

    // ── Active bi-annual half determination ──
    // H1 performance period: Apr-Sep (months 4-9). Rating window: Oct-Mar.
    // H2 performance period: Oct-Mar (months 10-12,1-3). Rating window: Apr-Sep.
    // Show only the half whose rating window is currently open.
    const _nowMonth = new Date().getUTCMonth() + 1 // 1-12
    const _H1_PERF_MONTHS = [4, 5, 6, 7, 8, 9]   // Apr-Sep: rated Oct-Mar
    const _H2_PERF_MONTHS = [10, 11, 12, 1, 2, 3] // Oct-Mar: rated Apr-Sep
    const _isH1RatingWindow = _H2_PERF_MONTHS.includes(_nowMonth) // Oct-Mar = H1 rating window
    const _activeHalfMonths = _isH1RatingWindow ? _H1_PERF_MONTHS : _H2_PERF_MONTHS

    // Filter out ghost/test accounts:
    // 1. Exclude users missing BOTH department AND job title
    // 2. Exclude users whose display name starts with 'test' or 'demo' (case-insensitive)
    // 3. Deduplicate by email — keep only the richest record per email (has jobTitle or departmentName)
    const baseFiltered = users.filter((u: any) => {
      const hasDept = !!(u.departmentName || u.departmentId || u.department?.id)
      const hasJob = !!(u.jobTitle || u.position)
      if (!hasDept && !hasJob) return false
      const displayName = (`${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase()
      if (displayName.startsWith('test') || displayName.startsWith('demo')) return false
      return true
    })
    // Deduplicate by email: for each email group keep only the single richest record
    const emailBestMap = new Map<string, any>()
    for (const u of baseFiltered as any[]) {
      const key = (u.email || u.id).toLowerCase()
      const existing = emailBestMap.get(key)
      if (!existing) {
        emailBestMap.set(key, u)
      } else {
        const existScore = (existing.jobTitle ? 2 : 0) + (existing.departmentName ? 1 : 0)
        const newScore = (u.jobTitle ? 2 : 0) + (u.departmentName ? 1 : 0)
        if (newScore > existScore) emailBestMap.set(key, u)
      }
    }
    const filteredUsers = Array.from(emailBestMap.values())
    console.log(`[STATS] Users: ${users.length} total, ${baseFiltered.length} after ghost/test filter, ${filteredUsers.length} after email dedup`)

    // Build a map: any userId (including non-canonical duplicates) → canonical filteredUser
    // This ensures Rating360/agreement records pointing to a duplicate account still resolve department info
    const idToCanonicalUser = new Map<string, any>()
    for (const canonical of filteredUsers) {
      idToCanonicalUser.set(canonical.id, canonical)
    }
    // Also map every duplicate ID → its canonical record via email
    for (const u of users as any[]) {
      if (idToCanonicalUser.has(u.id)) continue // already mapped
      const key = (u.email || u.id).toLowerCase()
      const canonical = emailBestMap.get(key)
      if (canonical) idToCanonicalUser.set(u.id, canonical)
    }

    // Basic status breakdown
    const statusCounts = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      BLOCKED: 0,
      OVERDUE: 0,
    }

    targets.forEach((t: any) => {
      if (t.status === 'COMPLETED') {
        statusCounts.COMPLETED++
      } else if (t.dueDate && new Date(t.dueDate) < now) {
        statusCounts.OVERDUE++
      } else {
        statusCounts[t.status as keyof typeof statusCounts]++
      }
    })

    const completedCount = statusCounts.COMPLETED
    const completionRate = targetsCount > 0 ? (completedCount / targetsCount) * 100 : 0

    // Initiative/Actions status tracking for current user
    const userInitiatives = initiatives.filter((i: any) => 
      i.primaryResponsibility === authUser.id || 
      i.secondaryResponsibility === authUser.id
    )
    
    const initiativeStatusCounts = {
      NOT_STARTED: userInitiatives.filter((i: any) => !i.status || i.status === 'NOT_STARTED').length,
      IN_PROGRESS: userInitiatives.filter((i: any) => i.status === 'IN_PROGRESS').length,
      COMPLETED: userInitiatives.filter((i: any) => i.status === 'COMPLETED').length,
      BLOCKED: userInitiatives.filter((i: any) => i.status === 'BLOCKED').length,
    }
    
    const initiativeCompletionRate = userInitiatives.length > 0 
      ? Math.round((initiativeStatusCounts.COMPLETED / userInitiatives.length) * 100) 
      : 0

    // Strategic Performance
    const completedGoals = goals.filter((g: any) =>
      g.objectives.every((o: any) =>
        o.initiatives.every((i: any) =>
          i.targets.every((t: any) => t.status === 'COMPLETED')
        )
      )
    ).length
    const goalCompletionRate = goalsCount > 0 ? (completedGoals / goalsCount) * 100 : 0

    // Timeline metrics
    const tasksDueThisWeek = targets.filter((t: any) =>
      t.status !== 'COMPLETED' &&
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      new Date(t.dueDate) <= oneWeekFromNow
    ).length

    const tasksDueThisMonth = targets.filter((t: any) =>
      t.status !== 'COMPLETED' &&
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      new Date(t.dueDate) <= oneMonthFromNow
    ).length

    // Department performance
    const departmentPerformance = departments.map((dept: any) => {
      const deptTargets = targets.filter((t: any) =>
        t.responsible?.department?.id === dept.id ||
        t.responsible?.departmentId === dept.id
      )
      const deptCompleted = deptTargets.filter((t: any) => t.status === 'COMPLETED').length
      const deptTotal = deptTargets.length
      const deptOverdue = deptTargets.filter((t: any) =>
        t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now
      ).length

      return {
        name: dept.name,
        totalTasks: deptTotal,
        completedTasks: deptCompleted,
        completionRate: deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0,
        overdueTasks: deptOverdue,
      }
    }).sort((a: any, b: any) => b.completionRate - a.completionRate)

    // Division performance - not available (Division model doesn't exist)
    const divisionPerformance: any[] = []

    // Overall NSA performance
    const overallNSA = {
      totalTasks: targetsCount,
      completedTasks: completedCount,
      completionRate: Math.round(completionRate),
      overdueTasks: statusCounts.OVERDUE,
      inProgressTasks: statusCounts.IN_PROGRESS,
      notStartedTasks: statusCounts.NOT_STARTED,
      blockedTasks: statusCounts.BLOCKED,
    }

    // Get current user's context for filtering - use email to find correct DB record (insensitive)
    // For merged users, find ALL records with same email and pick the richest one (has jobTitle/departmentName)
    const allUserRecordsByEmail = authUser.email ? await prisma.user.findMany({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      // @ts-ignore
      include: { department: true, roles: { include: { role: true } } },
    }) : []

    // Pick the canonical record: prefer the one with jobTitle or departmentName
    const richestRecord = allUserRecordsByEmail.find((u: any) => u.jobTitle || u.departmentName) || allUserRecordsByEmail[0]
    const actualUserId = richestRecord?.id || authUser.id

    const currentUser = richestRecord || await prisma.user.findUnique({
      where: { id: actualUserId },
      // @ts-ignore
      include: { department: true, roles: { include: { role: true } } },
    })

    // Collect all user IDs for this person (handles merged accounts)
    const allSelfIds = new Set(allUserRecordsByEmail.map((u: any) => u.id))
    if (authUser.id) allSelfIds.add(authUser.id)

    const userDepartmentId = currentUser?.departmentId
    const userDepartmentNameFromAD = (currentUser as any)?.departmentName || null
    const userDivisionName = (currentUser as any)?.divisionName || null
    // Merge roles from ALL records for this user
    const allRoles = allUserRecordsByEmail.flatMap((u: any) => (u.roles || []).map((r: any) => r.role.name.toUpperCase()))
    const userRoleNames = [...new Set(allRoles)]
    const userRole = userRoleNames[0] || 'USER'

    // Check if user can see all levels - check roles, job title (from any record or session), and email
    // Use session jobTitle as fallback for merged users whose canonical record lacks it
    const sessionJobTitle = (authUser as any).jobTitle || ''
    const jobTitle = ((currentUser as any)?.jobTitle || sessionJobTitle || '').toLowerCase()
    const department = (currentUser?.department?.name || (currentUser as any)?.departmentName || '').toLowerCase()
    const email = (currentUser?.email || '').toLowerCase()
    
    const isODSpecialist = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isExecutive = jobTitle.includes('executive')
    const isSG = jobTitle.includes('statistician') && jobTitle.includes('general') && !jobTitle.includes('deputy')
    const isDeputySG = jobTitle.includes('deputy') && jobTitle.includes('statistician')
    const isAdmin = userRoleNames.includes('ADMIN') || userRoleNames.includes('SUPER_ADMIN')
    const hasAdminRole = userRoleNames.some((r: string) =>
      r.includes('SG') || r.includes('EXECUTIVE') || r.includes('ADMIN') || r.includes('HUMAN_CAPITAL')
    )
    
    const canSeeAllLevels = isExecutive || isSG || isDeputySG || isAdmin || isODSpecialist || hasAdminRole
    
    // Get current user's personal performance agreement stats - check ALL known IDs for merged users
    const userPersonalAgreements = performanceAgreements.filter(a => allSelfIds.has(a.userId))
    const userApprovedCount = userPersonalAgreements.filter(a => a.approvalStatus === 'APPROVED').length
    const userPendingCount = userPersonalAgreements.filter(a => a.approvalStatus === 'PENDING').length
    const userTotalAgreements = userPersonalAgreements.length
    
    // Calculate user's completion status based on their agreements
    const userCompleteCount = userApprovedCount
    const userIncompleteCount = userTotalAgreements - userApprovedCount
    
    // Check if user is overdue (has incomplete agreements past deadline)
    let userOverdueCount = 0
    if (activePeriod?.submissionDeadline) {
      const deadline = new Date(activePeriod.submissionDeadline)
      if (now > deadline && userIncompleteCount > 0) {
        userOverdueCount = userIncompleteCount
      }
    }

    // Helper function to create performer object
    const createPerformer = (u: any) => {
      // Note: Target relation removed from User model
      const completed = 0
      const total = 0
      return {
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        role: (u.roles?.[0]?.role?.name) || 'USER',
        totalTasks: total,
        completedTasks: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    }

    // Organization-level rankings placeholder - computed after calculateUserFinalRating is defined
    let organizationTopPerformers: any[] = []
    let organizationPerformers: any[] = []

    // Department-level and division-level rankings are computed later
    // after calculateUserFinalRating is defined, so we use rating-based rankings.
    // Placeholder variables — filled in below.
    let departmentTopPerformers: any[] = []
    let divisionTopPerformers: any[] = []

    // Legacy top/least performers - will be populated after ratings are calculated
    let topPerformers: any[] = []
    let leastPerformers: any[] = []

    // Trend data (last 7 days)
    const trendData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const completedByDate = targets.filter(t =>
        t.status === 'COMPLETED' &&
        t.completedAt &&
        new Date(t.completedAt) <= date
      ).length
      trendData.push({
        date: dateStr,
        completed: completedByDate,
      })
    }

    // Risk indicators
    const blockedTasks = statusCounts.BLOCKED
    const criticalTasks = statusCounts.OVERDUE

    // Engagement - users who logged in within the last 7 days
    const activeUsers = filteredUsers.filter((u: any) =>
      u.lastLoginAt && new Date(u.lastLoginAt) >= oneWeekAgo
    ).length

    // Department-specific tasks for the current user
    let departmentTasks: { total: number; completed: number; completionRate: number } | undefined
    if (currentUser && userDepartmentId) {
      const deptTargets = targets.filter((t: any) => {
        const targetDeptId = t.responsible?.department?.id || t.responsible?.departmentId
        return targetDeptId === userDepartmentId
      })
      
      const deptCompleted = deptTargets.filter((t: { status: string }) => t.status === 'COMPLETED').length
      const deptTotal = deptTargets.length
      
      departmentTasks = {
        total: deptTotal,
        completed: deptCompleted,
        completionRate: deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100 * 10) / 10 : 0,
      }
    }

    // Performance Agreement Statistics
    const totalStaff = filteredUsers.length
    const uniqueUsersWithAgreements = new Set(performanceAgreements.map((a: any) => a.userId)).size
    const submittedAgreements = performanceAgreements.filter((a: any) => 
      a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED'
    ).length
    const pendingApprovals = performanceAgreements.filter((a: any) => a.approvalStatus === 'PENDING').length
    const approvedAgreements = performanceAgreements.filter((a: any) => a.approvalStatus === 'APPROVED').length
    
    // ============================================================
    // MULTI-COMPONENT RATING CALCULATION (matches my-rate API)
    // ============================================================
    // The my-rate API calculates a finalRating using 5 weighted components:
    //   1. Performance Agreement Rating (weighted avg of approved agreements)
    //   2. Ad-Hoc Tasks Rating (completion rate * 5)
    //   3. Projects Rating (placeholder - no data yet)
    //   4. Risk Management Rating (placeholder - no data yet)
    //   5. Audit Rating (placeholder - no data yet)
    // Then: finalRating = (comp1*w1 + comp2*w2 + ... + comp5*w5) / 100
    
    // Use ALL approved agreements (rated + unrated) to match my-rate API formula
    // Unrated agreements contribute 0 to score but their weight counts in denominator
    const allApprovedAgreements = performanceAgreements.filter((a: any) => a.approvalStatus === 'APPROVED')
    
    // Default weights — match my-rate/route.ts defaults: PA=75%, 360=25%
    // (period-level weights like adhocWeight/rating360Weight are org overrides but
    //  individual UserTaskWeight records always take priority per user)
    const defaultAdhocWeight = 0
    const defaultProjectsWeight = 0
    const defaultRiskWeight = 0
    const default360Weight = 25
    const defaultAuditWeight = 0
    const defaultPerfWeight = 75

    // Build userId → averageRating map from Rating360 records
    const rating360ByUserId = new Map<string, number>()
    ;(allRating360Records as any[]).forEach((r: any) => {
      if (r.averageRating != null) {
        rating360ByUserId.set(r.userId, Number(r.averageRating))
      } else if (r.selfRating != null) {
        // Fall back to selfRating if averageRating not yet computed
        rating360ByUserId.set(r.userId, Number(r.selfRating))
      }
    })
    
    // Calculate the full multi-component rating for a given user (same formula as my-rate API)
    const calculateUserFinalRating = (userId: string): number => {
      // --- Determine user's weight allocation ---
      let perfWeight = defaultPerfWeight
      let adhocW = defaultAdhocWeight
      let projectsW = defaultProjectsWeight
      let riskW = defaultRiskWeight
      let auditW = defaultAuditWeight
      let w360 = default360Weight
      
      const userWeight = (allUserWeights as any[]).find((w: any) => 
        w.userId === userId && (w.periodId === activePeriod?.id || w.periodId === null)
      )
      if (userWeight) {
        try {
          const categories = JSON.parse(userWeight.categories) as { id: string; weight: number }[]
          const getW = (id: string) => categories.find(c => c.id === id)?.weight ?? 0
          const rawPerf = getW('perf')
          const rawAdhoc = getW('adhoc')
          const rawRisk = getW('risk')
          const rawProject = getW('project')
          const rawAudit = getW('audit')
          const raw360 = getW('rating360')
          const rawTotal = rawPerf + rawAdhoc + rawRisk + rawProject + rawAudit + raw360
          const scale = rawTotal > 0 ? 100 / rawTotal : 0
          perfWeight = Math.round(rawPerf * scale * 100) / 100
          adhocW = Math.round(rawAdhoc * scale * 100) / 100
          projectsW = Math.round(rawProject * scale * 100) / 100
          riskW = Math.round(rawRisk * scale * 100) / 100
          auditW = Math.round(rawAudit * scale * 100) / 100
          w360 = Math.round(raw360 * scale * 100) / 100
        } catch (e) { /* use defaults */ }
      }
      
      // --- Component 1: Performance Agreement Rating (ACTIVE HALF only) ---
      // Only include agreements from the currently active bi-annual rating period.
      // H2 rated agreements during H1 window are carried over (included in H1 pool).
      const userAgreements = allApprovedAgreements.filter((a: any) => {
        if (a.userId !== userId) return false
        if (!a.dueDate) return false
        const m = new Date(a.dueDate).getUTCMonth() + 1
        if (_activeHalfMonths.includes(m)) return true // Active half items always included
        // Carry-over: other half's items that are already rated count in H1 pool
        if (_isH1RatingWindow && a.rating != null && a.rating > 0) return true
        return false
      })
      let perfTotalScore = 0
      let perfTotalWeight = 0
      userAgreements.forEach(a => {
        if (a.weight) {
          perfTotalWeight += a.weight
          if (a.rating) {
            perfTotalScore += a.rating * a.weight
          }
        }
      })
      const perfRating = perfTotalWeight > 0 ? perfTotalScore / perfTotalWeight : 0
      
      // --- Component 2: Ad-Hoc Tasks Rating ---
      const userAdhocTasks = (allAdhocTasks as any[]).filter((t: any) => t.assignedToId === userId)
      const completedAdhoc = userAdhocTasks.filter((t: any) => t.status === 'COMPLETED').length
      const adhocCompletionRate = userAdhocTasks.length > 0 ? completedAdhoc / userAdhocTasks.length : 0
      const adhocRating = adhocCompletionRate * 5
      
      // --- Components 3-5: Projects, Risk, Audit (placeholders - no data yet) ---
      const projectsRating = 0
      const riskRating = 0
      const auditRating = 0

      // --- Component 6: 360° Rating ---
      const rating360Score = rating360ByUserId.get(userId) ?? 0
      
      // --- Final weighted score (same as my-rate API) ---
      const weightedScore = 
        (perfRating * perfWeight) +
        (adhocRating * adhocW) +
        (projectsRating * projectsW) +
        (riskRating * riskW) +
        (auditRating * auditW) +
        (rating360Score * w360)
      
      return weightedScore / 100 // Weights sum to 100%
    }
    
    // Calculate final rating for every user who has any approved agreements, adhoc tasks, or 360 rating
    const allUserIds = [...new Set([
      ...allApprovedAgreements.map((a: any) => a.userId),
      ...(allAdhocTasks as any[]).map((t: any) => t.assignedToId),
      ...(allRating360Records as any[]).filter((r: any) => r.averageRating != null || r.selfRating != null).map((r: any) => r.userId),
    ])]
    
    const userFinalRatings = allUserIds.map((userId: any) => {
      const usr = idToCanonicalUser.get(userId)
      const rating = calculateUserFinalRating(userId)
      console.log(`[RATINGS DEBUG] User ${userId}: rating=${rating}, deptId=${usr?.departmentId}, deptName=${(usr as any)?.departmentName}, department.name=${usr?.department?.name}`)
      return {
        userId,
        rating,
        departmentId: usr?.departmentId,
        departmentName: (usr as any)?.departmentName || usr?.department?.name || null,
      }
    }).filter((u: any) => u.rating > 0)
    
    console.log(`[RATINGS DEBUG] actualUserId: ${actualUserId}, allApproved: ${allApprovedAgreements.length}, usersWithRatings: ${userFinalRatings.length}`)
    console.log(`[RATINGS DEBUG] userFinalRatings:`, userFinalRatings.map(u => ({ userId: u.userId, rating: u.rating, deptId: u.departmentId, deptName: u.departmentName })))
    console.log(`[RATINGS DEBUG] Current user department info - deptId: ${userDepartmentId}, deptNameFromAD: ${userDepartmentNameFromAD}, department.name: ${currentUser?.department?.name}`)

    // Current user's rating (matches my-rate API's finalRating)
    const userAverageRating = Math.round(calculateUserFinalRating(actualUserId) * 100) / 100
    console.log(`[RATINGS DEBUG] userAverageRating for ${actualUserId}: ${userAverageRating}`)

    // Organization average rating - average of all users' final ratings
    const organizationAverageRating = userFinalRatings.length > 0
      ? Math.round((userFinalRatings.reduce((sum: any, u: any) => sum + u.rating, 0) / userFinalRatings.length) * 10) / 10
      : 0
    console.log(`[RATINGS DEBUG] organizationAverageRating: ${organizationAverageRating} (from ${userFinalRatings.length} users)`)

    // Department average rating - match by departmentId OR departmentName
    let departmentAverageRating = 0
    if (currentUser) {
      const deptUserRatings = userFinalRatings.filter((u: any) => {
        if (userDepartmentId && u.departmentId === userDepartmentId) return true
        if (userDepartmentNameFromAD && u.departmentName === userDepartmentNameFromAD) return true
        return false
      })
      console.log(`[RATINGS DEBUG] Department filter - userDepartmentId: ${userDepartmentId}, userDepartmentNameFromAD: ${userDepartmentNameFromAD}`)
      console.log(`[RATINGS DEBUG] deptUserRatings matched: ${deptUserRatings.length}`, deptUserRatings.map(u => ({ userId: u.userId, rating: u.rating })))
      departmentAverageRating = deptUserRatings.length > 0
        ? Math.round((deptUserRatings.reduce((sum: any, u: any) => sum + u.rating, 0) / deptUserRatings.length) * 10) / 10
        : 0
      console.log(`[RATINGS DEBUG] departmentAverageRating: ${departmentAverageRating}`)
    }

    // Division average rating - based on divisionName field from Entra AD
    let divisionAverageRating = 0
    if (currentUser && userDivisionName) {
      const divUserRatings = userFinalRatings.filter((u: any) => {
        const user = idToCanonicalUser.get(u.userId)
        return (user as any)?.divisionName === userDivisionName
      })
      divisionAverageRating = divUserRatings.length > 0
        ? Math.round((divUserRatings.reduce((sum: any, u: any) => sum + u.rating, 0) / divUserRatings.length) * 10) / 10
        : 0
    }

    // Build set of user IDs who have performance agreements (needed for rankings and department stats)
    const userIdsWithAgreements = new Set(performanceAgreements.map((a: any) => a.userId))

    // ---- Rating-based department rankings (same department only for regular users) ----
    // Each user in the current user's department, ranked by their final rating
    const currentUserDeptName = userDepartmentNameFromAD || currentUser?.department?.name
    console.log(`[DEPT DEBUG] Current user dept: ${currentUserDeptName}, userDepartmentNameFromAD: ${userDepartmentNameFromAD}, currentUser?.department?.name: ${currentUser?.department?.name}`)
    console.log(`[DEPT DEBUG] Total users: ${filteredUsers.length}, Users with agreements: ${userIdsWithAgreements.size}`)
    
    if (currentUserDeptName) {
      // Find all users in the same department (by AD departmentName or departmentId)
      const sameDeptUsers = filteredUsers.filter((u: any) => {
        const uDeptName = u.departmentName || u.department?.name
        return uDeptName === currentUserDeptName
      })
      console.log(`[DEPT DEBUG] Found ${sameDeptUsers.length} users in same department`)

      departmentTopPerformers = sameDeptUsers
        .map((u: any) => {
          const rating = calculateUserFinalRating(u.id)
          const ratingPct = Math.round((rating / 5) * 100)
          return {
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
            role: u.jobTitle || u.position || (u.roles?.[0]?.role?.name) || 'Staff',
            completionRate: ratingPct,
            rating,
          }
        })
        .filter((p: any) => p.name)
        .sort((a: any, b: any) => b.rating - a.rating)
    }

    // Division-level rankings — same approach but by divisionName
    if (userDivisionName) {
      const sameDivUsers = filteredUsers.filter((u: any) => u.divisionName === userDivisionName)

      divisionTopPerformers = sameDivUsers
        .map((u: any) => {
          const rating = calculateUserFinalRating(u.id)
          const ratingPct = Math.round((rating / 5) * 100)
          return {
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
            role: u.jobTitle || u.position || (u.roles?.[0]?.role?.name) || 'Staff',
            completionRate: ratingPct,
            rating,
          }
        })
        .filter((p: any) => p.name)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 10)
    }

    // Organization-level rankings — ALL users across the entire organization, ranked by rating
    organizationPerformers = filteredUsers
      .map((u: any) => {
        const rating = calculateUserFinalRating(u.id)
        const ratingPct = Math.round((rating / 5) * 100)
        return {
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          role: u.jobTitle || u.position || (u.roles?.[0]?.role?.name) || 'Staff',
          completionRate: ratingPct,
          rating,
        }
      })
      .filter((p: any) => p.name && p.name.trim() !== '')
      .sort((a: any, b: any) => b.rating - a.rating)
    
    organizationTopPerformers = organizationPerformers.slice(0, 50) // Top 50 for organization-wide view
    
    // Populate legacy performers for backward compatibility
    topPerformers = organizationTopPerformers.slice(0, 10)
    leastPerformers = organizationPerformers.slice(-10).reverse()

    // Calculate rating breakdown weights
    const adhocWeight = activePeriod?.adhocWeight || 0
    const projectsWeight = activePeriod?.projectsWeight || 0
    const riskWeight = activePeriod?.riskManagementWeight || 0
    const workplanWeight = 100 - adhocWeight - projectsWeight - riskWeight

    // Department stats — include ALL users per department (not just those with agreements)
    // Also collect departmentName from AD (User.departmentName) for departments not in the Department table
    const deptNameMap = new Map<string, { userIds: Set<string> }>()

    // Build map from ALL users (not just those with agreements)
    for (const u of filteredUsers as any[]) {
      // Use AD departmentName first, fall back to department relation
      const deptName = (u as any).departmentName || u.department?.name
      if (!deptName) continue
      if (!deptNameMap.has(deptName)) {
        deptNameMap.set(deptName, { userIds: new Set() })
      }
      deptNameMap.get(deptName)!.userIds.add(u.id)
    }

    console.log(`[DEPT DEBUG] deptNameMap size: ${deptNameMap.size}, departments found: ${Array.from(deptNameMap.keys()).join(', ')}`)
    
    const departmentStats = Array.from(deptNameMap.entries()).map(([deptName, data]) => {
      const deptUserIds = data.userIds
      const deptAgreements = performanceAgreements.filter(a => deptUserIds.has(a.userId))

      // Complete: users where ALL their agreements are APPROVED (1 point per person)
      const deptAllUsers = Array.from(deptUserIds)
      const approved = deptAllUsers.filter((uid: any) => {
        const ua = deptAgreements.filter((a: any) => a.userId === uid)
        return ua.length > 0 && ua.every((a: any) => a.approvalStatus === 'APPROVED')
      }).length

      // Incomplete: users with agreements but NOT all approved, OR no agreements
      const totalUsersInDept = deptUserIds.size
      const incomplete = totalUsersInDept - approved

      // Overdue
      let overdue = 0
      if (activePeriod?.submissionDeadline) {
        const deadline = new Date(activePeriod.submissionDeadline)
        if (now > deadline) {
          overdue = incomplete
        }
      }

      const submitted = deptAgreements.filter((a: any) =>
        a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED'
      ).length

      // Average rating for the department (using multi-component formula)
      const deptRatings = Array.from(deptUserIds).map((uid: any) => calculateUserFinalRating(uid)).filter((r: any) => r > 0)
      const avgRating = deptRatings.length > 0
        ? Math.round((deptRatings.reduce((s: any, r: any) => s + r, 0) / deptRatings.length) * 10) / 10
        : 0
      // Convert 0-5 rating to percentage (0-100)
      const ratingPercentage = Math.round((avgRating / 5) * 100)

      console.log(`[DEPT DEBUG] ${deptName}: ${deptUserIds.size} users, ${deptRatings.length} with ratings, avgRating: ${avgRating}`)

      return {
        name: deptName,
        submitted,
        total: totalUsersInDept,
        percentage: ratingPercentage,
        avgRating,
        usersRated: deptRatings.length,
        approved,
        pending: incomplete,
        notStarted: incomplete,
        overdue,
      }
    })
    .filter((d: any) => d.total > 0)
    .sort((a: any, b: any) => b.avgRating - a.avgRating)
    
    console.log(`[DEPT DEBUG] Final departmentStats count: ${departmentStats.length}`)

    // Build per-department individual person scores (for clickable dept card popup)
    const departmentPersonStats: Record<string, Array<{
      id: string
      name: string
      jobTitle: string
      rating: number
      ratingPct: number
      agreementCount: number
      allApproved: boolean
    }>> = {}

    for (const [deptName, data] of deptNameMap.entries()) {
      const deptUserIds = data.userIds
      departmentPersonStats[deptName] = Array.from(deptUserIds).map((uid: any) => {
        const u = idToCanonicalUser.get(uid) as any
        if (!u) return null
        const rating = calculateUserFinalRating(uid)
        const ratingPct = Math.round((rating / 5) * 100)
        const userAgreements = performanceAgreements.filter((a: any) => a.userId === uid)
        const allApproved = userAgreements.length > 0 && userAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
        return {
          id: uid,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          jobTitle: u.jobTitle || u.position || '',
          rating: Math.round(rating * 100) / 100,
          ratingPct,
          agreementCount: userAgreements.length,
          allApproved,
        }
      }).filter((x: any): x is NonNullable<typeof x> => x !== null).sort((a: any, b: any) => b.ratingPct - a.ratingPct)
    }

    // Division stats for agreements - not available (Division model doesn't exist)
    const divisionStats: any[] = []

    // Organization-level summary — person-level counts (1 point per person, not per agreement row)
    // Complete: user has >=1 agreement AND all are APPROVED
    const orgCompletePersons = filteredUsers.filter((u: any) => {
      const ua = performanceAgreements.filter((a: any) => a.userId === u.id)
      return ua.length > 0 && ua.every((a: any) => a.approvalStatus === 'APPROVED')
    })
    // Incomplete: user has >=1 agreement but NOT all approved, OR has no agreements at all
    const orgIncompletePersons = filteredUsers.filter((u: any) => {
      const ua = performanceAgreements.filter((a: any) => a.userId === u.id)
      return ua.length === 0 || !ua.every((a: any) => a.approvalStatus === 'APPROVED')
    })
    // Overdue: user has any agreement past due date that is not approved
    const orgOverduePersons = filteredUsers.filter((u: any) => {
      const ua = performanceAgreements.filter((a: any) => a.userId === u.id)
      return ua.some((a: any) => {
        const dueDate = (a as any).dueDate
        if (!dueDate) return false
        return new Date(dueDate) < now && a.approvalStatus !== 'APPROVED'
      })
    })

    const organizationStats = [{
      name: 'Organization',
      submitted: uniqueUsersWithAgreements,
      total: totalStaff,
      percentage: totalStaff > 0 ? Math.round((uniqueUsersWithAgreements / totalStaff) * 100) : 0,
      approved: orgCompletePersons.length,
      pending: orgIncompletePersons.length,
      notStarted: totalStaff - uniqueUsersWithAgreements,
      overdue: orgOverduePersons.length,
    }]

    // Level-specific metrics for current user's context
    let divisionMetrics = null
    let departmentMetrics = null

    // Resolve department name: use AD departmentName, department relation, or extract from jobTitle
    // e.g. 'EXECUTIVE:IT & DATA MANAGEMENT' -> 'IT & Data Management'
    const extractDeptFromJobTitle = (jt: string): string | null => {
      if (!jt) return null
      const upper = jt.toUpperCase()
      if (upper.includes('EXECUTIVE:')) {
        const raw = jt.split(':')[1]?.trim()
        return raw || null
      }
      return null
    }
    const jobTitleDept = extractDeptFromJobTitle((currentUser as any)?.jobTitle || sessionJobTitle)
    const resolvedDeptName = userDepartmentNameFromAD || currentUser?.department?.name || jobTitleDept

    // Build email→Set<id> map from ALL users (including ghost-filtered ones) so that merged
    // users like Henok whose agreement-holding record is a ghost account are still found.
    const emailToIds = new Map<string, Set<string>>()
    for (const u of users as any[]) {
      const emailKey = (u.email || '').toLowerCase()
      if (!emailKey) continue
      if (!emailToIds.has(emailKey)) emailToIds.set(emailKey, new Set())
      emailToIds.get(emailKey)!.add(u.id)
    }
    // Helper: get all DB IDs for a user (handles merged accounts)
    const getAllIdsForUser = (u: any): Set<string> => {
      const emailKey = (u.email || '').toLowerCase()
      return emailToIds.get(emailKey) || new Set([u.id])
    }

    // Helper to deduplicate a PersonSummary list by name, keeping the record with more data
    const deduplicateByName = (list: any[]) => {
      const nameMap = new Map<string, any>()
      for (const p of list) {
        const key = (p.name || '').trim().toLowerCase()
        if (!key) continue
        const existing = nameMap.get(key)
        if (!existing) {
          nameMap.set(key, p)
        } else {
          const existingScore = (existing.jobTitle ? 1 : 0) + (existing.departmentName ? 1 : 0)
          const newScore = (p.jobTitle ? 1 : 0) + (p.departmentName ? 1 : 0)
          if (newScore > existingScore) nameMap.set(key, p)
        }
      }
      return Array.from(nameMap.values())
    }

    // Helper to build a person summary object - checks ALL merged user IDs for agreements
    const personSummary = (u: any, agreements: any[]) => {
      const allIds = getAllIdsForUser(u)
      const userAgreements = agreements.filter((a: any) => allIds.has(a.userId))
      const allApproved = userAgreements.length > 0 && userAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
      return {
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        jobTitle: u.jobTitle || u.position || '',
        departmentName: u.departmentName || u.department?.name || '',
        divisionName: u.divisionName || '',
        agreementCount: userAgreements.length,
        allApproved,
      }
    }

    // Department-level metrics (using departmentId OR AD departmentName)
    if (currentUser && (userDepartmentId || resolvedDeptName)) {
      // Match users by departmentId first, fallback to AD departmentName
      const deptUsers = filteredUsers.filter((u: any) => {
        if (userDepartmentId && u.departmentId === userDepartmentId) return true
        if (resolvedDeptName) {
          const rdn = resolvedDeptName.toLowerCase()
          const udn = ((u as any).departmentName || u.department?.name || '').toLowerCase()
          if (udn && udn === rdn) return true
        }
        return false
      })
      const deptUserIds = new Set(deptUsers.map((u: any) => u.id))
      // Also include all merged IDs for dept users so agreements under old/merged IDs are found
      const deptAllIds = new Set<string>()
      for (const u of deptUsers as any[]) {
        for (const id of getAllIdsForUser(u)) deptAllIds.add(id)
      }
      const deptAgreements = performanceAgreements.filter((a: any) => deptAllIds.has(a.userId))
      const deptSubmitted = deptAgreements.filter((a: any) => 
        a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED'
      ).length

      // Person-level completion: a person's agreement is complete only when ALL their actions are approved
      // Use all merged IDs for each user
      const deptCompleteUsers = deptUsers.filter((u: any) => {
        const allIds = getAllIdsForUser(u)
        const userAgreements = deptAgreements.filter((a: any) => allIds.has(a.userId))
        return userAgreements.length > 0 && userAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
      })
      const deptIncompleteUsers = deptUsers.filter((u: any) => !deptCompleteUsers.find((c: any) => c.id === u.id))
      
      departmentMetrics = {
        totalStaff: deptUsers.length,
        submittedAgreements: deptSubmitted,
        pendingApprovals: deptIncompleteUsers.length,
        approvedAgreements: deptCompleteUsers.length,
        submissionRate: deptUsers.length > 0 ? Math.round((deptSubmitted / deptUsers.length) * 100) : 0,
        approvalRate: deptUsers.length > 0 ? Math.round((deptCompleteUsers.length / deptUsers.length) * 100) : 0,
        staffList: deduplicateByName(deptUsers.map((u: any) => personSummary(u, deptAgreements))),
        completeList: deduplicateByName(deptCompleteUsers.map((u: any) => personSummary(u, deptAgreements))),
        incompleteList: deduplicateByName(deptIncompleteUsers.map((u: any) => personSummary(u, deptAgreements))),
      }
    }

    // Organisation-level person lists (all users)
    // Complete = user has >=1 agreement AND all are APPROVED (1 point per person)
    // Incomplete = user has >=1 agreement but NOT all approved (1 point per person)
    // Users with zero agreements are excluded from complete/incomplete counts
    // Use all merged IDs for each user
    const orgCompleteUsers = filteredUsers.filter((u: any) => {
      const allIds = getAllIdsForUser(u)
      const userAgreements = performanceAgreements.filter((a: any) => allIds.has(a.userId))
      return userAgreements.length > 0 && userAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
    })
    const orgIncompleteUsers = filteredUsers.filter((u: any) => {
      const allIds = getAllIdsForUser(u)
      const userAgreements = performanceAgreements.filter((a: any) => allIds.has(a.userId))
      return userAgreements.length > 0 && !userAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
    })
    const orgNoAgreementUsers = filteredUsers.filter((u: any) => {
      const allIds = getAllIdsForUser(u)
      return performanceAgreements.filter((a: any) => allIds.has(a.userId)).length === 0
    })
    const orgPersonMetrics = {
      totalStaff: filteredUsers.length,
      completeCount: orgCompleteUsers.length,
      incompleteCount: orgIncompleteUsers.length + orgNoAgreementUsers.length,
      staffList: deduplicateByName(filteredUsers.map((u: any) => personSummary(u, performanceAgreements))),
      completeList: deduplicateByName(orgCompleteUsers.map((u: any) => personSummary(u, performanceAgreements))),
      incompleteList: deduplicateByName([...orgIncompleteUsers, ...orgNoAgreementUsers].map((u: any) => personSummary(u, performanceAgreements))),
    }

    // Division-level metrics (using AD divisionName)
    if (currentUser && userDivisionName) {
      const divUsers = filteredUsers.filter((u: any) => (u as any).divisionName === userDivisionName)
      const divUserIds = new Set(divUsers.map((u: any) => u.id))
      const divAgreements = performanceAgreements.filter((a: any) => divUserIds.has(a.userId))
      const divSubmitted = divAgreements.filter((a: any) => 
        a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED'
      ).length
      const divPending = divAgreements.filter((a: any) => a.approvalStatus === 'PENDING').length
      const divApproved = divAgreements.filter((a: any) => a.approvalStatus === 'APPROVED').length
      
      divisionMetrics = {
        totalStaff: divUsers.length,
        submittedAgreements: divSubmitted,
        pendingApprovals: divPending,
        approvedAgreements: divApproved,
        submissionRate: divUsers.length > 0 ? Math.round((divSubmitted / divUsers.length) * 100) : 0,
        approvalRate: divSubmitted > 0 ? Math.round((divApproved / divSubmitted) * 100) : 0,
      }
    }

    return NextResponse.json({
      // User role and permissions
      canSeeAllLevels,
      userRole,
      
      // Personal stats for current user (for regular users to see their own progress)
      personalStats: {
        totalAgreements: userTotalAgreements,
        approved: userApprovedCount,
        pending: userPendingCount,
        complete: userCompleteCount,
        incomplete: userIncompleteCount,
        overdue: userOverdueCount,
      },
      
      // Performance Agreement Stats (organization-wide, person-level counts — always org-wide)
      totalStaff: totalStaff,
      // Person-level: 1 point per user who has at least one agreement
      submittedAgreements: uniqueUsersWithAgreements,
      // Person-level: users whose ALL agreements are approved
      approvedAgreements: (() => {
        const usersWithAny = new Set(performanceAgreements.map((a: any) => a.userId))
        return Array.from(usersWithAny).filter(uid =>
          performanceAgreements.filter((a: any) => a.userId === uid).every((a: any) => a.approvalStatus === 'APPROVED')
        ).length
      })(),
      // Person-level: users who have at least one agreement NOT yet approved
      pendingApprovals: (() => {
        const usersWithAny = new Set(performanceAgreements.map((a: any) => a.userId))
        const usersAllApproved = Array.from(usersWithAny).filter(uid =>
          performanceAgreements.filter((a: any) => a.userId === uid).every((a: any) => a.approvalStatus === 'APPROVED')
        ).length
        return usersWithAny.size - usersAllApproved
      })(),
      averageCompletion: Math.round(completionRate),
      overdueSubmissions: canSeeAllLevels ? orgOverduePersons.length : userOverdueCount,
      averageRating: organizationAverageRating,
      userAverageRating,
      departmentAverageRating,
      divisionAverageRating,
      userContext: {
        departmentId: userDepartmentId,
        divisionId: userDivisionName, // Use divisionName as the identifier (from Entra AD)
        departmentName: currentUser?.department?.name || resolvedDeptName,
        divisionName: userDivisionName,
      },
      ratingBreakdown: {
        workplanInitiatives: workplanWeight,
        adhocTasks: adhocWeight,
        projects: projectsWeight,
        riskManagement: riskWeight,
      },
      departmentStats,
      departmentPersonStats,
      divisionStats,
      organizationStats,
      divisionMetrics,
      departmentMetrics,
      orgPersonMetrics,
      rankings: {
        organization: organizationTopPerformers.map(p => ({
          name: p.name,
          completionRate: p.completionRate,
          position: p.role,
        })),
        department: departmentTopPerformers.map((p: any) => ({
          name: p.name,
          completionRate: p.completionRate,
          position: p.role,
        })),
        division: divisionTopPerformers.map((p: any) => ({
          name: p.name,
          completionRate: p.completionRate,
          position: p.role,
        })),
      },
      // Legacy fields for backward compatibility
      totals: {
        goals: goalsCount,
        objectives: objectivesCount,
        initiatives: initiativesCount,
        targets: targetsCount,
      },
      statusBreakdown: statusCounts,
      overdue: statusCounts.OVERDUE,
      completionRate: Math.round(completionRate * 10) / 10,
      departmentTasks,
      strategic: {
        goalCompletionRate: Math.round(goalCompletionRate),
        completedGoals,
        totalGoals: goalsCount,
      },
      timeline: {
        tasksDueThisWeek,
        tasksDueThisMonth,
      },
      overallNSA,
      departments: departmentPerformance,
      divisions: divisionPerformance,
      topPerformers,
      leastPerformers,
      trends: trendData,
      risks: {
        blockedTasks,
        criticalTasks,
      },
      engagement: {
        activeUsers,
        totalUsers: filteredUsers.length,
        engagementRate: filteredUsers.length > 0 ? Math.round((activeUsers / filteredUsers.length) * 100) : 0,
      },
      initiatives: {
        total: userInitiatives.length,
        completed: initiativeStatusCounts.COMPLETED,
        inProgress: initiativeStatusCounts.IN_PROGRESS,
        notStarted: initiativeStatusCounts.NOT_STARTED,
        blocked: initiativeStatusCounts.BLOCKED,
        completionRate: initiativeCompletionRate,
      },
    })
  } catch (error) {
    console.error('❌ [DASHBOARD STATS ERROR] Failed to fetch dashboard stats:', error)
    console.error('❌ [DASHBOARD STATS ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ [DASHBOARD STATS ERROR] Error message:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
