import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email
    let actualUserId = user.id
    let delegatorName = ''
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ where: { email: user.email }, select: { id: true, firstName: true, lastName: true } })
      if (dbUser) {
        actualUserId = dbUser.id
        delegatorName = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim()
      }
    }

    const body = await req.json()
    const { status, percentComplete, evidenceUrl, evidenceNotes, rating, progressNotes, title, description, priority, dueDate, assignedToId } = body

    // Check if this is a delegation (assignedToId is being changed)
    let isDelegation = false
    let oldTask = null
    if (assignedToId !== undefined) {
      oldTask = await (prisma as any).auditTask.findUnique({
        where: { id },
        select: { assignedToId: true, title: true }
      })
      isDelegation = oldTask && oldTask.assignedToId !== assignedToId
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (percentComplete !== undefined) updateData.percentComplete = percentComplete
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes
    if (rating !== undefined) updateData.rating = rating
    if (progressNotes !== undefined) updateData.progressNotes = progressNotes
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId
      if (isDelegation) {
        updateData.delegatedById = actualUserId
      }
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
      updateData.percentComplete = 100
    }

    const task = await (prisma as any).auditTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        delegatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    // Send notification if delegated
    if (isDelegation && oldTask) {
      try {
        const { createNotification } = await import('@/lib/pms/create-notification')
        await createNotification({
          type: 'TARGET_ASSIGNED',
          message: `${delegatorName || 'Someone'} has delegated an audit task to you: "${oldTask.title}"`,
          receiverId: assignedToId,
          senderId: actualUserId,
          entityType: 'AUDIT_TASK',
          entityId: task.id,
        })
      } catch (notifError) {
        console.error('Failed to create delegation notification:', notifError)
      }
    }

    const mapped = {
      ...task,
      assignedTo: task.assignedTo ? { ...task.assignedTo, name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email } : null,
      createdBy: task.createdBy ? { ...task.createdBy, name: `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim() || task.createdBy.email } : null,
      delegatedBy: task.delegatedBy ? { ...task.delegatedBy, name: `${task.delegatedBy.firstName || ''} ${task.delegatedBy.lastName || ''}`.trim() || task.delegatedBy.email } : null,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error updating audit task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Resolve actual DB user by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ where: { email: user.email }, select: { id: true } })
      if (dbUser) actualUserId = dbUser.id
    }
    
    // Verify user created this task
    const task = await (prisma as any).auditTask.findUnique({
      where: { id },
      select: { createdById: true }
    })
    
    if (!task || task.createdById !== actualUserId) {
      return NextResponse.json({ error: 'Not found or unauthorized. Only the creator can delete this task.' }, { status: 403 })
    }
    
    await (prisma as any).auditTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting audit task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
