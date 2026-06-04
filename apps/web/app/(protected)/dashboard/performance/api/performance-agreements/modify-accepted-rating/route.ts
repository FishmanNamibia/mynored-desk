import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agreementId, action, newRating, comment } = await req.json()

    if (!agreementId || action !== 'modify_accepted') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (!newRating || newRating < 1 || newRating > 5) {
      return NextResponse.json({ error: 'Invalid rating (1-5)' }, { status: 400 })
    }
    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'A comment is required when modifying an accepted rating' }, { status: 400 })
    }

    // Get the agreement
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
            email: true
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

    // Check if the rating is actually accepted
    const isAccepted = agreement.progressNotes?.includes('--- Rating Accepted')
    if (!isAccepted) {
      return NextResponse.json({ error: 'This rating has not been fully accepted yet' }, { status: 400 })
    }

    const dateStr = new Date().toLocaleDateString('en-GB')
    const supervisorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Supervisor'

    // Add modification marker and reset the approval chain
    const modificationMarker = `\n\n--- Rating Modified by ${supervisorName} (from ${agreement.rating}/5 to ${newRating}/5, ${dateStr}) ---\n${comment.trim()}\n\n--- Rating process restarted ---`
    
    await prisma.performanceAgreement.update({
      where: { id: agreementId },
      data: {
        rating: newRating,
        progressNotes: (agreement.progressNotes || '') + modificationMarker,
        approvalStatus: 'PENDING'
      }
    })

    // Reset rating approval chain to restart the process
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "PerformanceRatingChain"
         SET "ratingApprovalLevel" = 1,
             "ratingApprovalChain" = NULL,
             "updatedAt" = NOW()
         WHERE "agreementId" = $1`,
        agreementId
      )
    } catch { /* table may not exist yet — safe to ignore */ }

    // Notify employee that rating was modified
    try {
      const safeSenderId = await getSafeSenderId(actualUserId)
      const notif = await prisma.pmsNotification.create({
        data: {
          senderId: safeSenderId,
          receiverId: agreement.userId,
          message: `${supervisorName} modified your accepted rating for "${agreement.title}" from ${agreement.rating}/5 to ${newRating}/5. Please review and respond.`,
          type: 'GENERAL',
          status: 'PENDING',
          entityType: 'PerformanceAgreement',
          entityId: agreementId,
          metadata: {
            action: 'rating_modified',
            agreementTitle: agreement.title,
            oldRating: agreement.rating,
            newRating,
            supervisorName
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
          where: { receiverId: agreement.userId, status: { in: ['PENDING', 'SENT'] } }
        })
        broadcastToUser(agreement.userId, { type: 'notification', notification: mapNotifForBroadcast(notif), unreadCount })
      } catch { /* SSE broadcast is best-effort */ }
    } catch (notifError) {
      console.error('Failed to send modification notification to employee (non-critical):', notifError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rating modified and approval process restarted',
      action: 'modified'
    })

  } catch (error) {
    console.error('Error modifying accepted rating:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
