import { NextRequest } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


// Store active SSE connections per user
// This is an in-memory store — works for single-instance deployments
const connections = new Map<string, Set<ReadableStreamDefaultController>>()

/**
 * Register a controller so the broadcast helper can push to it later.
 */
export function registerConnection(userId: string, controller: ReadableStreamDefaultController) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set())
  }
  connections.get(userId)!.add(controller)
}

export function unregisterConnection(userId: string, controller: ReadableStreamDefaultController) {
  const userConns = connections.get(userId)
  if (userConns) {
    userConns.delete(controller)
    if (userConns.size === 0) {
      connections.delete(userId)
    }
  }
}

/**
 * Normalize a Prisma notification record for SSE broadcast.
 * Ensures sender.name is always a string (bell component expects this shape).
 */
export function mapNotifForBroadcast(notif: any) {
  return {
    ...notif,
    sender: notif.sender ? {
      id: notif.sender.id,
      name: (notif.sender.name
        ?? (`${notif.sender.firstName || ''} ${notif.sender.lastName || ''}`.trim()
        || notif.sender.email)),
      email: notif.sender.email,
    } : null,
  }
}

/**
 * Broadcast a notification event to all active SSE connections for a user.
 * Called from the centralized createNotification helper.
 */
export function broadcastToUser(userId: string, notification: any) {
  const userConns = connections.get(userId)
  if (!userConns || userConns.size === 0) return

  const data = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`
  const encoder = new TextEncoder()

  for (const controller of userConns) {
    try {
      controller.enqueue(encoder.encode(data))
    } catch {
      // Connection closed — clean up
      userConns.delete(controller)
    }
  }
}

/**
 * SSE endpoint — clients connect here to receive real-time notifications.
 * 
 * Protocol:
 *   - On connect: sends all unread notifications as `event: init`
 *   - On new notification: sends `event: notification` with the notification data
 *   - Heartbeat every 30s to keep connection alive
 */
export async function GET(req: NextRequest) {
  const { user } = await getAuthenticatedUser(req)
  if (!user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Resolve actual DB user by email (auth token ID may differ)
  let userId = user.id
  try {
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true }
    })
    userId = dbUser?.id || user.id
  } catch (dbError) {
    console.error('[SSE] Failed to fetch user from DB, using auth ID:', dbError)
  }
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Register this connection
      registerConnection(userId, controller)

      // Send initial unread notifications
      try {
        const unreadNotifications = await prisma.pmsNotification.findMany({
          where: {
            receiverId: userId,
            status: { in: ['PENDING', 'SENT'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        })

        // Map sender to include computed name field
        const mappedNotifications = unreadNotifications.map((n: any) => ({
          ...n,
          sender: n.sender ? { id: n.sender.id, name: `${n.sender.firstName || ''} ${n.sender.lastName || ''}`.trim() || n.sender.email, email: n.sender.email } : null,
        }))

        const unreadCount = await prisma.pmsNotification.count({
          where: {
            receiverId: userId,
            status: { in: ['PENDING', 'SENT'] },
          },
        })

        const initData = {
          type: 'init',
          notifications: mappedNotifications,
          unreadCount,
        }

        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify(initData)}\n\n`)
        )
      } catch (error) {
        console.error('[SSE] Failed to fetch initial notifications:', error)
        // Send empty init so the client doesn't hang
        const initData = { type: 'init', notifications: [], unreadCount: 0 }
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify(initData)}\n\n`)
        )
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Periodic check for new notifications (fallback for missed broadcasts)
      let lastCheck = new Date()
      const pollInterval = setInterval(async () => {
        try {
          const newNotifications = await prisma.pmsNotification.findMany({
            where: {
              receiverId: userId,
              createdAt: { gt: lastCheck },
              status: { in: ['PENDING', 'SENT'] },
            },
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          })

          if (newNotifications.length > 0) {
            lastCheck = new Date()

            const unreadCount = await prisma.pmsNotification.count({
              where: {
                receiverId: userId,
                status: { in: ['PENDING', 'SENT'] },
              },
            })

            for (const notif of newNotifications) {
              // Map sender to include computed name field
              const mappedNotif = {
                ...notif,
                sender: (notif as any).sender ? {
                  id: (notif as any).sender.id,
                  name: `${(notif as any).sender.firstName || ''} ${(notif as any).sender.lastName || ''}`.trim() || (notif as any).sender.email,
                  email: (notif as any).sender.email,
                } : null,
              }

              const eventData = {
                type: 'notification',
                notification: mappedNotif,
                unreadCount,
              }
              controller.enqueue(
                encoder.encode(`event: notification\ndata: ${JSON.stringify(eventData)}\n\n`)
              )
            }
          }
        } catch {
          // Silently ignore poll errors
        }
      }, 10000) // Check every 10 seconds as fallback

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clearInterval(pollInterval)
        unregisterConnection(userId, controller)
      })
    },

    cancel() {
      // Stream cancelled by client
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

