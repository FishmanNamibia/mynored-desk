import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Fetch Performance Agreement actions
    const performanceAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId,
        isAdhocContainer: false // Exclude container items
      },
      select: {
        id: true,
        title: true,
        customAction: true,
        approvalStatus: true,
        status: true,
        initiative: {
          select: {
            title: true
          }
        }
      }
    })

    // Fetch Ad-hoc Tasks
    const adhocTasks = await prisma.adhocTask.findMany({
      where: {
        assignedToId: userId
      },
      select: {
        id: true,
        title: true,
        status: true,
        approvalStatus: true
      }
    })

    // Fetch Projects (placeholder - will be 0 until implemented)
    const projects: any[] = []

    // Fetch Risk Management tasks (placeholder - will be 0 until implemented)
    const riskTasks: any[] = []

    // Calculate Performance Agreement stats
    const paCompleted = performanceAgreements.filter(a => a.approvalStatus === 'APPROVED').length
    const paInProgress = performanceAgreements.filter(a => a.approvalStatus === 'PENDING_APPROVAL').length
    const paPending = performanceAgreements.filter(a => a.approvalStatus === 'PENDING' || !a.approvalStatus).length

    // Calculate Ad-hoc stats
    const adhocCompleted = adhocTasks.filter(t => t.status === 'COMPLETED').length
    const adhocInProgress = adhocTasks.filter(t => t.status === 'IN_PROGRESS').length
    const adhocPending = adhocTasks.filter(t => t.status === 'PENDING' || t.status === 'NOT_STARTED').length

    // Calculate Projects stats (placeholder)
    const projectsCompleted = 0
    const projectsInProgress = 0
    const projectsPending = 0

    // Calculate Risk Management stats (placeholder)
    const riskCompleted = 0
    const riskInProgress = 0
    const riskPending = 0

    // Calculate totals
    const totalAll = performanceAgreements.length + adhocTasks.length + projects.length + riskTasks.length
    const totalCompleted = paCompleted + adhocCompleted + projectsCompleted + riskCompleted
    const totalInProgress = paInProgress + adhocInProgress + projectsInProgress + riskInProgress
    const totalPending = paPending + adhocPending + projectsPending + riskPending

    return NextResponse.json({
      performanceAgreement: {
        total: performanceAgreements.length,
        completed: paCompleted,
        inProgress: paInProgress,
        pending: paPending,
        actions: performanceAgreements.map(a => ({
          id: a.id,
          title: a.customAction || a.initiative?.title || a.title || 'Untitled',
          status: a.approvalStatus
        }))
      },
      adhoc: {
        total: adhocTasks.length,
        completed: adhocCompleted,
        inProgress: adhocInProgress,
        pending: adhocPending,
        actions: adhocTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status
        }))
      },
      projects: {
        total: projects.length,
        completed: projectsCompleted,
        inProgress: projectsInProgress,
        pending: projectsPending,
        actions: []
      },
      riskManagement: {
        total: riskTasks.length,
        completed: riskCompleted,
        inProgress: riskInProgress,
        pending: riskPending,
        actions: []
      },
      totals: {
        all: totalAll,
        completed: totalCompleted,
        inProgress: totalInProgress,
        pending: totalPending
      }
    })
  } catch (error) {
    console.error('Error fetching individual actions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
