import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET - List team members (users managed by the current user + the user themselves)
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get users who report to this user (managerId) + all active users for task assignment
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
      take: 200
    })

    const mapped = users.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      jobTitle: u.jobTitle,
      department: u.departmentName
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('[users/team GET] Error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch team members', details: error.message }, { status: 500 })
  }
}
