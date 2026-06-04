import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { v4 as uuidv4 } from 'uuid'


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
      dept.users.forEach((user: any) => userIds.add(user.id))
      dept.divisions.forEach((div: any) => {
        div.users.forEach((user: any) => userIds.add(user.id))
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

    divisions.forEach((div: any) => {
      div.users.forEach((user: any) => userIds.add(user.id))
    })
  }

  return Array.from(userIds)
}

// Helper function to auto-assign workplan initiatives to a user
async function autoAssignWorkplanInitiatives(userId: string, userRole: string) {
  try {
    console.log('Checking if user needs workplan assignment:', userId)

    // Check if user already has ANY agreements (regardless of period)
    // This prevents creating workplan duplicates for executives who imported their own agreements
    const existingAgreements = await prisma.performanceAgreement.count({
      where: { userId: userId, isAdhocContainer: false }
    })

    if (existingAgreements > 0) {
      console.log('User already has agreements, skipping workplan assignment')
      return false
    }

    console.log('User has no agreements, checking workplan...')

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
      console.log('No workplan initiatives found')
      return false
    }

    // Get user details for supervisor assignment (use managerId as supervisorId)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { managerId: true }
    })

    if (!dbUser) return false

    // Use manager as supervisor
    const supervisorId = dbUser.managerId || null

    // Get fiscal year dates
    const currentYear = new Date().getFullYear()
    const fiscalYear = {
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear + 1}-03-31`)
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    let assignmentsCreated = 0

    // Check each initiative to see if this user should be assigned
    for (const initiative of initiatives) {
      try {
        // Check if user should be assigned (similar logic to API)
        let shouldAssign = false

        // Check 'All' assignment
        if (initiative.primaryResponsibility?.toLowerCase() === 'all' ||
            initiative.secondaryResponsibility?.toLowerCase() === 'all') {
          shouldAssign = true
        }

        // No additional role-based assignment logic needed here

        if (shouldAssign) {
          // Check if agreement already exists (double-check)
          const existingAgreement = await prisma.performanceAgreement.findFirst({
            where: {
              userId: userId,
              initiativeId: initiative.id
            }
          })

          if (!existingAgreement) {
            await prisma.performanceAgreement.create({
              data: {
                id: uuidv4(),
                title: initiative.title,
                description: initiative.description,
                kpi: initiative.measure || null,
                target: initiative.target || null,
                customAction: initiative.action || null,
                dueDate: initiative.dueDate || fiscalYear.endDate,
                userId: userId,
                supervisorId: supervisorId,
                initiativeId: initiative.id,
                performancePeriodId: activePeriod?.id || null,
                status: 'NOT_STARTED',
                isSystemGenerated: true,
                weight: null,
                updatedAt: new Date()
              }
            })
            assignmentsCreated++
          }
        }
      } catch (error: any) {
        console.error(`Error assigning initiative ${initiative.title} to user ${userId}:`, error)
      }
    }

    if (assignmentsCreated > 0) {
      console.log(`Auto-assigned ${assignmentsCreated} workplan initiatives to user ${userId}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Error in auto-assign workplan:', error)
    return false
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Performance Agreements API Called ===')
    console.log('Session user ID:', user.id)
    console.log('Session user email:', user.email)

    // Resolve actual DB user ID by email (auth session ID may differ from DB ID)
    let actualUserId = user.id
    const actualUserRole = (user.roles?.[0] || 'STAFF')
    if (user.email) {
      try {
        const dbUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          orderBy: { createdAt: 'asc' }, // oldest (canonical) account wins — deterministic
          select: { id: true }
        })
        if (dbUser) {
          actualUserId = dbUser.id
        }
      } catch (e) {
        console.error('Error resolving DB user by email:', e)
      }
    }
    console.log('Resolved DB userId:', actualUserId, 'role:', actualUserRole)

    // ─────────────────────────────────────────────────────────────────────
    // GHOST-ACCOUNT SWEEP: migrate agreements from ALL duplicate IDs → canonical
    // This runs on every GET so a server restart never loses visible agreements.
    // Safety: we verify email ownership before touching ANY record.
    // ─────────────────────────────────────────────────────────────────────
    const allEmailUserIds = user.email
      ? await prisma.user.findMany({
          where: { email: { equals: user.email, mode: 'insensitive' } },
          select: { id: true }
        }).then(rows => rows.map(r => r.id))
      : []
    const allKnownIds = Array.from(new Set([user.id, actualUserId, ...allEmailUserIds]))
    const ghostIds = allKnownIds.filter(id => id !== actualUserId)

    if (ghostIds.length > 0) {
      try {
        const orphanedCount = await prisma.performanceAgreement.count({
          where: { userId: { in: ghostIds } }
        })
        if (orphanedCount > 0) {
          await prisma.performanceAgreement.updateMany({
            where: { userId: { in: ghostIds } },
            data: { userId: actualUserId }
          })
          console.log(`[AGREEMENTS] Migrated ${orphanedCount} agreements from ghost IDs [${ghostIds.join(', ')}] → canonical ${actualUserId}`)
        }
      } catch (e) {
        console.error('[AGREEMENTS] Error during ghost-account sweep:', e)
      }
    }

    // Get active performance period first (needed for filtering)
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { 
        id: true,
        adhocWeight: true,
        projectsWeight: true,
        riskManagementWeight: true,
        rating360Weight: true
      }
    })
    const totalAgreementsAnyId = await prisma.performanceAgreement.count({
      where: { userId: { in: allKnownIds }, isAdhocContainer: false }
    })
    if (totalAgreementsAnyId === 0) {
      await autoAssignWorkplanInitiatives(actualUserId, actualUserRole)
    }
    
    // Fetch performance agreements for this user in the ACTIVE period only
    // Fall back to ALL agreements if none found for active period (handles executives with pre-existing agreements)
    const agreementQuery = {
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: {
                  select: { goalNumber: true, title: true }
                }
              }
            }
          }
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            position: true,
            signatureUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' as const }
    }

    // Always load ALL non-container agreements for this user first
    const allUserAgreements = await prisma.performanceAgreement.findMany({
      where: { userId: actualUserId, isAdhocContainer: false },
      ...agreementQuery,
    })

    // Eagerly backfill performancePeriodId for any agreement not yet linked to the active period.
    // This runs on every GET so a service restart or period change never leaves agreements invisible.
    if (activePeriod?.id && allUserAgreements.length > 0) {
      const wrongPeriodIds = allUserAgreements
        .filter((a: any) => a.performancePeriodId !== activePeriod.id)
        .map((a: any) => a.id)

      if (wrongPeriodIds.length > 0) {
        await prisma.performanceAgreement.updateMany({
          where: { id: { in: wrongPeriodIds } },
          data: { performancePeriodId: activePeriod.id }
        })
        console.log(`[AGREEMENTS] Backfilled period for ${wrongPeriodIds.length} agreements → active period ${activePeriod.id}`)
      }
    }

    // Now fetch with the active period filter (all should be linked now)
    let agreements = activePeriod?.id
      ? await prisma.performanceAgreement.findMany({
          where: { userId: actualUserId, isAdhocContainer: false, performancePeriodId: activePeriod.id },
          ...agreementQuery,
        })
      : allUserAgreements

    console.log('Found', agreements.length, 'performance agreements for user')

    const adhocWeight = activePeriod?.adhocWeight || 0
    const projectsWeight = activePeriod?.projectsWeight || 0
    const riskManagementWeight = activePeriod?.riskManagementWeight || 0
    const rating360Weight = activePeriod?.rating360Weight || 10
    const currentYear = new Date().getFullYear()

    // Check if ad-hoc container exists, create if not
    let adhocContainer = null
    try {
      adhocContainer = await prisma.performanceAgreement.findFirst({
        where: {
          userId: actualUserId,
          isAdhocContainer: true,
          title: 'Ad-hoc Tasks'
        }
      })

      if (!adhocContainer) {
        console.log('Creating ad-hoc container for user:', actualUserId)
        adhocContainer = await prisma.performanceAgreement.create({
          data: {
            id: uuidv4(),
            title: 'Ad-hoc Tasks',
            description: 'Collective rating of all ad-hoc tasks completed during the year',
            dueDate: new Date(currentYear, 11, 31),
            userId: actualUserId,
            weight: adhocWeight,
            isAdhocContainer: true,
            isSystemGenerated: true,
            status: 'IN_PROGRESS',
            percentComplete: 0,
            updatedAt: new Date()
          }
        })
        console.log('Ad-hoc container created:', adhocContainer.id)
      }
    } catch (containerError) {
      console.error('Error with ad-hoc container:', containerError)
    }

    // Check if projects container exists, create if not
    let projectsContainer = null
    try {
      projectsContainer = await prisma.performanceAgreement.findFirst({
        where: {
          userId: actualUserId,
          isAdhocContainer: true,
          title: 'Projects'
        }
      })

      if (!projectsContainer) {
        console.log('Creating projects container for user:', actualUserId)
        projectsContainer = await prisma.performanceAgreement.create({
          data: {
            id: uuidv4(),
            title: 'Projects',
            description: 'Collective rating of all project tasks completed during the year',
            dueDate: new Date(currentYear, 11, 31),
            userId: actualUserId,
            weight: projectsWeight,
            isAdhocContainer: true,
            isSystemGenerated: true,
            status: 'IN_PROGRESS',
            percentComplete: 0,
            updatedAt: new Date()
          }
        })
        console.log('Projects container created:', projectsContainer.id)
      }
    } catch (containerError) {
      console.error('Error with projects container:', containerError)
    }

    // Check if risk management container exists, create if not
    let riskContainer = null
    try {
      riskContainer = await prisma.performanceAgreement.findFirst({
        where: {
          userId: actualUserId,
          isAdhocContainer: true,
          title: 'Risk Management'
        }
      })

      if (!riskContainer) {
        console.log('Creating risk management container for user:', actualUserId)
        riskContainer = await prisma.performanceAgreement.create({
          data: {
            id: uuidv4(),
            title: 'Risk Management',
            description: 'Collective rating of all risk management tasks completed during the year',
            dueDate: new Date(currentYear, 11, 31),
            userId: actualUserId,
            weight: riskManagementWeight,
            isAdhocContainer: true,
            isSystemGenerated: true,
            status: 'IN_PROGRESS',
            percentComplete: 0,
            updatedAt: new Date()
          }
        })
        console.log('Risk management container created:', riskContainer.id)
      }
    } catch (containerError) {
      console.error('Error with risk management container:', containerError)
    }

    // Get supervisor info
    let supervisorInfo = null
    if (agreements.length > 0) {
      supervisorInfo = agreements[0]?.supervisor || null
    } else {
      // Fetch supervisor info if no agreements (User model uses 'manager' relation, not 'supervisor')
      const currentUser = await prisma.user.findUnique({
        where: { id: actualUserId },
        select: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              position: true,
              signatureUrl: true
            }
          }
        }
      })
      supervisorInfo = currentUser?.manager || null
    }

    // Add all 3 containers to the list with supervisor info
    const allAgreements = [
      ...agreements
    ]
    
    if (adhocContainer) {
      allAgreements.push({
        ...adhocContainer,
        supervisor: supervisorInfo,
        initiative: null
      })
    }
    
    if (projectsContainer) {
      allAgreements.push({
        ...projectsContainer,
        supervisor: supervisorInfo,
        initiative: null
      })
    }
    
    if (riskContainer) {
      allAgreements.push({
        ...riskContainer,
        supervisor: supervisorInfo,
        initiative: null
      })
    }

    console.log('Returning', allAgreements.length, 'agreements (including', (allAgreements.length - agreements.length), 'containers)')
    return NextResponse.json(allAgreements)
  } catch (error) {
    console.error('=== ERROR in Performance Agreements API ===')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, kpi, target, weight, dueDate } = body

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
    }

    // Resolve actual DB user ID by email (session ID may differ)
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, managerId: true }
      })
      if (dbUser) actualUserId = dbUser.id
    }

    // Get user's supervisor
    const dbUser = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: { managerId: true }
    })

    // Always link to active period so agreement is never invisible after restart
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    })

    const agreement = await prisma.performanceAgreement.create({
      data: {
        id: uuidv4(),
        title,
        description,
        kpi,
        target,
        weight,
        dueDate: new Date(dueDate),
        userId: actualUserId,
        supervisorId: dbUser?.managerId || undefined,
        performancePeriodId: activePeriod?.id || undefined,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error creating performance agreement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
