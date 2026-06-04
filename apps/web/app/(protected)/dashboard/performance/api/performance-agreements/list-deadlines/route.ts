import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve canonical DB user ID (oldest record by email) to handle ghost accounts
    const canonicalUser = user.email ? await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    }) : null
    const userId = canonicalUser?.id || user.id

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Helper: categorize items by deadline. Only skip COMPLETED work items.
    const categorize = (items: Array<{ dueDate: Date | null; status: string }>) => {
      let approaching = 0
      let overdue = 0

      items.forEach(item => {
        if (!item.dueDate) return
        if (item.status === 'COMPLETED') return

        const dueDate = new Date(item.dueDate)
        if (dueDate < now) {
          overdue++
        } else if (dueDate <= sevenDaysFromNow) {
          approaching++
        }
      })

      return { approaching, overdue }
    }

    // 1. Performance Agreements (non ad-hoc initiatives)
    const perfAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId,
        isAdhocContainer: false
      },
      select: {
        dueDate: true,
        status: true
      }
    })
    const performanceAgreements = categorize(perfAgreements)

    // 2. Ad-hoc Tasks
    let adhoc = { approaching: 0, overdue: 0 }
    try {
      const adhocTasks = await prisma.adhocTask.findMany({
        where: { assignedToId: userId },
        select: { dueDate: true, status: true }
      })
      adhoc = categorize(adhocTasks)
    } catch (e) { /* table may not exist */ }

    // 3. Projects — no separate model yet
    const projects = { approaching: 0, overdue: 0 }

    // 4. Risk Management — no separate model yet
    const risk = { approaching: 0, overdue: 0 }

    return NextResponse.json({
      performanceAgreements,
      adhoc,
      projects,
      risk
    })
  } catch (error: any) {
    console.error('[list-deadlines] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
