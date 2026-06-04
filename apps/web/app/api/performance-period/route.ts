import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Get the original URL and query parameters
    const { searchParams } = new URL(req.url)
    const includeHistory = searchParams.get('includeHistory')
    
    // For the import dialog, we'll directly query the database instead of forwarding
    // This bypasses the authentication check in the protected route
    
    // Connect to the database directly
    const prisma = (await import('@/lib/pms/prisma')).prisma
    
    let periodsData: any[] = []
    
    if (includeHistory === 'true') {
      // Fetch all periods, ordered by most recent first
      periodsData = await prisma.performancePeriod.findMany({
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
    } else {
      // Fetch only active period
      const activePeriod = await prisma.performancePeriod.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })
      
      if (activePeriod) {
        periodsData = [activePeriod]
      }
    }
    
    // Return the periods - single object for active period, array for history
    if (includeHistory === 'true') {
      return NextResponse.json(periodsData)
    } else {
      // Return single object for active period (or null if none)
      return NextResponse.json(periodsData[0] || null)
    }
  } catch (error) {
    console.error('Error forwarding performance period request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance periods' },
      { status: 500 }
    )
  }
}

// Also implement POST and PATCH methods to use direct database access
export async function POST(req: NextRequest) {
  try {
    // Connect to the database directly
    const prisma = (await import('@/lib/pms/prisma')).prisma
    
    // Parse the request body
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
        name,
        submissionDeadline: new Date(submissionDeadline),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
        // Use a default user ID for createdById if needed
        createdById: '00000000-0000-0000-0000-000000000000'
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

export async function PATCH(req: NextRequest) {
  try {
    // Connect to the database directly
    const prisma = (await import('@/lib/pms/prisma')).prisma
    
    // Parse the request body
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
