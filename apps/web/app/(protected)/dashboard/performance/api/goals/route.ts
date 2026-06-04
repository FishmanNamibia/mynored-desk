import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

const goalSchema = z.object({
  goalNumber: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
})

// Normalize goal numbers: strip prefixes like "GOAL-" → just the number
function normalizeGoalNumber(goalNumber: string): string {
  return goalNumber.trim().replace(/^GOAL[\s\-_]*:?\s*/i, '').trim()
}

// Auto-merge duplicate goals that differ only by prefix (e.g. "GOAL-2" vs "2")
async function autoMergeDuplicateGoals() {
  try {
    const allGoals = await prisma.goal.findMany({
      select: { id: true, goalNumber: true, objectives: { select: { id: true } } },
      orderBy: { createdAt: 'asc' }
    })

    // Group by normalized number
    const groups = new Map<string, typeof allGoals>()
    for (const g of allGoals) {
      const norm = normalizeGoalNumber(g.goalNumber)
      if (!groups.has(norm)) groups.set(norm, [])
      groups.get(norm)!.push(g)
    }

    for (const [norm, goalsInGroup] of groups) {
      // Normalize single goals
      if (goalsInGroup.length === 1) {
        if (goalsInGroup[0].goalNumber !== norm) {
          await prisma.goal.update({ where: { id: goalsInGroup[0].id }, data: { goalNumber: norm } })
        }
        continue
      }

      // Multiple goals with same normalized number → merge
      // Canonical = the one already using the normalized number, or the one with most objectives
      let canonical = goalsInGroup.find(g => g.goalNumber === norm)
        || goalsInGroup.sort((a, b) => b.objectives.length - a.objectives.length)[0]

      if (canonical.goalNumber !== norm) {
        await prisma.goal.update({ where: { id: canonical.id }, data: { goalNumber: norm } })
      }

      for (const dup of goalsInGroup.filter(g => g.id !== canonical.id)) {
        if (dup.objectives.length > 0) {
          if (canonical.objectives.length >= dup.objectives.length) {
            // Canonical has more or equal objectives — delete the duplicate's stale objectives
            await prisma.objective.deleteMany({ where: { goalId: dup.id } })
          } else {
            // Duplicate has more objectives — it's the fresher data; delete canonical's old ones and move
            await prisma.objective.deleteMany({ where: { goalId: canonical.id } })
            await prisma.objective.updateMany({ where: { goalId: dup.id }, data: { goalId: canonical.id } })
          }
        }
        await prisma.goal.delete({ where: { id: dup.id } })
        console.log(`[goal-cleanup] Merged "${dup.goalNumber}" into "${norm}"`)
      }
    }
  } catch (err) {
    console.error('[goal-cleanup] Error:', err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)
    if (!user) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    // Auto-merge any duplicate goals (e.g. "GOAL-2" + "2" → "2")
    await autoMergeDuplicateGoals()

    const goals = await prisma.goal.findMany({
      where: {
        // Exclude goals created by individual contract imports — those belong to employees
        // Use OR with null check because Prisma's `not` excludes null values
        OR: [
          { bscPerspective: null },
          { bscPerspective: { not: { equals: 'INDIVIDUAL_CONTRACT' } } }
        ]
      },
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
      orderBy: { createdAt: 'desc' },
    })

    // Fetch user details for primary and secondary responsible persons
    const userIds = new Set<string>()
    goals.forEach(goal => {
      goal.objectives.forEach(objective => {
        objective.initiatives.forEach(initiative => {
          if (initiative.primaryResponsibility) {
            userIds.add(initiative.primaryResponsibility)
          }
          if (initiative.secondaryResponsibility) {
            userIds.add(initiative.secondaryResponsibility)
          }
        })
      })
    })

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
      },
    })

    const toDisplayName = (u: { firstName: string | null; lastName: string | null; username: string; email: string }) => {
      const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
      return full || u.username || u.email
    }

    const userMap = new Map(users.map(u => [u.id, { id: u.id, name: toDisplayName(u) }]))

    // Attach user names to initiatives
    const goalsWithNames = goals.map(goal => ({
      ...goal,
      objectives: goal.objectives.map(objective => ({
        ...objective,
        initiatives: objective.initiatives.map(initiative => {
          // Check if responsibility is a user ID or a role/text (from Excel import)
          const primaryUser = initiative.primaryResponsibility 
            ? userMap.get(initiative.primaryResponsibility) || { id: initiative.primaryResponsibility, name: initiative.primaryResponsibility }
            : null
          
          const secondaryUser = initiative.secondaryResponsibility
            ? userMap.get(initiative.secondaryResponsibility) || { id: initiative.secondaryResponsibility, name: initiative.secondaryResponsibility }
            : null
          
          return {
            ...initiative,
            primaryResponsibleUser: primaryUser,
            secondaryResponsibleUser: secondaryUser
          }
        })
      }))
    }))

    const res = NextResponse.json(goalsWithNames)
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)
    // Only Admin, SG, Deputy SG, Executive, and Administrative Assistant can create goals
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'ADMINISTRATIVE_ASSISTANT'])) {
      const res = NextResponse.json(
        { error: 'Unauthorized - Only administrators, executives, and administrative assistants can create implementation plans' },
        { status: 403 },
      )
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    const body = await req.json()
    console.log('Received goal data:', body)
    
    const validatedData = goalSchema.parse(body)
    console.log('Validated goal data:', validatedData)

    const goal = await prisma.goal.create({
      data: {
        goalNumber: validatedData.goalNumber,
        title: validatedData.title,
        description: validatedData.description,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
      },
    })

    await createAuditLog({
      actorId: user.id,
      entityType: 'Goal',
      entityId: goal.id,
      action: 'CREATE',
      afterData: goal,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    const res = NextResponse.json(goal, { status: 201 })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    console.error('Goal creation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create goal', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
