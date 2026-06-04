import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== PENDING-APPROVAL API CALLED ===')
    console.log('Authenticated user ID:', user.id)
    console.log('Authenticated user email:', user.email)

    // First verify this user exists and get their details
    const authUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true }
    })
    console.log('Current user from DB:', authUser)

    if (!authUser) {
      console.log('ERROR: User not found in database!')
      return NextResponse.json([])
    }

    // Recursive function to get ALL subordinates in the hierarchy (not just direct reports)
    async function getAllSubordinatesRecursive(managerId: string, visited: Set<string> = new Set()): Promise<any[]> {
      if (visited.has(managerId)) return [] // Prevent infinite loops
      visited.add(managerId)
      
      // Get direct reports
      const directReports = await prisma.user.findMany({
        where: { managerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          departmentName: true,
          divisionName: true,
          jobTitle: true
        }
      })
      
      // Recursively get subordinates of each direct report
      const allSubordinates: any[] = [...directReports]
      for (const report of directReports) {
        const theirSubordinates = await getAllSubordinatesRecursive(report.id, visited)
        allSubordinates.push(...theirSubordinates)
      }
      
      return allSubordinates
    }

    // Get all subordinates recursively (entire hierarchy below this user)
    const subordinatesViaManager = await getAllSubordinatesRecursive(user.id)
    console.log(`Found ${subordinatesViaManager.length} subordinates via recursive managerId lookup`)

    // Strategy 2: Get users whose agreements have this user as supervisor (in case AD hierarchy is incomplete)
    const agreementsWithThisSupervisor = await prisma.performanceAgreement.findMany({
      where: {
        supervisorId: user.id,
        isAdhocContainer: false
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })
    
    const userIdsFromAgreements = agreementsWithThisSupervisor.map((a: { userId: string }) => a.userId)
    const subordinatesViaAgreement = await prisma.user.findMany({
      where: {
        id: { in: userIdsFromAgreements },
        NOT: { id: { in: subordinatesViaManager.map((s: { id: string }) => s.id) } }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentName: true,
        divisionName: true,
        jobTitle: true
      }
    })
    console.log(`Found ${subordinatesViaAgreement.length} additional subordinates via agreement supervisorId`)

    // Combine both strategies
    const subordinates = [...subordinatesViaManager, ...subordinatesViaAgreement]
    console.log(`Total subordinates: ${subordinates.length}`)

    // Special case: Add users whose agreements this user can approve (based on jobTitle)
    let specialSubordinates: typeof subordinates = []
    const jobTitle = authUser?.jobTitle?.toLowerCase() || ''

    if (jobTitle.includes('statistician general') || jobTitle === 'sg') {
      // SG can approve DSG agreements
      const dsgUsers = await prisma.user.findMany({
        where: {
          OR: [
            { jobTitle: { contains: 'Deputy Statistician General', mode: 'insensitive' } },
            { jobTitle: { contains: 'DSG', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          departmentName: true,
          divisionName: true
        }
      })
      specialSubordinates = dsgUsers
    } else if (jobTitle.includes('board') && jobTitle.includes('chair')) {
      // Board Chairperson can approve SG agreements
      const sgUsers = await prisma.user.findMany({
        where: {
          OR: [
            { jobTitle: { contains: 'Statistician General', mode: 'insensitive' } },
            { jobTitle: { equals: 'SG', mode: 'insensitive' } }
          ],
          NOT: { jobTitle: { contains: 'Deputy', mode: 'insensitive' } }
        },
        select: {
          id: true,
          name: true,
          email: true,
          departmentName: true,
          divisionName: true
        }
      })
      specialSubordinates = sgUsers
    }

    // Combine regular subordinates with special subordinates
    const allSubordinates = [...subordinates, ...specialSubordinates.filter(
      (special: { id: string }) => !subordinates.some((sub: { id: string }) => sub.id === special.id)
    )]
    console.log(`All subordinates (including special): ${allSubordinates.length}`)

    // Get all agreements for these subordinates
    const allAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: { in: allSubordinates.map((s: { id: string }) => s.id) },
        isAdhocContainer: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            departmentName: true,
            divisionName: true,
            jobTitle: true
          }
        },
        initiative: {
          select: {
            id: true,
            title: true,
            measure: true,
            target: true,
            objective: {
              select: {
                id: true,
                title: true,
                goal: {
                  select: {
                    id: true,
                    title: true,
                    goalNumber: true
                  }
                }
              }
            }
          }
        },
        performancePeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        confirmedAt: 'desc'
      }
    })

    // Create result for each subordinate
    const result = allSubordinates.map((subordinate: { id: string; firstName: string | null; lastName: string | null; email: string; departmentName: string | null; divisionName: string | null; jobTitle?: string | null }) => {
      const userAgreements = allAgreements.filter((a: { userId: string }) => a.userId === subordinate.id)
      
      const pendingCount = userAgreements.filter((a: { approvalStatus: string | null }) => a.approvalStatus === 'PENDING').length
      const approvedCount = userAgreements.filter((a: { approvalStatus: string | null }) => a.approvalStatus === 'APPROVED').length
      const rejectedCount = userAgreements.filter((a: { approvalStatus: string | null }) => a.approvalStatus === 'REJECTED').length
      const notSubmittedCount = userAgreements.filter((a: { approvalStatus: string | null }) => !a.approvalStatus).length
      
      // Determine overall status
      let overallStatus = 'NOT_SUBMITTED'
      if (userAgreements.length === 0) {
        overallStatus = 'NO_ASSIGNMENTS'
      } else if (approvedCount === userAgreements.length) {
        overallStatus = 'APPROVED'
      } else if (pendingCount === userAgreements.length) {
        overallStatus = 'PENDING'
      } else if (notSubmittedCount === userAgreements.length) {
        overallStatus = 'NOT_SUBMITTED'
      } else if (pendingCount > 0 || approvedCount > 0 || rejectedCount > 0) {
        overallStatus = 'MIXED'
      }
      
      const totalWeight = userAgreements.reduce((sum: number, a: { weight: number | null }) => sum + (a.weight || 0), 0)
      const lastSubmission = userAgreements
        .filter((a: { confirmedAt: Date | null }) => a.confirmedAt)
        .sort((a: { confirmedAt: Date | null }, b: { confirmedAt: Date | null }) => 
          new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime()
        )[0]

      // Check if agreement is complete (all initiatives are APPROVED)
      const notApprovedCount = userAgreements.filter((a: { approvalStatus: string | null }) => 
        a.approvalStatus !== 'APPROVED'
      ).length
      const isComplete = userAgreements.length > 0 && notApprovedCount === 0

      return {
        id: `user-${subordinate.id}`,
        userId: subordinate.id,
        user: {
          id: subordinate.id,
          name: `${subordinate.firstName || ''} ${subordinate.lastName || ''}`.trim() || 'Unknown User',
          email: subordinate.email,
          jobTitle: subordinate.jobTitle || null,
          department: { name: subordinate.departmentName || 'Unknown' },
          division: { name: subordinate.divisionName || null }
        },
        agreements: userAgreements.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description || '',
          kpi: a.kpi || '',
          target: a.target || '',
          customAction: a.customAction || '',
          weight: a.weight || 0,
          status: a.status || 'NOT_STARTED',
          percentComplete: a.percentComplete || 0,
          evidenceUrl: a.evidenceUrl || null,
          evidenceNotes: a.evidenceNotes || null,
          rating: a.rating || null,
          progressNotes: a.progressNotes || null,
          initiative: a.initiative,
          performancePeriod: a.performancePeriod,
          dueDate: a.dueDate,
          confirmedAt: a.confirmedAt,
          approvedAt: a.approvedAt,
          completedAt: a.completedAt,
          approvalStatus: a.approvalStatus
        })),
        submittedAt: lastSubmission?.confirmedAt || null,
        totalWeight,
        overallStatus,
        isComplete,
        incompleteCount: notApprovedCount,
        counts: {
          total: userAgreements.length,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          notSubmitted: notSubmittedCount
        }
      }
    })

    console.log(`Total subordinates: ${result.length}`)
    console.log(`With agreements: ${result.filter((r: { agreements: any[] }) => r.agreements.length > 0).length}`)
    console.log(`With approved: ${result.filter((r: { counts: { approved: number } }) => r.counts.approved > 0).length}`)
    
    const response = NextResponse.json(result)
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie)
    }
    return response
  } catch (error) {
    console.error('Error fetching pending agreements:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
