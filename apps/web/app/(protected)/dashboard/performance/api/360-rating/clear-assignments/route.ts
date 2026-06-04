import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST /api/360-rating/clear-assignments
// HC/OD only — deletes ALL PeerRating360 entries for the active cycle (rated and unrated)
// This is the nuclear option before a clean re-initialize
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
    const clearRated = body?.clearRated !== false // Default to true (clear all) unless explicitly set to false

    const cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) return NextResponse.json({ error: 'No active cycle found' }, { status: 400 })

    const r360Ids = (
      await prisma.rating360.findMany({ where: { cycleId: cycle.id }, select: { id: true } })
    ).map((r) => r.id)

    let deleted = 0
    if (r360Ids.length > 0) {
      const where = clearRated
        ? { rating360Id: { in: r360Ids } }
        : { rating360Id: { in: r360Ids }, rating: null }

      const result = await prisma.peerRating360.deleteMany({ where })
      deleted = result.count
    }

    return NextResponse.json({
      success: true,
      deleted,
      message: `Cleared ${deleted} random assignment${deleted !== 1 ? 's' : ''} from the active cycle`,
    })
  } catch (error) {
    console.error('Error clearing assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
