import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await prisma.riskTask.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, departmentName: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        document: {
          select: { id: true, title: true, fileUrl: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Risk task not found' }, { status: 404 })
    }

    // Map name fields for better readability
    const mapped = {
      ...task,
      assignedTo: task.assignedTo ? {
        ...task.assignedTo,
        name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email,
      } : null,
      createdBy: task.createdBy ? {
        ...task.createdBy,
        name: `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim() || task.createdBy.email,
      } : null,
      approvedBy: task.approvedBy ? {
        ...task.approvedBy,
        name: `${task.approvedBy.firstName || ''} ${task.approvedBy.lastName || ''}`.trim() || task.approvedBy.email,
      } : null
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching risk task details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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

    // Get the task to check permissions
    const task = await prisma.riskTask.findUnique({
      where: { id },
      select: { assignedToId: true, createdById: true, status: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Risk task not found' }, { status: 404 })
    }

    // For updates, allow assigned user or creator
    const canUpdate = task.assignedToId === actualUserId || task.createdById === actualUserId
    if (!canUpdate) {
      return NextResponse.json({ error: 'You are not authorized to update this task' }, { status: 403 })
    }

    const body = await req.json()
    const { 
      status, percentComplete, evidenceUrl, evidenceNotes, 
      rating, progressNotes, mitigations, furtherActions,
      priority, dueDate
    } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (percentComplete !== undefined) updateData.percentComplete = percentComplete
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes
    if (rating !== undefined) updateData.rating = rating
    if (progressNotes !== undefined) updateData.progressNotes = progressNotes
    if (mitigations !== undefined) updateData.mitigations = mitigations
    if (furtherActions !== undefined) updateData.furtherActions = furtherActions
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    // Handle task completion
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
      updateData.percentComplete = 100
      updateData.approvalStatus = 'PENDING'

      // Create notification for task creator (notification system will be implemented separately)
      if (task.createdById !== actualUserId) {
        console.log(`Task ${id} completed by ${actualUserId}, notification would be sent to ${task.createdById}`)
      }
    }

    const updated = await prisma.riskTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    const mapped = {
      ...updated,
      assignedTo: updated.assignedTo ? { 
        ...updated.assignedTo, 
        name: `${updated.assignedTo.firstName || ''} ${updated.assignedTo.lastName || ''}`.trim() || updated.assignedTo.email 
      } : null,
      createdBy: updated.createdBy ? { 
        ...updated.createdBy, 
        name: `${updated.createdBy.firstName || ''} ${updated.createdBy.lastName || ''}`.trim() || updated.createdBy.email 
      } : null,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error updating risk task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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

    // Verify user created this risk task
    const task = await prisma.riskTask.findUnique({
      where: { id },
      select: { createdById: true }
    })

    if (!task || task.createdById !== actualUserId) {
      return NextResponse.json({ error: 'Not found or unauthorized. Only the creator can delete this risk task.' }, { status: 403 })
    }

    // Delete the risk task
    await prisma.riskTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting risk task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
