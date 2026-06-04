import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const goalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        objectives: {
          include: {
            initiatives: {
              include: {
                targets: true,
              },
            },
          },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'])) {
      return NextResponse.json({ error: 'Unauthorized - Only administrators, executives, and administrative assistants can edit goals' }, { status: 403 })
    }

    const body = await req.json()
    const data = goalSchema.parse(body)

    const existingGoal = await prisma.goal.findUnique({
      where: { id },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.startDate) updateData.startDate = data.startDate
    if (data.endDate) updateData.endDate = data.endDate

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        objectives: true,
      },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Goal',
      resourceId: updatedGoal.id,
      action: 'UPDATE',
      details: { before: existingGoal, after: updatedGoal },
    })

    return NextResponse.json(updatedGoal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'])) {
      return NextResponse.json({ error: 'Unauthorized - Only administrators and executives can delete goals' }, { status: 403 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await prisma.goal.delete({
      where: { id },
    })

    // Audit log is best-effort — don't let it break the delete
    try {
      await createAuditLog({
        userId: user.id,
        resourceType: 'Goal',
        resourceId: id,
        action: 'DELETE',
        details: { deletedGoal: goal },
      })
    } catch (auditError) {
      console.error('[DELETE goal] Audit log failed (non-fatal):', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE goal] Error:', error)
    return NextResponse.json({ error: 'Failed to delete goal', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
