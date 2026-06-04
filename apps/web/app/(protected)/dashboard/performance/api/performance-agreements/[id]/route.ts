import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { status, percentComplete, progressNotes, evidenceUrl, evidenceNotes, rating } = body

    // Look up actual database user ID by email — orderBy asc = oldest (canonical) account first
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true, lastName: true }
    })
    const actualUserId = dbUser?.id || user.id
    const employeeName = `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim() || user.email || 'Employee'

    // Verify user owns this agreement OR is the supervisor/manager
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id },
      include: { user: { select: { id: true, managerId: true } } }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    const isOwner = agreement.userId === actualUserId
    const isSupervisor = agreement.supervisorId === actualUserId
    const isManager = agreement.user?.managerId === actualUserId

    if (!isOwner && !isSupervisor && !isManager) {
      return NextResponse.json({ error: 'Not authorized to update this agreement' }, { status: 403 })
    }

    // Track whether a new rating is being submitted by the owner (for notification)
    const isNewRatingByOwner = isOwner && rating !== undefined && rating !== null && rating !== agreement.rating

    // Build update data
    const updateData: any = {}

    if (isOwner) {
      if (status !== undefined) updateData.status = status
      if (percentComplete !== undefined) updateData.percentComplete = percentComplete
      if (progressNotes !== undefined) updateData.progressNotes = progressNotes
      if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
      if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes
      if (rating !== undefined) updateData.rating = rating
      if (status === 'COMPLETED') updateData.completedAt = new Date()
      // When employee moves an action back to IN_PROGRESS or NOT_STARTED, clear any REJECTED
      // approvalStatus so it no longer shows the red "Rejected - Needs Revision" badge.
      // The employee will need to re-submit for approval once the action is complete.
      if ((status === 'IN_PROGRESS' || status === 'NOT_STARTED') &&
          agreement.approvalStatus === 'REJECTED') {
        updateData.approvalStatus = null
        updateData.progressNotes = null // Clear rejection comment from supervisor
      }
    }

    if (isSupervisor || isManager) {
      if (rating !== undefined) updateData.rating = rating
      if (status !== undefined) updateData.status = status
      if (progressNotes !== undefined) updateData.progressNotes = progressNotes
    }

    // Update agreement
    const updated = await prisma.performanceAgreement.update({
      where: { id },
      data: updateData
    })

    // If the employee is revising a rejected rating, reset the approval chain
    // so it restarts from level 1 (direct supervisor) on the new rating
    if (isOwner && rating !== undefined && rating !== null) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "PerformanceRatingChain"
           SET "ratingApprovalLevel" = 0,
               "ratingApprovalChain" = NULL,
               "updatedAt" = NOW()
           WHERE "agreementId" = $1 AND "ratingApprovalLevel" = -1`,
          id
        )
      } catch { /* table may not exist yet — safe to ignore */ }
    }

    // Notify supervisor when employee submits a rating (with or without evidence)
    if (isNewRatingByOwner) {
      const supervisorId = agreement.supervisorId || agreement.user?.managerId
      if (supervisorId) {
        try {
          const safeSenderId = await getSafeSenderId(actualUserId)
          const hasEvidence = !!(evidenceUrl || agreement.evidenceUrl)
          const message = hasEvidence
            ? `${employeeName} has rated "${agreement.title}" as ${rating}/5 and attached evidence. Please review on the Approvals page.`
            : `${employeeName} has rated "${agreement.title}" as ${rating}/5. Please review on the Approvals page.`

          const notif = await prisma.pmsNotification.create({
            data: {
              senderId: safeSenderId,
              receiverId: supervisorId,
              message,
              type: 'GENERAL',
              status: 'PENDING',
              entityType: 'PerformanceAgreement',
              entityId: id,
              metadata: {
                action: 'rating_submitted',
                agreementTitle: agreement.title,
                employeeName,
                rating,
                hasEvidence
              }
            },
            include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } }
          })

          // Broadcast via SSE for real-time delivery
          try {
            const { broadcastToUser, mapNotifForBroadcast } = await import(
              '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
            )
            const unreadCount = await prisma.pmsNotification.count({
              where: { receiverId: supervisorId, status: { in: ['PENDING', 'SENT'] } }
            })
            broadcastToUser(supervisorId, { type: 'notification', notification: mapNotifForBroadcast(notif), unreadCount })
          } catch { /* SSE broadcast is best-effort */ }
        } catch (notifError) {
          console.error('Failed to send rating notification to supervisor (non-critical):', notifError)
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating performance agreement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
