import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST /api/360-rating/clear-person-rating
// Clears the rating a user submitted for a specific person (their own rating only)
// Body: { peerRating360Id } for peer/dept_random/org_random
//    OR { rating360Id, raterType: 'supervisor' } for supervisor ratings
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    const body = await req.json()
    const { peerRating360Id, rating360Id, raterType } = body

    if (peerRating360Id) {
      // Verify the rater owns this entry
      const peer = await prisma.peerRating360.findUnique({ where: { id: peerRating360Id } })
      if (!peer) return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
      if (peer.raterId !== myId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // Parse original raterType from comments, reset to empty assignment marker
      let origRaterType = 'dept_random'
      try { origRaterType = JSON.parse(peer.comments || '{}').raterType || origRaterType } catch {}

      await prisma.peerRating360.update({
        where: { id: peerRating360Id },
        data: {
          rating: null,
          comments: JSON.stringify({ raterType: origRaterType, scores: {} }),
          completedAt: null,
        },
      })
      // Null out the cached averageRating on the parent Rating360 so my-rate recomputes fresh
      await prisma.rating360.update({
        where: { id: peer.rating360Id },
        data: { averageRating: null },
      }).catch(() => {})
      return NextResponse.json({ success: true, message: 'Rating cleared' })
    }

    if (rating360Id && raterType === 'supervisor') {
      // Verify I'm the supervisor for this rating
      const r360 = await prisma.rating360.findUnique({ where: { id: rating360Id } })
      if (!r360) return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
      if (r360.supervisorId !== myId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      await prisma.rating360.update({
        where: { id: rating360Id },
        data: {
          supervisorRating: null,
          supervisorComments: null,
          supervisorCompletedAt: null,
          averageRating: null,
        },
      })
      return NextResponse.json({ success: true, message: 'Supervisor rating cleared' })
    }

    return NextResponse.json({ error: 'peerRating360Id or (rating360Id + raterType) required' }, { status: 400 })
  } catch (error) {
    console.error('Error clearing person rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
