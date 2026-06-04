import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')

    let where: any = {}
    const now = new Date()

    // Build filter conditions based on the filter parameter
    switch (filter) {
      case 'all':
        // No additional filter - show all tasks
        break
      
      case 'completed':
        where.status = 'COMPLETED'
        break
      
      case 'in_progress':
        where.status = 'IN_PROGRESS'
        break
      
      case 'overdue':
        where.AND = [
          { status: { not: 'COMPLETED' } },
          { dueDate: { lt: now } }
        ]
        break
      
      case 'due_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        where.AND = [
          { status: { not: 'COMPLETED' } },
          { dueDate: { gte: startOfMonth, lte: endOfMonth } }
        ]
        break
      
      case 'blocked':
        where.status = 'BLOCKED'
        break
      
      default:
        // If no valid filter, return empty array
        return NextResponse.json([])
    }

    // Apply role-based filtering
    if (user.role === 'STAFF' || user.role === 'ADMINISTRATIVE_ASSISTANT') {
      where.responsibleId = user.id
    }

    const tasks = await prisma.target.findMany({
      where,
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 100, // Limit to 100 tasks for performance
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Failed to fetch tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
