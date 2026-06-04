import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET - List adhoc tasks for the authenticated user (assigned to or created by)
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await prisma.adhocTask.findMany({
      where: {
        OR: [
          { assignedToId: user.id },
          { createdById: user.id }
        ]
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to the shape the frontend expects
    const mapped = tasks.map(t => ({
      ...t,
      assignedTo: { name: `${t.assignedTo.firstName || ''} ${t.assignedTo.lastName || ''}`.trim() || t.assignedTo.email },
      createdBy: { name: `${t.createdBy.firstName || ''} ${t.createdBy.lastName || ''}`.trim() || t.createdBy.email }
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('[adhoc-tasks GET] Error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tasks', details: error.message }, { status: 500 })
  }
}

// POST - Create a new adhoc task
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, priority, dueDate, assignedToId } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await prisma.adhocTask.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId: assignedToId || user.id,
        createdById: user.id,
        status: 'NOT_STARTED',
        percentComplete: 0
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })

    return NextResponse.json({
      ...task,
      assignedTo: { name: `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email },
      createdBy: { name: `${task.createdBy.firstName || ''} ${task.createdBy.lastName || ''}`.trim() || task.createdBy.email }
    })
  } catch (error: any) {
    console.error('[adhoc-tasks POST] Error:', error.message)
    return NextResponse.json({ error: 'Failed to create task', details: error.message }, { status: 500 })
  }
}
