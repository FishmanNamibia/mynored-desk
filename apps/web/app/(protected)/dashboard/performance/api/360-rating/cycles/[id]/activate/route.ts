import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await getAuthenticatedUser(req)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is HC Executive or OD Specialist
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { jobTitle: true },
    })
    const jobTitle = (dbUser?.jobTitle || user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const canActivate =
      jobTitle.includes('human capital') ||
      jobTitle.includes('od specialist') ||
      userRoles.some((r: string) => ['ADMIN', 'SG'].includes(r))
    if (!canActivate) {
      return NextResponse.json({ error: 'Forbidden — HC Executive or OD Specialist only' }, { status: 403 })
    }

    const cycleId = params.id

    // Check if cycle exists
    const cycle = await prisma.rating360Cycle.findUnique({
      where: { id: cycleId }
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    if (cycle.isActive) {
      return NextResponse.json({ error: 'Cycle is already active' }, { status: 400 })
    }

    // Deactivate all other cycles first
    await prisma.rating360Cycle.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Activate the selected cycle
    const activatedCycle = await prisma.rating360Cycle.update({
      where: { id: cycleId },
      data: { isActive: true }
    })

    // Initialize Rating360 entries for all approved users
    const users = await prisma.user.findMany({
      select: { id: true, managerId: true },
    })

    // Create Rating360 entries for users who don't have one yet
    for (const user of users) {
      const existingRating = await prisma.rating360.findUnique({
        where: {
          cycleId_userId: {
            cycleId: cycleId,
            userId: user.id
          }
        }
      })

      if (!existingRating) {
        await prisma.rating360.create({
          data: {
            cycleId: cycleId,
            userId: user.id,
            supervisorId: user.managerId,
            status: 'PENDING'
          }
        })
      }
    }

    return NextResponse.json({
      ...activatedCycle,
      usersInitialized: users.length
    })
  } catch (error) {
    console.error('Error activating cycle:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
