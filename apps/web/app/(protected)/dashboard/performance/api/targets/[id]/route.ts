import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog, shouldCreateDeadlineOverrideLog } from '@/lib/audit'
import { z } from 'zod'
import { TargetStatus } from '@prisma/client'

const updateTargetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TargetStatus).optional(),
  percentComplete: z.number().min(0).max(100).optional(),
  progressNotes: z.string().optional(),
  dueDate: z.string().transform(str => new Date(str)).optional(),
  responsibleId: z.string().optional(),
  reason: z.string().optional(), // For admin deadline overrides
  // Completion workflow fields
  staffRating: z.number().min(1).max(5).optional(),
  evidenceUrl: z.string().optional(),
  evidenceNotes: z.string().optional(),
  submitForApproval: z.boolean().optional(), // Flag to submit for approval
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

    const target = await prisma.target.findUnique({
      where: { id },
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: true,
              },
            },
          },
        },
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
            division: {
              include: {
                department: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Check access rights
    if (userHasAnyRole(user, ['STAFF', 'ADMINISTRATIVE_ASSISTANT']) && target.responsibleId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(target)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch target' }, { status: 500 })
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
    const data = updateTargetSchema.parse(body)

    // Fetch existing target
    const existingTarget = await prisma.target.findUnique({
      where: { id },
    })

    if (!existingTarget) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    // Check access rights
    if (userHasAnyRole(user, ['STAFF', 'ADMINISTRATIVE_ASSISTANT']) && existingTarget.responsibleId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Deadline enforcement
    const now = new Date()
    const isPastDeadline = existingTarget.dueDate && now > existingTarget.dueDate

    if (isPastDeadline && !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG'])) {
      return NextResponse.json(
        { error: 'Cannot update target past deadline. Only admins and leadership can override.' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    
    // Staff and Admin Assistants can only update status, percentComplete, progressNotes, and completion workflow fields
    if (userHasAnyRole(user, ['STAFF', 'ADMINISTRATIVE_ASSISTANT'])) {
      if (data.status !== undefined) updateData.status = data.status
      if (data.percentComplete !== undefined) updateData.percentComplete = data.percentComplete
      if (data.progressNotes !== undefined) updateData.progressNotes = data.progressNotes
      if (data.staffRating !== undefined) updateData.staffRating = data.staffRating
      if (data.evidenceUrl !== undefined) updateData.evidenceUrl = data.evidenceUrl
      if (data.evidenceNotes !== undefined) updateData.evidenceNotes = data.evidenceNotes
      
      // Handle submission for approval
      if (data.submitForApproval && data.status === 'COMPLETED') {
        updateData.approvalStatus = 'SUBMITTED'
        updateData.submittedForApproval = new Date()
        updateData.completedAt = new Date()
      } else if (data.status === 'COMPLETED' && !existingTarget.completedAt) {
        updateData.completedAt = new Date()
      }
    } else {
      // Admin and Manager can update all fields
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status
      if (data.percentComplete !== undefined) updateData.percentComplete = data.percentComplete
      if (data.progressNotes !== undefined) updateData.progressNotes = data.progressNotes
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
      if (data.responsibleId !== undefined) updateData.responsibleId = data.responsibleId
      
      // Auto-set completedAt when status is COMPLETED
      if (data.status === 'COMPLETED' && !existingTarget.completedAt) {
        updateData.completedAt = new Date()
      }
    }

    // Update target
    const updatedTarget = await prisma.target.update({
      where: { id },
      data: updateData,
      include: {
        initiative: true,
        responsible: true,
      },
    })

    // Create status history if status or percent changed
    if (data.status !== undefined || data.percentComplete !== undefined) {
      await prisma.statusHistory.create({
        data: {
          targetId: updatedTarget.id,
          oldStatus: existingTarget.status,
          newStatus: updatedTarget.status,
          oldPercent: existingTarget.percentComplete,
          newPercent: updatedTarget.percentComplete,
          notes: data.progressNotes,
          changedBy: user.id,
        },
      })
    }

    // Create audit log
    const auditAction = existingTarget.dueDate && shouldCreateDeadlineOverrideLog(existingTarget.dueDate, userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG']) ? 'ADMIN' : 'STAFF')
      ? 'DEADLINE_OVERRIDE'
      : 'UPDATE'

    await createAuditLog({
      userId: user.id,
      resourceType: 'Target',
      resourceId: updatedTarget.id,
      action: auditAction,
      details: { before: existingTarget, after: updatedTarget, reason: data.reason },
    })

    return NextResponse.json(updatedTarget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update target' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const target = await prisma.target.findUnique({
      where: { id },
    })

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    await prisma.target.delete({
      where: { id },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Target',
      resourceId: id,
      action: 'DELETE',
      details: { deletedTarget: target },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
  }
}
