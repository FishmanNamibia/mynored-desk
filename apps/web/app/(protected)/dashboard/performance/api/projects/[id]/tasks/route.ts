import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// POST /api/projects/[id]/tasks - Create a new task in a project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
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

    // Verify user is project owner or creator
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, createdById: true }
    })

    if (!project || (project.ownerId !== actualUserId && project.createdById !== actualUserId)) {
      return NextResponse.json({ 
        error: 'Only the project owner or creator can add tasks' 
      }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      description,
      status = 'NOT_STARTED',
      priority = 'MEDIUM',
      plannedStartDate,
      plannedEndDate,
      assignedToId,
      phaseName
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description,
        status,
        priority,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        assignedToId: assignedToId || null,
        phaseName
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    // Auto-add assignee as team member if not already a member
    if (assignedToId) {
      const existingMember = await prisma.projectTeamMember.findFirst({
        where: {
          projectId,
          userId: assignedToId
        }
      })

      if (!existingMember) {
        await prisma.projectTeamMember.create({
          data: {
            projectId,
            userId: assignedToId,
            role: 'MEMBER'
          }
        })
      }
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating project task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
