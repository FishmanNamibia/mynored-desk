import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const objectiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  goalId: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const goalId = searchParams.get('goalId')

    const objectives = await prisma.objective.findMany({
      where: goalId ? { goalId } : undefined,
      include: {
        goal: true,
        initiatives: {
          include: {
            targets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(objectives)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch objectives' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    // Only Admin, SG, Deputy SG, Executive, and Administrative Assistant can create objectives
    if (!user || !['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only administrators, executives, and administrative assistants can create objectives' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = objectiveSchema.parse(body)

    const objective = await prisma.objective.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        goalId: validatedData.goalId,
      },
      include: {
        goal: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      entityType: 'Objective',
      entityId: objective.id,
      action: 'CREATE',
      afterData: objective,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return NextResponse.json(objective, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create objective' }, { status: 500 })
  }
}
