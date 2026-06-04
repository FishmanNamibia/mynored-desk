import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET /api/projects/tasks/[id] - Get a specific project task
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

    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: {
          select: { 
            id: true, 
            title: true,
            ownerId: true,
            teamMembers: {
              select: { userId: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const mapped = {
      ...task,
      assignedTo: task.assignedTo ? {
        ...task.assignedTo,
        name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email,
      } : null,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching project task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/projects/tasks/[id] - Update a project task
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
      const dbUser = await prisma.user.findFirst({ 
        where: { email: user.email }, 
        select: { id: true } 
      })
      if (dbUser) actualUserId = dbUser.id
    }

    // Get the task with project info to check permissions
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: {
          select: { 
            ownerId: true,
            createdById: true,
            teamMembers: {
              select: { userId: true }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check permissions: assigned user, project owner, project creator, or team member
    const isAssignedUser = task.assignedToId === actualUserId
    const isProjectOwner = task.project.ownerId === actualUserId
    const isProjectCreator = task.project.createdById === actualUserId
    const isTeamMember = task.project.teamMembers.some(tm => tm.userId === actualUserId)

    console.log('[ProjectTask PATCH] actualUserId:', actualUserId, 'taskId:', id)
    console.log('[ProjectTask PATCH] assignedToId:', task.assignedToId, 'ownerId:', task.project.ownerId, 'createdById:', task.project.createdById)
    console.log('[ProjectTask PATCH] isAssigned:', isAssignedUser, 'isOwner:', isProjectOwner, 'isCreator:', isProjectCreator, 'isTeamMember:', isTeamMember)
    console.log('[ProjectTask PATCH] teamMembers:', JSON.stringify(task.project.teamMembers))

    const canUpdate = isAssignedUser || isProjectOwner || isProjectCreator || isTeamMember

    if (!canUpdate) {
      console.log('[ProjectTask PATCH] Permission denied:', {
        actualUserId,
        taskId: id,
        assignedToId: task.assignedToId,
        ownerId: task.project.ownerId,
        createdById: task.project.createdById,
        teamMembers: task.project.teamMembers,
      })
      return NextResponse.json({ 
        error: 'You are not authorized to update this task. You must be the assigned user, project owner, creator, or a team member.' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { 
      title,
      description,
      status, 
      percentComplete, 
      priority,
      plannedStartDate,
      plannedEndDate,
      estimatedHours,
      assignedToId,
      phaseName,
      evidenceUrl,
      rating,
      evidenceNotes
    } = body

    const updateData: any = {}
    
    // Only project owner/creator can change these fields
    if (isProjectOwner || isProjectCreator) {
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (priority !== undefined) updateData.priority = priority
      if (plannedStartDate !== undefined) updateData.plannedStartDate = plannedStartDate ? new Date(plannedStartDate) : null
      if (plannedEndDate !== undefined) updateData.plannedEndDate = plannedEndDate ? new Date(plannedEndDate) : null
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId
      if (phaseName !== undefined) updateData.phaseName = phaseName
    }

    // Assigned user and team members can update progress and evidence
    if (status !== undefined) updateData.status = status
    if (percentComplete !== undefined) updateData.percentComplete = percentComplete
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (rating !== undefined) updateData.rating = rating
    if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes

    // If assignedToId is being changed and user is owner/creator, auto-add assignee as team member
    if (assignedToId !== undefined && assignedToId && (isProjectOwner || isProjectCreator)) {
      const existingMember = await prisma.projectTeamMember.findFirst({
        where: {
          projectId: task.projectId,
          userId: assignedToId
        }
      })

      if (!existingMember) {
        await prisma.projectTeamMember.create({
          data: {
            projectId: task.projectId,
            userId: assignedToId,
            role: 'MEMBER'
          }
        })
      }
    }

    console.log('[ProjectTask PATCH] updateData:', JSON.stringify(updateData))
    const updated = await prisma.projectTask.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, title: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    // Recalculate project overall progress from all tasks
    const allTasks = await prisma.projectTask.findMany({
      where: { projectId: task.projectId },
      select: { percentComplete: true }
    })
    const avgProgress = allTasks.length > 0
      ? Math.round(allTasks.reduce((sum, t) => sum + (t.percentComplete || 0), 0) / allTasks.length)
      : 0
    await prisma.project.update({
      where: { id: task.projectId },
      data: { percentComplete: avgProgress }
    })

    const mapped = {
      ...updated,
      assignedTo: updated.assignedTo ? {
        ...updated.assignedTo,
        name: `${updated.assignedTo.firstName || ''} ${updated.assignedTo.lastName || ''}`.trim() || updated.assignedTo.email,
      } : null,
    }

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Error updating project task:', error)
    console.error('Error details:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/tasks/[id] - Delete a project task (owner/creator only)
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
      const dbUser = await prisma.user.findFirst({ 
        where: { email: user.email }, 
        select: { id: true } 
      })
      if (dbUser) actualUserId = dbUser.id
    }

    // Get the task with project info to check permissions
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: {
        project: {
          select: { ownerId: true, createdById: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only project owner or creator can delete tasks
    const canDelete = task.project.ownerId === actualUserId || task.project.createdById === actualUserId

    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Only the project owner or creator can delete tasks' 
      }, { status: 403 })
    }

    await prisma.projectTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
