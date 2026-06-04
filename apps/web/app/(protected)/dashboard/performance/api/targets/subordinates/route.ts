import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user with their organizational context
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

    let subordinateIds: string[] = []

    // Define access based on role hierarchy
    if (currentUser.role === 'SG' || currentUser.role === 'DEPUTY_SG') {
      // SG and Deputy SG see all staff across all departments
      const allStaff = await prisma.user.findMany({
        where: {
          id: { not: currentUser.id }, // Exclude themselves
        },
        select: { id: true },
      })
      subordinateIds = allStaff.map(u => u.id)
    } else if (currentUser.role === 'EXECUTIVE') {
      // Executives see all staff in their department (across all divisions)
      if (currentUser.departmentId) {
        const departmentStaff = await prisma.user.findMany({
          where: {
            OR: [
              { departmentId: currentUser.departmentId },
              { division: { departmentId: currentUser.departmentId } },
            ],
            id: { not: currentUser.id }, // Exclude themselves
          },
          select: { id: true },
        })
        subordinateIds = departmentStaff.map(u => u.id)
      }
    } else if (currentUser.role === 'MANAGER') {
      // Managers see all staff in their division
      if (currentUser.divisionId) {
        const divisionStaff = await prisma.user.findMany({
          where: {
            divisionId: currentUser.divisionId,
            id: { not: currentUser.id }, // Exclude themselves
          },
          select: { id: true },
        })
        subordinateIds = divisionStaff.map(u => u.id)
      }
    } else {
      // For other roles (STAFF, ADMINISTRATIVE_ASSISTANT), show direct reports only
      const directReports = await prisma.user.findMany({
        where: {
          managerId: currentUser.id,
        },
        select: { id: true },
      })
      subordinateIds = directReports.map(u => u.id)
    }

    if (subordinateIds.length === 0) {
      return NextResponse.json([])
    }

    // Get all tasks assigned to subordinates
    const targets = await prisma.target.findMany({
      where: {
        responsibleId: {
          in: subordinateIds,
        },
      },
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: true,
              },
            },
          },
        },
        responsible: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
            division: {
              include: {
                department: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            changedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json(targets)
  } catch (error) {
    console.error('Failed to fetch subordinate targets:', error)
    return NextResponse.json({ error: 'Failed to fetch subordinate targets' }, { status: 500 })
  }
}
