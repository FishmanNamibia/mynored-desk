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
    const tasks = await prisma.adhocTask.findMany({
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
    console.error('Error fetching adhoc tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[ADHOC TASK CREATE] Starting...')
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      console.log('[ADHOC TASK CREATE] Unauthorized - no user ID')
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
    console.log('[ADHOC TASK CREATE] Request body:', body)
    const { title, description, priority, dueDate, assignedToId } = body

    if (!title) {
      console.log('[ADHOC TASK CREATE] Missing title')
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // If assignedToId is empty or not provided, assign to the creator (self)
    const finalAssignedToId = assignedToId && assignedToId !== '' ? assignedToId : actualUserId
    const isDelegated = finalAssignedToId !== actualUserId
    console.log('[ADHOC TASK CREATE] Creating task - assignedToId:', finalAssignedToId, 'isDelegated:', isDelegated)

    const task = await prisma.adhocTask.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: finalAssignedToId,
        createdById: actualUserId
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
    console.log('[ADHOC TASK CREATE] Task created successfully:', task.id)

    // Send notification to the assigned user if delegated to someone else
    if (isDelegated) {
      try {
        const { createNotification } = await import('@/lib/pms/create-notification')
        await createNotification({
          type: 'TARGET_ASSIGNED',
          message: `${creatorName || 'Someone'} has assigned you an ad-hoc task: "${title}"`,
          receiverId: finalAssignedToId,
          senderId: actualUserId,
          entityType: 'ADHOC_TASK',
          entityId: task.id,
          metadata: {
            taskTitle: title,
            priority: priority || 'MEDIUM',
            dueDate: dueDate || null,
            creatorName,
          }
        })
      } catch (notifError) {
        console.error('Failed to create delegation notification:', notifError)
      }
    }

    // Add computed name fields to response
    const mapped = {
      ...task,
      assignedTo: task.assignedTo ? { ...task.assignedTo, name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email } : null,
      createdBy: task.createdBy ? { ...task.createdBy, name: `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim() || task.createdBy.email } : null,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error creating adhoc task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
