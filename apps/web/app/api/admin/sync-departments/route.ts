import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

/**
 * Sync user departments from their current AD data
 * This endpoint triggers a re-sync of department info for all users
 * who have signed in (have adGuid set)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔄 Department sync initiated by:', user.email)

    // Get all users who have Azure AD GUID (have signed in before)
    const users = await prisma.user.findMany({
      where: {
        adGuid: { not: null }
      },
      select: {
        id: true,
        email: true,
        departmentName: true,
        divisionName: true,
        jobTitle: true
      }
    })

    console.log(`Found ${users.length} users with AD sync capability`)

    return NextResponse.json({
      success: true,
      message: 'Department sync information',
      totalUsers: users.length,
      note: 'Departments will be updated automatically when users sign in next time',
      currentDepartments: users.map(u => ({
        email: u.email,
        department: u.departmentName,
        division: u.divisionName,
        jobTitle: u.jobTitle
      })),
      instructions: [
        'User departments are synced from Azure AD during sign-in',
        'To force update: users need to sign out and sign in again',
        'Or wait for automatic token refresh (happens every 7 days)',
        'Azure AD is the source of truth for department information'
      ]
    })

  } catch (error: any) {
    console.error('Department sync error:', error)
    return NextResponse.json({
      error: 'Sync failed',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Get current department sync status
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get department statistics
    const totalUsers = await prisma.user.count()
    const usersWithDepartment = await prisma.user.count({
      where: { departmentName: { not: null } }
    })
    const usersWithADSync = await prisma.user.count({
      where: { adGuid: { not: null } }
    })

    // Get unique departments
    const departments = await prisma.user.groupBy({
      by: ['departmentName'],
      where: { departmentName: { not: null } },
      _count: true
    })

    return NextResponse.json({
      totalUsers,
      usersWithDepartment,
      usersWithADSync,
      usersWithoutDepartment: totalUsers - usersWithDepartment,
      departments: departments.map(d => ({
        name: d.departmentName,
        userCount: d._count
      })).sort((a, b) => b.userCount - a.userCount),
      syncMethod: 'Automatic during user sign-in via Azure AD',
      lastUpdate: 'Real-time on each sign-in'
    })

  } catch (error: any) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({
      error: 'Failed to fetch status',
      details: error.message
    }, { status: 500 })
  }
}
