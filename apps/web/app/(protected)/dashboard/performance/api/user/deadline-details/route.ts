import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
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
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let tasks: any[] = []

    switch (category) {
      case 'performance':
        // Fetch Performance Agreements
        const performanceAgreements = await prisma.performanceAgreement.findMany({
          where: {
            userId,
            isAdhocContainer: false,
            status: { not: 'COMPLETED' },
            OR: [
              { dueDate: { lt: now } }, // Overdue
              { dueDate: { lte: sevenDaysFromNow } } // Approaching
            ]
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            status: true,
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
        tasks = performanceAgreements
        break

      case 'adhoc':
        // Fetch Ad-hoc Tasks
        const adhocTasks = await prisma.adhocTask.findMany({
          where: {
            assignedToId: userId,
            status: { not: 'COMPLETED' },
            dueDate: { not: null },
            OR: [
              { dueDate: { lt: now } },
              { dueDate: { lte: sevenDaysFromNow } }
            ]
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            status: true,
            priority: true,
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
        tasks = adhocTasks
        break

      case 'projects':
        // Fetch Project Tasks from Independent Plans
        const projectTasks = await prisma.independentPlanTask.findMany({
          where: {
            plan: {
              userId
            },
            status: { not: 'COMPLETED' },
            dueDate: { not: null },
            OR: [
              { dueDate: { lt: now } },
              { dueDate: { lte: sevenDaysFromNow } }
            ]
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            status: true,
            priority: true,
            plan: {
              select: {
                title: true
              }
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        })
        tasks = projectTasks.map(task => ({
          ...task,
          description: task.description || `Part of: ${task.plan.title}`
        }))
        break

      case 'risk':
        // Placeholder for Risk Management tasks
        // TODO: Implement when risk management module is available
        tasks = []
        break

      default:
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Failed to fetch deadline details:', error)
    return NextResponse.json({ error: 'Failed to fetch deadline details' }, { status: 500 })
  }
}
