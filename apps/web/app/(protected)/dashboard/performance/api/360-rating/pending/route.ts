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
    const allMyRecords = user.email ? await prisma.user.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true }
    }) : []
    const allMyIds = Array.from(new Set([user.id, ...allMyRecords.map((r: any) => r.id)]))

    // Get active 360 cycle
    const activeCycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true }
    })

    if (!activeCycle) {
      return NextResponse.json([])
    }

    const pendingRatings: any[] = []

    // Find peer ratings where I'm the rater and haven't completed
    const peerRatings = await prisma.peerRating360.findMany({
      where: {
        raterId: user.id,
        rating: null,
        rating360: { cycleId: activeCycle.id }
      },
      include: {
        rating360: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    })

    peerRatings.forEach((pr: any) => {
      const u = pr.rating360.user
      pendingRatings.push({
        id: pr.id,
        type: 'peer',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        relationship: 'Peer'
      })
    })

    // Find subordinate ratings where I'm the rater and haven't completed
    const subordinateRatings = await prisma.subordinateRating360.findMany({
      where: {
        raterId: user.id,
        rating: null,
        rating360: { cycleId: activeCycle.id }
      },
      include: {
        rating360: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    })

    subordinateRatings.forEach((sr: any) => {
      const u = sr.rating360.user
      pendingRatings.push({
        id: sr.id,
        type: 'subordinate',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        relationship: 'Team Member'
      })
    })

    // Find ratings where I'm the supervisor and haven't rated
    // Use allMyIds to catch records pointing to ghost/duplicate accounts
    const supervisorRatings = await prisma.rating360.findMany({
      where: {
        supervisorId: { in: allMyIds },
        supervisorRating: null,
        cycleId: activeCycle.id
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })

    supervisorRatings.forEach((sr: any) => {
      const u = sr.user
      pendingRatings.push({
        id: sr.id,
        type: 'supervisor',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        relationship: 'Direct Report'
      })
    })

    return NextResponse.json(pendingRatings)
  } catch (error) {
    console.error('Error fetching pending ratings:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
