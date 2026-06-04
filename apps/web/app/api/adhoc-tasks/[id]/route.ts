import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// PATCH - Update adhoc task status/progress
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, percentComplete, evidenceUrl, rating } = body

    const task = await prisma.adhocTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only the assignee or creator can update
    if (task.assignedToId !== user.id && task.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.adhocTask.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(percentComplete !== undefined && { percentComplete: Number(percentComplete) }),
        ...(evidenceUrl !== undefined && { evidenceUrl }),
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[adhoc-tasks PATCH] Error:', error.message)
    return NextResponse.json({ error: 'Failed to update task', details: error.message }, { status: 500 })
  }
}

// DELETE - Delete an adhoc task
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const task = await prisma.adhocTask.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only the creator can delete
    if (task.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.adhocTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[adhoc-tasks DELETE] Error:', error.message)
    return NextResponse.json({ error: 'Failed to delete task', details: error.message }, { status: 500 })
  }
}
