import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve canonical user ID by email (oldest DB record wins).
    // Executives and other ghost-account holders have their agreements stored
    // under the canonical ID, not necessarily the session token ID.
    const canonicalDbUser = authUser.email ? await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    }) : null
    const userId = canonicalDbUser?.id || authUser.id

    // Fetch active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        adhocWeight: true,
        projectsWeight: true,
        riskManagementWeight: true,
        rating360Weight: true
      }
    })

    // Check for user-specific weight allocations first
    let userWeights: any = null
    try {
      userWeights = await prisma.userTaskWeight.findFirst({
        where: {
          userId: userId,
          periodId: activePeriod?.id || null
        }
      })
      if (!userWeights && activePeriod?.id) {
        userWeights = await prisma.userTaskWeight.findFirst({
          where: {
            userId: userId,
            periodId: null
          }
        })
      }
    } catch (e) {
      // userTaskWeight table may not exist yet
    }

    // All weight budget goes to user-configurable categories (including 360°)
    const userBudget = 100

    // User-configurable weights (including rating360) are taken directly from saved categories
    let performanceAgreementWeight: number
    let adhocWeight: number
    let projectsWeight: number
    let riskManagementWeight: number
    let auditWeight: number
    let rating360Weight: number

    // Track all categories (including custom ones) for dynamic rendering
    let allCategories: { id: string; name: string; weight: number }[] = []

    if (userWeights) {
      const categories = JSON.parse(userWeights.categories) as { id: string; name: string; weight: number }[]
      allCategories = categories
      const getWeight = (id: string) => categories.find(c => c.id === id)?.weight ?? 0
      performanceAgreementWeight = getWeight('perf')
      adhocWeight = getWeight('adhoc')
      riskManagementWeight = getWeight('risk')
      projectsWeight = getWeight('project')
      auditWeight = getWeight('audit')
      rating360Weight = getWeight('rating360')
    } else {
      // Default weights: PA=75%, 360=25%
      performanceAgreementWeight = 75
      adhocWeight = 0
      projectsWeight = 0
      riskManagementWeight = 0
      auditWeight = 0
      rating360Weight = 25
      allCategories = [
        { id: 'perf', name: 'Performance Agreement Tasks', weight: performanceAgreementWeight },
        { id: 'adhoc', name: 'Ad-Hoc', weight: adhocWeight },
        { id: 'risk', name: 'Risk Tasks', weight: riskManagementWeight },
        { id: 'project', name: 'Project Tasks', weight: projectsWeight },
        { id: 'audit', name: 'Audit Tasks', weight: auditWeight },
        { id: 'rating360', name: '360 Degree Rating', weight: rating360Weight },
      ]
    }

    // ============================================
    // COMPONENT 1: PERFORMANCE AGREEMENT RATING
    // ============================================
    // Fetch ALL approved performance agreement initiatives (rated + unrated, excluding containers)
    const allPerformanceAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: userId,
        approvalStatus: 'APPROVED',
        isAdhocContainer: false // Only real performance agreement initiatives
      },
      select: {
        id: true,
        rating: true,
        weight: true,
        title: true,
        dueDate: true,
        initiative: {
          select: {
            title: true
          }
        }
      }
    })
    
    console.log(`[MY-RATE DEBUG] User ${userId} (session: ${authUser.id}, email: ${authUser.email})`)
    console.log(`[MY-RATE DEBUG] Found ${allPerformanceAgreements.length} approved performance agreements`)
    console.log(`[MY-RATE DEBUG] Agreements with ratings: ${allPerformanceAgreements.filter(a => a.rating).length}`)
    if (allPerformanceAgreements.length > 0) {
      console.log(`[MY-RATE DEBUG] Sample agreement:`, {
        id: allPerformanceAgreements[0].id,
        title: allPerformanceAgreements[0].title,
        rating: allPerformanceAgreements[0].rating,
        weight: allPerformanceAgreements[0].weight
      })
    }

    // ── Active bi-annual half determination ──
    // H1 performance period: Apr-Sep (months 4-9). Rating window: Oct-Mar.
    // H2 performance period: Oct-Mar (months 10-12,1-3). Rating window: Apr-Sep.
    // Use only the active half's agreements for the dashboard rating.
    const _nowMonth = new Date().getUTCMonth() + 1 // 1-12
    const _H1_PERF_MONTHS = [4, 5, 6, 7, 8, 9]
    const _H2_PERF_MONTHS = [10, 11, 12, 1, 2, 3]
    const isH1RatingWindow = _H2_PERF_MONTHS.includes(_nowMonth) // Oct-Mar = H1 rating window
    const activeHalfMonths = isH1RatingWindow ? _H1_PERF_MONTHS : _H2_PERF_MONTHS
    const activeHalf = isH1RatingWindow ? 'H1' : 'H2'

    // Effective agreements = active half items + rated carry-overs from the other half
    const effectiveAgreements = allPerformanceAgreements.filter(a => {
      if (!a.dueDate) return false
      const d = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
      const m = d.getUTCMonth() + 1
      if (activeHalfMonths.includes(m)) return true
      // Carry-over: other half's rated agreements count in the active pool
      if (a.rating != null && a.rating > 0) return true
      return false
    })

    // Calculate weighted average rating using EFFECTIVE agreements only
    let performanceAgreementTotalScore = 0
    let performanceAgreementTotalWeight = 0
    effectiveAgreements.forEach(agreement => {
      if (agreement.weight) {
        performanceAgreementTotalWeight += agreement.weight
        if (agreement.rating) {
          performanceAgreementTotalScore += agreement.rating * agreement.weight
        }
      }
    })
    const performanceAgreementRating = performanceAgreementTotalWeight > 0 
      ? performanceAgreementTotalScore / performanceAgreementTotalWeight 
      : 0
    const ratedAgreements = effectiveAgreements.filter(a => a.rating !== null && a.rating !== undefined)

    // ============================================
    // COMPONENT 2: AD-HOC TASKS RATING
    // ============================================
    const allAdhocTasks = await prisma.adhocTask.findMany({
      where: {
        assignedToId: userId,
        approvalStatus: 'APPROVED'
      },
      select: {
        id: true,
        title: true,
        status: true
      }
    })

    const completedAdhocTasks = allAdhocTasks.filter(task => task.status === 'COMPLETED')
    const adhocCompletionRate = allAdhocTasks.length > 0 
      ? completedAdhocTasks.length / allAdhocTasks.length 
      : 0
    const adhocRating = adhocCompletionRate * 5 // Rating out of 5

    // Update ad-hoc container
    let adhocContainer = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        isAdhocContainer: true,
        title: 'Ad-hoc Tasks'
      }
    })

    if (adhocContainer) {
      await prisma.performanceAgreement.update({
        where: { id: adhocContainer.id },
        data: { rating: allAdhocTasks.length > 0 ? Math.round(adhocRating * 10) / 10 : null }
      })
    }

    // ============================================
    // COMPONENT 3: PROJECTS RATING
    // ============================================
    // TODO: Replace with actual project task model when available
    // For now, using placeholder - you'll need to create a ProjectTask model
    const allProjectTasks: any[] = [] // await prisma.projectTask.findMany(...)
    const completedProjectTasks = allProjectTasks.filter(task => task.status === 'COMPLETED')
    const projectsCompletionRate = allProjectTasks.length > 0 
      ? completedProjectTasks.length / allProjectTasks.length 
      : 0
    const projectsRating = projectsCompletionRate * 5

    // Update projects container
    let projectsContainer = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        isAdhocContainer: true,
        title: 'Projects'
      }
    })

    if (projectsContainer) {
      await prisma.performanceAgreement.update({
        where: { id: projectsContainer.id },
        data: { rating: allProjectTasks.length > 0 ? Math.round(projectsRating * 10) / 10 : null }
      })
    }

    // ============================================
    // COMPONENT 4: RISK MANAGEMENT RATING
    // ============================================
    // TODO: Replace with actual risk management task model when available
    const allRiskTasks: any[] = [] // await prisma.riskTask.findMany(...)
    const completedRiskTasks = allRiskTasks.filter(task => task.status === 'COMPLETED')
    const riskCompletionRate = allRiskTasks.length > 0 
      ? completedRiskTasks.length / allRiskTasks.length 
      : 0
    const riskManagementRating = riskCompletionRate * 5

    // Update risk management container
    let riskContainer = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        isAdhocContainer: true,
        title: 'Risk Management'
      }
    })

    if (riskContainer) {
      await prisma.performanceAgreement.update({
        where: { id: riskContainer.id },
        data: { rating: allRiskTasks.length > 0 ? Math.round(riskManagementRating * 10) / 10 : null }
      })
    }

    // ============================================
    // COMPONENT 5: AUDIT TASKS RATING
    // ============================================
    // TODO: Replace with actual audit task model when available
    const allAuditTasks: any[] = [] // await prisma.auditTask.findMany(...)
    const completedAuditTasks = allAuditTasks.filter(task => task.status === 'COMPLETED')
    const auditCompletionRate = allAuditTasks.length > 0
      ? completedAuditTasks.length / allAuditTasks.length
      : 0
    const auditRating = auditCompletionRate * 5

    // ============================================
    // COMPONENT 6: 360-DEGREE RATING
    // ============================================
    // Fetch user's most recent 360-degree rating with full breakdown
    // Try COMPLETED first, then fall back to any status
    let rating360 = await prisma.rating360.findFirst({
      where: {
        userId: userId,
        status: 'COMPLETED'
      },
      orderBy: { updatedAt: 'desc' },
      include: { cycle: true, peerRatings: true, subordinateRatings: true }
    })
    if (!rating360) {
      // Fall back to any status (IN_PROGRESS, PENDING) so partial ratings are included
      rating360 = await prisma.rating360.findFirst({
        where: {
          userId: userId
        },
        orderBy: {
          updatedAt: 'desc'
        },
        include: {
          cycle: true,
          peerRatings: true,
          subordinateRatings: true,
        }
      })
    }

    // Compute 360 score from LIVE questionnaire/answer responses first (so clears are reflected immediately)
    // Only fall back to cached averageRating when no live responses exist
    let rating360Score = 0
    if (rating360) {
      // Try live questionnaire responses
      let liveScores: number[] = []
      try {
        const liveResponses = await prisma.questionnaireResponse.findMany({
          where: { rating360Id: rating360.id },
          select: { rating: true }
        })
        liveScores = liveResponses.map((r: any) => Number(r.rating)).filter((n: number) => !isNaN(n) && n > 0)
      } catch (_e) { /* table may not exist */ }

      if (liveScores.length === 0) {
        // Try live Rating360Answer records
        try {
          const liveAnswers = await prisma.rating360Answer.findMany({
            where: { rating360Id: rating360.id },
            select: { rating: true }
          })
          liveScores = liveAnswers.map((a: any) => Number(a.rating)).filter((n: number) => !isNaN(n) && n > 0)
        } catch (_e) { /* table may not exist */ }
      }

      if (liveScores.length > 0) {
        // Use average of live responses (most up-to-date)
        rating360Score = liveScores.reduce((a, b) => a + b, 0) / liveScores.length
      } else {
        // No live responses — try individual field ratings (self, supervisor, peer, subordinate)
        const availableRatings: number[] = []
        if (rating360.selfRating !== null && rating360.selfRating !== undefined) availableRatings.push(Number(rating360.selfRating))
        if (rating360.supervisorRating !== null && rating360.supervisorRating !== undefined) availableRatings.push(Number(rating360.supervisorRating))
        const completedPeers = (rating360 as any).peerRatings?.filter((p: any) => p.rating !== null) || []
        completedPeers.forEach((p: any) => availableRatings.push(Number(p.rating)))
        const completedSubs = (rating360 as any).subordinateRatings?.filter((s: any) => s.rating !== null) || []
        completedSubs.forEach((s: any) => availableRatings.push(Number(s.rating)))
        if (availableRatings.length > 0) {
          rating360Score = availableRatings.reduce((a, b) => a + b, 0) / availableRatings.length
        }
        // averageRating is only used as absolute last resort (stale — avoid if possible)
        else if (rating360.averageRating && availableRatings.length === 0 && liveScores.length === 0) {
          rating360Score = rating360.averageRating
        }
      }
    }

    // Build detailed 360-degree breakdown
    let rating360Detail: any = null
    if (rating360) {
      // Fetch questionnaire responses grouped by competency
      let competencyBreakdown: any[] = []
      let categoryBreakdown: any[] = []
      try {
        const responses = await prisma.questionnaireResponse.findMany({
          where: { rating360Id: rating360.id },
          include: {
            question: {
              include: {
                subsection: true
              }
            }
          }
        })

        const competencyMap: Record<string, { scores: number[]; competency: string }> = {}
        responses.forEach((resp: any) => {
          const competency = resp.question?.subsection?.institutionalValue || resp.question?.subsection?.title || 'General'
          if (!competencyMap[competency]) {
            competencyMap[competency] = { competency, scores: [] }
          }
          competencyMap[competency].scores.push(resp.rating)
        })

        competencyBreakdown = Object.values(competencyMap).map(c => ({
          competency: c.competency,
          averageScore: c.scores.length > 0 ? Math.round((c.scores.reduce((a, b) => a + b, 0) / c.scores.length) * 100) / 100 : null,
          responseCount: c.scores.length,
        }))
      } catch (e) {
        // questionnaireResponse may not exist — fall back to Rating360Answer
      }

      try {
        const answers = await prisma.rating360Answer.findMany({
          where: { rating360Id: rating360.id },
          include: { question: true }
        })

        const categoryMap: Record<string, number[]> = {}
        answers.forEach((ans: any) => {
          const cat = ans.question?.category || 'General'
          if (!categoryMap[cat]) categoryMap[cat] = []
          categoryMap[cat].push(ans.rating)
        })

        categoryBreakdown = Object.entries(categoryMap).map(([category, scores]) => ({
          category,
          averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          responseCount: scores.length,
        }))
      } catch (e) {
        // Rating360Answer may not have data
      }

      const completedSubs = (rating360 as any).subordinateRatings?.filter((s: any) => s.rating !== null) || []

      // NSA core behavioural competencies — always shown even if not yet rated
      const NSA_COMPETENCIES = ['Integrity', 'Excellent Performance', 'Professionalism', 'Accountability', 'Partnership', 'Customer-focussed']

      // Parse per-rater competency scores from stored JSON (from NSA simple form)
      const parseCS360 = (s: string | null | undefined): Record<string, number> => {
        if (!s) return {}
        try { return (JSON.parse(s) as any)?.scores || {} } catch { return {} }
      }
      const parseRaterType360 = (s: string | null | undefined): string => {
        if (!s) return 'dept_random'
        try { return (JSON.parse(s) as any)?.raterType || 'dept_random' } catch { return 'dept_random' }
      }

      const allPeers360 = (rating360 as any).peerRatings || []
      const deptRandomPeer360 = allPeers360.find((p: any) => parseRaterType360(p.comments) === 'dept_random') ?? null
      const orgRandomPeer360 = allPeers360.find((p: any) => parseRaterType360(p.comments) === 'org_random') ?? null

      const selfCS360 = parseCS360((rating360 as any).selfComments)
      const supCS360 = parseCS360((rating360 as any).supervisorComments)
      const deptCS360 = parseCS360(deptRandomPeer360?.comments)
      const orgCS360 = parseCS360(orgRandomPeer360?.comments)

      const compNames360 = [...new Set([
        ...Object.keys(selfCS360), ...Object.keys(supCS360), ...Object.keys(deptCS360), ...Object.keys(orgCS360),
        ...NSA_COMPETENCIES,
      ])]
      compNames360.sort((a, b) => {
        const ai = NSA_COMPETENCIES.indexOf(a); const bi = NSA_COMPETENCIES.indexOf(b)
        if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1
        return ai - bi
      })

      const competencyDetail360 = compNames360.map(comp => {
        const self = selfCS360[comp] ?? null
        const sup = supCS360[comp] ?? null
        const deptRandom = deptCS360[comp] ?? null
        const orgRandom = orgCS360[comp] ?? null
        const allVals = [self, sup, deptRandom, orgRandom].filter((v): v is number => v !== null)
        return {
          competency: comp,
          selfScore: self,
          supervisorScore: sup,
          deptRandomScore: deptRandom,
          orgRandomScore: orgRandom,
          overallAvg: allVals.length > 0 ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length * 100) / 100 : null,
        }
      })

      rating360Detail = {
        cycleName: (rating360 as any).cycle?.name || 'N/A',
        selfRating: rating360.selfRating,
        supervisorRating: rating360.supervisorRating,
        deptRandomRating: deptRandomPeer360?.rating ?? null,
        orgRandomRating: orgRandomPeer360?.rating ?? null,
        averageRating: rating360.averageRating,
        status: rating360.status,
        selfStatus: rating360.selfRating !== null ? 'Completed' : 'Pending',
        supervisorStatus: rating360.supervisorRating !== null ? 'Completed' : 'Pending',
        deptRandomStatus: deptRandomPeer360 ? (deptRandomPeer360.rating !== null ? 'Completed' : 'Pending') : 'Not assigned',
        orgRandomStatus: orgRandomPeer360 ? (orgRandomPeer360.rating !== null ? 'Completed' : 'Pending') : 'Not assigned',
        subordinateAverage: completedSubs.length > 0
          ? Math.round((completedSubs.reduce((sum: number, s: any) => sum + s.rating, 0) / completedSubs.length) * 100) / 100
          : null,
        subordinateCount: completedSubs.length,
        competencyBreakdown,
        categoryBreakdown,
        competencyDetail: competencyDetail360,
      }
    }

    // ============================================
    // FINAL RATING: WEIGHTED AVERAGE OF ALL COMPONENTS (including 360°)
    // ============================================
    // Final rating = weighted average based on allocated percentages
    const weightedScore = 
      (performanceAgreementRating * performanceAgreementWeight) +
      (adhocRating * adhocWeight) +
      (projectsRating * projectsWeight) +
      (riskManagementRating * riskManagementWeight) +
      (auditRating * auditWeight) +
      (rating360Score * rating360Weight)
    
    const finalRating = weightedScore / 100 // Weights always sum to 100%

    // Convert to percentage (1-5 scale to 0-100%)
    const finalPercentage = (finalRating / 5) * 100

    console.log(`[MY-RATE DEBUG] Final calculation:`)
    console.log(`  - performanceAgreementRating: ${performanceAgreementRating.toFixed(2)} (weight: ${performanceAgreementWeight}%)`)
    console.log(`  - adhocRating: ${adhocRating.toFixed(2)} (weight: ${adhocWeight}%)`)
    console.log(`  - projectsRating: ${projectsRating.toFixed(2)} (weight: ${projectsWeight}%)`)
    console.log(`  - riskManagementRating: ${riskManagementRating.toFixed(2)} (weight: ${riskManagementWeight}%)`)
    console.log(`  - auditRating: ${auditRating.toFixed(2)} (weight: ${auditWeight}%)`)
    console.log(`  - rating360Score: ${rating360Score.toFixed(2)} (weight: ${rating360Weight}%)`)
    console.log(`  - FINAL RATING: ${finalRating.toFixed(2)} / 5 (${finalPercentage.toFixed(2)}%)`)

    return NextResponse.json({
      // ACTIVE RATING PERIOD
      activeHalf,
      activeHalfLabel: activeHalf === 'H1' ? 'First Half (Apr – Sep)' : 'Second Half (Oct – Mar)',

      // FINAL RATING (1-5 scale)
      finalRating: Number(finalRating.toFixed(2)),
      finalPercentage: Number(finalPercentage.toFixed(2)),

      // WEIGHT ALLOCATIONS
      weights: {
        performanceAgreement: performanceAgreementWeight,
        adhoc: adhocWeight,
        projects: projectsWeight,
        riskManagement: riskManagementWeight,
        audit: auditWeight,
        rating360: rating360Weight
      },

      // COMPONENT BREAKDOWN
      components: {
        performanceAgreement: {
          rating: Number(performanceAgreementRating.toFixed(2)),
          weight: performanceAgreementWeight,
          weightedScore: Number((performanceAgreementRating * performanceAgreementWeight / 100).toFixed(2)),
          initiativesCount: effectiveAgreements.length,
          ratedCount: ratedAgreements.length,
          totalWeight: performanceAgreementTotalWeight
        },
        adhoc: {
          rating: Number(adhocRating.toFixed(2)),
          weight: adhocWeight,
          weightedScore: Number((adhocRating * adhocWeight / 100).toFixed(2)),
          tasksTotal: allAdhocTasks.length,
          tasksCompleted: completedAdhocTasks.length,
          completionRate: Number((adhocCompletionRate * 100).toFixed(2))
        },
        projects: {
          rating: Number(projectsRating.toFixed(2)),
          weight: projectsWeight,
          weightedScore: Number((projectsRating * projectsWeight / 100).toFixed(2)),
          tasksTotal: allProjectTasks.length,
          tasksCompleted: completedProjectTasks.length,
          completionRate: Number((projectsCompletionRate * 100).toFixed(2))
        },
        riskManagement: {
          rating: Number(riskManagementRating.toFixed(2)),
          weight: riskManagementWeight,
          weightedScore: Number((riskManagementRating * riskManagementWeight / 100).toFixed(2)),
          tasksTotal: allRiskTasks.length,
          tasksCompleted: completedRiskTasks.length,
          completionRate: Number((riskCompletionRate * 100).toFixed(2))
        },
        audit: {
          rating: Number(auditRating.toFixed(2)),
          weight: auditWeight,
          weightedScore: Number((auditRating * auditWeight / 100).toFixed(2)),
          tasksTotal: allAuditTasks.length,
          tasksCompleted: completedAuditTasks.length,
          completionRate: Number((auditCompletionRate * 100).toFixed(2))
        },
        rating360: {
          rating: Number(rating360Score.toFixed(2)),
          weight: rating360Weight,
          weightedScore: Number((rating360Score * rating360Weight / 100).toFixed(2)),
          hasCompleted: !!rating360,
          hasAnyRatings: rating360Score > 0
        },
      },

      // ALLOCATED CATEGORIES (for dynamic dashboard rendering) - only those with weight > 0
      categories: allCategories
        .map(c => {
          // Map known IDs to their computed component data
          let rating = 0
          let componentKey = ''
          switch (c.id) {
            case 'perf': rating = Number(performanceAgreementRating.toFixed(2)); componentKey = 'performanceAgreement'; break
            case 'adhoc': rating = Number(adhocRating.toFixed(2)); componentKey = 'adhoc'; break
            case 'project': rating = Number(projectsRating.toFixed(2)); componentKey = 'projects'; break
            case 'risk': rating = Number(riskManagementRating.toFixed(2)); componentKey = 'riskManagement'; break
            case 'audit': rating = Number(auditRating.toFixed(2)); componentKey = 'audit'; break
            default: rating = 0; componentKey = c.id; break // Custom categories default to 0
          }
          return { id: c.id, name: c.name, weight: c.weight, rating, componentKey }
        })
        .filter(c => c.weight > 0),

      // DETAILED BREAKDOWN
      performanceAgreementInitiatives: allPerformanceAgreements.map(a => ({
        id: a.id,
        title: a.initiative?.title || a.title || 'Untitled',
        rating: a.rating,
        weight: a.weight,
        dueDate: a.dueDate
      })),

      // 360-DEGREE DETAILED BREAKDOWN
      rating360Detail,

      // QUARTERLY BREAKDOWN (Financial year: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
      quarterBreakdown: (['Q1','Q2','Q3','Q4'] as const).map(q => {
        const months = q === 'Q1' ? [4,5,6] : q === 'Q2' ? [7,8,9] : q === 'Q3' ? [10,11,12] : [1,2,3]
        const label = q === 'Q1' ? 'Apr – Jun' : q === 'Q2' ? 'Jul – Sep' : q === 'Q3' ? 'Oct – Dec' : 'Jan – Mar'
        const inQuarter = allPerformanceAgreements.filter(a => {
          if (!a.dueDate) return false
          // Use UTC month to avoid timezone shifting items into the wrong quarter
          // (e.g. 2025-07-01T00:00:00+02:00 = 2025-06-30T22:00:00Z → getMonth()+1 = 6, wrong!)
          const d = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
          const m = d.getUTCMonth() + 1
          return months.includes(m)
        })
        const rated = inQuarter.filter(a => a.rating != null && a.rating > 0)
        const totalW = inQuarter.reduce((s, a) => s + (a.weight || 0), 0)
        const ratedW = rated.reduce((s, a) => s + (a.weight || 0), 0)
        const weightedSum = rated.reduce((s, a) => s + ((a.rating || 0) * (a.weight || 0)), 0)
        // Average = sum of ALL ratings (unrated = 0) / total actions in quarter.
        // A quarter with 1/3 rated at 3.0 should show 1.0, NOT 3.0.
        const ratingSum = rated.reduce((s, a) => s + (a.rating || 0), 0)
        const avgRating = inQuarter.length > 0
          ? (rated.length > 0 ? Number((ratingSum / inQuarter.length).toFixed(2)) : null)
          : null
        const weightedScore = totalW > 0 ? Number((weightedSum / (performanceAgreementTotalWeight || 100)).toFixed(2)) : 0
        return { quarter: q, label, total: inQuarter.length, rated: rated.length, totalWeight: totalW, avgRating, weightedScore }
      })
    })
  } catch (error) {
    console.error('Error calculating performance rate:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
