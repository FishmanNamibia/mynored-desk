import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user info
    const userInfo = {
      id: authUser.id,
      email: authUser.email,
      name: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim()
    }

    // Check for performance agreements
    const allAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: authUser.id
      },
      select: {
        id: true,
        title: true,
        approvalStatus: true,
        rating: true,
        weight: true,
        isAdhocContainer: true
      }
    })

    const approvedAgreements = allAgreements.filter(a => a.approvalStatus === 'APPROVED' && !a.isAdhocContainer)
    const ratedAgreements = approvedAgreements.filter(a => a.rating !== null && a.rating !== undefined)

    // Check for adhoc tasks
    const adhocTasks = await prisma.adhocTask.findMany({
      where: {
        assignedToId: authUser.id,
        approvalStatus: 'APPROVED'
      },
      select: {
        id: true,
        title: true,
        status: true
      }
    })

    return NextResponse.json({
      user: userInfo,
      summary: {
        totalAgreements: allAgreements.length,
        approvedAgreements: approvedAgreements.length,
        ratedAgreements: ratedAgreements.length,
        adhocTasksTotal: adhocTasks.length,
        adhocTasksCompleted: adhocTasks.filter(t => t.status === 'COMPLETED').length
      },
      agreements: allAgreements.map(a => ({
        id: a.id,
        title: a.title,
        status: a.approvalStatus,
        rating: a.rating,
        weight: a.weight,
        isContainer: a.isAdhocContainer
      })),
      adhocTasks: adhocTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status
      }))
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
