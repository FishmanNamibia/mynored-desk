import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      console.log('[deadline-stats] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve canonical DB user ID (oldest record by email) to handle ghost accounts
    const canonicalUser = user.email ? await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    }) : null
    const userId = canonicalUser?.id || user.id
    console.log('[deadline-stats] Fetching stats for user:', userId, '(session:', user.id, ')')
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Helper to categorize items by deadline
    // Only skip items where the WORK is completed — approved agreements still have deadlines to track
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
        status: true,
        approvalStatus: true
      }
    })
    const performanceAgreements = categorize(perfAgreements)
    console.log('[deadline-stats] PA items:', perfAgreements.length, '→', performanceAgreements)

    // 2. Ad-hoc Tasks
    let adhoc = { approaching: 0, overdue: 0 }
    try {
      const adhocTasks = await prisma.adhocTask.findMany({
        where: {
          assignedToId: userId
        },
        select: {
          dueDate: true,
          status: true,
          approvalStatus: true
        }
      })
      adhoc = categorize(adhocTasks)
    } catch (e) {
      // AdhocTask table may not exist yet
    }

    // 3. Projects (no separate model — placeholder)
    const projects = { approaching: 0, overdue: 0 }

    // 4. Risk Management (no separate model — placeholder)
    const risk = { approaching: 0, overdue: 0 }

    return NextResponse.json({
      performanceAgreements,
      adhoc,
      projects,
      risk
    })

  } catch (error: any) {
    console.error('Error fetching deadline stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deadline stats' },
      { status: 500 }
    )
  }
}
