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

    console.log('=== Exporting Performance Agreement ===')
    console.log('Target User ID:', userId)
    console.log('Requesting User ID:', sessionUser.id)

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
    const isOwnData = userId === sessionUser.id
    
    // Check if requesting user is the direct manager
    const isDirectManager = targetUser.managerId === sessionUser.id
    
    // Check if requesting user is a supervisor on any of the target's agreements
    const isSupervisorOnAgreement = await prisma.performanceAgreement.findFirst({
      where: {
        userId: userId,
        supervisorId: sessionUser.id
      }
    })
    
    // Check if requesting user is anywhere in the target's management chain (hierarchical)
    let isInManagementChain = false
    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement) {
      // Walk up the management chain from target user
      let currentManagerId = targetUser.managerId
      const visited = new Set<string>()
      while (currentManagerId && !visited.has(currentManagerId)) {
        if (currentManagerId === sessionUser.id) {
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

    if (!isOwnData && !isDirectManager && !isSupervisorOnAgreement && !isInManagementChain) {
      return NextResponse.json({ error: 'Unauthorized to view this user\'s agreements' }, { status: 403 })
    }

    // Fetch active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true, adhocWeight: true, projectsWeight: true, riskManagementWeight: true, rating360Weight: true }
    })

    // Fetch target user's full info including signature and job title
    const targetUserFull = await prisma.user.findUnique({
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
        const mgr = await prisma.user.findUnique({
          where: { id: currentManagerId },
          select: { id: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true, managerId: true }
        })
        if (!mgr) break
        const name = `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim()
        const designation = mgr.jobTitle || mgr.position || ''
        const signatureUrl = mgr.signatureUrl || null
        if (isExecutiveTitle(mgr.jobTitle)) {
          signatoryChain.push({ role: 'EXECUTIVE', name, designation, signatureUrl })
          break
        } else {
          const role = signatoryChain.length === 0 ? 'SUPERVISOR' : 'MANAGER'
          signatoryChain.push({ role, name, designation, signatureUrl })
        }
        currentManagerId = mgr.managerId
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
        approvalStatus: 'APPROVED', // Only approved agreements (matches my-rate API)
        isAdhocContainer: false // Exclude ad-hoc containers to match subordinate's count
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
        // Fetch questionnaire responses grouped by competency
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

        // Group by competency
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

        // Also get Rating360Answer category scores
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

        const completedPeers = rating.peerRatings.filter((p: any) => p.rating !== null)
        const completedSubs = rating.subordinateRatings.filter((s: any) => s.rating !== null)

        rating360Data = {
          cycleName: rating.cycle.name,
          selfRating: rating.selfRating,
          supervisorRating: rating.supervisorRating,
          averageRating: rating.averageRating,
          status: rating.status,
          peerAverage: completedPeers.length > 0
            ? Math.round((completedPeers.reduce((sum: number, p: any) => sum + p.rating, 0) / completedPeers.length) * 100) / 100
            : null,
          subordinateAverage: completedSubs.length > 0
            ? Math.round((completedSubs.reduce((sum: number, s: any) => sum + s.rating, 0) / completedSubs.length) * 100) / 100
            : null,
          peerCount: completedPeers.length,
          subordinateCount: completedSubs.length,
          competencyBreakdown,
          categoryBreakdown,
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
        // Fetch active performance period weights
        const activePeriod = await prisma.performancePeriod.findFirst({
          where: { isActive: true },
          select: { id: true, adhocWeight: true, projectsWeight: true, riskManagementWeight: true, rating360Weight: true }
        })

        // Check for user-specific weight allocations first
        let targetUserWeights: any = null
        try {
          targetUserWeights = await prisma.userTaskWeight.findFirst({
            where: { userId, periodId: activePeriod?.id || null }
          })
          if (!targetUserWeights && activePeriod?.id) {
            targetUserWeights = await prisma.userTaskWeight.findFirst({
              where: { userId, periodId: null }
            })
          }
        } catch (e) { /* userTaskWeight may not exist */ }

        // Use user-saved categories (including 360°) directly
        let performanceAgreementWeight: number
        let adhocWeight: number
        let projectsWeight: number
        let riskManagementWeight: number
        let auditWeight: number
        let rating360Weight: number

        if (targetUserWeights) {
          const cats = JSON.parse(targetUserWeights.categories) as { id: string; weight: number }[]
          const gw = (id: string) => cats.find(c => c.id === id)?.weight ?? 0
          performanceAgreementWeight = gw('perf')
          adhocWeight = gw('adhoc')
          riskManagementWeight = gw('risk')
          projectsWeight = gw('project')
          auditWeight = gw('audit')
          rating360Weight = gw('rating360')
        } else {
          // Default weights: PA=75%, 360=25%
          performanceAgreementWeight = 75
          adhocWeight = 0
          projectsWeight = 0
          riskManagementWeight = 0
          auditWeight = 0
          rating360Weight = 25
        }

        // Component 1: Performance Agreement Rating (ALL approved initiatives, not just rated)
        const allPaAgreements = formattedAgreements.filter((a: any) => a.weight && !a.isAdhocContainer)
        const ratedAgreements = allPaAgreements.filter((a: any) => a.rating)
        let paTotalScore = 0, paTotalWeight = 0
        allPaAgreements.forEach((a: any) => {
          paTotalWeight += a.weight
          if (a.rating) paTotalScore += a.rating * a.weight
        })
        const paRating = paTotalWeight > 0 ? paTotalScore / paTotalWeight : 0

        // Component 2: Ad-hoc Tasks Rating
        const allAdhoc = await prisma.adhocTask.findMany({ where: { assignedToId: userId, approvalStatus: 'APPROVED' }, select: { status: true } })
        const completedAdhoc = allAdhoc.filter((t: any) => t.status === 'COMPLETED')
        const adhocRate = allAdhoc.length > 0 ? (completedAdhoc.length / allAdhoc.length) * 5 : 0

        // Component 3 & 4: Projects & Risk (placeholder)
        const projectsRating = 0
        const riskRating = 0

        // Component 5: Audit Tasks (placeholder)
        const auditRating = 0

        // Component 6: 360-Degree Rating
        // Compute 360 score from available individual ratings if averageRating not set
        let rating360Score = 0
        if (rating360Data) {
          if (rating360Data.averageRating) {
            rating360Score = rating360Data.averageRating
          } else {
            const avail: number[] = []
            if (rating360Data.selfRating != null) avail.push(Number(rating360Data.selfRating))
            if (rating360Data.supervisorRating != null) avail.push(Number(rating360Data.supervisorRating))
            if (rating360Data.peerAverage != null) avail.push(Number(rating360Data.peerAverage))
            if (rating360Data.subordinateAverage != null) avail.push(Number(rating360Data.subordinateAverage))
            if (avail.length > 0) rating360Score = avail.reduce((a, b) => a + b, 0) / avail.length
          }
        }

        // Final weighted score (all 6 components)
        const weightedScore = (paRating * performanceAgreementWeight) + (adhocRate * adhocWeight) + (projectsRating * projectsWeight) + (riskRating * riskManagementWeight) + (auditRating * auditWeight) + (rating360Score * rating360Weight)
        const finalRating = weightedScore / 100 // Weights always sum to 100%
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
        manager: signatoryChain.find(c => c.role === 'MANAGER') || null,
        executive: signatoryChain.find(c => c.role === 'EXECUTIVE') || null
      },
      rating360: rating360Data,
      adhocTasks,
      hasRatings,
      scoreSummary
    })

  } catch (error: any) {
    console.error('❌ Error exporting performance agreement:', error)
    return NextResponse.json(
      { error: 'Failed to export performance agreement: ' + error.message },
      { status: 500 }
    )
  }
}
