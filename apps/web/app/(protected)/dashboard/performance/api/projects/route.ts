import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


// GET /api/projects - Get all projects with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const ownerId = searchParams.get('ownerId')
    const departmentId = searchParams.get('departmentId')
    const divisionId = searchParams.get('divisionId')
    const search = searchParams.get('search')
    const memberOnly = searchParams.get('memberOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Resolve actual DB user by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ 
        where: { email: user.email }, 
        select: { id: true } 
      })
      if (dbUser) actualUserId = dbUser.id
    }

    // Build where clause
    const where: any = {}

    if (status) where.status = status
    if (priority) where.priority = priority
    if (ownerId) where.ownerId = ownerId
    if (departmentId) where.departmentId = departmentId
    if (divisionId) where.divisionId = divisionId

    if (memberOnly) {
      where.OR = [
        { ownerId: actualUserId }, // User is owner
        { createdById: actualUserId }, // User is creator
        { teamMembers: { some: { userId: actualUserId } } }, // User is team member
        { tasks: { some: { assignedToId: actualUserId } } } // User is assigned to a task
      ]
    }

    if (search) {
      const searchCondition = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
      
      if (where.OR && memberOnly) {
        // Combine member filter with search - user must be member AND match search
        where.AND = [
          { OR: where.OR }, // Member filter
          { OR: searchCondition } // Search filter
        ]
        delete where.OR
      } else {
        where.OR = searchCondition
      }
    }

    // Get total count for pagination
    const total = await prisma.project.count({ where })

    // Get projects with related data
    const projects = await prisma.project.findMany({
      where,
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
          include: {
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
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Map projects to include computed name fields
    const mapped = projects.map((p: any) => ({
      ...p,
      owner: p.owner ? {
        ...p.owner,
        name: `${p.owner.firstName || ''} ${p.owner.lastName || ''}`.trim() || p.owner.email,
      } : null,
      teamMembers: (p.teamMembers || []).map((tm: any) => ({
        ...tm,
        user: tm.user ? {
          ...tm.user,
          name: `${tm.user.firstName || ''} ${tm.user.lastName || ''}`.trim() || tm.user.email,
        } : tm.user,
      })),
    }))

    return NextResponse.json({
      projects: mapped,
      currentUserId: actualUserId,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth ID !== DB ID)
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ where: { email: user.email }, select: { id: true, departmentId: true } })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    const body = await request.json()
    const {
      title,
      description,
      status = 'PLANNING',
      priority = 'MEDIUM',
      plannedStartDate,
      plannedEndDate,
      budget,
      currency = 'NAD',
      departmentId,
      teamMemberIds = [],
      wbsPhases = [],
      tasks = []
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: 'Project title is required' }, { status: 400 })
    }

    // Build task records from WBS phases (frontend sends wbsPhases)
    const taskRecords: any[] = []
    if (wbsPhases.length > 0) {
      for (const phase of wbsPhases) {
        for (const task of (phase.subtasks || [])) {
          taskRecords.push({
            title: task.name || 'Untitled Task',
            description: task.description || null,
            phaseName: phase.name || null,
            plannedStartDate: task.startDate ? new Date(task.startDate) : null,
            plannedEndDate: task.endDate ? new Date(task.endDate) : null,
            assignedToId: task.assignee || null,
          })
        }
      }
    } else if (tasks.length > 0) {
      // Fallback: direct tasks array
      for (const task of tasks) {
        taskRecords.push({
          title: task.title,
          description: task.description || null,
          priority: task.priority || 'MEDIUM',
          plannedStartDate: task.plannedStartDate ? new Date(task.plannedStartDate) : null,
          plannedEndDate: task.plannedEndDate ? new Date(task.plannedEndDate) : null,
          estimatedHours: task.estimatedHours ? parseFloat(task.estimatedHours) : null,
          assignedToId: task.assignedToId || null,
        })
      }
    }

    // Create project with team members and tasks
    const project = await prisma.project.create({
      data: {
        title,
        description: description || null,
        status: status || 'PLANNING',
        priority: priority || 'MEDIUM',
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        budget: budget ? parseFloat(budget) : null,
        currency,
        departmentId: departmentId || null,
        ownerId: actualUserId,
        createdById: actualUserId,
        // Add team members
        teamMembers: teamMemberIds.length > 0 ? {
          create: teamMemberIds.map((userId: string) => ({
            userId
          }))
        } : undefined,
        // Add tasks from WBS phases or direct tasks
        tasks: taskRecords.length > 0 ? {
          create: taskRecords
        } : undefined,
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
        tasks: true,
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

    // Auto-add task assignees as team members if not already included
    const existingMemberIds = new Set(teamMemberIds)
    const assigneeIds = taskRecords
      .map((t: any) => t.assignedToId)
      .filter((id: string | null) => id && !existingMemberIds.has(id))
    
    const uniqueAssigneeIds = [...new Set(assigneeIds)] as string[]
    if (uniqueAssigneeIds.length > 0) {
      await prisma.projectTeamMember.createMany({
        data: uniqueAssigneeIds.map((userId: string) => ({
          projectId: project.id,
          userId,
          role: 'MEMBER'
        })),
        skipDuplicates: true
      })
    }

    // Also add the creator as a team member if not already
    if (!existingMemberIds.has(actualUserId)) {
      await prisma.projectTeamMember.create({
        data: {
          projectId: project.id,
          userId: actualUserId,
          role: 'OWNER'
        }
      }).catch(() => {}) // Ignore if duplicate
    }

    return NextResponse.json(project, { status: 201 })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
