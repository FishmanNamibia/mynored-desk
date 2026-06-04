import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'

const statusUpdateSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
  progressNotes: z.string().optional(),
  staffRating: z.number().min(1).max(5).optional(),
  evidenceUrl: z.string().optional(),
  evidenceNotes: z.string().optional(),
  completedAt: z.string().optional(),
  approvalStatus: z.enum(['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
})

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
    const data = statusUpdateSchema.parse(body)

    // Get the target with full context
    const target = await prisma.target.findUnique({
      where: { id },
      include: {
        responsible: {
          include: {
            department: true,
            division: {
              include: {
                department: true,
              },
            },
          },
        },
        initiative: {
          include: {
            objective: {
              include: {
                goal: true,
              },
            },
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Get current user with their organizational context
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true,
        division: {
          include: {
            department: true,
          },
        },
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    const isResponsible = target.responsibleId === user.id
    const isExecutive = currentUser.role === 'EXECUTIVE' && 
                       currentUser.departmentId && 
                       (target.responsible.departmentId === currentUser.departmentId || 
                        target.responsible.division?.departmentId === currentUser.departmentId)
    const isSeniorLeadership = currentUser.role === 'SG' || currentUser.role === 'DEPUTY_SG'
    
    // Allow: responsible person, executives in same department, or senior leadership
    if (!isResponsible && !isExecutive && !isSeniorLeadership) {
      return NextResponse.json({ error: 'You do not have permission to update this task' }, { status: 403 })
    }

    // Calculate percent complete based on status
    let percentComplete = target.percentComplete
    let actualStatus = data.status
    
    if (data.status === 'NOT_STARTED') {
      percentComplete = 0
    } else if (data.status === 'IN_PROGRESS' && percentComplete === 0) {
      percentComplete = 25
    } else if (data.status === 'COMPLETED') {
      // When staff marks as complete, keep as IN_PROGRESS until supervisor approves
      actualStatus = 'IN_PROGRESS'
      percentComplete = 90 // 90% until supervisor approval
    }

    // Update the target
    const updatedTarget = await prisma.target.update({
      where: { id },
      data: {
        status: actualStatus,
        percentComplete,
        progressNotes: data.progressNotes,
        staffRating: data.staffRating,
        evidenceUrl: data.evidenceUrl,
        evidenceNotes: data.evidenceNotes,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        approvalStatus: data.approvalStatus,
        submittedForApproval: data.approvalStatus === 'SUBMITTED' ? new Date() : undefined,
      },
    })

    // Create status history entry with enhanced audit information
    const statusChangeNote = !isResponsible 
      ? `Status changed by ${currentUser.role} (${currentUser.name}) - ${data.progressNotes || 'No notes provided'}`
      : data.progressNotes
    
    await prisma.statusHistory.create({
      data: {
        targetId: id,
        oldStatus: target.status,
        newStatus: data.status,
        oldPercent: target.percentComplete,
        newPercent: percentComplete,
        notes: statusChangeNote,
        changedBy: user.id,
      },
    })

    // Create audit log entry for executive/leadership status changes
    if (!isResponsible) {
      await createAuditLog({
        userId: user.id,
        resourceType: 'Target',
        resourceId: id,
        action: 'UPDATE',
        details: {
          before: { status: target.status, percentComplete: target.percentComplete, approvalStatus: target.approvalStatus },
          after: { status: actualStatus, percentComplete, approvalStatus: data.approvalStatus },
          changedBy: `${currentUser.role} - ${currentUser.name}`,
          reason: data.progressNotes || 'No reason provided',
        },
      })
    }

    // If submitted for approval, notify supervisor
    if (data.approvalStatus === 'SUBMITTED') {
      // Find the user's manager/supervisor
      const supervisor = await prisma.user.findFirst({
        where: {
          OR: [
            { role: 'MANAGER', departmentId: target.responsible.departmentId },
            { role: 'EXECUTIVE', departmentId: target.responsible.departmentId },
            { role: 'DEPUTY_SG' },
            { role: 'SG' },
          ],
        },
        orderBy: {
          role: 'asc',
        },
      })

      if (supervisor) {
        const safeSenderId = await getSafeSenderId(user.id)
        
        const statusNotif = await prisma.pmsNotification.create({
          data: {
            type: 'GENERAL',
            status: 'PENDING',
            senderId: safeSenderId,
            receiverId: supervisor.id,
            message: `${user.name} has completed "${target.title}" and submitted it for your approval.`,
            entityType: 'Target',
            entityId: target.id,
          },
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        })

        // Broadcast via SSE for real-time delivery
        try {
          const { broadcastToUser } = await import(
            '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
          )
          const unreadCount = await prisma.pmsNotification.count({
            where: { receiverId: supervisor.id, status: { in: ['PENDING', 'SENT'] } },
          })
          broadcastToUser(supervisor.id, { type: 'notification', notification: statusNotif, unreadCount })
        } catch { /* SSE broadcast is best-effort */ }
      }
    }

    return NextResponse.json(updatedTarget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to update target status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
