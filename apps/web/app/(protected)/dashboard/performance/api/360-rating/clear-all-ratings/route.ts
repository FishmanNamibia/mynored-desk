import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST /api/360-rating/clear-all-ratings
// HC/OD only — deletes ALL 360 rating data for the active cycle
// This includes PeerRating360, Rating360Answers, and resets Rating360 averages
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobTitle = (user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const canManage =
      jobTitle.includes('human capital') ||
      jobTitle.includes('od specialist') ||
      userRoles.some((r) => ['ADMIN', 'SG'].includes(r))
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { confirm } = body

    if (confirm !== 'CLEAR_ALL_360_RATINGS') {
      return NextResponse.json({ 
        error: 'Confirmation required. Please send { "confirm": "CLEAR_ALL_360_RATINGS" }' 
      }, { status: 400 })
    }

    const cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) return NextResponse.json({ error: 'No active cycle found' }, { status: 400 })

    // Get all Rating360 records for this cycle
    const rating360Records = await prisma.rating360.findMany({
      where: { cycleId: cycle.id },
      select: { id: true }
    })

    const r360Ids = rating360Records.map(r => r.id)

    if (r360Ids.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No 360 rating records found for active cycle',
        deletedPeerRatings: 0,
        deletedAnswers: 0,
        resetMainRatings: 0
      })
    }

    // Delete all PeerRating360 entries for this cycle
    const deletedPeerRatings = await prisma.peerRating360.deleteMany({
      where: { rating360Id: { in: r360Ids } }
    })

    // Delete all Rating360Answer entries for this cycle
    const deletedAnswers = await prisma.rating360Answer.deleteMany({
      where: { rating360Id: { in: r360Ids } }
    })

    // Reset all Rating360 records to initial state
    const resetMainRatings = await prisma.rating360.updateMany({
      where: { id: { in: r360Ids } },
      data: {
        selfRating: null,
        selfComments: null,
        selfCompletedAt: null,
        supervisorRating: null,
        supervisorComments: null,
        supervisorCompletedAt: null,
        averageRating: null,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all 360 rating data for active cycle "${cycle.name}"`,
      deletedPeerRatings: deletedPeerRatings.count,
      deletedAnswers: deletedAnswers.count,
      resetMainRatings: resetMainRatings.count,
      cycleName: cycle.name,
      clearedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error clearing all 360 ratings:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 })
  }
}
