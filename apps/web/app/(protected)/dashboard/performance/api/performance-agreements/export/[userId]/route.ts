import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { user: sessionUser } = await getAuthenticatedUser(req)
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { userId } = params

    // Resolve actual DB user by email (auth token ID may differ)
    let actualSessionUserId = sessionUser.id
    if (sessionUser.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: sessionUser.email },
        select: { id: true }
      })
      if (dbUser) actualSessionUserId = dbUser.id
    }

    console.log('=== Exporting Performance Agreement ===')
    console.log('Target User ID:', userId)
    console.log('Requesting User ID:', actualSessionUserId)

    // Check if the requesting user is authorized to view this user's data
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        managerId: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Allow if requesting user is the target user themselves
    const isOwnData = userId === actualSessionUserId
    
    // Check if requesting user is the direct manager
    const isDirectManager = targetUser.managerId === actualSessionUserId
    
    // Check if requesting user is a supervisor on any of the target's agreements
    const isSupervisorOnAgreement = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        supervisorId: actualSessionUserId
      }
    })
    
    // Check if requesting user is anywhere in the target's management chain (hierarchical)
    let isInManagementChain = false
    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement) {
      // Walk up the management chain from target user
      let currentManagerId = targetUser.managerId
      const visited = new Set<string>()
      while (currentManagerId && !visited.has(currentManagerId)) {
        if (currentManagerId === actualSessionUserId) {
          isInManagementChain = true
          break
        }
        visited.add(currentManagerId)
        const manager = await prisma.user.findUnique({
          where: { id: currentManagerId },
          select: { managerId: true }
        })
        currentManagerId = manager?.managerId || null
      }
    }

    // Check if requesting user has elevated access (Executive, Manager, OD Specialist)
    let hasElevatedAccess = false
    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement && !isInManagementChain) {
      const requestingUser = await prisma.user.findFirst({
        where: { email: sessionUser.email },
        include: { department: true }
      })
      
      if (requestingUser) {
        const reqJobTitle = (requestingUser.jobTitle || '').toLowerCase()
        const reqDepartment = (requestingUser.department?.name || '').toLowerCase()
        
        // Check for elevated access roles
        const isExecutive = reqJobTitle.includes('executive')
        const isManager = reqJobTitle.includes('manager') || reqJobTitle.includes('senior') || reqJobTitle.includes('head')
        const isODSpecialist = reqJobTitle.includes('od specialist') && reqDepartment.includes('human capital')
        const isSG = reqJobTitle.includes('statistician') && reqJobTitle.includes('general')
        const isDeputySG = reqJobTitle.includes('deputy') && reqJobTitle.includes('statistician')

        // Also allow any user who has direct reports (i.e. is a supervisor/manager of anyone)
        const hasDirectReports = await prisma.user.count({ where: { managerId: actualSessionUserId } }) > 0
        
        hasElevatedAccess = isExecutive || isManager || isODSpecialist || isSG || isDeputySG || hasDirectReports
      }
    }

    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement && !isInManagementChain && !hasElevatedAccess) {
      return NextResponse.json({ error: 'Unauthorized to view this user\'s agreements' }, { status: 403 })
    }

    // Fetch active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true, adhocWeight: true, projectsWeight: true, riskManagementWeight: true, rating360Weight: true }
    })

    // Resolve a user ID to the canonical (richest) DB record — fixes ghost/merged manager accounts
    // Uses case-insensitive email match to catch different-casing variants (e.g. himmanuel@ vs Himmanuel@)
    const resolveCanonical = async (uid: string) => {
      const u = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true, managerId: true }
      })
      if (!u) return null
      const dups = await prisma.user.findMany({
        where: { email: { equals: u.email, mode: 'insensitive' } },
        select: { id: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true, managerId: true }
      })
      if (dups.length <= 1) return u
      const best = dups.reduce((b, r) => {
        const s = (r.firstName ? 2 : 0) + (r.jobTitle ? 2 : 0) + (r.signatureUrl ? 1 : 0) + (r.managerId ? 1 : 0)
        const bs = (b.firstName ? 2 : 0) + (b.jobTitle ? 2 : 0) + (b.signatureUrl ? 1 : 0) + (b.managerId ? 1 : 0)
        return s > bs ? r : b
      }, dups[0])
      return { ...best, email: u.email }
    }

    // Fetch target user's full info including signature and job title
    // Resolve to canonical user to avoid ghost account signature issues
    const targetUserCanonical = await resolveCanonical(userId)
    const targetUserFull = targetUserCanonical || await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        signatureUrl: true,
        jobTitle: true,
        position: true,
        managerId: true,
        department: { select: { name: true } }
      }
    })

    // Build dynamic signatory chain by walking the manager hierarchy
    function isDeputyStatisticianGeneral(jobTitle: string | null | undefined): boolean {
      if (!jobTitle) return false
      const t = jobTitle.toLowerCase()
      return t.includes('deputy statistician') && t.includes('general')
    }

    function isStatisticianGeneral(jobTitle: string | null | undefined): boolean {
      if (!jobTitle) return false
      const t = jobTitle.toLowerCase()
      return t.includes('statistician general') && !t.includes('deputy')
    }

    function isExecutiveTitle(jobTitle: string | null | undefined): boolean {
      if (!jobTitle) return false
      const t = jobTitle.toLowerCase()
      return t.includes('executive') || t.includes('statistician general') || t.includes('deputy statistician')
    }

    const signatoryChain: { role: string; name: string; designation: string; signatureUrl: string | null }[] = []
    
    // Determine starting manager: primary from User.managerId, fallback from agreement supervisorId
    let startManagerId = targetUserFull?.managerId || null
    if (!startManagerId) {
      const recentAgreement = await prisma.performanceAgreement.findFirst({
        where: { userId, supervisorId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { supervisorId: true }
      })
      startManagerId = recentAgreement?.supervisorId || null
    }

    if (startManagerId) {
      const visited = new Set<string>()
      let currentManagerId: string | null = startManagerId
      while (currentManagerId && !visited.has(currentManagerId) && signatoryChain.length < 5) {
        visited.add(currentManagerId)
        const mgr = await resolveCanonical(currentManagerId)
        if (!mgr) break
        // Skip ghost/sparse accounts (no jobTitle, no position) — walk past them
        if (!mgr.jobTitle && !mgr.position) {
          currentManagerId = mgr.managerId
          continue
        }
        const name = `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim()
        const designation = mgr.jobTitle || mgr.position || ''
        const signatureUrl = mgr.signatureUrl || null
        
        // Determine role based on position in hierarchy
        if (isStatisticianGeneral(mgr.jobTitle)) {
          // Statistician General is the top - always label as SG
          signatoryChain.push({ role: 'SG', name, designation, signatureUrl })
          break // Stop at SG
        } else if (isDeputyStatisticianGeneral(mgr.jobTitle)) {
          // Deputy Statistician General — stop here (acts as executive for this chain)
          signatoryChain.push({ role: 'DSG', name, designation, signatureUrl })
          break
        } else if (isExecutiveTitle(mgr.jobTitle)) {
          // Other executive (department head, etc.) — stop here
          signatoryChain.push({ role: 'EXECUTIVE', name, designation, signatureUrl })
          break
        } else {
          // Regular supervisor/manager
          const role = signatoryChain.length === 0 ? 'SUPERVISOR' : 'MANAGER'
          signatoryChain.push({ role, name, designation, signatureUrl })
          currentManagerId = mgr.managerId
        }
      }
    }
    
    // If no executive found by chain walk, try department lookup
    const deptName = targetUserFull?.department?.name
    if (!signatoryChain.some(c => c.role === 'EXECUTIVE') && deptName) {
      const execByTitle = await prisma.user.findFirst({
        where: {
          departmentName: deptName,
          OR: [
            { jobTitle: { contains: 'Executive', mode: 'insensitive' } },
            { jobTitle: { contains: 'Statistician General', mode: 'insensitive' } },
          ]
        },
        select: { id: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true }
      })
      if (execByTitle) {
        signatoryChain.push({
          role: 'EXECUTIVE',
          name: `${execByTitle.firstName || ''} ${execByTitle.lastName || ''}`.trim(),
          designation: execByTitle.jobTitle || execByTitle.position || '',
          signatureUrl: execByTitle.signatureUrl || null,
        })
      }
    }

    // Fetch all APPROVED performance agreements for the target user (excluding ad-hoc containers)
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: userId,
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
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    console.log(`Found ${agreements.length} agreements for user ${userId}`)

    // Format the response
    const formattedAgreements = agreements.map(agreement => ({
      ...agreement,
      supervisor: agreement.supervisor ? {
        id: agreement.supervisor.id,
        name: `${agreement.supervisor.firstName || ''} ${agreement.supervisor.lastName || ''}`.trim() || agreement.supervisor.email
      } : null
    }))

    // Fetch 360-degree rating data for the user
    let rating360Data = null
    try {
      const rating = await prisma.rating360.findFirst({
        where: { userId },
        include: {
          cycle: true,
          peerRatings: true,
          subordinateRatings: true,
        },
        orderBy: { createdAt: 'desc' }
      })

      if (rating) {
        const responses = await prisma.questionnaireResponse.findMany({
          where: { rating360Id: rating.id },
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

        const competencyBreakdown = Object.values(competencyMap).map(c => ({
          competency: c.competency,
          averageScore: c.scores.length > 0 ? Math.round((c.scores.reduce((a, b) => a + b, 0) / c.scores.length) * 100) / 100 : null,
          responseCount: c.scores.length,
        }))

        const answers = await prisma.rating360Answer.findMany({
          where: { rating360Id: rating.id },
          include: { question: true }
        })

        const categoryMap: Record<string, number[]> = {}
        answers.forEach((ans: any) => {
          const cat = ans.question?.category || 'General'
          if (!categoryMap[cat]) categoryMap[cat] = []
          categoryMap[cat].push(ans.rating)
        })

        const categoryBreakdown = Object.entries(categoryMap).map(([category, scores]) => ({
          category,
          averageScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
          responseCount: scores.length,
        }))

        const completedSubs = rating.subordinateRatings.filter((s: any) => s.rating !== null)

        // NSA core behavioural competencies — always shown even if not yet rated
        const NSA_COMPETENCIES = ['Integrity', 'Excellent Performance', 'Professionalism', 'Accountability', 'Partnership', 'Customer-focussed']

        // Parse per-rater competency scores from stored JSON (from NSA simple form)
        const parseCS = (s: string | null | undefined): Record<string, number> => {
          if (!s) return {}
          try { return (JSON.parse(s) as any)?.scores || {} } catch { return {} }
        }
        const parseRaterType = (s: string | null | undefined): string => {
          if (!s) return 'dept_random'
          try { return (JSON.parse(s) as any)?.raterType || 'dept_random' } catch { return 'dept_random' }
        }

        const allPeers = rating.peerRatings
        const deptRandomPeer = allPeers.find((p: any) => parseRaterType(p.comments) === 'dept_random') ?? null
        const orgRandomPeer = allPeers.find((p: any) => parseRaterType(p.comments) === 'org_random') ?? null

        const selfCS = parseCS((rating as any).selfComments)
        const supCS = parseCS((rating as any).supervisorComments)
        const deptCS = parseCS(deptRandomPeer?.comments)
        const orgCS = parseCS(orgRandomPeer?.comments)

        // Union of all competency names + always include NSA 6
        const compNames = [...new Set([
          ...Object.keys(selfCS), ...Object.keys(supCS), ...Object.keys(deptCS), ...Object.keys(orgCS),
          ...NSA_COMPETENCIES,
        ])]
        // Sort in NSA order
        compNames.sort((a, b) => {
          const ai = NSA_COMPETENCIES.indexOf(a); const bi = NSA_COMPETENCIES.indexOf(b)
          if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1
          return ai - bi
        })

        const competencyDetail = compNames.map(comp => {
          const self = selfCS[comp] ?? null
          const sup = supCS[comp] ?? null
          const deptRandom = deptCS[comp] ?? null
          const orgRandom = orgCS[comp] ?? null
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

        rating360Data = {
          cycleName: rating.cycle.name,
          selfRating: rating.selfRating,
          supervisorRating: rating.supervisorRating,
          deptRandomRating: deptRandomPeer?.rating ?? null,
          orgRandomRating: orgRandomPeer?.rating ?? null,
          averageRating: rating.averageRating,
          status: rating.status,
          selfStatus: rating.selfRating !== null ? 'Completed' : 'Pending',
          supervisorStatus: rating.supervisorRating !== null ? 'Completed' : 'Pending',
          deptRandomStatus: deptRandomPeer ? (deptRandomPeer.rating !== null ? 'Completed' : 'Pending') : 'Not assigned',
          orgRandomStatus: orgRandomPeer ? (orgRandomPeer.rating !== null ? 'Completed' : 'Pending') : 'Not assigned',
          subordinateAverage: completedSubs.length > 0
            ? Math.round((completedSubs.reduce((sum: number, s: any) => sum + s.rating, 0) / completedSubs.length) * 100) / 100
            : null,
          subordinateCount: completedSubs.length,
          competencyBreakdown,
          categoryBreakdown,
          competencyDetail,
        }
      }
    } catch (rating360Error: any) {
      console.warn('Could not fetch 360 rating data:', rating360Error.message)
    }

    // Fetch ad-hoc tasks for the user
    let adhocTasks: any[] = []
    try {
      adhocTasks = await prisma.adhocTask.findMany({
        where: {
          assignedToId: userId,
          status: 'COMPLETED',
          rating: { not: null }
        },
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          rating: true,
          completedAt: true,
        },
        orderBy: { completedAt: 'desc' }
      })
    } catch (adhocError: any) {
      console.warn('Could not fetch ad-hoc tasks:', adhocError.message)
    }

    // Determine if this is a post-rating export
    const hasRatings = formattedAgreements.some((a: any) => a.rating !== null && a.rating !== undefined && !a.isAdhocContainer)

    // Compute the full 5-component score summary (same logic as my-rate API)
    let scoreSummary = null
    if (hasRatings) {
      try {
        const activePeriodForScore = await prisma.performancePeriod.findFirst({
          where: { isActive: true },
          select: { id: true, adhocWeight: true, projectsWeight: true, riskManagementWeight: true, rating360Weight: true }
        })

        let targetUserWeights: any = null
        try {
          targetUserWeights = await prisma.userTaskWeight.findFirst({
            where: { userId, periodId: activePeriodForScore?.id || null }
          })
          if (!targetUserWeights && activePeriodForScore?.id) {
            targetUserWeights = await prisma.userTaskWeight.findFirst({
              where: { userId, periodId: null }
            })
          }
        } catch (e) { /* userTaskWeight may not exist */ }

        const userBudget = 100
        const rating360Weight = 0
        
        let performanceAgreementWeight: number
        let adhocWeight: number
        let projectsWeight: number
        let riskManagementWeight: number
        let auditWeight: number

        if (targetUserWeights) {
          const cats = JSON.parse(targetUserWeights.categories) as { id: string; weight: number }[]
          const gw = (id: string) => cats.find(c => c.id === id)?.weight ?? 0
          const rawPerf = gw('perf')
          const rawAdhoc = gw('adhoc')
          const rawRisk = gw('risk')
          const rawProject = gw('project')
          const rawAudit = gw('audit')
          const rawTotal = rawPerf + rawAdhoc + rawRisk + rawProject + rawAudit
          const scale = rawTotal > 0 ? userBudget / rawTotal : 0
          performanceAgreementWeight = Math.round(rawPerf * scale * 100) / 100
          adhocWeight = Math.round(rawAdhoc * scale * 100) / 100
          riskManagementWeight = Math.round(rawRisk * scale * 100) / 100
          projectsWeight = Math.round(rawProject * scale * 100) / 100
          auditWeight = Math.round(rawAudit * scale * 100) / 100
        } else {
          adhocWeight = activePeriodForScore?.adhocWeight || 0
          projectsWeight = activePeriodForScore?.projectsWeight || 0
          riskManagementWeight = activePeriodForScore?.riskManagementWeight || 0
          auditWeight = 0
          performanceAgreementWeight = userBudget - (adhocWeight + projectsWeight + riskManagementWeight + auditWeight)
        }

        // Active bi-annual half filtering (same logic as my-rate/route.ts)
        const _expNowM = new Date().getUTCMonth() + 1
        const _expH1M = [4, 5, 6, 7, 8, 9]
        const _expH2M = [10, 11, 12, 1, 2, 3]
        const _expIsH1Win = _expH2M.includes(_expNowM)
        const _expActiveM = _expIsH1Win ? _expH1M : _expH2M
        const allPaAgreements = formattedAgreements.filter((a: any) => {
          if (!a.weight || a.isAdhocContainer) return false
          if (!a.dueDate) return false
          const m = new Date(a.dueDate).getUTCMonth() + 1
          if (_expActiveM.includes(m)) return true
          if (a.rating != null && a.rating > 0) return true // carry-over
          return false
        })
        const ratedAgreements = allPaAgreements.filter((a: any) => a.rating)
        let paTotalScore = 0, paTotalWeight = 0
        allPaAgreements.forEach((a: any) => {
          paTotalWeight += a.weight
          if (a.rating) paTotalScore += a.rating * a.weight
        })
        const paRating = paTotalWeight > 0 ? paTotalScore / paTotalWeight : 0

        const allAdhoc = await prisma.adhocTask.findMany({ where: { assignedToId: userId, approvalStatus: 'APPROVED' }, select: { status: true } })
        const completedAdhoc = allAdhoc.filter((t: any) => t.status === 'COMPLETED')
        const adhocRate = allAdhoc.length > 0 ? (completedAdhoc.length / allAdhoc.length) * 5 : 0

        const projectsRating = 0
        const riskRating = 0
        const auditRating = 0

        let rating360Score = 0
        if (rating360Data) {
          if (rating360Data.averageRating) {
            rating360Score = rating360Data.averageRating
          } else {
            const avail: number[] = []
            if (rating360Data.selfRating != null) avail.push(Number(rating360Data.selfRating))
            if (rating360Data.supervisorRating != null) avail.push(Number(rating360Data.supervisorRating))
            if (rating360Data.deptRandomRating != null) avail.push(Number(rating360Data.deptRandomRating))
            if (rating360Data.orgRandomRating != null) avail.push(Number(rating360Data.orgRandomRating))
            if (rating360Data.subordinateAverage != null) avail.push(Number(rating360Data.subordinateAverage))
            if (avail.length > 0) rating360Score = avail.reduce((a, b) => a + b, 0) / avail.length
          }
        }

        const weightedScore = (paRating * performanceAgreementWeight) + (adhocRate * adhocWeight) + (projectsRating * projectsWeight) + (riskRating * riskManagementWeight) + (auditRating * auditWeight) + (rating360Score * rating360Weight)
        const finalRating = weightedScore / 100
        const finalPercentage = (finalRating / 5) * 100

        scoreSummary = {
          finalRating: Number(finalRating.toFixed(2)),
          finalPercentage: Number(finalPercentage.toFixed(2)),
          weights: { performanceAgreement: performanceAgreementWeight, adhoc: adhocWeight, projects: projectsWeight, riskManagement: riskManagementWeight, audit: auditWeight, rating360: rating360Weight },
          components: {
            performanceAgreement: { rating: Number(paRating.toFixed(2)), weight: performanceAgreementWeight, weightedScore: Number((paRating * performanceAgreementWeight / 100).toFixed(2)), initiativesCount: allPaAgreements.length, ratedCount: ratedAgreements.length, totalWeight: paTotalWeight },
            adhoc: { rating: Number(adhocRate.toFixed(2)), weight: adhocWeight, weightedScore: Number((adhocRate * adhocWeight / 100).toFixed(2)), tasksTotal: allAdhoc.length, tasksCompleted: completedAdhoc.length, completionRate: Number(((allAdhoc.length > 0 ? completedAdhoc.length / allAdhoc.length : 0) * 100).toFixed(2)) },
            projects: { rating: 0, weight: projectsWeight, weightedScore: 0, tasksTotal: 0, tasksCompleted: 0, completionRate: 0 },
            riskManagement: { rating: 0, weight: riskManagementWeight, weightedScore: 0, tasksTotal: 0, tasksCompleted: 0, completionRate: 0 },
            audit: { rating: 0, weight: auditWeight, weightedScore: 0, tasksTotal: 0, tasksCompleted: 0, completionRate: 0 },
            rating360: { rating: Number(rating360Score.toFixed(2)), weight: rating360Weight, weightedScore: Number((rating360Score * rating360Weight / 100).toFixed(2)), hasCompleted: !!rating360Data, hasAnyRatings: rating360Score > 0 }
          }
        }
      } catch (scoreError: any) {
        console.warn('Could not compute score summary:', scoreError.message)
      }
    }

    return NextResponse.json({
      user: {
        id: userId,
        name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
        email: targetUser.email,
        jobTitle: targetUserFull?.jobTitle || targetUserFull?.position || '',
        signatureUrl: targetUserFull?.signatureUrl || null,
        department: targetUserFull?.department?.name || ''
      },
      agreements: formattedAgreements,
      activePeriod: activePeriod ? {
        name: activePeriod.name,
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate
      } : null,
      signatoryChain,
      signatories: {
        supervisor: signatoryChain.find(c => c.role === 'SUPERVISOR') || null,
        manager: signatoryChain.find(c => c.role === 'MANAGER' || c.role === 'DSG') || null,
        executive: signatoryChain.find(c => c.role === 'EXECUTIVE' || c.role === 'SG') || null
      },
      rating360: rating360Data,
      adhocTasks,
      hasRatings,
      scoreSummary,
      quarterBreakdown: (['Q1','Q2','Q3','Q4'] as const).map(q => {
        const months = q === 'Q1' ? [4,5,6] : q === 'Q2' ? [7,8,9] : q === 'Q3' ? [10,11,12] : [1,2,3]
        const label = q === 'Q1' ? 'Apr – Jun' : q === 'Q2' ? 'Jul – Sep' : q === 'Q3' ? 'Oct – Dec' : 'Jan – Mar'
        const allPaForQ = formattedAgreements.filter((a: any) => !a.isAdhocContainer && a.weight)
        const inQuarter = allPaForQ.filter((a: any) => {
          if (!a.dueDate) return false
          const d = new Date(a.dueDate)
          const m = d.getUTCMonth() + 1
          return months.includes(m)
        })
        const rated = inQuarter.filter((a: any) => a.rating != null && a.rating > 0)
        const totalW = inQuarter.reduce((s: number, a: any) => s + (a.weight || 0), 0)
        const weightedSum = rated.reduce((s: number, a: any) => s + ((a.rating || 0) * (a.weight || 0)), 0)
        const ratingSum = rated.reduce((s: number, a: any) => s + (a.rating || 0), 0)
        const avgRating = inQuarter.length > 0 ? (rated.length > 0 ? Number((ratingSum / inQuarter.length).toFixed(2)) : null) : null
        const allPaTotalW = allPaForQ.reduce((s: number, a: any) => s + (a.weight || 0), 0)
        const weightedScore = totalW > 0 ? Number((weightedSum / (allPaTotalW || 100)).toFixed(2)) : 0
        return { quarter: q, label, total: inQuarter.length, rated: rated.length, totalWeight: totalW, avgRating, weightedScore }
      })
    })

  } catch (error: any) {
    console.error('❌ Error exporting performance agreement:', error)
    return NextResponse.json(
      { error: 'Failed to export performance agreement: ' + error.message },
      { status: 500 }
    )
  }
}
