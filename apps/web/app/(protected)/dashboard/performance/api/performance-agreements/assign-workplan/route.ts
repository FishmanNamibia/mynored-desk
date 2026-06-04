import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


// Helper function to find users by responsibility string
async function findUsersByResponsibility(responsibilityStr: string): Promise<string[]> {
  if (!responsibilityStr || !responsibilityStr.trim()) {
    return []
  }

  const trimmed = responsibilityStr.trim()

  // Handle "All" - return all active users
  if (trimmed.toLowerCase() === 'all') {
    const allUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    })
    return allUsers.map(u => u.id)
  }

  // Split by comma for multiple responsibilities
  const responsibilities = trimmed.split(',').map(r => r.trim()).filter(r => r.length > 0)

  const userIds = new Set<string>()

  for (const resp of responsibilities) {
    // Search in departments (case-insensitive partial match)
    const departments = await prisma.department.findMany({
      where: {
        name: { contains: resp, mode: 'insensitive' }
      },
      include: {
        users: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        },
        divisions: {
          include: {
            users: {
              where: { status: 'ACTIVE' },
              select: { id: true }
            }
          }
        }
      }
    })

    // Add users from matching departments
    departments.forEach(dept => {
      dept.users.forEach(user => userIds.add(user.id))
      dept.divisions.forEach(div => {
        div.users.forEach(user => userIds.add(user.id))
      })
    })

    // Also search directly in divisions (in case the responsibility is a division name)
    const divisions = await prisma.division.findMany({
      where: {
        name: { contains: resp, mode: 'insensitive' }
      },
      include: {
        users: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    })

    divisions.forEach(div => {
      div.users.forEach(user => userIds.add(user.id))
    })
  }

  return Array.from(userIds)
}

// Helper function to parse responsibility field
function parseResponsibility(responsibilityStr: string): string {
  if (!responsibilityStr || !responsibilityStr.trim()) {
    return ''
  }

  const trimmed = responsibilityStr.trim()

  // Check if it's "All" (case-insensitive)
  if (trimmed.toLowerCase() === 'all') {
    return 'All'
  }

  // Split by comma, trim each part - no mapping
  const parts = trimmed.split(',').map(part => part.trim()).filter(part => part.length > 0)

  // Join back with comma and space - return as-is from Excel
  return parts.join(', ')
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission - Only Human Capital Executive, Admin, or SG can assign workplan
    let isAuthorized = false
    if (user.role === 'ADMIN' || user.role === 'SG') {
      isAuthorized = true
    } else if (user.role === 'EXECUTIVE' && user.departmentId) {
      const userWithDept = await prisma.user.findUnique({
        where: { id: user.id },
        include: { department: true }
      })

      if (userWithDept?.department?.name) {
        const deptName = userWithDept.department.name.toLowerCase()
        isAuthorized = deptName.includes('human capital') ||
                      deptName.includes('human resources') ||
                      deptName.includes('hr')
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({
        error: 'Unauthorized: Only the Human Capital Executive, Admin, or SG can assign workplan initiatives'
      }, { status: 403 })
    }

    const { userIds, performanceYear } = await req.json()

    if (!performanceYear || !performanceYear.trim()) {
      return NextResponse.json({ error: 'Performance year is required' }, { status: 400 })
    }

    // Get active performance period — required so every created agreement is linked to it
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    })
    if (!activePeriod) {
      return NextResponse.json({ error: 'No active performance period found. Please activate a period before assigning workplan.' }, { status: 400 })
    }
    console.log('Active period for assignment:', activePeriod.name)

    console.log('=== ASSIGNING WORKPLAN INITIATIVES ===')
    console.log('Performance Year:', performanceYear)
    console.log('Target Users:', userIds?.length || 'All missing users')

    // Get all initiatives from the workplan
    const initiatives = await prisma.initiative.findMany({
      include: {
        objective: {
          include: {
            goal: true
          }
        }
      }
    })

    if (initiatives.length === 0) {
      return NextResponse.json({ error: 'No workplan initiatives found. Please import the workplan first.' }, { status: 400 })
    }

    console.log('Found initiatives:', initiatives.length)

    // Determine which users to assign to
    let targetUsers: string[]

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Specific users provided
      targetUsers = userIds
    } else {
      // Find all active users who don't have performance agreements
      const approvedUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      })

      const usersWithAgreements = await prisma.performanceAgreement.findMany({
        where: { isAdhocContainer: false },
        select: { userId: true },
        distinct: ['userId']
      })

      const usersWithAgreementsIds = new Set(usersWithAgreements.map(u => u.userId))

      targetUsers = approvedUsers
        .filter(user => !usersWithAgreementsIds.has(user.id))
        .map(user => user.id)
    }

    console.log('Target users to assign:', targetUsers.length)

    if (targetUsers.length === 0) {
      return NextResponse.json({
        message: 'All approved users already have workplan assignments',
        assigned: 0
      })
    }

    // Get fiscal year dates
    const currentYear = new Date().getFullYear()
    const fiscalYear = {
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear + 1}-03-31`)
    }

    const results = {
      agreementsCreated: 0,
      usersAssigned: 0,
      errors: [] as string[]
    }

    // For each target user, assign all applicable initiatives
    for (const userId of targetUsers) {
      try {
        // Get user details for supervisor assignment
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { managerId: true }
        })

        if (!dbUser) continue

        const supervisorId = dbUser.managerId || null

        let userAssigned = false

        // Check each initiative to see if this user should be assigned
        for (const initiative of initiatives) {
          try {
            // Parse the responsibility fields to determine assignment
            const primaryUserIds = await findUsersByResponsibility(initiative.primaryResponsibility || '')
            const secondaryUserIds = await findUsersByResponsibility(initiative.secondaryResponsibility || '')

            // Combine and deduplicate user IDs
            const allAssignedUserIds = Array.from(new Set([...primaryUserIds, ...secondaryUserIds]))

            // Check if this user should be assigned to this initiative
            if (allAssignedUserIds.includes(userId)) {
              // Check if agreement already exists
              const existingAgreement = await prisma.performanceAgreement.findFirst({
                where: {
                  userId: userId,
                  initiativeId: initiative.id
                }
              })

              if (!existingAgreement) {
                await prisma.performanceAgreement.create({
                  data: {
                    title: initiative.title,
                    description: initiative.description,
                    kpi: initiative.measure || null,
                    target: initiative.target || null,
                    customAction: initiative.action || null,
                    dueDate: initiative.dueDate || fiscalYear.endDate,
                    userId: userId,
                    supervisorId: supervisorId,
                    initiativeId: initiative.id,
                    performancePeriodId: activePeriod.id, // Always link to active period
                    status: 'NOT_STARTED',
                    isSystemGenerated: true,
                    weight: null,
                  }
                })
                results.agreementsCreated++
                userAssigned = true
              }
            }
          } catch (error: any) {
            console.error(`Error assigning initiative ${initiative.title} to user ${userId}:`, error)
            results.errors.push(`Failed to assign initiative "${initiative.title}" to user ${userId}: ${error.message}`)
          }
        }

        if (userAssigned) {
          results.usersAssigned++
        }

      } catch (error: any) {
        console.error(`Error processing user ${userId}:`, error)
        results.errors.push(`Failed to process user ${userId}: ${error.message}`)
      }
    }

    console.log('Assignment completed:', results)

    return NextResponse.json({
      success: true,
      message: `Assigned workplan initiatives to ${results.usersAssigned} users`,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Workplan assignment error:', error)
    return NextResponse.json({
      error: 'Failed to assign workplan initiatives',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
