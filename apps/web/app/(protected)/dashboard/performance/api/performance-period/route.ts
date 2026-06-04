import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import { v4 as uuidv4 } from 'uuid'

// GET - Fetch active performance period or all periods (historical)
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    if (includeHistory) {
      // Fetch all periods, ordered by most recent first
      const allPeriods = await prisma.performancePeriod.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(allPeriods)
    } else {
      // Fetch only active period
      const activePeriod = await prisma.performancePeriod.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(activePeriod)
    }
  } catch (error) {
    console.error('Error fetching performance period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update performance period (Human Capital only)
export async function POST(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Debug: Log user info for troubleshooting
    console.log('[Performance Period API] User info:', {
      id: authUser.id,
      email: authUser.email,
      roles: authUser.roles,
      jobTitle: authUser.jobTitle,
      department: authUser.department
    })

    // Check if user is Admin, Human Capital Executive, or OD Specialist & Strategy Coordination
    const jobTitleLower = authUser.jobTitle?.toLowerCase() || ''
    const isHCExecutiveByJobTitle = jobTitleLower.includes('human capital executive') ||
      (jobTitleLower.includes('executive') && jobTitleLower.includes('human capital'))
    const isODSpecialist = jobTitleLower.includes('od specialist') || jobTitleLower.includes('strategy coordination')
    
    const isAuthorized = userHasAnyRole(authUser, ['ADMIN', 'EXECUTIVE', 'HC_EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE']) ||
      isHCExecutiveByJobTitle || isODSpecialist

    console.log('[Performance Period API] Authorization result:', isAuthorized, { isHCExecutiveByJobTitle, isODSpecialist })

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Only Human Capital executives and administrators can set performance periods',
        debug: {
          userRoles: authUser.roles,
          jobTitle: authUser.jobTitle,
          department: authUser.department
        }
      }, { status: 403 })
    }

    const body = await req.json()
    const { name, submissionDeadline, startDate, endDate } = body

    if (!name || !submissionDeadline || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Name, submission deadline, start date, and end date are required' 
      }, { status: 400 })
    }

    // Deactivate all existing periods
    await prisma.performancePeriod.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Create new period
    const period = await prisma.performancePeriod.create({
      data: {
        id: uuidv4(),
        name,
        submissionDeadline: new Date(submissionDeadline),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        createdById: authUser.id,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error('Error creating performance period:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH - Update active performance period (Human Capital only)
export async function PATCH(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Admin, Human Capital Executive, or OD Specialist & Strategy Coordination
    const jobTitleLower = authUser.jobTitle?.toLowerCase() || ''
    const isHCExecutiveByJobTitle = jobTitleLower.includes('human capital executive') ||
      (jobTitleLower.includes('executive') && jobTitleLower.includes('human capital'))
    const isODSpecialist = jobTitleLower.includes('od specialist') || jobTitleLower.includes('strategy coordination')
    
    const isAuthorized = userHasAnyRole(authUser, ['ADMIN', 'EXECUTIVE', 'HC_EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE']) ||
      isHCExecutiveByJobTitle || isODSpecialist

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Only Human Capital executives, OD Specialists, and administrators can update performance periods' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { id, name, submissionDeadline, startDate, endDate } = body

    if (!id) {
      return NextResponse.json({ error: 'Period ID is required' }, { status: 400 })
    }

    // Update the period
    const period = await prisma.performancePeriod.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(submissionDeadline && { submissionDeadline: new Date(submissionDeadline) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) })
      }
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error('Error updating performance period:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
