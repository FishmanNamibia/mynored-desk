import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: cycleId } = await params

    // Verify cycle exists
    const cycle = await prisma.rating360Cycle.findUnique({
      where: { id: cycleId },
      include: {
        ratings: { select: { id: true } }
      }
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const ratingIds = cycle.ratings.map(r => r.id)

    // Delete in order: answers/responses first (no cascade from Rating360), then let cascade handle the rest
    if (ratingIds.length > 0) {
      // Delete questionnaire open-ended responses
      try {
        await prisma.questionnaireOpenEndedResponse.deleteMany({
          where: { rating360Id: { in: ratingIds } }
        })
      } catch (e) { /* table may not exist */ }

      // Delete questionnaire responses
      try {
        await prisma.questionnaireResponse.deleteMany({
          where: { rating360Id: { in: ratingIds } }
        })
      } catch (e) { /* table may not exist */ }

      // Delete rating360 answers
      try {
        await prisma.rating360Answer.deleteMany({
          where: { rating360Id: { in: ratingIds } }
        })
      } catch (e) { /* table may not exist */ }
    }

    // Delete the cycle — cascades to Rating360 → PeerRating360, SubordinateRating360
    await prisma.rating360Cycle.delete({
      where: { id: cycleId }
    })

    return NextResponse.json({
      success: true,
      message: `Cycle "${cycle.name}" and ${ratingIds.length} rating(s) deleted successfully`
    })
  } catch (error: any) {
    console.error('[360 cycles DELETE] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
