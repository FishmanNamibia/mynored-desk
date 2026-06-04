import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all unique performance years from goals
    const goals = await prisma.goal.findMany({
      select: {
        performanceYear: true
      },
      distinct: ['performanceYear']
    })

    // Extract and sort periods
    const periods = goals
      .map(g => g.performanceYear)
      .filter((p): p is string => p !== null)
      .sort()
      .reverse() // Most recent first

    return NextResponse.json({ periods })
  } catch (error) {
    console.error('Error fetching available periods:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
