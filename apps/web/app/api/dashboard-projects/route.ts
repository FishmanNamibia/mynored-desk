import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET /api/dashboard-projects - Get projects for the current user (owner or team member)
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
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

    // Get projects where user is owner, team member, or has tasks assigned
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: actualUserId },
          { 
            teamMembers: {
              some: { userId: actualUserId }
            }
          },
          {
            tasks: {
              some: { assignedToId: actualUserId }
            }
          }
        ]
      },
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
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            percentComplete: true,
            assignedToId: true
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
      },
      orderBy: [
        { status: 'asc' }, // Active projects first
        { updatedAt: 'desc' }
      ],
      take: 10 // Limit to 10 most relevant projects
    })

    // Calculate project statistics
    const projectsWithStats = projects.map((project: any) => {
      const totalTasks = project.tasks.length
      const completedTasks = project.tasks.filter((t: any) => t.status === 'COMPLETED').length
      const myTasks = project.tasks.filter((t: any) => t.assignedToId === actualUserId).length
      const avgProgress = totalTasks > 0 
        ? Math.round(project.tasks.reduce((sum: number, t: any) => sum + (t.percentComplete || 0), 0) / totalTasks)
        : 0

      // Count unique members: team members + task assignees + owner
      const memberIds = new Set<string>()
      project.teamMembers.forEach((tm: any) => memberIds.add(tm.userId))
      project.tasks.forEach((t: any) => { if (t.assignedToId) memberIds.add(t.assignedToId) })
      if (project.ownerId) memberIds.add(project.ownerId)

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        percentComplete: project.percentComplete,
        plannedStartDate: project.plannedStartDate,
        plannedEndDate: project.plannedEndDate,
        actualStartDate: project.actualStartDate,
        actualEndDate: project.actualEndDate,
        budget: project.budget,
        currency: project.currency,
        owner: project.owner ? {
          ...project.owner,
          name: `${project.owner.firstName || ''} ${project.owner.lastName || ''}`.trim() || project.owner.email,
        } : null,
        department: project.department,
        teamSize: memberIds.size,
        stats: {
          totalTasks,
          completedTasks,
          myTasks,
          avgProgress,
          risks: project._count.risks,
          issues: project._count.issues,
          documents: project._count.documents
        },
        isOwner: project.ownerId === actualUserId,
        updatedAt: project.updatedAt
      }
    })

    return NextResponse.json({ 
      projects: projectsWithStats,
      total: projectsWithStats.length 
    })

  } catch (error) {
    console.error('Error fetching dashboard projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
