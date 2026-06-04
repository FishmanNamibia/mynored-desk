import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'

const reassignSchema = z.object({
  newResponsibleId: z.string(),
  reason: z.string().min(1, 'Reason is required'),
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
    const data = reassignSchema.parse(body)

    // Get the target
    const target = await prisma.target.findUnique({
      where: { id },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Check if user is the current responsible person
    if (target.responsibleId !== user.id) {
      return NextResponse.json({ error: 'Only the assigned person can reassign this task' }, { status: 403 })
    }

    // Check if current user is senior level (cannot delegate)
    const seniorRoles = ['EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN']
    if (userHasAnyRole(user, seniorRoles)) {
      return NextResponse.json({ error: 'Senior level staff cannot delegate tasks' }, { status: 403 })
    }

    // Get the new assignee
    const newResponsible = await prisma.user.findUnique({
      where: { id: data.newResponsibleId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    })

    if (!newResponsible) {
      return NextResponse.json({ error: 'New assignee not found' }, { status: 404 })
    }

    // Validate that new assignee is not senior level
    if (seniorRoles.includes(newResponsible.role)) {
      return NextResponse.json({ error: 'Cannot delegate to senior level staff' }, { status: 400 })
    }

    // Update the target
    const updatedTarget = await prisma.target.update({
      where: { id },
      data: {
        responsibleId: data.newResponsibleId,
      },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Create status history entry for reassignment
    await prisma.statusHistory.create({
      data: {
        targetId: id,
        oldStatus: target.status,
        newStatus: target.status,
        oldPercent: target.percentComplete,
        newPercent: target.percentComplete,
        notes: `Task reassigned from ${target.responsible.name} to ${newResponsible.name}. Reason: ${data.reason}`,
        changedBy: user.id,
      },
    })

    // Send notification to new assignee
    const safeSenderId = await getSafeSenderId(user.id)
    
    const reassignNotif = await prisma.pmsNotification.create({
      data: {
        type: 'GENERAL',
        status: 'PENDING',
        senderId: safeSenderId,
        receiverId: data.newResponsibleId,
        entityType: 'Target',
        entityId: target.id,
        message: `${user.name} has reassigned the task "${target.title}" to you. Reason: ${data.reason}`,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })

    // Broadcast via SSE for real-time delivery
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      const unreadCount1 = await prisma.pmsNotification.count({
        where: { receiverId: data.newResponsibleId, status: { in: ['PENDING', 'SENT'] } },
      })
      broadcastToUser(data.newResponsibleId, { type: 'notification', notification: reassignNotif, unreadCount: unreadCount1 })
    } catch { /* SSE broadcast is best-effort */ }

    // Send notification to original assignee's supervisor (if exists)
    const originalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { managerId: true },
    })

    if (originalUser?.managerId) {
      const supNotif = await prisma.pmsNotification.create({
        data: {
          type: 'GENERAL',
          status: 'PENDING',
          senderId: safeSenderId,
          receiverId: originalUser.managerId,
          entityType: 'Target',
          entityId: target.id,
          message: `${user.name} has reassigned the task "${target.title}" to ${newResponsible.name}. Reason: ${data.reason}`,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
      })

      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount2 = await prisma.pmsNotification.count({
          where: { receiverId: originalUser.supervisorId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(originalUser.supervisorId, { type: 'notification', notification: supNotif, unreadCount: unreadCount2 })
      } catch { /* SSE broadcast is best-effort */ }
    }

    return NextResponse.json(updatedTarget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to reassign task:', error)
    return NextResponse.json({ error: 'Failed to reassign task' }, { status: 500 })
  }
}
