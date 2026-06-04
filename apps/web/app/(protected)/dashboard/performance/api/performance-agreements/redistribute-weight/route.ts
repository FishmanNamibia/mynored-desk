import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

/**
 * POST /dashboard/performance/api/performance-agreements/redistribute-weight
 *
 * Bulk-updates the weight of multiple workplan agreements in one shot.
 * Body: { weights: Array<{ id: string; weight: number }> }
 * Rules:
 *  - Total of all active (non-discontinued) agreement weights must equal 100
 *  - Only allowed for isSystemGenerated agreements owned by the caller
 *  - Discontinued agreements must have weight = 0
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weights } = await req.json() as { weights: { id: string; weight: number }[] }

    if (!Array.isArray(weights) || weights.length === 0) {
      return NextResponse.json({ error: 'weights array is required' }, { status: 400 })
    }

    // Resolve canonical DB user
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) actualUserId = dbUser.id
    }

    const ids = weights.map(w => w.id)

    // Verify ownership and workplan source
    const agreements = await prisma.performanceAgreement.findMany({
      where: { id: { in: ids }, userId: actualUserId, isAdhocContainer: false },
      select: { id: true, isSystemGenerated: true, isDiscontinued: true }
    })

    if (agreements.length !== ids.length) {
      return NextResponse.json({ error: 'One or more agreements not found or not owned by you' }, { status: 404 })
    }

    const nonWorkplan = agreements.filter(a => !a.isSystemGenerated)
    if (nonWorkplan.length > 0) {
      return NextResponse.json(
        { error: 'Weight redistribution is only available for annual workplan agreements' },
        { status: 400 }
      )
    }

    // Validate total of non-discontinued weights = 100
    const agreementMap = new Map(agreements.map(a => [a.id, a]))
    const activeTotal = weights
      .filter(w => !agreementMap.get(w.id)?.isDiscontinued)
      .reduce((sum, w) => sum + (w.weight ?? 0), 0)

    if (activeTotal !== 100) {
      return NextResponse.json(
        { error: `Total weight of active actions must equal 100% (currently ${activeTotal}%)` },
        { status: 400 }
      )
    }

    // Apply all weight updates in a transaction
    await prisma.$transaction(
      weights.map(w =>
        prisma.performanceAgreement.update({
          where: { id: w.id },
          data: { weight: w.weight, updatedAt: new Date() }
        })
      )
    )

    return NextResponse.json({ success: true, updatedCount: weights.length })
  } catch (error: any) {
    console.error('[redistribute-weight] Error:', error?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
