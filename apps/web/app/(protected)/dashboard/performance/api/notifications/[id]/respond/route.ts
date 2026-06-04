import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'

const responseSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  adminNote: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = responseSchema.parse(body)

    const notification = await prisma.pmsNotification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.status !== 'PENDING') {
      return NextResponse.json({ error: 'Notification already processed' }, { status: 400 })
    }

    // Update notification status
    const updatedNotification = await prisma.pmsNotification.update({
      where: { id },
      data: {
        status: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        metadata: {
          ...(notification.metadata as any || {}),
          adminNote: data.adminNote,
          respondedAt: new Date().toISOString(),
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // Handle weight unlock request
    if (notification.entityType === 'UserTaskWeight' && (notification.metadata as any)?.requestType === 'WEIGHT_UNLOCK') {
      const meta = notification.metadata as any
      const weightId = meta?.weightId
      const requesterId = meta?.requesterId || notification.senderId

      if (weightId && data.action === 'APPROVE') {
        // Unlock the weight allocation (set isApproved to false so user can edit)
        await prisma.userTaskWeight.update({
          where: { id: weightId },
          data: { isApproved: false, pendingCategories: null }
        })
      }

      // Send response notification to the requester
      if (requesterId) {
        const safeSenderId = await getSafeSenderId(user.id)
        const executiveName = user.name || user.email || 'Your executive'

        const responseNotification = await prisma.pmsNotification.create({
          data: {
            type: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            message: data.action === 'APPROVE'
              ? `${executiveName} has granted you access to modify your weight allocation. You may now update your weights (one-time access).${data.adminNote ? ` Note: ${data.adminNote}` : ''}`
              : `${executiveName} has rejected your request to modify weight allocation.${data.adminNote ? ` Reason: ${data.adminNote}` : ''}`,
            senderId: safeSenderId,
            receiverId: requesterId,
            entityType: 'UserTaskWeight',
            entityId: weightId || '',
            status: 'PENDING',
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        })

        // Broadcast via SSE
        try {
          const { broadcastToUser } = await import(
            '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
          )
          const unreadCount = await prisma.pmsNotification.count({
            where: { receiverId: requesterId, status: { in: ['PENDING', 'SENT'] } },
          })
          broadcastToUser(requesterId, {
            type: 'notification',
            notification: responseNotification,
            unreadCount,
          })
        } catch { /* SSE best-effort */ }
      }

      return NextResponse.json(updatedNotification)
    }

    // Handle delete request approval
    if (data.action === 'APPROVE' && notification.type === 'DELETE_REQUEST') {
      if (notification.entityType && notification.entityId) {
        try {
          if (notification.entityType === 'Goal') {
            await (prisma as any).goal.delete({ where: { id: notification.entityId } })
          } else if (notification.entityType === 'Target') {
            await prisma.target.delete({ where: { id: notification.entityId } })
          }
        } catch (deleteError) {
          console.error('Failed to delete entity:', deleteError)
          return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 })
        }
      }
    }

    // Send generic response notification to requester
    if (notification.senderId) {
      const safeSenderId = await getSafeSenderId(user.id)
      const responseNotification = await prisma.pmsNotification.create({
        data: {
          type: data.action === 'APPROVE' ? 'DELETE_APPROVED' : 'DELETE_REJECTED',
          message: data.action === 'APPROVE'
            ? `Your request has been approved.${data.adminNote ? ` Note: ${data.adminNote}` : ''}`
            : `Your request has been rejected.${data.adminNote ? ` Reason: ${data.adminNote}` : ''}`,
          senderId: safeSenderId,
          receiverId: notification.senderId,
          status: 'PENDING',
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })

      // Broadcast via SSE
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: notification.senderId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(notification.senderId, {
          type: 'notification',
          notification: responseNotification,
          unreadCount,
        })
      } catch { /* SSE best-effort */ }
    }

    return NextResponse.json(updatedNotification)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    console.error('Failed to respond to notification:', error)
    return NextResponse.json({ error: 'Failed to respond to notification' }, { status: 500 })
  }
}
