import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can view cycles
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, jobTitle: true, departmentName: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const jobTitle = (dbUser.jobTitle || user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const canManage =
      jobTitle.includes('human capital') ||
      jobTitle.includes('od specialist') ||
      userRoles.some((r) => ['ADMIN', 'SG'].includes(r))

    if (!canManage) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital and OD Specialists can view rating cycles' 
      }, { status: 403 })
    }

    // Get all cycles, ordered by creation date
    const cycles = await prisma.rating360Cycle.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(cycles)
  } catch (error) {
    console.error('Error fetching cycles:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Executive: Human Capital can create cycles
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true, jobTitle: true, departmentName: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const jobTitle = (dbUser.jobTitle || user.jobTitle || '').toLowerCase()
    const userRoles: string[] = user.roles || []
    const canManage =
      jobTitle.includes('human capital') ||
      jobTitle.includes('od specialist') ||
      userRoles.some((r) => ['ADMIN', 'SG'].includes(r))

    if (!canManage) {
      return NextResponse.json({ 
        error: 'Only Executive: Human Capital and OD Specialists can create rating cycles' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, startDate, endDate } = body

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Name, start date, and end date are required' 
      }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json({ 
        error: 'End date must be after start date' 
      }, { status: 400 })
    }

    // Create new cycle
    const cycle = await prisma.rating360Cycle.create({
      data: {
        name,
        description: description || null,
        startDate: start,
        endDate: end,
        isActive: false, // Not active by default, must be activated explicitly
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(cycle, { status: 201 })
  } catch (error) {
    console.error('Error creating cycle:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
