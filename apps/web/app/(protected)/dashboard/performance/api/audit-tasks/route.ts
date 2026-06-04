import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
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

    // Get tasks where user is assigned or created
    const tasks = await (prisma as any).auditTask.findMany({
      where: {
        OR: [
          { assignedToId: actualUserId },
          { createdById: actualUserId }
        ]
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Add computed name fields
    const mapped = tasks.map((t: any) => ({
      ...t,
      assignedTo: t.assignedTo ? { ...t.assignedTo, name: `${t.assignedTo.firstName || ''} ${t.assignedTo.lastName || ''}`.trim() || t.assignedTo.email } : null,
      createdBy: t.createdBy ? { ...t.createdBy, name: `${t.createdBy.firstName || ''} ${t.createdBy.lastName || ''}`.trim() || t.createdBy.email } : null,
    }))

    return NextResponse.json({ tasks: mapped, currentUserId: actualUserId })
  } catch (error) {
    console.error('Error fetching audit tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email
    let actualUserId = user.id
    let creatorName = ''
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ where: { email: user.email }, select: { id: true, firstName: true, lastName: true } })
      if (dbUser) {
        actualUserId = dbUser.id
        creatorName = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim()
      }
    }

    const body = await req.json()
    const { title, description, priority, dueDate, assignedToId, businessObjectives, legislation, objectiveAndScope, conclusion, detailedObservations } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const finalAssignedToId = assignedToId && assignedToId !== '' ? assignedToId : actualUserId
    const isDelegated = finalAssignedToId !== actualUserId

    const task = await (prisma as any).auditTask.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: finalAssignedToId,
        createdById: actualUserId,
        businessObjectives: businessObjectives || undefined,
        legislation: legislation || undefined,
        objectiveAndScope: objectiveAndScope || undefined,
        conclusion: conclusion || undefined,
        detailedObservations: detailedObservations || undefined
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    // Send notification if delegated
    if (isDelegated) {
      try {
        const { createNotification } = await import('@/lib/pms/create-notification')
        await createNotification({
          type: 'TARGET_ASSIGNED',
          message: `${creatorName || 'Someone'} has assigned you an audit task: "${title}"`,
          receiverId: finalAssignedToId,
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
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error creating audit task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
