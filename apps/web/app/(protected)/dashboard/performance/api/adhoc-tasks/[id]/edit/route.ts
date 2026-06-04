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
    const { title, description, priority, dueDate, assignedToId } = body

    // Verify user created this task
    const task = await prisma.adhocTask.findUnique({
      where: { id }
    })

    if (!task || task.createdById !== actualUserId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const updateData: any = {
      title,
      description,
      priority
    }

    // Handle dueDate
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate === '' || dueDate === null ? null : new Date(dueDate)
    }

    // Handle assignedToId - if empty, assign to creator
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId === '' ? actualUserId : assignedToId
    }

    const updated = await prisma.adhocTask.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error editing adhoc task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
