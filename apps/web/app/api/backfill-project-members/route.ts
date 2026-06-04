import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'

// POST /api/backfill-project-members - One-time backfill to add task assignees + owners as team members
export async function POST(request: NextRequest) {
  try {
    // Get all projects with their tasks and existing team members
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          select: { assignedToId: true }
        },
        teamMembers: {
          select: { userId: true }
        }
      }
    })

    let totalAdded = 0

    for (const project of projects) {
      const existingMemberIds = new Set(project.teamMembers.map(tm => tm.userId))
      const toAdd: string[] = []

      // Add owner
      if (project.ownerId && !existingMemberIds.has(project.ownerId)) {
        toAdd.push(project.ownerId)
        existingMemberIds.add(project.ownerId)
      }

      // Add creator
      if (project.createdById && !existingMemberIds.has(project.createdById)) {
        toAdd.push(project.createdById)
        existingMemberIds.add(project.createdById)
      }

      // Add task assignees
      for (const task of project.tasks) {
        if (task.assignedToId && !existingMemberIds.has(task.assignedToId)) {
          toAdd.push(task.assignedToId)
          existingMemberIds.add(task.assignedToId)
        }
      }

      if (toAdd.length > 0) {
        await prisma.projectTeamMember.createMany({
          data: toAdd.map(userId => ({
            projectId: project.id,
            userId,
            role: userId === project.ownerId ? 'OWNER' : 'MEMBER'
          })),
          skipDuplicates: true
        })
        totalAdded += toAdd.length
      }
    }

    return NextResponse.json({ 
      success: true, 
      projectsProcessed: projects.length, 
      membersAdded: totalAdded 
    })
  } catch (error) {
    console.error('Error backfilling project members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
