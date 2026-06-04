import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the rating
    const rating = await prisma.rating360.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, managerId: true } },
        cycle: true,
        peerRatings: true,
        subordinateRatings: true,
      }
    })

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    // Authorization: only the user, their manager, or HC can view
    const isOwn = rating.userId === user.id
    const isManager = rating.user.managerId === user.id
    const isSupervisor = rating.supervisorId === user.id
    if (!isOwn && !isManager && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all Rating360Answer entries for this rating
    const answers = await prisma.rating360Answer.findMany({
      where: { rating360Id: id },
      include: { question: true }
    })

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0

    // --- Build per-question analysis ---
    // Group answers by questionId
    const questionMap: Record<string, {
      questionText: string
      category: string
      applicableTo: string
      self: number[]
      supervisor: number[]
      peer: number[]
      subordinate: number[]
      external: number[]
    }> = {}

    answers.forEach((answer: any) => {
      const qId = answer.questionId
      if (!questionMap[qId]) {
        questionMap[qId] = {
          questionText: answer.question?.question || 'Unknown',
          category: answer.question?.category || 'General',
          applicableTo: answer.question?.applicableTo || 'self',
          self: [], supervisor: [], peer: [], subordinate: [], external: []
        }
      }
      const raterType = answer.raterType as string
      if (questionMap[qId][raterType as keyof typeof questionMap[string]]) {
        (questionMap[qId][raterType as keyof typeof questionMap[string]] as number[]).push(answer.rating)
      }
    })

    // Also include questions from the active cycle that have no answers yet
    const activeQuestions = await prisma.rating360Question.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }]
    })
    activeQuestions.forEach(q => {
      if (!questionMap[q.id]) {
        questionMap[q.id] = {
          questionText: q.question,
          category: q.category,
          applicableTo: q.applicableTo,
          self: [], supervisor: [], peer: [], subordinate: [], external: []
        }
      }
    })

    const questionsAnalysis = Object.values(questionMap).map(q => {
      const selfAvg = avg(q.self)
      const supAvg = avg(q.supervisor)
      const peerAvg = avg(q.peer)
      const subAvg = avg(q.subordinate)
      const extAvg = avg(q.external)
      const allNonZero = [selfAvg, supAvg, peerAvg, subAvg, extAvg].filter(s => s > 0)
      const overall = allNonZero.length > 0 ? avg(allNonZero) : 0
      const othersScores = [supAvg, peerAvg, subAvg, extAvg].filter(s => s > 0)
      const othersAvg = othersScores.length > 0 ? avg(othersScores) : 0
      const gap = selfAvg > 0 && othersAvg > 0 ? Math.round((selfAvg - othersAvg) * 10) / 10 : 0

      return {
        questionText: q.questionText,
        category: q.category,
        applicableTo: q.applicableTo,
        averages: { overall, self: selfAvg, supervisor: supAvg, peer: peerAvg, subordinate: subAvg, external: extAvg, others: othersAvg },
        gap
      }
    })

    // --- Category scores for radar chart ---
    const categoryData: Record<string, { self: number[], supervisor: number[], peer: number[], subordinate: number[], external: number[] }> = {}
    answers.forEach((answer: any) => {
      const cat = answer.question?.category || 'General'
      if (!categoryData[cat]) categoryData[cat] = { self: [], supervisor: [], peer: [], subordinate: [], external: [] }
      const rt = answer.raterType as string
      if (categoryData[cat][rt as keyof typeof categoryData[string]]) {
        (categoryData[cat][rt as keyof typeof categoryData[string]] as number[]).push(answer.rating)
      }
    })

    const categoryScores = Object.entries(categoryData).map(([category, data]) => {
      const s = avg(data.self), su = avg(data.supervisor), p = avg(data.peer), sb = avg(data.subordinate), e = avg(data.external)
      const all = [s, su, p, sb, e].filter(v => v > 0)
      return { category, self: s, supervisor: su, peer: p, subordinate: sb, external: e, overall: all.length > 0 ? avg(all) : 0 }
    })

    // --- Rater type averages ---
    const allSelf = answers.filter((a: any) => a.raterType === 'self').map((a: any) => a.rating)
    const allSup = answers.filter((a: any) => a.raterType === 'supervisor').map((a: any) => a.rating)
    const allPeer = answers.filter((a: any) => a.raterType === 'peer').map((a: any) => a.rating)
    const allSub = answers.filter((a: any) => a.raterType === 'subordinate').map((a: any) => a.rating)
    const allExt = answers.filter((a: any) => a.raterType === 'external').map((a: any) => a.rating)

    const raterTypeAverages = {
      self: avg(allSelf),
      supervisor: avg(allSup),
      peer: avg(allPeer),
      subordinate: avg(allSub),
      external: avg(allExt)
    }

    // --- Overall score ---
    // Use the rating's averageRating if available, otherwise compute from all answers or from the rating fields
    const completedPeers = rating.peerRatings.filter((p: any) => p.rating !== null)
    const completedSubs = rating.subordinateRatings.filter((s: any) => s.rating !== null)
    const peerAverage = completedPeers.length > 0
      ? Math.round((completedPeers.reduce((sum: number, p: any) => sum + (p.rating || 0), 0) / completedPeers.length) * 100) / 100
      : 0
    const subAverage = completedSubs.length > 0
      ? Math.round((completedSubs.reduce((sum: number, s: any) => sum + (s.rating || 0), 0) / completedSubs.length) * 100) / 100
      : 0

    const overallComponents = [
      rating.selfRating || 0,
      rating.supervisorRating || 0,
      peerAverage,
      subAverage
    ].filter(v => v > 0)
    const overallScore = rating.averageRating || (overallComponents.length > 0 ? avg(overallComponents) : 0)

    // --- Insights ---
    const sortedByOverall = [...questionsAnalysis].filter(q => q.averages.overall > 0)
    const strengths = sortedByOverall.filter(q => q.averages.overall >= 4).sort((a, b) => b.averages.overall - a.averages.overall).slice(0, 5)
    const developmentAreas = sortedByOverall.filter(q => q.averages.overall > 0 && q.averages.overall < 3).sort((a, b) => a.averages.overall - b.averages.overall).slice(0, 5)
    const blindSpots = questionsAnalysis.filter(q => q.gap > 0.5).sort((a, b) => b.gap - a.gap).slice(0, 5)
    const hiddenStrengths = questionsAnalysis.filter(q => q.gap < -0.5).sort((a, b) => a.gap - b.gap).slice(0, 5)

    // --- Rater counts ---
    const raterCounts = {
      peers: completedPeers.length,
      subordinates: completedSubs.length,
      supervisor: rating.supervisorRating ? 1 : 0
    }

    const userName = `${rating.user.firstName || ''} ${rating.user.lastName || ''}`.trim() || rating.user.email

    return NextResponse.json({
      rating: {
        user: { name: userName },
        cycle: { name: rating.cycle.name }
      },
      overallScore,
      raterTypeAverages,
      categoryScores,
      insights: { strengths, developmentAreas, blindSpots, hiddenStrengths },
      questions: questionsAnalysis,
      raterCounts,
    })

  } catch (error: any) {
    console.error('[360 analysis] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
