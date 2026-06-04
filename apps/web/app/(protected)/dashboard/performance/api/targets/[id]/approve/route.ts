import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'

const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  supervisorRating: z.number().min(1).max(5).optional(),
  rejectionReason: z.string().optional(),
  newStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).optional(),
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
    const data = approvalSchema.parse(body)

    // Fetch the target
    const target = await prisma.target.findUnique({
      where: { id },
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            supervisorId: true,
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Check if user is the supervisor of the responsible person
    const isSupervisor = target.responsible.supervisorId === user.id
    const isLeadership = userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER'])

    if (!isSupervisor && !isLeadership) {
      return NextResponse.json({ error: 'Only supervisors can approve/reject tasks' }, { status: 403 })
    }

    // Check if task is submitted for approval
    if (target.approvalStatus !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Task is not submitted for approval' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {
      approvedBy: user?.id,
      approvedAt: new Date(),
    }

    if (data.action === 'APPROVE') {
      updateData.approvalStatus = 'APPROVED'
      updateData.status = 'COMPLETED' // Only truly completed when approved
      updateData.percentComplete = 100
      if (data.supervisorRating) {
        updateData.supervisorRating = data.supervisorRating
      }
    } else {
      updateData.approvalStatus = 'REJECTED'
      // Use provided status or default to IN_PROGRESS
      updateData.status = data.newStatus || 'IN_PROGRESS'
      updateData.percentComplete = data.newStatus === 'NOT_STARTED' ? 0 : 50
      if (data.rejectionReason) {
        updateData.rejectionReason = data.rejectionReason
      }
    }

    // Update target
    const updatedTarget = await prisma.target.update({
      where: { id },
      data: updateData,
      include: {
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    await createAuditLog({
      userId: user.id,
      resourceType: 'Target',
      resourceId: updatedTarget.id,
      action: 'UPDATE',
      details: { approvalStatus: updateData.approvalStatus, supervisorRating: data.supervisorRating, reason: data.rejectionReason },
    })

    // Send notification to staff member
    const safeSenderId = await getSafeSenderId(user.id)
    
    const approvalNotif = await prisma.pmsNotification.create({
      data: {
        type: 'GENERAL',
        status: 'PENDING',
        senderId: safeSenderId,
        receiverId: target.responsibleId,
        entityType: 'Target',
        entityId: target.id,
        message: data.action === 'APPROVE'
          ? `Your task "${target.title}" has been approved by ${user.name}${data.supervisorRating ? ` with a rating of ${data.supervisorRating}/5` : ''}.`
          : `Your task "${target.title}" was rejected by ${user.name}. Reason: ${data.rejectionReason || 'No reason provided'}`,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })

    // Broadcast via SSE for real-time delivery
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      const unreadCount = await prisma.pmsNotification.count({
        where: { receiverId: target.responsibleId, status: { in: ['PENDING', 'SENT'] } },
      })
      broadcastToUser(target.responsibleId, { type: 'notification', notification: approvalNotif, unreadCount })
    } catch { /* SSE broadcast is best-effort */ }

    return NextResponse.json(updatedTarget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to process approval:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
