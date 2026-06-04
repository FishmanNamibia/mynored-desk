import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

// Helper: find workplan initiatives matching a user's department and auto-create
// PerformanceAgreement records so they appear on the executive's page.
async function autoAssignWorkplanForExecutive(userId: string) {
  try {
    // Get the user's department info
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        managerId: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } }
      }
    })

    if (!userInfo) return 0

    // Only auto-assign for executive-level users
    const isExecutive = (userInfo.jobTitle || '').toLowerCase().includes('executive')
    if (!isExecutive) return 0

    // Build search terms from the user's department info
    const searchTerms: string[] = []
    if (userInfo.departmentName) searchTerms.push(userInfo.departmentName)
    if (userInfo.divisionName) searchTerms.push(userInfo.divisionName)
    if (userInfo.department?.name) searchTerms.push(userInfo.department.name)
    if (userInfo.department?.code) searchTerms.push(userInfo.department.code)

    if (searchTerms.length === 0) return 0

    // Find all initiatives where primaryResponsibility or secondaryResponsibility
    // contains any of the user's department identifiers
    const orConditions: any[] = []
    for (const term of searchTerms) {
      orConditions.push({ primaryResponsibility: { contains: term, mode: 'insensitive' } })
      orConditions.push({ secondaryResponsibility: { contains: term, mode: 'insensitive' } })
    }
    // Also match "All" responsibility (handles "All", "All Executives", etc.)
    orConditions.push({ primaryResponsibility: { contains: 'All', mode: 'insensitive' } })
    orConditions.push({ secondaryResponsibility: { contains: 'All', mode: 'insensitive' } })

    const matchingInitiatives = await prisma.initiative.findMany({
      where: {
        OR: orConditions
      },
      select: {
        id: true,
        title: true,
        description: true,
        measure: true,
        action: true,
        target: true,
        dueDate: true,
        primaryResponsibility: true,
        secondaryResponsibility: true
      }
    })

    if (matchingInitiatives.length === 0) return 0

    // Get existing agreement initiative IDs AND actions for this user to avoid duplicates
    // Check by both initiativeId AND customAction - one strategic objective can have multiple actions
    const existingAgreements = await prisma.performanceAgreement.findMany({
      where: { userId, isAdhocContainer: false },
      select: { initiativeId: true, customAction: true }
    })
    // Create composite key of initiativeId + action for proper duplicate detection
    const existingKeys = new Set(
      existingAgreements.map(a => `${a.initiativeId}|${a.customAction || ''}`).filter(k => k !== 'null|')
    )

    const currentYear = new Date().getFullYear()
    const defaultDueDate = new Date(`${currentYear + 1}-03-31`)
    let created = 0

    for (const init of matchingInitiatives) {
      // Check duplicate by both initiative AND action (not just initiative)
      const key = `${init.id}|${init.action || ''}`
      if (existingKeys.has(key)) continue

      try {
        await prisma.performanceAgreement.create({
          data: {
            title: init.title,
            description: init.description || init.action || 'From annual work plan',
            kpi: init.measure || null,
            target: init.target || null,
            customAction: init.action || null,
            dueDate: init.dueDate || defaultDueDate,
            userId: userId,
            supervisorId: userInfo.managerId || null,
            initiativeId: init.id,
            status: 'NOT_STARTED',
            percentComplete: 0,
            isSystemGenerated: true,
            weight: null,
          }
        })
        created++
      } catch (err: any) {
        console.error(`[auto-assign] Failed to create agreement for initiative ${init.id}:`, err.message)
      }
    }

    if (created > 0) {
      console.log(`[auto-assign] Created ${created} performance agreement(s) for executive ${userId}`)
    }
    return created
  } catch (error) {
    console.error('[auto-assign] Error:', error)
    return 0
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie')
    console.log('=== Performance Agreements API Called ===')
    console.log('🍪 Cookies received:', cookieHeader ? 'YES' : 'NO')
    console.log('🍪 Cookie header:', cookieHeader?.substring(0, 100))
    
    const { user, setCookieHeaders } = await getAuthenticatedUser(req)
    
    console.log('User authenticated:', !!user)
    console.log('User ID:', user?.id)
    console.log('User email:', user?.email)
    console.log('User roles:', user?.roles)
    
    if (!user?.id) {
      console.log('❌ No authenticated user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Authenticated - Filtering agreements for userId:', user.id)
    
    // Auto-assign workplan initiatives to this executive based on department matching.
    // This runs on each page load but is idempotent — it only creates agreements
    // for initiatives that don't already have an agreement for this user.
    await autoAssignWorkplanForExecutive(user.id)
    
    // Fetch all performance agreements for this user (excluding ad-hoc container)
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: user.id,
        isAdhocContainer: false
      },
      include: {
        initiative: {
          include: {
            objective: {
              include: {
                goal: {
                  select: {
                    goalNumber: true,
                    title: true
                  }
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
            email: true,
            jobTitle: true,
            position: true,
            signatureUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log('Found', agreements.length, 'performance agreements for user')
    console.log('Approval statuses:', agreements.map(a => ({ id: a.id.substring(0,8), title: a.title?.substring(0,20), approvalStatus: a.approvalStatus })))

    // Get active performance period for weight configuration
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { 
        adhocWeight: true,
        projectsWeight: true,
        riskManagementWeight: true,
        rating360Weight: true
      }
    })

    const adhocWeight = activePeriod?.adhocWeight || 10
    const projectsWeight = activePeriod?.projectsWeight || 10
    const riskManagementWeight = activePeriod?.riskManagementWeight || 10
    const rating360Weight = activePeriod?.rating360Weight || 10
    const currentYear = new Date().getFullYear()

    // Check if ad-hoc container exists, create if not
    let adhocContainer = null
    try {
      adhocContainer = await prisma.performanceAgreement.findFirst({
        where: {
          userId: user.id,
          isAdhocContainer: true,
          title: 'Ad-hoc Tasks'
        }
      })

      if (!adhocContainer) {
        console.log('Creating ad-hoc container for user:', user.id)
        adhocContainer = await prisma.performanceAgreement.create({
          data: {
            title: 'Ad-hoc Tasks',
            description: 'Collective rating of all ad-hoc tasks completed during the year',
            dueDate: new Date(currentYear, 11, 31),
            userId: user.id,
            weight: adhocWeight,
            isAdhocContainer: true,
            isSystemGenerated: true,
            status: 'IN_PROGRESS',
            percentComplete: 0
          }
        })
        console.log('Ad-hoc container created:', adhocContainer.id)
      }
    } catch (containerError) {
      console.error('Error with ad-hoc container:', containerError)
    }

    // Format the response to match what the frontend expects
    const formattedAgreements = agreements.map(agreement => ({
      ...agreement,
      supervisor: agreement.supervisor ? {
        id: agreement.supervisor.id,
        name: `${agreement.supervisor.firstName || ''} ${agreement.supervisor.lastName || ''}`.trim() || agreement.supervisor.email,
        jobTitle: agreement.supervisor.jobTitle || agreement.supervisor.position || '',
        signatureUrl: agreement.supervisor.signatureUrl || null
      } : null
    }))

    const response = NextResponse.json({
      agreements: formattedAgreements,
      adhocContainer,
      weights: {
        adhoc: adhocWeight,
        projects: projectsWeight,
        riskManagement: riskManagementWeight,
        rating360: rating360Weight
      }
    })

    // Forward any Set-Cookie headers from the auth system
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response

  } catch (error: any) {
    console.error('❌ Error fetching performance agreements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance agreements: ' + error.message },
      { status: 500 }
    )
  }
}
