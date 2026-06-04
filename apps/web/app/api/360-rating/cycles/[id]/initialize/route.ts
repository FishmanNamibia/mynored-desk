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

    const cycle = await prisma.rating360Cycle.findUnique({ where: { id } })
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, managerId: true }
    })

    let created = 0
    let skipped = 0
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
        created++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Initialized ${created} rating entries (${skipped} already existed)`,
      created,
      skipped
    })
  } catch (error: any) {
    console.error('[360 initialize] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
