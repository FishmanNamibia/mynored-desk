import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agreementId, action, comment } = await req.json()

    if (!agreementId || !action) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!['accept', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    if (action === 'reject' && (!comment || !comment.trim())) {
      return NextResponse.json({ error: 'A comment is required when rejecting an altered rating' }, { status: 400 })
    }

    // Get the agreement and verify ownership
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id: agreementId },
      select: { 
        id: true, 
        title: true, 
        rating: true, 
        userId: true, 
        supervisorId: true, 
        progressNotes: true,
        approvalStatus: true,
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true,
            managerId: true
          }
        }
      }
    })

    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })

    // Resolve actual DB user ID by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    // Verify the user is the agreement owner
    if (agreement.userId !== actualUserId) {
      return NextResponse.json({ error: 'Only the agreement owner can respond to altered ratings' }, { status: 403 })
    }

    // Check if there's an altered rating to respond to
    const hasAlteredRating = agreement.progressNotes?.includes('adjusted your rating') || 
                           agreement.progressNotes?.includes('altered') || 
                           agreement.progressNotes?.includes('changed your rating')

    if (!hasAlteredRating) {
      return NextResponse.json({ error: 'No altered rating found to respond to' }, { status: 400 })
    }

    const dateStr = new Date().toLocaleDateString('en-GB')
    const employeeName = `${agreement.user?.firstName || ''} ${agreement.user?.lastName || ''}`.trim() || 'Employee'

    if (action === 'accept') {
      // Accept the altered rating - make it final
      const acceptMarker = `\n\n--- Rating Accepted (${employeeName}, ${dateStr}) ---${comment?.trim() ? '\n' + comment.trim() : ''}`
      
      await prisma.performanceAgreement.update({
        where: { id: agreementId },
        data: {
          progressNotes: (agreement.progressNotes || '') + acceptMarker,
          approvalStatus: 'APPROVED'
        }
      })

      // Reset rating approval chain to mark as complete
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "PerformanceRatingChain"
           SET "ratingApprovalLevel" = 99,
               "updatedAt" = NOW()
           WHERE "agreementId" = $1`,
          agreementId
        )
      } catch { /* table may not exist yet — safe to ignore */ }

      // Notify supervisor that rating was accepted
      if (agreement.supervisorId) {
        try {
          const safeSenderId = await getSafeSenderId(actualUserId)
          const notif = await prisma.pmsNotification.create({
            data: {
              senderId: safeSenderId,
              receiverId: agreement.supervisorId,
              message: `${employeeName} accepted your adjusted rating for "${agreement.title}". The rating is now final.`,
              type: 'APPROVED',
              status: 'PENDING',
              entityType: 'PerformanceAgreement',
              entityId: agreementId,
              metadata: {
                action: 'rating_accepted',
                agreementTitle: agreement.title,
                employeeName
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
              where: { receiverId: agreement.supervisorId, status: { in: ['PENDING', 'SENT'] } }
            })
            broadcastToUser(agreement.supervisorId, { type: 'notification', notification: mapNotifForBroadcast(notif), unreadCount })
          } catch { /* SSE broadcast is best-effort */ }
        } catch (notifError) {
          console.error('Failed to send acceptance notification to supervisor (non-critical):', notifError)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Rating accepted and finalized',
        action: 'accepted'
      })

    } else if (action === 'reject') {
      // Reject the altered rating - restart the process
      const rejectMarker = `\n\n--- Rating Rejected (${employeeName}, ${dateStr}) ---\n${comment.trim()}`
      
      await prisma.performanceAgreement.update({
        where: { id: agreementId },
        data: {
          progressNotes: (agreement.progressNotes || '') + rejectMarker,
          rating: null,
          approvalStatus: 'PENDING'
        }
      })

      // Reset rating approval chain to restart the process
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "PerformanceRatingChain"
           SET "ratingApprovalLevel" = 0,
               "ratingApprovalChain" = NULL,
               "updatedAt" = NOW()
           WHERE "agreementId" = $1`,
          agreementId
        )
      } catch { /* table may not exist yet — safe to ignore */ }

      // Notify supervisor that rating was rejected and needs to be restarted
      if (agreement.supervisorId) {
        try {
          const safeSenderId = await getSafeSenderId(actualUserId)
          const notif = await prisma.pmsNotification.create({
            data: {
              senderId: safeSenderId,
              receiverId: agreement.supervisorId,
              message: `${employeeName} rejected your adjusted rating for "${agreement.title}". Please review and provide a new rating.`,
              type: 'REJECTED',
              status: 'PENDING',
              entityType: 'PerformanceAgreement',
              entityId: agreementId,
              metadata: {
                action: 'rating_rejected',
                agreementTitle: agreement.title,
                employeeName,
                comment: comment.trim()
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
              where: { receiverId: agreement.supervisorId, status: { in: ['PENDING', 'SENT'] } }
            })
            broadcastToUser(agreement.supervisorId, { type: 'notification', notification: mapNotifForBroadcast(notif), unreadCount })
          } catch { /* SSE broadcast is best-effort */ }
        } catch (notifError) {
          console.error('Failed to send rejection notification to supervisor (non-critical):', notifError)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Rating rejected and process restarted',
        action: 'rejected'
      })
    }

  } catch (error) {
    console.error('Error responding to altered rating:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
