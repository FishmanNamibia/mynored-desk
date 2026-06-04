import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const { user } = await getAuthenticatedUser(req)
      if (user?.id) userId = user.id
      if (user?.email) userEmail = user.email
    } catch { /* ignore */ }

    if (!userId) {
      const url = new URL(req.url)
      userId = url.searchParams.get('userId')
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve canonical DB user ID (oldest record by email) to handle ghost accounts
    if (userEmail) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: userEmail, mode: 'insensitive' } },
          orderBy: { createdAt: 'asc' },
          select: { id: true }
        })
        if (dbUser) {
          userId = dbUser.id
        }
      } catch (e) {
        console.error('[DASHBOARD-KPIS] Error resolving DB user by email:', e)
      }
    }

    console.log('[DASHBOARD-KPIS] Fetching KPIs for user:', userId)

    // Fetch active performance period first (needed for filtering)
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true, submissionDeadline: true },
    })

    // Fetch task counts filtered by active period (with fallback for users whose agreements predate the period)
    const agreementSelect = { id: true, status: true, dueDate: true } as const
    let myAgreements = await prisma.performanceAgreement.findMany({
      where: { userId, isAdhocContainer: false, ...(activePeriod?.id ? { performancePeriodId: activePeriod.id } : {}) },
      select: agreementSelect,
    })
    if (myAgreements.length === 0) {
      myAgreements = await prisma.performanceAgreement.findMany({
        where: { userId, isAdhocContainer: false },
        select: agreementSelect,
      })
    }

    const [
      myAdhocTasks,
      pendingApprovals,
    ] = await Promise.all([
      // My adhoc tasks (for legacy KPIs)
      prisma.adhocTask.findMany({
        where: { assignedToId: userId },
        select: { id: true, status: true },
      }),
      // Agreements pending my approval (as supervisor)
      prisma.performanceAgreement.findMany({
        where: {
          approvalStatus: 'PENDING',
          user: { managerId: userId },
          isAdhocContainer: false,
          ...(activePeriod?.id ? { performancePeriodId: activePeriod.id } : {})
        },
        select: { id: true },
      }),
    ])

    // Calculate performance KPIs from agreements (matching Workplan Actions page)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    const totalActions = myAgreements.length
    const notStarted = myAgreements.filter(a => a.status === 'NOT_STARTED').length
    const inProgress = myAgreements.filter(a => a.status === 'IN_PROGRESS').length
    const completed = myAgreements.filter(a => a.status === 'COMPLETED').length
    const overdue = myAgreements.filter(a => {
      return a.status !== 'COMPLETED' && a.dueDate && new Date(a.dueDate) < now
    }).length

    console.log('[DASHBOARD-KPIS] Calculated KPIs:', {
      totalActions,
      notStarted,
      inProgress,
      completed,
      overdue,
      agreementsCount: myAgreements.length
    })

    // Legacy calculations for compatibility
    const taskCount = myAgreements.length + myAdhocTasks.filter(t => t.status !== 'COMPLETED').length
    const approvalsCount = pendingApprovals.length

    // Performance period info for FY badge
    let periodInfo = null
    if (activePeriod) {
      const now = new Date()
      const endDate = new Date(activePeriod.endDate)
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      periodInfo = {
        name: activePeriod.name,
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate,
        daysLeft,
      }
    }

    return NextResponse.json({
      // Performance Management KPIs
      totalActions,
      notStarted,
      inProgress,
      completed,
      overdue,
      
      // Legacy KPIs (keeping for compatibility)
      tasks: taskCount,
      approvals: approvalsCount,
      memos: 0,
      meetings: 0,
      reviews: 0,
      requests: 0,
      activePeriod: periodInfo,
    })
  } catch (error: any) {
    console.error('dashboard-kpis error:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
