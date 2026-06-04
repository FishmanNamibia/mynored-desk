import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const objectiveSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
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

    const objective = await prisma.objective.findUnique({
      where: { id },
      include: {
        initiatives: true,
      },
    })

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    return NextResponse.json(objective)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch objective' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const data = objectiveSchema.parse(body)

    const existingObjective = await prisma.objective.findUnique({
      where: { id },
    })

    if (!existingObjective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description

    const updatedObjective = await prisma.objective.update({
      where: { id },
      data: updateData,
      include: {
        initiatives: true,
      },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Objective',
      resourceId: updatedObjective.id,
      action: 'UPDATE',
      details: { before: existingObjective, after: updatedObjective },
    })

    return NextResponse.json(updatedObjective)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update objective' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const objective = await prisma.objective.findUnique({
      where: { id },
    })

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    await prisma.objective.delete({
      where: { id },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Objective',
      resourceId: id,
      action: 'DELETE',
      details: { deletedObjective: objective },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete objective' }, { status: 500 })
  }
}
