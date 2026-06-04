import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET - Export 360-degree rating data for a user (for PDF generation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    // Authorization: user can view own data, or supervisor can view subordinate's
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        managerId: true,
        jobTitle: true,
        departmentName: true,
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwnData = userId === user.id
    const isSupervisor = targetUser.managerId === user.id
    if (!isOwnData && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find the latest active cycle's rating for this user
    const rating = await prisma.rating360.findFirst({
      where: { userId },
      include: {
        cycle: true,
        peerRatings: {
          include: {
            rater: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        subordinateRatings: {
          include: {
            rater: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        supervisor: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!rating) {
      return NextResponse.json({
        user: {
          id: targetUser.id,
          name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
          email: targetUser.email,
          jobTitle: targetUser.jobTitle,
          department: targetUser.departmentName,
        },
        hasRating: false,
        message: 'No 360-degree rating found for this user'
      })
    }

    // Fetch questionnaire responses grouped by competency
    const questionnaireResponses = await prisma.questionnaireResponse.findMany({
      where: { rating360Id: rating.id },
      include: {
        question: {
          include: {
            subsection: {
              include: {
                section: true
              }
            }
          }
        }
      }
    })

    // Group responses by competency (institutionalValue)
    const competencyScores: Record<string, {
      competency: string
      selfScore: number | null
      supervisorScore: number | null
      peerScore: number | null
      subordinateScore: number | null
      overallScore: number | null
      questionCount: number
    }> = {}

    // Process questionnaire responses
    questionnaireResponses.forEach((resp: any) => {
      const competency = resp.question?.subsection?.institutionalValue || resp.question?.subsection?.title || 'General'
      
      if (!competencyScores[competency]) {
        competencyScores[competency] = {
          competency,
          selfScore: null,
          supervisorScore: null,
          peerScore: null,
          subordinateScore: null,
          overallScore: null,
          questionCount: 0,
        }
      }

      competencyScores[competency].questionCount++

      // Accumulate by rater type
      const entry = competencyScores[competency]
      if (resp.raterType === 'self') {
        entry.selfScore = entry.selfScore ? (entry.selfScore + resp.rating) / 2 : resp.rating
      } else if (resp.raterType === 'supervisor') {
        entry.supervisorScore = entry.supervisorScore ? (entry.supervisorScore + resp.rating) / 2 : resp.rating
      } else if (resp.raterType === 'peer') {
        entry.peerScore = entry.peerScore ? (entry.peerScore + resp.rating) / 2 : resp.rating
      } else if (resp.raterType === 'subordinate') {
        entry.subordinateScore = entry.subordinateScore ? (entry.subordinateScore + resp.rating) / 2 : resp.rating
      }
    })

    // Calculate overall score per competency
    Object.values(competencyScores).forEach(entry => {
      const scores = [entry.selfScore, entry.supervisorScore, entry.peerScore, entry.subordinateScore]
        .filter((s): s is number => s !== null)
      entry.overallScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    })

    // Also fetch Rating360Answer data (the simpler question-based answers)
    const rating360Answers = await prisma.rating360Answer.findMany({
      where: { rating360Id: rating.id },
      include: {
        question: true
      }
    })

    // Group Rating360Answers by category
    const categoryScores: Record<string, {
      category: string
      selfScores: number[]
      supervisorScores: number[]
      peerScores: number[]
      subordinateScores: number[]
    }> = {}

    rating360Answers.forEach((answer: any) => {
      const category = answer.question?.category || 'General'
      if (!categoryScores[category]) {
        categoryScores[category] = {
          category,
          selfScores: [],
          supervisorScores: [],
          peerScores: [],
          subordinateScores: [],
        }
      }

      if (answer.raterType === 'self') categoryScores[category].selfScores.push(answer.rating)
      else if (answer.raterType === 'supervisor') categoryScores[category].supervisorScores.push(answer.rating)
      else if (answer.raterType === 'peer') categoryScores[category].peerScores.push(answer.rating)
      else if (answer.raterType === 'subordinate') categoryScores[category].subordinateScores.push(answer.rating)
    })

    const categoryBreakdown = Object.values(categoryScores).map(cat => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
      const selfAvg = avg(cat.selfScores)
      const supAvg = avg(cat.supervisorScores)
      const peerAvg = avg(cat.peerScores)
      const subAvg = avg(cat.subordinateScores)
      const allScores = [selfAvg, supAvg, peerAvg, subAvg].filter((s): s is number => s !== null)
      return {
        category: cat.category,
        selfScore: selfAvg ? Math.round(selfAvg * 100) / 100 : null,
        supervisorScore: supAvg ? Math.round(supAvg * 100) / 100 : null,
        peerScore: peerAvg ? Math.round(peerAvg * 100) / 100 : null,
        subordinateScore: subAvg ? Math.round(subAvg * 100) / 100 : null,
        overallScore: allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100 : null,
      }
    })

    // Fetch open-ended responses
    const openEndedResponses = await prisma.questionnaireOpenEndedResponse.findMany({
      where: { rating360Id: rating.id },
      include: {
        question: true
      }
    })

    // Format peer ratings
    const peerRatingsSummary = rating.peerRatings.map((pr: any) => ({
      raterName: `${pr.rater.firstName || ''} ${pr.rater.lastName || ''}`.trim() || pr.rater.email,
      rating: pr.rating,
      comments: pr.comments,
      completedAt: pr.completedAt,
    }))

    const subordinateRatingsSummary = rating.subordinateRatings.map((sr: any) => ({
      raterName: `${sr.rater.firstName || ''} ${sr.rater.lastName || ''}`.trim() || sr.rater.email,
      rating: sr.rating,
      comments: sr.comments,
      completedAt: sr.completedAt,
    }))

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
        email: targetUser.email,
        jobTitle: targetUser.jobTitle,
        department: targetUser.departmentName,
      },
      hasRating: true,
      cycle: {
        id: rating.cycle.id,
        name: rating.cycle.name,
        startDate: rating.cycle.startDate,
        endDate: rating.cycle.endDate,
      },
      overallRating: {
        selfRating: rating.selfRating,
        supervisorRating: rating.supervisorRating,
        averageRating: rating.averageRating,
        status: rating.status,
        peerCount: rating.peerRatings.length,
        subordinateCount: rating.subordinateRatings.length,
        peerAverage: peerRatingsSummary.filter((p: any) => p.rating !== null).length > 0
          ? Math.round((peerRatingsSummary.filter((p: any) => p.rating !== null).reduce((sum: number, p: any) => sum + p.rating, 0) / peerRatingsSummary.filter((p: any) => p.rating !== null).length) * 100) / 100
          : null,
        subordinateAverage: subordinateRatingsSummary.filter((s: any) => s.rating !== null).length > 0
          ? Math.round((subordinateRatingsSummary.filter((s: any) => s.rating !== null).reduce((sum: number, s: any) => sum + s.rating, 0) / subordinateRatingsSummary.filter((s: any) => s.rating !== null).length) * 100) / 100
          : null,
      },
      competencyBreakdown: Object.values(competencyScores).map(c => ({
        ...c,
        selfScore: c.selfScore ? Math.round(c.selfScore * 100) / 100 : null,
        supervisorScore: c.supervisorScore ? Math.round(c.supervisorScore * 100) / 100 : null,
        peerScore: c.peerScore ? Math.round(c.peerScore * 100) / 100 : null,
        subordinateScore: c.subordinateScore ? Math.round(c.subordinateScore * 100) / 100 : null,
        overallScore: c.overallScore ? Math.round(c.overallScore * 100) / 100 : null,
      })),
      categoryBreakdown,
      peerRatings: peerRatingsSummary,
      subordinateRatings: subordinateRatingsSummary,
      supervisor: rating.supervisor ? {
        name: `${rating.supervisor.firstName || ''} ${rating.supervisor.lastName || ''}`.trim() || rating.supervisor.email,
      } : null,
      openEndedFeedback: openEndedResponses.map((r: any) => ({
        question: r.question?.question,
        response: r.response,
        raterType: r.raterType,
      })),
    })

  } catch (error: any) {
    console.error('[360-export] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to export 360 data', details: error.message },
      { status: 500 }
    )
  }
}
