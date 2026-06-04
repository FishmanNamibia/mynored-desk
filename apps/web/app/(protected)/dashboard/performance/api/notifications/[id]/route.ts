import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'

const responseSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  adminNote: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notification = await prisma.pmsNotification.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Only receiver can view
    if (notification.receiverId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Failed to fetch notification:', error)
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
  }
}

export async function PATCH(
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
    
    // Simple mark as read (any authenticated user can mark their own notifications as read)
    if (body.status === 'READ') {
      const notification = await prisma.pmsNotification.findUnique({
        where: { id },
      })

      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
      }

      // Only the receiver can mark as read
      if (notification.receiverId !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const updatedNotification = await prisma.pmsNotification.update({
        where: { id },
        data: { status: 'READ' },
      })

      return NextResponse.json(updatedNotification)
    }

    const data = responseSchema.parse(body)

    const notification = await prisma.pmsNotification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Resolve actual DB user by email (session ID may differ from DB ID)
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, jobTitle: true, roles: { select: { role: { select: { name: true } } } } }
    })
    const actualUserId = dbUser?.id || user.id
    const dbJobTitle = (dbUser?.jobTitle || '').toUpperCase()
    const dbRoles = dbUser?.roles?.map(r => r.role.name.toUpperCase()) || []

    // Authorization: the notification receiver is always authorized to act on it.
    // Also allow users with manager/executive/admin roles or job titles.
    const isReceiver = notification.receiverId === actualUserId
    const hasManagerRole = userHasAnyRole(user, ['ADMIN', 'MANAGER', 'EXECUTIVE', 'SG', 'DEPUTY_SG'])
    const hasManagerTitle = dbJobTitle.includes('MANAGER') || dbJobTitle.includes('EXECUTIVE') ||
      dbJobTitle.includes('SUPERVISOR') || dbJobTitle.includes('HEAD') ||
      dbJobTitle.includes('SENIOR') || dbJobTitle.includes('STATISTICIAN') ||
      dbJobTitle.includes('DIRECTOR') || dbJobTitle.includes('ADMIN')
    const hasManagerDbRole = dbRoles.some(r =>
      ['ADMIN', 'MANAGER', 'EXECUTIVE', 'SG', 'DEPUTY_SG', 'SUPERVISOR'].includes(r)
    )

    if (!isReceiver && !hasManagerRole && !hasManagerTitle && !hasManagerDbRole) {
      return NextResponse.json({ error: 'Unauthorized - not authorized to respond to this notification' }, { status: 403 })
    }

    if (notification.status !== 'PENDING') {
      return NextResponse.json({ error: 'Notification already processed' }, { status: 400 })
    }

    // Update notification status — preserve existing metadata (contains requestType, weightId etc.)
    const updatedNotification = await prisma.pmsNotification.update({
      where: { id },
      data: {
        status: (data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED') as any,
        metadata: {
          ...(notification.metadata as any || {}),
          adminNote: data.adminNote,
          respondedAt: new Date().toISOString(),
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // If approved and it's a weight unlock request, unlock the weights
    if (notification.entityType === 'UserTaskWeight' && (notification.metadata as any)?.requestType === 'WEIGHT_UNLOCK') {
      const meta = notification.metadata as any
      const weightId = meta?.weightId
      if (weightId) {
        if (data.action === 'APPROVE') {
          await prisma.userTaskWeight.update({
            where: { id: weightId },
            data: { isApproved: false, pendingCategories: null }
          })
        }
        // Send response notification to the requester
        const safeSenderId = await getSafeSenderId(user.id)
        if (notification.senderId) {
          const responseNotification = await prisma.pmsNotification.create({
            data: {
              type: data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
              message: data.action === 'APPROVE'
                ? `Your weight allocation has been unlocked by your executive. You can now modify your weights.${data.adminNote ? ` Note: ${data.adminNote}` : ''}`
                : `Your request to unlock weight allocation has been rejected.${data.adminNote ? ` Reason: ${data.adminNote}` : ''}`,
              senderId: safeSenderId,
              receiverId: notification.senderId,
              entityType: 'UserTaskWeight',
              entityId: weightId,
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
      }
    }

    // If approved and it's a delete request, perform the deletion
    if (data.action === 'APPROVE' && (notification.type as any) === 'DELETE_REQUEST') {
      if (notification.entityType && notification.entityId) {
        try {
          if (notification.entityType === 'Goal') {
            await prisma.goal.delete({
              where: { id: notification.entityId },
            })
          } else if (notification.entityType === 'Target') {
            await prisma.target.delete({
              where: { id: notification.entityId },
            })
          }

          // Create audit log
          await createAuditLog({
            userId: user.id,
            resourceType: notification.entityType || 'Unknown',
            resourceId: notification.entityId || id,
            action: 'DELETE',
            details: { metadata: notification.metadata },
          })
        } catch (deleteError) {
          console.error('Failed to delete entity:', deleteError)
          return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 })
        }
      }
    }

    // Send response notification to requester
    const safeSenderId = await getSafeSenderId(user.id)
    
    if (notification.senderId) {
      const responseNotification = await prisma.pmsNotification.create({
        data: {
          type: (data.action === 'APPROVE' ? 'DELETE_APPROVED' : 'DELETE_REJECTED') as any,
          message: data.action === 'APPROVE' 
            ? `Your request to delete ${notification.entityType} has been approved.${data.adminNote ? ` Note: ${data.adminNote}` : ''}`
            : `Your request to delete ${notification.entityType} has been rejected.${data.adminNote ? ` Reason: ${data.adminNote}` : ''}`,
          senderId: safeSenderId,
          receiverId: notification.senderId,
          status: 'PENDING',
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })

      // Broadcast response notification via SSE
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
      } catch {
        // SSE broadcast is best-effort
      }
    }

    return NextResponse.json(updatedNotification)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    console.error('Failed to update notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notification = await prisma.pmsNotification.findUnique({
      where: { id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Only receiver can delete their notifications
    if (notification.receiverId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.pmsNotification.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
