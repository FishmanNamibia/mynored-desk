import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve ALL IDs for this user's email (canonical + ghost/duplicate accounts)
    // This ensures employees whose managerId points to a ghost account are still included
    const allMyRecords = user.email ? await prisma.user.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true }
    }) : []
    const allMyIds = Array.from(new Set([user.id, ...allMyRecords.map(r => r.id)]))

    // Check if user is a manager — roles is an array, jobTitle is a fallback
    const userRoles = user.roles || []
    const jobTitle = (user.jobTitle || '').toUpperCase()
    const isManager = userRoles.some((r: string) =>
      ['MANAGER', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN'].includes(r)
    ) || jobTitle.includes('EXECUTIVE') || jobTitle.includes('MANAGER') ||
      jobTitle.includes('STATISTICIAN GENERAL') || jobTitle.includes('HEAD')
    if (!isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get active 360 cycle
    let activeCycle: any = null
    try {
      activeCycle = await prisma.rating360Cycle.findFirst({
        where: { isActive: true }
      })
    } catch (e: any) {
      console.error('[360 team] Error finding active cycle:', e.message)
      return NextResponse.json([])
    }

    if (!activeCycle) {
      return NextResponse.json([])
    }

    // Get ratings for users managed by this user — check all ghost/canonical IDs
    const teamRatings = await prisma.rating360.findMany({
      where: {
        cycleId: activeCycle.id,
        supervisorId: { in: allMyIds }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true, lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(
      teamRatings.map((rating: typeof teamRatings[number]) => ({
        id: rating.id,
        userId: rating.userId,
        userName: `${rating.user.firstName || ''} ${rating.user.lastName || ''}`.trim() || rating.user.email,
        userEmail: rating.user.email,
        userRole: rating.user.role,
        averageRating: rating.averageRating,
        status: rating.status,
        createdAt: rating.createdAt.toISOString()
      }))
    )
  } catch (error) {
    console.error('Error fetching team ratings:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
