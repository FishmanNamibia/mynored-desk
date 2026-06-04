import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const targetSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  isAdhoc: z.boolean().optional().default(false),
  initiativeId: z.string().optional(), // Optional for ad-hoc tasks
  assignedToId: z.string().optional(),
  responsibleId: z.string().optional(),
  dueDate: z.string().nullable().optional().transform(str => str ? new Date(str) : null),
  status: z.string().optional(),
  percentComplete: z.number().min(0).max(100).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const initiativeId = searchParams.get('initiativeId')
    const responsibleId = searchParams.get('responsibleId')
    const level = searchParams.get('level')
    const levelId = searchParams.get('levelId')

    let where: any = {}
    
    console.log('[API] User role:', user.role)
    console.log('[API] User ID:', user.id)
    console.log('[API] responsibleId param:', responsibleId)
    console.log('[API] level param:', level)
    console.log('[API] levelId param:', levelId)
    
    // Handle level-based queries (for dashboard views)
    if (level) {
      let userIds: string[] = []

      if (level === 'organization') {
        // Get all users across the entire organization
        const users = await prisma.user.findMany({
          where: {
            isApproved: true,
            role: {
              notIn: ['ADMIN', 'SG', 'DEPUTY_SG']
            }
          },
          select: { id: true }
        })
        userIds = users.map(u => u.id)
      } else if (level === 'department' && levelId) {
        // Get all users in divisions within this department + executives
        const [divisionUsers, executives] = await Promise.all([
          // Users in divisions within this department
          prisma.user.findMany({
            where: {
              isApproved: true,
              division: {
                departmentId: levelId
              }
            },
            select: { id: true }
          }),
          // All executives (they oversee all departments)
          prisma.user.findMany({
            where: {
              isApproved: true,
              role: 'EXECUTIVE'
            },
            select: { id: true }
          })
        ])
        
        const allDeptUsers = [...divisionUsers, ...executives]
        userIds = allDeptUsers.map(u => u.id)
      } else if (level === 'division' && levelId) {
        // Get all users directly in this division
        const users = await prisma.user.findMany({
          where: {
            isApproved: true,
            divisionId: levelId
          },
          select: { id: true }
        })
        userIds = users.map(u => u.id)
      }

      if (userIds.length > 0) {
        where.responsibleId = { in: userIds }
      }
    } else {
      // Original role-based filtering for individual views
      // Staff and Admin Assistants only see their own tasks
      if (user.role === 'STAFF' || user.role === 'ADMINISTRATIVE_ASSISTANT') {
        where.responsibleId = user.id
      } else if (user.role === 'EXECUTIVE') {
        // Executives see their own tasks by default unless filtering for someone else
        where.responsibleId = responsibleId || user.id
      } else if (responsibleId) {
        // Admins, SG, Deputy SG can filter by responsibleId
        where.responsibleId = responsibleId
      }
    }
    
    if (initiativeId) {
      where.initiativeId = initiativeId
    }

    console.log('[API] Filter where clause:', where)

    const targets = await prisma.target.findMany({
      where,
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
          take: 5,
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
      orderBy: [
        { isAdhoc: 'asc' }, // Show goal-aligned tasks first
        { dueDate: 'asc' },
      ],
    })

    console.log('[API] Found', targets.length, 'tasks')
    console.log('[API] Task IDs:', targets.map(t => ({ id: t.id, title: t.title, responsibleId: t.responsibleId })))

    return NextResponse.json(targets)
  } catch (error) {
    console.error('Failed to fetch targets:', error)
    return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    // Everyone can create ad-hoc tasks, but only certain roles can create goal-aligned tasks
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = targetSchema.parse(body)

    // For non-adhoc tasks, restrict to certain roles
    if (!data.isAdhoc && !['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only administrators, executives, managers, and administrative assistants can create goal-aligned tasks' }, { status: 403 })
    }

    // Validate: non-adhoc tasks must have initiativeId
    if (!data.isAdhoc && !data.initiativeId) {
      return NextResponse.json({ error: 'Initiative is required for goal-aligned tasks' }, { status: 400 })
    }

    // Support both assignedToId and responsibleId for backwards compatibility
    const responsibleId = data.assignedToId || data.responsibleId
    if (!responsibleId) {
      return NextResponse.json({ error: 'Staff member assignment is required' }, { status: 400 })
    }

    const target = await prisma.target.create({
      data: {
        title: data.title,
        description: data.description,
        isAdhoc: data.isAdhoc || false,
        initiativeId: data.initiativeId || null,
        responsibleId: responsibleId,
        dueDate: data.dueDate,
        status: (data.status as any) || 'NOT_STARTED',
        percentComplete: data.percentComplete || 0,
      },
      include: {
        initiative: data.initiativeId ? {
          include: {
            objective: {
              include: {
                goal: true,
              },
            },
          },
        } : undefined,
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        targetId: target.id,
        newStatus: target.status,
        newPercent: target.percentComplete,
        changedBy: user.id,
      },
    })

    await createAuditLog({
      actorId: user.id,
      entityType: 'Target',
      entityId: target.id,
      action: 'CREATE',
      afterData: target,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    // Send notification to the assigned user
    if (target.responsibleId && target.responsibleId !== user.id) {
      const taskNotification = await prisma.pmsNotification.create({
        data: {
          type: 'TASK_ASSIGNED',
          message: `You have been assigned a new task: "${target.title}"${data.isAdhoc ? ' (Ad-hoc)' : ''}`,
          receiverId: target.responsibleId,
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
          where: { receiverId: target.responsibleId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(target.responsibleId, { type: 'notification', notification: taskNotification, unreadCount })
      } catch { /* SSE broadcast is best-effort */ }
    }

    return NextResponse.json(target, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    console.error('Failed to create target:', error)
    return NextResponse.json({ error: 'Failed to create target' }, { status: 500 })
  }
}

