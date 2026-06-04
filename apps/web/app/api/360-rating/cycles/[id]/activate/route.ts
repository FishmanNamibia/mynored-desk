import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Deactivate all other cycles
    await prisma.rating360Cycle.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Activate this cycle
    const cycle = await prisma.rating360Cycle.update({
      where: { id },
      data: { isActive: true }
    })

    // Initialize Rating360 records for all active users
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, managerId: true }
    })

    let initialized = 0
    for (const u of users) {
      const existing = await prisma.rating360.findFirst({
        where: { cycleId: id, userId: u.id }
      })
      if (!existing) {
        await prisma.rating360.create({
          data: {
            cycleId: id,
            userId: u.id,
            supervisorId: u.managerId || null,
            status: 'PENDING'
          }
        })
        initialized++
      }
    }

    return NextResponse.json({
      success: true,
      cycle,
      usersInitialized: initialized
    })
  } catch (error: any) {
    console.error('[360 activate] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
