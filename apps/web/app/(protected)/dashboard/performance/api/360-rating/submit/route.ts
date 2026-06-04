import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { ratingId, ratingType, rating, comments } = body

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 })
    }

    if (!ratingId || !ratingType) {
      return NextResponse.json({ 
        error: 'Rating ID and type are required' 
      }, { status: 400 })
    }

    const now = new Date()

    // Handle different rating types
    if (ratingType === 'peer') {
      // Update peer rating
      const updated = await prisma.peerRating360.update({
        where: { id: ratingId },
        data: {
          rating: rating,
          comments: comments || null,
          completedAt: now
        }
      })

      // Recalculate average for the Rating360
      await recalculateAverage(updated.rating360Id)

      return NextResponse.json({ success: true, message: 'Peer rating submitted successfully' })
    } 
    else if (ratingType === 'subordinate') {
      // Update subordinate rating
      const updated = await prisma.subordinateRating360.update({
        where: { id: ratingId },
        data: {
          rating: rating,
          comments: comments || null,
          completedAt: now
        }
      })

      // Recalculate average for the Rating360
      await recalculateAverage(updated.rating360Id)

      return NextResponse.json({ success: true, message: 'Team member rating submitted successfully' })
    }
    else if (ratingType === 'supervisor') {
      // Update supervisor rating on Rating360
      const updated = await prisma.rating360.update({
        where: { id: ratingId },
        data: {
          supervisorRating: rating,
          supervisorComments: comments || null,
          supervisorCompletedAt: now
        }
      })

      // Recalculate average
      await recalculateAverage(updated.id)

      return NextResponse.json({ success: true, message: 'Supervisor rating submitted successfully' })
    }
    else if (ratingType === 'self') {
      // Update self rating on Rating360
      const updated = await prisma.rating360.update({
        where: { id: ratingId },
        data: {
          selfRating: rating,
          selfComments: comments || null,
          selfCompletedAt: now
        }
      })

      // Recalculate average
      await recalculateAverage(updated.id)

      return NextResponse.json({ success: true, message: 'Self-assessment submitted successfully' })
    }
    else {
      return NextResponse.json({ 
        error: 'Invalid rating type' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error submitting rating:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to recalculate average rating
async function recalculateAverage(rating360Id: string) {
  const rating = await prisma.rating360.findUnique({
    where: { id: rating360Id },
    include: {
      peerRatings: true,
      subordinateRatings: true
    }
  })

  if (!rating) return

  const ratings: number[] = []

  // Add self rating
  if (rating.selfRating !== null) {
    ratings.push(rating.selfRating)
  }

  // Add supervisor rating
  if (rating.supervisorRating !== null) {
    ratings.push(rating.supervisorRating)
  }

  // Add peer ratings
  const peerRatingsValues = rating.peerRatings
    .filter((pr: typeof rating.peerRatings[number]) => pr.rating !== null)
    .map((pr: typeof rating.peerRatings[number]) => pr.rating!)
  
  if (peerRatingsValues.length > 0) {
    const peerAvg = peerRatingsValues.reduce((sum: number, r: number) => sum + r, 0) / peerRatingsValues.length
    ratings.push(peerAvg)
  }

  // Add subordinate ratings
  const subRatingsValues = rating.subordinateRatings
    .filter((sr: typeof rating.subordinateRatings[number]) => sr.rating !== null)
    .map((sr: typeof rating.subordinateRatings[number]) => sr.rating!)
  
  if (subRatingsValues.length > 0) {
    const subAvg = subRatingsValues.reduce((sum: number, r: number) => sum + r, 0) / subRatingsValues.length
    ratings.push(subAvg)
  }

  // Calculate overall average
  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length 
    : null

  // Update status
  let status = 'PENDING'
  if (rating.selfRating !== null && rating.supervisorRating !== null) {
    status = 'IN_PROGRESS'
  }
  if (averageRating !== null && ratings.length >= 2) {
    status = 'COMPLETED'
  }

  // Update the Rating360 record
  await prisma.rating360.update({
    where: { id: rating360Id },
    data: {
      averageRating,
      status
    }
  })
}
