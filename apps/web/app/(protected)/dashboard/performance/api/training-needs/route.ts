import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve actual DB user ID by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    // Find existing training needs for this user and period
    const trainingNeeds = await prisma.trainingNeed.findMany({
      where: {
        userId: actualUserId,
        performancePeriodId: activePeriod?.id
      },
      orderBy: { priority: 'asc' }
    })

    return NextResponse.json(trainingNeeds)

  } catch (error) {
    console.error('Error fetching training needs:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { trainingNeeds } = await req.json()

    if (!Array.isArray(trainingNeeds) || trainingNeeds.length > 3) {
      return NextResponse.json({ error: 'You can specify up to 3 training needs' }, { status: 400 })
    }

    // Validate each training need
    for (const need of trainingNeeds) {
      if (!need.title || !need.title.trim()) {
        return NextResponse.json({ error: 'Training title is required' }, { status: 400 })
      }
      if (!need.description || !need.description.trim()) {
        return NextResponse.json({ error: 'Training description is required' }, { status: 400 })
      }
    }

    // Resolve actual DB user ID by email
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    if (!activePeriod) {
      return NextResponse.json({ error: 'No active performance period found' }, { status: 400 })
    }

    // Delete existing training needs for this user and period
    await prisma.trainingNeed.deleteMany({
      where: {
        userId: actualUserId,
        performancePeriodId: activePeriod.id
      }
    })

    // Create new training needs
    const createdNeeds = await prisma.$transaction(
      trainingNeeds.map((need, index) => 
        prisma.trainingNeed.create({
          data: {
            userId: actualUserId,
            performancePeriodId: activePeriod.id,
            title: need.title.trim(),
            description: need.description.trim(),
            type: 'OTHER', // Default to OTHER since we're not capturing this
            urgency: 'MEDIUM', // Default to MEDIUM since we're not capturing this
            priority: index + 1,
            preferredTimeline: need.preferredTimeline || null,
            estimatedCost: null,
            provider: null
          }
        })
      )
    )

    return NextResponse.json(createdNeeds)

  } catch (error) {
    console.error('Error saving training needs:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
