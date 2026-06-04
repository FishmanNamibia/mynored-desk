import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ratingId, ratingType, rating, comments, questionRatings } = body

    if (!ratingId || !ratingType) {
      return NextResponse.json({ error: 'Rating ID and type are required' }, { status: 400 })
    }

    // Compute the final rating: use average of questionRatings if provided, otherwise use the overall rating
    let finalRating = rating
    if (questionRatings && Object.keys(questionRatings).length > 0) {
      const values = Object.values(questionRatings) as number[]
      finalRating = values.reduce((sum, v) => sum + v, 0) / values.length
    }

    if (!finalRating || finalRating < 1 || finalRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const now = new Date()

    // Determine the rating360Id for saving question-level answers
    let rating360Id: string | null = null

    if (ratingType === 'peer') {
      const updated = await prisma.peerRating360.update({
        where: { id: ratingId },
        data: { rating: finalRating, comments: comments || null, completedAt: now }
      })
      rating360Id = updated.rating360Id
      await recalculateAverage(updated.rating360Id)
    }
    else if (ratingType === 'subordinate') {
      const updated = await prisma.subordinateRating360.update({
        where: { id: ratingId },
        data: { rating: finalRating, comments: comments || null, completedAt: now }
      })
      rating360Id = updated.rating360Id
      await recalculateAverage(updated.rating360Id)
    }
    else if (ratingType === 'supervisor') {
      const updated = await prisma.rating360.update({
        where: { id: ratingId },
        data: { supervisorRating: finalRating, supervisorComments: comments || null, supervisorCompletedAt: now }
      })
      rating360Id = updated.id
      await recalculateAverage(updated.id)
    }
    else if (ratingType === 'self') {
      const updated = await prisma.rating360.update({
        where: { id: ratingId },
        data: { selfRating: finalRating, selfComments: comments || null, selfCompletedAt: now }
      })
      rating360Id = updated.id
      await recalculateAverage(updated.id)
    }
    else {
      return NextResponse.json({ error: 'Invalid rating type' }, { status: 400 })
    }

    // Save individual question-level answers if provided
    if (questionRatings && rating360Id) {
      for (const [questionId, qRating] of Object.entries(questionRatings)) {
        await prisma.rating360Answer.upsert({
          where: {
            questionId_rating360Id_raterId_raterType: {
              questionId,
              rating360Id,
              raterId: user.id,
              raterType: ratingType
            }
          },
          update: {
            rating: qRating as number,
            comments: null
          },
          create: {
            questionId,
            rating360Id,
            raterId: user.id,
            raterType: ratingType,
            rating: qRating as number
          }
        })
      }
    }

    const typeLabels: Record<string, string> = {
      peer: 'Peer rating',
      subordinate: 'Team member rating',
      supervisor: 'Supervisor rating',
      self: 'Self-assessment'
    }
    return NextResponse.json({ success: true, message: `${typeLabels[ratingType] || 'Rating'} submitted successfully` })
  } catch (error: any) {
    console.error('[360 submit] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

async function recalculateAverage(rating360Id: string) {
  const rating = await prisma.rating360.findUnique({
    where: { id: rating360Id },
    include: { peerRatings: true, subordinateRatings: true }
  })

  if (!rating) return

  const ratings: number[] = []

  if (rating.selfRating !== null) ratings.push(rating.selfRating)
  if (rating.supervisorRating !== null) ratings.push(rating.supervisorRating)

  const peerValues = rating.peerRatings.filter(pr => pr.rating !== null).map(pr => pr.rating!)
  if (peerValues.length > 0) {
    ratings.push(peerValues.reduce((sum, r) => sum + r, 0) / peerValues.length)
  }

  const subValues = rating.subordinateRatings.filter(sr => sr.rating !== null).map(sr => sr.rating!)
  if (subValues.length > 0) {
    ratings.push(subValues.reduce((sum, r) => sum + r, 0) / subValues.length)
  }

  const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null

  let status = 'PENDING'
  if (rating.selfRating !== null && rating.supervisorRating !== null) status = 'IN_PROGRESS'
  if (averageRating !== null && ratings.length >= 2) status = 'COMPLETED'

  await prisma.rating360.update({
    where: { id: rating360Id },
    data: { averageRating, status }
  })
}
