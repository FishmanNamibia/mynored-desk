import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user from database with full profile
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true
      }
    })
    
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Query parameters
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    
    // Build filters
    let filters: any = { assignedToId: dbUser.id }
    if (status) {
      filters.status = status
    }
    if (priority) {
      filters.priority = priority
    }
    
    // Get user's assigned risk tasks
    const tasks = await prisma.riskTask.findMany({
      where: filters,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            departmentName: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            fileUrl: true
          }
        }
      }
    })
    
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching risk tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risk tasks' },
      { status: 500 }
    )
  }
}
