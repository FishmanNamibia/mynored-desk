import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all logs within the time period
    const logs = await prisma.helpAssistantLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: {
              select: {
                name: true,
              },
            },
            division: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate statistics
    const totalQuestions = logs.length
    const uniqueUsers = new Set(logs.map(l => l.userId)).size
    const helpfulResponses = logs.filter(l => l.wasHelpful === true).length
    const unhelpfulResponses = logs.filter(l => l.wasHelpful === false).length
    const avgResponseTime = logs.filter(l => l.responseTime).length > 0
      ? Math.round(
          logs
            .filter(l => l.responseTime)
            .reduce((sum, l) => sum + (l.responseTime || 0), 0) /
            logs.filter(l => l.responseTime).length
        )
      : 0

    // Category breakdown
    const categoryBreakdown = logs.reduce((acc, log) => {
      const category = log.category || 'uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Role breakdown
    const roleBreakdown = logs.reduce((acc, log) => {
      const role = log.user.role
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Daily usage trend
    const dailyUsage = logs.reduce((acc, log) => {
      const date = new Date(log.createdAt).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Top users
    const userUsage = logs.reduce((acc, log) => {
      const userId = log.userId
      if (!acc[userId]) {
        acc[userId] = {
          user: log.user,
          count: 0,
        }
      }
      acc[userId].count++
      return acc
    }, {} as Record<string, { user: any; count: number }>)

    const topUsers = (Object.values(userUsage) as Array<{user: any, count: number}>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Most common questions (simplified - group by first 50 chars)
    const questionFrequency = logs.reduce((acc, log) => {
      const questionKey = log.question.substring(0, 50).toLowerCase()
      if (!acc[questionKey]) {
        acc[questionKey] = {
          sample: log.question,
          count: 0,
        }
      }
      acc[questionKey].count++
      return acc
    }, {} as Record<string, { sample: string; count: number }>)

    const commonQuestions = (Object.values(questionFrequency) as Array<{sample: string, count: number}>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Satisfaction rate
    const totalWithFeedback = helpfulResponses + unhelpfulResponses
    const satisfactionRate = totalWithFeedback > 0
      ? Math.round((helpfulResponses / totalWithFeedback) * 100)
      : null

    return NextResponse.json({
      overview: {
        totalQuestions,
        uniqueUsers,
        helpfulResponses,
        unhelpfulResponses,
        satisfactionRate,
        avgResponseTime,
      },
      categoryBreakdown,
      roleBreakdown,
      dailyUsage,
      topUsers,
      commonQuestions,
      recentLogs: logs.slice(0, 50), // Last 50 interactions
    })
  } catch (error) {
    console.error('Failed to fetch help assistant stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
