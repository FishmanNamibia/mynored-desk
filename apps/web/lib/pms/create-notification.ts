import { prisma } from './prisma'
import { getSafeSenderId } from './notification-helper'

/**
 * Centralized notification creation helper.
 * 
 * Creates a PmsNotification record in the database AND broadcasts it
 * to the user's active SSE connections for real-time delivery.
 * 
 * Usage:
 *   import { createNotification } from '@/lib/pms/create-notification'
 *   
 *   await createNotification({
 *     type: 'TARGET_ASSIGNED',
 *     message: 'You have been assigned a new target',
 *     receiverId: targetUserId,
 *     senderId: currentUserId,
 *     entityType: 'TARGET',
 *     entityId: target.id,
 *   })
 */

interface CreateNotificationParams {
  type: string
  message: string
  receiverId: string
  senderId?: string | null
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams) {
  const { type, message, receiverId, senderId, entityType, entityId, metadata } = params

  try {
    // Validate sender exists in DB to prevent FK errors
    const safeSenderId = await getSafeSenderId(senderId)

    // Create the notification record
    const notification = await prisma.pmsNotification.create({
      data: {
        type: type as any,
        message,
        receiverId,
        senderId: safeSenderId,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata || null,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Broadcast to SSE connections
    // Dynamic import to avoid circular dependency issues
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      broadcastToUser(receiverId, {
        type: 'notification',
        notification,
        unreadCount: await prisma.pmsNotification.count({
          where: {
            receiverId,
            status: { in: ['PENDING', 'SENT'] },
          },
        }),
      })
    } catch (broadcastError) {
      // SSE broadcast is best-effort — don't fail the notification creation
      console.warn('[createNotification] SSE broadcast failed (non-fatal):', broadcastError)
    }

    return notification
  } catch (error) {
    console.error('[createNotification] Failed to create notification:', error)
    throw error
  }
}

/**
 * Create notifications for multiple receivers at once.
 */
export async function createBulkNotifications(
  params: Omit<CreateNotificationParams, 'receiverId'> & { receiverIds: string[] }
) {
  const { receiverIds, ...rest } = params
  const results = await Promise.allSettled(
    receiverIds.map((receiverId) => createNotification({ ...rest, receiverId }))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  if (failed > 0) {
    console.warn(`[createBulkNotifications] ${failed}/${receiverIds.length} notifications failed`)
  }

  return { succeeded, failed, total: receiverIds.length }
}

