import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('PATCH request body:', body)
    const { status, percentComplete, evidenceUrl, evidenceNotes, rating, customFieldValues, dueDate } = body

    // Verify user owns the plan this task belongs to
    const task = await prisma.independentPlanTask.findUnique({
      where: { id },
      include: { plan: true }
    })

    if (!task || task.plan.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const updateData: any = {}
    
    // Only update fields that are provided
    if (status !== undefined) updateData.status = status
    if (percentComplete !== undefined) updateData.percentComplete = percentComplete
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl
    if (evidenceNotes !== undefined) updateData.evidenceNotes = evidenceNotes
    if (rating !== undefined) updateData.rating = rating
    if (customFieldValues !== undefined) updateData.customFieldValues = customFieldValues
    
    // Handle dueDate - convert empty string to null, otherwise convert to Date
    if (dueDate !== undefined) {
      if (dueDate === '' || dueDate === null) {
        updateData.dueDate = null
      } else {
        // Validate and convert date
        const dateObj = new Date(dueDate)
        if (!isNaN(dateObj.getTime())) {
          updateData.dueDate = dateObj
        } else {
          console.error('Invalid date:', dueDate)
          return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
        }
      }
    }
    
    if (status === 'COMPLETED') updateData.completedAt = new Date()

    console.log('Update data:', updateData)

    const updated = await prisma.independentPlanTask.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating task:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the plan this task belongs to
    const task = await prisma.independentPlanTask.findUnique({
      where: { id },
      include: { plan: true }
    })

    if (!task || task.plan.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    await prisma.independentPlanTask.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
