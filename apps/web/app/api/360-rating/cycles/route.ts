import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let cycles: any[] = []
    try {
      cycles = await prisma.rating360Cycle.findMany({
        orderBy: { createdAt: 'desc' }
      })
    } catch (e: any) {
      console.error('[360 cycles GET] Error querying cycles:', e.message)
      return NextResponse.json([])
    }

    return NextResponse.json(cycles)
  } catch (error: any) {
    console.error('[360 cycles GET] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, startDate, endDate } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Name, start date and end date are required' }, { status: 400 })
    }

    const cycle = await prisma.rating360Cycle.create({
      data: {
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: false,
        createdById: user.id
      }
    })

    return NextResponse.json(cycle, { status: 201 })
  } catch (error: any) {
    console.error('[360 cycles POST] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
