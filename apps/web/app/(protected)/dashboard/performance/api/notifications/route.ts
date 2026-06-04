import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const notificationSchema = z.object({
  type: z.enum(['DELETE_REQUEST', 'DELETE_APPROVED', 'DELETE_REJECTED', 'GENERAL']),
  title: z.string().min(1),
  message: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  entityData: z.any().optional(),
  receiverId: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ from DB ID)
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: user.email },
        select: { id: true }
      })
      if (dbUser) actualUserId = dbUser.id
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let where: any = {
      receiverId: actualUserId,
    }

    if (status) {
      where.status = status
    }

    const notifications = await prisma.pmsNotification.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {}),
    })

    // Map sender to include a computed `name` field for backward compat
    const mapped = notifications.map((n: any) => ({
      ...n,
      sender: n.sender ? { ...n.sender, name: `${n.sender.firstName || ''} ${n.sender.lastName || ''}`.trim() || n.sender.email } : null,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const data = notificationSchema.parse(body)

    const safeSenderId = await getSafeSenderId(user.id)

    const notification = await prisma.pmsNotification.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        type: data.type as any,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.entityData,
        senderId: safeSenderId,
        receiverId: data.receiverId,
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

    // Broadcast to SSE connections for real-time delivery
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      const unreadCount = await prisma.pmsNotification.count({
        where: { receiverId: data.receiverId, status: { in: ['PENDING', 'SENT'] } },
      })
      broadcastToUser(data.receiverId, {
        type: 'notification',
        notification,
        unreadCount,
      })
    } catch (broadcastError) {
      // SSE broadcast is best-effort
      console.warn('[notifications POST] SSE broadcast failed (non-fatal):', broadcastError)
    }

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      console.error('Validation error:', errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    console.error('Failed to create notification:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to create notification', 
      details: errorMessage 
    }, { status: 500 })
  }
}

