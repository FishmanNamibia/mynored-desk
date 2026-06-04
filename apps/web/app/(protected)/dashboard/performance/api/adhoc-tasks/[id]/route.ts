import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

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

    const body = await req.json()
    const { status, percentComplete, evidenceUrl, rating } = body

    // Verify user is assigned to this task or created it
    const task = await prisma.adhocTask.findUnique({
      where: { id }
    })

    if (!task || (task.assignedToId !== actualUserId && task.createdById !== actualUserId)) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const updated = await prisma.adhocTask.update({
      where: { id },
      data: {
        status,
        percentComplete,
        evidenceUrl,
        rating,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        approvalStatus: status === 'COMPLETED' ? 'SUBMITTED' : task.approvalStatus
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating adhoc task:', error)
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

    // Verify user created this task
    const task = await prisma.adhocTask.findUnique({
      where: { id }
    })

    if (!task || task.createdById !== actualUserId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    await prisma.adhocTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting adhoc task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
