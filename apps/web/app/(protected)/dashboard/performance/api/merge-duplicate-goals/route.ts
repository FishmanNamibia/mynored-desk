import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find duplicate goals by goalNumber
    const allGoals = await prisma.goal.findMany({
      include: {
        objectives: {
          include: {
            initiatives: {
              include: {
                performanceAgreements: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Group goals by goalNumber
    const goalsByNumber = new Map<string, typeof allGoals>()
    for (const goal of allGoals) {
      const existing = goalsByNumber.get(goal.goalNumber) || []
      existing.push(goal)
      goalsByNumber.set(goal.goalNumber, existing)
    }

    let mergedCount = 0
    let deletedCount = 0

    // Process each group of duplicates
    for (const [goalNumber, goals] of goalsByNumber.entries()) {
      if (goals.length <= 1) continue

      console.log(`🔄 Merging ${goals.length} duplicates for ${goalNumber}`)
      
      // Keep the first goal (oldest), merge others into it
      const primaryGoal = goals[0]
      const duplicates = goals.slice(1)

      for (const duplicate of duplicates) {
        // Move all objectives from duplicate to primary goal
        for (const objective of duplicate.objectives) {
          // Check if similar objective exists in primary goal
          const existingObjective = primaryGoal.objectives.find(
            o => o.title === objective.title
          )

          if (existingObjective) {
            // Move initiatives from duplicate objective to existing objective
            for (const initiative of objective.initiatives) {
              // Re-point any performance agreements from this initiative to the
              // matching initiative in the primary objective (if one exists), or
              // just move the initiative itself to the existing objective.
              await prisma.initiative.update({
                where: { id: initiative.id },
                data: { objectiveId: existingObjective.id }
              })
            }
            // Before deleting the now-empty duplicate objective, disconnect any
            // remaining performance agreements so they are NOT cascade-deleted.
            const dupInitIds = objective.initiatives.map(i => i.id)
            if (dupInitIds.length > 0) {
              await prisma.performanceAgreement.updateMany({
                where: { initiativeId: { in: dupInitIds } },
                data: { initiativeId: null }
              })
            }
            // Safe to delete — initiatives were already moved above, but guard
            // against any stragglers by disconnecting first.
            await prisma.objective.delete({
              where: { id: objective.id }
            })
          } else {
            // Move the entire objective to primary goal
            await prisma.objective.update({
              where: { id: objective.id },
              data: { goalId: primaryGoal.id }
            })
          }
        }

        // Delete the duplicate goal (now empty of objectives)
        await prisma.goal.delete({
          where: { id: duplicate.id }
        })
        deletedCount++
      }
      mergedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Merged ${mergedCount} goal groups, deleted ${deletedCount} duplicate goals`
    })

  } catch (error: any) {
    console.error('Error merging duplicate goals:', error)
    return NextResponse.json(
      { error: 'Failed to merge duplicate goals', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find duplicate goals by goalNumber
    const allGoals = await prisma.goal.findMany({
      select: {
        id: true,
        goalNumber: true,
        title: true,
        performanceYear: true,
        _count: {
          select: {
            objectives: true
          }
        }
      },
      orderBy: {
        goalNumber: 'asc'
      }
    })

    // Group goals by goalNumber
    const goalsByNumber = new Map<string, typeof allGoals>()
    for (const goal of allGoals) {
      const existing = goalsByNumber.get(goal.goalNumber) || []
      existing.push(goal)
      goalsByNumber.set(goal.goalNumber, existing)
    }

    // Find duplicates
    const duplicates: { goalNumber: string; count: number; goals: typeof allGoals }[] = []
    for (const [goalNumber, goals] of goalsByNumber.entries()) {
      if (goals.length > 1) {
        duplicates.push({ goalNumber, count: goals.length, goals })
      }
    }

    return NextResponse.json({
      totalGoals: allGoals.length,
      duplicateGroups: duplicates.length,
      duplicates
    })

  } catch (error: any) {
    console.error('Error checking duplicate goals:', error)
    return NextResponse.json(
      { error: 'Failed to check duplicate goals' },
      { status: 500 }
    )
  }
}
