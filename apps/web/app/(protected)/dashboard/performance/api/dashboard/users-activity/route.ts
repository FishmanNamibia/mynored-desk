import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current user's information
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true,
        division: {
          include: {
            department: true,
          },
        },
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let where: any = {
      isApproved: true, // Only show approved users
    }

    // Filter users based on role and department/division
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SG') {
      // Admins and SG see all users
      // No additional filter needed
    } else if (currentUser.role === 'DEPUTY_SG' || currentUser.role === 'EXECUTIVE') {
      // Executives and Deputy SG see users in their department
      if (currentUser.departmentId) {
        where.OR = [
          { departmentId: currentUser.departmentId },
          { division: { departmentId: currentUser.departmentId } },
        ]
      }
    } else if (currentUser.role === 'MANAGER') {
      // Managers see users in their division
      if (currentUser.divisionId) {
        where.divisionId = currentUser.divisionId
      }
    } else {
      // Staff and others only see themselves
      where.id = currentUser.id
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        lastLoginAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        division: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        lastLoginAt: 'desc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to fetch users activity:', error)
    return NextResponse.json({ error: 'Failed to fetch users activity' }, { status: 500 })
  }
}
