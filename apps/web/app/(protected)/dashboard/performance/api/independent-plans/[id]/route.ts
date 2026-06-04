import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

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

    // Verify user owns this plan
    const plan = await prisma.independentPlan.findUnique({
      where: { id }
    })

    if (!plan || plan.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    // Delete the plan (tasks will be deleted automatically due to cascade)
    await prisma.independentPlan.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // Verify user owns this plan
    const plan = await prisma.independentPlan.findUnique({
      where: { id }
    })

    if (!plan || plan.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, startDate, endDate, departmentId, status, customColumns } = body

    const updatedPlan = await prisma.independentPlan.update({
      where: { id },
      data: {
        title: title || plan.title,
        description: description !== undefined ? description : plan.description,
        startDate: startDate ? new Date(startDate) : plan.startDate,
        endDate: endDate ? new Date(endDate) : plan.endDate,
        departmentId: departmentId !== undefined ? departmentId : plan.departmentId,
        status: status || plan.status,
        customColumns: customColumns !== undefined ? customColumns : plan.customColumns
      },
      include: {
        tasks: true,
        department: true
      }
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
