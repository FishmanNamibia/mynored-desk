import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly
    const type = searchParams.get('type') || 'staff' // staff, division

    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'weekly':
        startDate = startOfWeek(now)
        endDate = endOfWeek(now)
        break
      case 'monthly':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'daily':
      default:
        startDate = startOfDay(now)
        endDate = endOfDay(now)
        break
    }

    if (type === 'staff') {
      // Top performers by staff
      const targets = await prisma.target.findMany({
        where: {
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        include: {
          responsible: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              division: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      })

      // Calculate on-time completions
      const staffPerformance = targets.reduce((acc, target) => {
        const userId = target.responsibleId
        const isOnTime = target.completedAt && target.dueDate && target.completedAt <= target.dueDate

        if (!acc[userId]) {
          acc[userId] = {
            user: target.responsible,
            totalCompleted: 0,
            onTimeCompleted: 0,
            lateCompleted: 0,
          }
        }

        acc[userId].totalCompleted++
        if (isOnTime) {
          acc[userId].onTimeCompleted++
        } else {
          acc[userId].lateCompleted++
        }

        return acc
      }, {} as Record<string, any>)

      const leaderboard = (Object.values(staffPerformance) as Array<{user: any, totalCompleted: number, onTimeCompleted: number, lateCompleted: number}>)
        .sort((a, b) => b.onTimeCompleted - a.onTimeCompleted)
        .slice(0, 10)

      return NextResponse.json({ period, type, leaderboard })
    } else {
      // Top performers by division
      const targets = await prisma.target.findMany({
        where: {
          completedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'COMPLETED',
        },
        include: {
          responsible: {
            include: {
              division: {
                include: {
                  department: true,
                },
              },
            },
          },
        },
      })

      const divisionPerformance = targets.reduce((acc, target) => {
        const divisionId = target.responsible.divisionId
        if (!divisionId) return acc

        const isOnTime = target.completedAt && target.dueDate && target.completedAt <= target.dueDate

        if (!acc[divisionId]) {
          acc[divisionId] = {
            division: target.responsible.division,
            totalCompleted: 0,
            onTimeCompleted: 0,
            lateCompleted: 0,
          }
        }

        acc[divisionId].totalCompleted++
        if (isOnTime) {
          acc[divisionId].onTimeCompleted++
        } else {
          acc[divisionId].lateCompleted++
        }

        return acc
      }, {} as Record<string, any>)

      const leaderboard = (Object.values(divisionPerformance) as Array<{division: any, totalCompleted: number, onTimeCompleted: number, lateCompleted: number}>)
        .sort((a, b) => b.onTimeCompleted - a.onTimeCompleted)
        .slice(0, 10)

      return NextResponse.json({ period, type, leaderboard })
    }
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
