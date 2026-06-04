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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        department: {
          select: { id: true, name: true }
        },
        teamMembers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            percentComplete: true,
            plannedStartDate: true,
            plannedEndDate: true,
            estimatedHours: true,
            assignedToId: true,
            phaseName: true,
            evidenceUrl: true,
            rating: true,
            evidenceNotes: true,
            createdAt: true,
            updatedAt: true,
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            risks: true,
            issues: true,
            documents: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Map name fields for better readability
    const mapped = {
      ...project,
      owner: project.owner ? {
        ...project.owner,
        name: `${project.owner.firstName || ''} ${project.owner.lastName || ''}`.trim() || project.owner.email,
      } : null,
      teamMembers: (project.teamMembers || []).map((tm: any) => ({
        ...tm,
        user: tm.user ? {
          ...tm.user,
          name: `${tm.user.firstName || ''} ${tm.user.lastName || ''}`.trim() || tm.user.email,
        } : null,
      })),
      tasks: (project.tasks || []).map((t: any) => ({
        ...t,
        assignedTo: t.assignedTo ? {
          ...t.assignedTo,
          name: `${t.assignedTo.firstName || ''} ${t.assignedTo.lastName || ''}`.trim() || t.assignedTo.email,
        } : null,
      })),
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching project details:', error)
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

    // Verify user is the project owner or creator
    const project = await prisma.project.findUnique({
      where: { id },
      select: { ownerId: true, createdById: true }
    })

    if (!project || (project.ownerId !== actualUserId && project.createdById !== actualUserId)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const body = await req.json()
    const {
      title,
      description,
      status,
      priority,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      budget,
      currency,
      departmentId,
      teamMemberIds
    } = body

    // Process team member updates if provided
    let teamMembers
    if (Array.isArray(teamMemberIds)) {
      // Get current team members
      const currentTeam = await prisma.projectTeamMember.findMany({
        where: { projectId: id },
        select: { userId: true }
      })
      const currentTeamIds = currentTeam.map(tm => tm.userId)

      // Find IDs to add and remove
      const idsToAdd = teamMemberIds.filter(uid => !currentTeamIds.includes(uid))
      const idsToRemove = currentTeamIds.filter(uid => !teamMemberIds.includes(uid))

      if (idsToAdd.length > 0 || idsToRemove.length > 0) {
        teamMembers = {
          deleteMany: idsToRemove.length > 0 ? {
            userId: { in: idsToRemove }
          } : undefined,
          create: idsToAdd.length > 0 ? idsToAdd.map(userId => ({
            userId
          })) : undefined
        }
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
        budget: budget !== undefined ? parseFloat(budget) : undefined,
        currency,
        departmentId,
        teamMembers
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        teamMembers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating project:', error)
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

    // Verify user created this project
    const project = await prisma.project.findUnique({
      where: { id },
      select: { createdById: true }
    })

    if (!project || project.createdById !== actualUserId) {
      return NextResponse.json({ error: 'Not found or unauthorized. Only the creator can delete this project.' }, { status: 403 })
    }

    // Delete the project and all associated records
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
