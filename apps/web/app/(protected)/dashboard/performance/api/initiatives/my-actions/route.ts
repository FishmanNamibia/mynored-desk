import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[MY ACTIONS] Fetching actions for user:', user.id)

    // Get initiatives where user is primary or secondary responsible
    const initiatives = await prisma.initiative.findMany({
      where: {
        OR: [
          { primaryResponsibility: user.id },
          { secondaryResponsibility: user.id },
        ],
      },
      include: {
        objective: {
          include: {
            goal: true,
          },
        },
        targets: {
          include: {
            responsible: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('[MY ACTIONS] Found', initiatives.length, 'initiatives')

    // Transform to action format
    const actions = initiatives.map(init => ({
      id: init.id,
      title: init.title,
      number: init.number,
      description: init.description,
      measure: init.measure,
      action: init.action,
      target: init.target,
      reportingPeriods: init.reportingPeriods,
      quarterDates: init.quarterDates,
      status: init.status,
      percentComplete: init.percentComplete,
      progressNotes: init.progressNotes,
      evidenceUrl: init.evidenceUrl,
      evidenceNotes: init.evidenceNotes,
      rating: init.rating,
      isPrimaryResponsible: init.primaryResponsibility === user.id,
      isSecondaryResponsible: init.secondaryResponsibility === user.id,
      primaryResponsibleId: init.primaryResponsibility,
      secondaryResponsibleId: init.secondaryResponsibility,
      objective: {
        id: init.objective.id,
        title: init.objective.title,
        goal: {
          id: init.objective.goal.id,
          title: init.objective.goal.title,
          goalNumber: init.objective.goal.goalNumber,
        },
      },
      tasks: init.targets,
      createdAt: init.createdAt,
      updatedAt: init.updatedAt,
    }))

    return NextResponse.json(actions)
  } catch (error) {
    console.error('[MY ACTIONS] Failed to fetch:', error)
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 })
  }
}
