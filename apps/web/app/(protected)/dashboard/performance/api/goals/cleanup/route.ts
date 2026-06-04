import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

// Helper to normalize goal numbers: strip prefixes like "GOAL-" and return just the number
function normalizeGoalNumber(goalNumber: string): string {
  const trimmed = goalNumber.trim()
  const stripped = trimmed.replace(/^GOAL[\s\-_]*:?\s*/i, '')
  return stripped.trim()
}

// POST: Merge duplicate goals and normalize goal numbers
// This finds goals with "GOAL-X" format and merges their objectives into the canonical "X" goal
export async function POST(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE'])) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    const allGoals = await prisma.goal.findMany({
      include: {
        objectives: {
          include: {
            initiatives: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const results = {
      goalsMerged: 0,
      goalsNormalized: 0,
      objectivesMoved: 0,
      goalsDeleted: 0,
      details: [] as string[]
    }

    // Group goals by their normalized number
    const goalsByNormalized = new Map<string, typeof allGoals>()
    for (const goal of allGoals) {
      const normalized = normalizeGoalNumber(goal.goalNumber)
      if (!goalsByNormalized.has(normalized)) {
        goalsByNormalized.set(normalized, [])
      }
      goalsByNormalized.get(normalized)!.push(goal)
    }

    // Process each group
    for (const [normalizedNum, goalsInGroup] of goalsByNormalized) {
      if (goalsInGroup.length <= 1) {
        // Single goal — just normalize the number if needed
        const goal = goalsInGroup[0]
        if (goal.goalNumber !== normalizedNum) {
          await prisma.goal.update({
            where: { id: goal.id },
            data: { goalNumber: normalizedNum }
          })
          results.goalsNormalized++
          results.details.push(`Normalized "${goal.goalNumber}" → "${normalizedNum}"`)
        }
        continue
      }

      // Multiple goals with the same normalized number — merge them
      // Pick the canonical goal: prefer the one with the normalized number, or the one with more objectives
      let canonical = goalsInGroup.find(g => g.goalNumber === normalizedNum)
      if (!canonical) {
        // Pick the one with the most objectives
        canonical = goalsInGroup.sort((a, b) => b.objectives.length - a.objectives.length)[0]
      }

      // Normalize the canonical goal's number
      if (canonical.goalNumber !== normalizedNum) {
        await prisma.goal.update({
          where: { id: canonical.id },
          data: { goalNumber: normalizedNum }
        })
        results.goalsNormalized++
      }

      // Move objectives from duplicate goals to the canonical goal
      const duplicates = goalsInGroup.filter(g => g.id !== canonical!.id)
      for (const dup of duplicates) {
        if (dup.objectives.length > 0) {
          // Before deleting any objectives, disconnect performance agreements
          // from all initiatives under the objectives being deleted so they
          // are NOT cascade-deleted.
          const disconnectGoalId = canonical.objectives.length >= dup.objectives.length ? dup.id : canonical.id
          const initIdsToDisconnect = await prisma.initiative.findMany({
            where: { objective: { goalId: disconnectGoalId } },
            select: { id: true }
          })
          if (initIdsToDisconnect.length > 0) {
            await prisma.performanceAgreement.updateMany({
              where: { initiativeId: { in: initIdsToDisconnect.map(i => i.id) } },
              data: { initiativeId: null }
            })
          }

          if (canonical.objectives.length >= dup.objectives.length) {
            // Canonical has more or equal objectives — delete the duplicate's stale objectives
            await prisma.objective.deleteMany({ where: { goalId: dup.id } })
            results.details.push(`Deleted ${dup.objectives.length} stale objectives from duplicate "${dup.goalNumber}"`)
          } else {
            // Duplicate has more objectives — it's the fresher data; swap
            await prisma.objective.deleteMany({ where: { goalId: canonical.id } })
            await prisma.objective.updateMany({ where: { goalId: dup.id }, data: { goalId: canonical.id } })
            results.objectivesMoved += dup.objectives.length
            results.details.push(`Moved ${dup.objectives.length} objectives from "${dup.goalNumber}" to canonical goal "${normalizedNum}"`)
          }
        }

        // Delete the duplicate goal (now empty)
        await prisma.goal.delete({
          where: { id: dup.id }
        })
        results.goalsDeleted++
        results.details.push(`Deleted duplicate goal "${dup.goalNumber}" (${dup.title.substring(0, 40)})`)
      }

      results.goalsMerged++
    }

    const res = NextResponse.json({
      success: true,
      message: `Cleanup complete: ${results.goalsMerged} goal group(s) merged, ${results.goalsNormalized} normalized, ${results.goalsDeleted} duplicates deleted, ${results.objectivesMoved} objectives moved.`,
      results
    })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res

  } catch (error: any) {
    console.error('Goal cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup goals: ' + error.message },
      { status: 500 }
    )
  }
}
