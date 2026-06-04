import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

/**
 * PATCH /dashboard/performance/api/performance-agreements/[id]/discontinue
 *
 * Marks a workplan-sourced agreement as discontinued (N/A for this employee).
 * Only allowed when the agreement is isSystemGenerated=true (from the annual workplan).
 * Stores the original weight so it can be redistributed by the user.
 * Body: { discontinued: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { discontinued } = await req.json()

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

    const agreement = await prisma.performanceAgreement.findFirst({
      where: { id: params.id, userId: actualUserId }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    if (!agreement.isSystemGenerated) {
      return NextResponse.json(
        { error: 'Weight redistribution is only available for annual workplan agreements' },
        { status: 400 }
      )
    }

    if (agreement.approvalStatus === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot mark an already-approved action as discontinued' },
        { status: 400 }
      )
    }

    // When marking as discontinued: store original weight, zero out current weight
    // When un-marking: restore original weight
    const updateData: any = {
      isDiscontinued: discontinued,
      discontinuedAt: discontinued ? new Date() : null,
      updatedAt: new Date()
    }

    if (discontinued) {
      // Preserve the weight before zeroing so redistribution can use it
      updateData.originalWeight = agreement.weight ?? 0
      updateData.weight = 0
    } else {
      // Restore original weight on un-mark
      updateData.weight = agreement.originalWeight ?? agreement.weight ?? 0
      updateData.originalWeight = null
    }

    const updated = await prisma.performanceAgreement.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      id: updated.id,
      isDiscontinued: updated.isDiscontinued,
      freedWeight: discontinued ? (agreement.weight ?? 0) : 0
    })
  } catch (error: any) {
    console.error('[discontinue] Error:', error?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
