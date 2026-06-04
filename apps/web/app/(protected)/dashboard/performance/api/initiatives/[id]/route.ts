import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const initiativeSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  measure: z.string().optional(),
  action: z.string().optional(),
  reportingPeriods: z.array(z.string()).optional(),
  quarterDates: z.record(z.string()).optional(),
  target: z.string().optional(),
  dueDate: z.string().optional(),
  primaryResponsibility: z.string().optional(),
  secondaryResponsibility: z.string().optional(),
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

    const initiative = await prisma.initiative.findUnique({
      where: { id },
      include: {
        targets: true,
      },
    })

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    return NextResponse.json(initiative)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch initiative' }, { status: 500 })
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
    const data = initiativeSchema.parse(body)

    const existingInitiative = await prisma.initiative.findUnique({
      where: { id },
    })

    if (!existingInitiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.number !== undefined) updateData.number = data.number
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.measure !== undefined) updateData.measure = data.measure
    if (data.action !== undefined) updateData.action = data.action
    if (data.reportingPeriods) updateData.reportingPeriods = data.reportingPeriods
    if (data.quarterDates !== undefined) updateData.quarterDates = data.quarterDates
    if (data.target !== undefined) updateData.target = data.target
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate)
    if (data.primaryResponsibility !== undefined) updateData.primaryResponsibility = data.primaryResponsibility
    if (data.secondaryResponsibility !== undefined) updateData.secondaryResponsibility = data.secondaryResponsibility

    const updatedInitiative = await prisma.initiative.update({
      where: { id },
      data: updateData,
      include: {
        targets: true,
      },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Initiative',
      resourceId: updatedInitiative.id,
      action: 'UPDATE',
      details: { before: existingInitiative, after: updatedInitiative },
    })

    return NextResponse.json(updatedInitiative)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update initiative' }, { status: 500 })
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

    const initiative = await prisma.initiative.findUnique({
      where: { id },
    })

    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    await prisma.initiative.delete({
      where: { id },
    })

    await createAuditLog({
      userId: user.id,
      resourceType: 'Initiative',
      resourceId: id,
      action: 'DELETE',
      details: { deletedInitiative: initiative },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete initiative' }, { status: 500 })
  }
}
