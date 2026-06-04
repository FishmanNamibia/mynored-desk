import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ratingId = id

    // Fetch the rating with all related data
    const rating = await prisma.rating360.findUnique({
      where: { id: ratingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true,
            role: true
          }
        },
        cycle: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        },
        peerRatings: {
          include: {
            rater: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        subordinateRatings: {
          include: {
            rater: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    // Check authorization - user can only view their own rating, or managers can view their team
    const isOwnRating = rating.userId === user.id
    const isManager = user.role && ['MANAGER', 'EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN'].includes(user.role)
    
    if (!isOwnRating && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all question answers for this rating
    const answers = await prisma.rating360Answer.findMany({
      where: {
        rating360Id: ratingId
      },
      include: {
        question: true
      }
    })

    // Group answers by question and rater type
    const questionAnalysis: any = {}
    const categoryScores: any = {}
    const raterTypeScores: any = {
      self: [],
      supervisor: [],
      peer: [],
      subordinate: [],
      external: []
    }

    answers.forEach((answer: any) => {
      const questionId = answer.questionId
      const category = answer.question.category
      const raterType = answer.raterType

      // Initialize question analysis
      if (!questionAnalysis[questionId]) {
        questionAnalysis[questionId] = {
          questionId,
          questionText: answer.question.question,
          category: category,
          applicableTo: answer.question.applicableTo,
          ratings: {
            self: null,
            supervisor: null,
            peer: [],
            subordinate: [],
            external: []
          }
        }
      }

      // Add rating to appropriate category
      if (raterType === 'self') {
        questionAnalysis[questionId].ratings.self = answer.rating
      } else if (raterType === 'supervisor') {
        questionAnalysis[questionId].ratings.supervisor = answer.rating
      } else if (raterType === 'peer') {
        questionAnalysis[questionId].ratings.peer.push(answer.rating)
      } else if (raterType === 'subordinate') {
        questionAnalysis[questionId].ratings.subordinate.push(answer.rating)
      } else if (raterType === 'external') {
        questionAnalysis[questionId].ratings.external.push(answer.rating)
      }

      // Track for category scores
      if (!categoryScores[category]) {
        categoryScores[category] = {
          self: [],
          supervisor: [],
          peer: [],
          subordinate: [],
          external: []
        }
      }
      
      if (raterType === 'self') {
        categoryScores[category].self.push(answer.rating)
      } else if (raterType === 'supervisor') {
        categoryScores[category].supervisor.push(answer.rating)
      } else if (raterType === 'peer') {
        categoryScores[category].peer.push(answer.rating)
      } else if (raterType === 'subordinate') {
        categoryScores[category].subordinate.push(answer.rating)
      } else if (raterType === 'external') {
        categoryScores[category].external.push(answer.rating)
      }

      // Track for overall rater type scores
      raterTypeScores[raterType].push(answer.rating)
    })

    // Calculate averages and gaps for each question
    const questionsWithAnalysis = Object.values(questionAnalysis).map((q: any) => {
      const selfRating = q.ratings.self || 0
      const supervisorRating = q.ratings.supervisor || 0
      const peerAvg = q.ratings.peer.length > 0 
        ? q.ratings.peer.reduce((sum: number, r: number) => sum + r, 0) / q.ratings.peer.length 
        : 0
      const subordinateAvg = q.ratings.subordinate.length > 0 
        ? q.ratings.subordinate.reduce((sum: number, r: number) => sum + r, 0) / q.ratings.subordinate.length 
        : 0
      const externalAvg = q.ratings.external.length > 0 
        ? q.ratings.external.reduce((sum: number, r: number) => sum + r, 0) / q.ratings.external.length 
        : 0

      // Calculate others average (all non-self ratings)
      const otherRatings = [
        ...(supervisorRating > 0 ? [supervisorRating] : []),
        ...q.ratings.peer,
        ...q.ratings.subordinate,
        ...q.ratings.external
      ]
      const othersAvg = otherRatings.length > 0
        ? otherRatings.reduce((sum: number, r: number) => sum + r, 0) / otherRatings.length
        : 0

      // Calculate overall average
      const allRatings = [
        ...(selfRating > 0 ? [selfRating] : []),
        ...otherRatings
      ]
      const overallAvg = allRatings.length > 0
        ? allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length
        : 0

      return {
        ...q,
        averages: {
          self: selfRating,
          supervisor: supervisorRating,
          peer: peerAvg,
          subordinate: subordinateAvg,
          external: externalAvg,
          others: othersAvg,
          overall: overallAvg
        },
        gap: selfRating > 0 && othersAvg > 0 ? selfRating - othersAvg : 0
      }
    })

    // Calculate category averages
    const categoriesWithScores = Object.entries(categoryScores).map(([category, scores]: [string, any]) => {
      const selfAvg = scores.self.length > 0 
        ? scores.self.reduce((sum: number, r: number) => sum + r, 0) / scores.self.length 
        : 0
      const supervisorAvg = scores.supervisor.length > 0 
        ? scores.supervisor.reduce((sum: number, r: number) => sum + r, 0) / scores.supervisor.length 
        : 0
      const peerAvg = scores.peer.length > 0 
        ? scores.peer.reduce((sum: number, r: number) => sum + r, 0) / scores.peer.length 
        : 0
      const subordinateAvg = scores.subordinate.length > 0 
        ? scores.subordinate.reduce((sum: number, r: number) => sum + r, 0) / scores.subordinate.length 
        : 0
      const externalAvg = scores.external.length > 0 
        ? scores.external.reduce((sum: number, r: number) => sum + r, 0) / scores.external.length 
        : 0

      const allScores = [...scores.self, ...scores.supervisor, ...scores.peer, ...scores.subordinate, ...scores.external]
      const overallAvg = allScores.length > 0
        ? allScores.reduce((sum: number, r: number) => sum + r, 0) / allScores.length
        : 0

      return {
        category,
        self: selfAvg,
        supervisor: supervisorAvg,
        peer: peerAvg,
        subordinate: subordinateAvg,
        external: externalAvg,
        overall: overallAvg
      }
    })

    // Calculate overall rater type averages
    const raterTypeAverages = {
      self: raterTypeScores.self.length > 0
        ? raterTypeScores.self.reduce((sum: number, r: number) => sum + r, 0) / raterTypeScores.self.length
        : 0,
      supervisor: raterTypeScores.supervisor.length > 0
        ? raterTypeScores.supervisor.reduce((sum: number, r: number) => sum + r, 0) / raterTypeScores.supervisor.length
        : 0,
      peer: raterTypeScores.peer.length > 0
        ? raterTypeScores.peer.reduce((sum: number, r: number) => sum + r, 0) / raterTypeScores.peer.length
        : 0,
      subordinate: raterTypeScores.subordinate.length > 0
        ? raterTypeScores.subordinate.reduce((sum: number, r: number) => sum + r, 0) / raterTypeScores.subordinate.length
        : 0,
      external: raterTypeScores.external.length > 0
        ? raterTypeScores.external.reduce((sum: number, r: number) => sum + r, 0) / raterTypeScores.external.length
        : 0
    }

    // Calculate overall score
    const allRatings = [
      ...raterTypeScores.self,
      ...raterTypeScores.supervisor,
      ...raterTypeScores.peer,
      ...raterTypeScores.subordinate,
      ...raterTypeScores.external
    ]
    const overallScore = allRatings.length > 0
      ? allRatings.reduce((sum: number, r: number) => sum + r, 0) / allRatings.length
      : 0

    // Identify strengths and development areas
    const strengths = questionsWithAnalysis
      .filter((q: any) => q.averages.overall >= 4.5)
      .sort((a: any, b: any) => b.averages.overall - a.averages.overall)
      .slice(0, 5)

    const developmentAreas = questionsWithAnalysis
      .filter((q: any) => q.averages.overall > 0 && q.averages.overall < 3.5)
      .sort((a: any, b: any) => a.averages.overall - b.averages.overall)
      .slice(0, 5)

    // Identify blind spots (self-rating significantly higher than others)
    const blindSpots = questionsWithAnalysis
      .filter((q: any) => q.gap > 1)
      .sort((a: any, b: any) => b.gap - a.gap)
      .slice(0, 5)

    // Identify hidden strengths (self-rating significantly lower than others)
    const hiddenStrengths = questionsWithAnalysis
      .filter((q: any) => q.gap < -1)
      .sort((a: any, b: any) => a.gap - b.gap)
      .slice(0, 5)

    return NextResponse.json({
      rating: {
        id: rating.id,
        user: rating.user,
        cycle: rating.cycle,
        status: rating.status
      },
      overallScore,
      raterTypeAverages,
      categoryScores: categoriesWithScores,
      questions: questionsWithAnalysis,
      insights: {
        strengths,
        developmentAreas,
        blindSpots,
        hiddenStrengths
      },
      raterCounts: {
        self: raterTypeScores.self.length > 0 ? 1 : 0,
        supervisor: raterTypeScores.supervisor.length > 0 ? 1 : 0,
        peers: rating.peerRatings.length,
        subordinates: rating.subordinateRatings.length,
        external: raterTypeScores.external.length
      }
    })

  } catch (error) {
    console.error('Error fetching rating analysis:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
