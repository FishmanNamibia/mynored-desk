import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'


export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only HC Executive, SG, Admin, or Administrative Assistant can clear all goals data
    if (!userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'])) {
      return NextResponse.json({ 
        error: 'Unauthorized: Only administrators and executives can clear goals data' 
      }, { status: 403 })
    }

    // Only delete AWP-imported goals — preserve employee-imported individual contracts
    // Goals with bscPerspective='INDIVIDUAL_CONTRACT' are created by employee contract imports
    const goalsToDelete = await prisma.goal.findMany({
      where: {
        OR: [
          { bscPerspective: null },
          { bscPerspective: { not: { equals: 'INDIVIDUAL_CONTRACT' } } }
        ]
      },
      select: { id: true }
    })
    const goalIds = goalsToDelete.map(g => g.id)

    if (goalIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No AWP goals to clear',
        deleted: { goals: 0, objectives: 0, initiatives: 0 }
      }, { status: 200 })
    }

    // Get objective IDs for these goals
    const objectivesToDelete = await prisma.objective.findMany({
      where: { goalId: { in: goalIds } },
      select: { id: true }
    })
    const objectiveIds = objectivesToDelete.map(o => o.id)

    // Delete in correct order due to foreign key constraints
    const deletedInitiatives = await prisma.initiative.deleteMany({
      where: { objectiveId: { in: objectiveIds } }
    })
    const deletedObjectives = await prisma.objective.deleteMany({
      where: { goalId: { in: goalIds } }
    })
    const deletedGoals = await prisma.goal.deleteMany({
      where: { id: { in: goalIds } }
    })

    return NextResponse.json({
      success: true,
      message: 'AWP goals data cleared successfully (employee contracts preserved)',
      deleted: {
        goals: deletedGoals.count,
        objectives: deletedObjectives.count,
        initiatives: deletedInitiatives.count
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Clear goals error:', error)
    return NextResponse.json({ 
      error: 'Failed to clear goals data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
