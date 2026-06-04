import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        userId: user.id,
        isAdhocContainer: false
      },
      select: {
        dueDate: true,
        status: true
      }
    })
    const performanceAgreements = categorize(perfAgreements)
    console.log('[deadline-stats] PA:', perfAgreements.length, 'items →', performanceAgreements)

    // 2. Ad-hoc Tasks
    let adhoc = { approaching: 0, overdue: 0 }
    try {
      const adhocTasks = await prisma.adhocTask.findMany({
        where: { assignedToId: user.id },
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
  } catch (error) {
    console.error('Failed to fetch deadline stats:', error)
    return NextResponse.json({ error: 'Failed to fetch deadline stats' }, { status: 500 })
  }
}
