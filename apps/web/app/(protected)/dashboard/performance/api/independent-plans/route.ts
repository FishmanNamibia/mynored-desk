import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plans = await prisma.independentPlan.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' }
        },
        department: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching independent plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, startDate, endDate, departmentId, customColumns } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const plan = await prisma.independentPlan.create({
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        departmentId: departmentId || undefined,
        customColumns: customColumns || undefined,
        userId: user.id
      },
      include: {
        tasks: true,
        department: true
      }
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error creating independent plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
