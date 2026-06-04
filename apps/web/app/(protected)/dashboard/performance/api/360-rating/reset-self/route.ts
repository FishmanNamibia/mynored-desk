import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST /api/360-rating/reset-self
// Any authenticated user — resets their own self-assessment
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    const updated = await prisma.rating360.updateMany({
      where: { userId: myId },
      data: {
        selfRating: null,
        selfComments: null,
        selfCompletedAt: null,
        averageRating: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: updated.count > 0 ? 'Self-assessment cleared' : 'No self-assessment found to clear',
    })
  } catch (error) {
    console.error('Error resetting self-assessment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
