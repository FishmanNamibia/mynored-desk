import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


// GET - Fetch all available performance periods
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all periods, ordered by most recent first
    const allPeriods = await prisma.performancePeriod.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { startDate: 'desc' }
    })

    return NextResponse.json(allPeriods)
  } catch (error) {
    console.error('Error fetching available performance periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}