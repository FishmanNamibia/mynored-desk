import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const initiativeSchema = z.object({
  number: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  measure: z.string().optional(),
  action: z.string().optional(),
  reportingPeriods: z.array(z.string()).optional(),
  quarterDates: z.any().optional(),
  target: z.string().optional(),
  primaryResponsibility: z.string().optional(),
  secondaryResponsibility: z.string().optional(),
  objectiveId: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const objectiveId = searchParams.get('objectiveId')

    const initiatives = await prisma.initiative.findMany({
      where: objectiveId ? { objectiveId } : undefined,
      include: {
        objective: {
          include: {
            goal: true,
          },
        },
        targets: {
          include: {
            responsible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(initiatives)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch initiatives' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    // Only Admin, SG, Deputy SG, Executive, and Administrative Assistant can create initiatives
    if (!user || !['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Only administrators, executives, and administrative assistants can create initiatives' }, { status: 403 })
    }

    const body = await req.json()
    console.log('Creating initiative with data:', body)
    const validatedData = initiativeSchema.parse(body)
    console.log('Validated initiative data:', validatedData)

    // Calculate due date from quarterDates
    const calculateDueDate = (quarterDates: any) => {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      if (quarterDates?.q4) return new Date(nextYear, 2, 31)
      if (quarterDates?.q3) return new Date(currentYear, 11, 31)
      if (quarterDates?.q2) return new Date(currentYear, 8, 30)
      if (quarterDates?.q1) return new Date(currentYear, 5, 30)
      return new Date(currentYear, 11, 31)
    }

    const initiative = await prisma.initiative.create({
      data: {
        number: validatedData.number,
        title: validatedData.title,
        description: validatedData.description,
        measure: validatedData.measure,
        action: validatedData.action,
        reportingPeriods: validatedData.reportingPeriods,
        quarterDates: validatedData.quarterDates,
        target: validatedData.target,
        primaryResponsibility: validatedData.primaryResponsibility,
        secondaryResponsibility: validatedData.secondaryResponsibility,
        objectiveId: validatedData.objectiveId,
        dueDate: calculateDueDate(validatedData.quarterDates)
      },
      include: {
        objective: {
          include: {
            goal: true,
          },
        },
      },
    })

    await createAuditLog({
      actorId: user.id,
      entityType: 'Initiative',
      entityId: initiative.id,
      action: 'CREATE',
      afterData: initiative,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    // Auto-create performance agreements for responsible executives
    const responsibleIds = [
      validatedData.primaryResponsibility,
      validatedData.secondaryResponsibility
    ].filter((id): id is string => Boolean(id))

    for (const userId of responsibleIds) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: userId } })
        if (user && dbUser.role === 'EXECUTIVE') {
          // Calculate due date based on reporting period
          const dueDate = new Date()
          if (validatedData.reportingPeriods && validatedData.reportingPeriods.includes('Annual')) {
            dueDate.setFullYear(dueDate.getFullYear() + 1)
          } else {
            dueDate.setMonth(dueDate.getMonth() + 3) // Quarterly default
          }

          await prisma.performanceAgreement.create({
            data: {
              title: initiative.title,
              description: validatedData.description || '',
              kpi: validatedData.measure || '',
              target: validatedData.target || '',
              weight: 0, // Can be updated later
              dueDate,
              userId,
              initiativeId: initiative.id,
              status: 'NOT_STARTED',
              percentComplete: 0
            }
          })
        }
      } catch (error) {
        console.error(`Failed to create performance agreement for user ${userId}:`, error)
        // Continue even if PA creation fails
      }
    }

    return NextResponse.json(initiative, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create initiative' }, { status: 500 })
  }
}
