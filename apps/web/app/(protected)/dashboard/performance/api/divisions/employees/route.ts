import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// Recursively find all subordinate IDs under a given user
async function findAllSubordinateIds(userId: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(userId)) return []
  visited.add(userId)

  const directReports = await prisma.user.findMany({
    where: { managerId: userId, status: 'ACTIVE' },
    select: { id: true }
  })

  const ids: string[] = []
  for (const report of directReports) {
    ids.push(report.id)
    const subIds = await findAllSubordinateIds(report.id, visited)
    ids.push(...subIds)
  }
  return ids
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const divisionName = searchParams.get('division')

    if (!divisionName) {
      return NextResponse.json({ error: 'Division name is required' }, { status: 400 })
    }

    // Resolve actual database user ID by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true, departmentName: true, jobTitle: true }
    })
    const actualUserId = dbUser?.id || user.id

    const isExecutive = dbUser?.jobTitle?.toLowerCase().includes('executive') ||
                        dbUser?.jobTitle?.toLowerCase().includes('statistician general') ||
                        dbUser?.jobTitle?.toLowerCase().includes('deputy')
    const isManagerRole = isExecutive ||
                          dbUser?.jobTitle?.toLowerCase().includes('manager') ||
                          dbUser?.jobTitle?.toLowerCase().includes('head')

    // Get all subordinate IDs recursively under the logged-in user
    const allSubordinateIds = await findAllSubordinateIds(actualUserId)

    // Handle "No Division Assigned" — this means "My Team" (all subordinates regardless of division)
    const isNoDivision = divisionName === 'No Division Assigned'

    // Build where clause with fallback for incomplete managerId chains
    let employeeWhere: any = {
      status: 'ACTIVE',
    }

    // Only filter by divisionName when a real division is specified
    if (!isNoDivision) {
      employeeWhere.divisionName = divisionName
    }

    if (allSubordinateIds.length > 0) {
      employeeWhere.id = { in: allSubordinateIds }
    } else if (isManagerRole && dbUser?.departmentName) {
      // Fallback: show department employees (excluding self)
      employeeWhere.departmentName = dbUser.departmentName
      employeeWhere.id = { not: actualUserId }
    } else {
      return NextResponse.json({
        divisionName,
        departmentName: null,
        employees: [],
        stats: { total: 0, approved: 0, pending: 0, notSubmitted: 0, averageRating: null, ratedCount: 0 }
      })
    }

    // Fetch employees in this division
    const filteredEmployees = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        managerId: true,
        PerformanceAgreement_PerformanceAgreement_userIdToUser: {
          where: { isAdhocContainer: false },
          select: {
            id: true,
            title: true,
            approvalStatus: true,
            rating: true,
            weight: true,
            status: true,
            percentComplete: true,
            progressNotes: true,
            evidenceUrl: true,
            evidenceNotes: true,
            initiative: {
              select: {
                title: true,
                measure: true,
                target: true,
                objective: {
                  select: {
                    title: true,
                    goal: {
                      select: { title: true, goalNumber: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    // Calculate stats
    let approved = 0
    let pending = 0
    let notSubmitted = 0
    let rejected = 0

    const employeesWithStatus = filteredEmployees.map(emp => {
      const agreements = emp.PerformanceAgreement_PerformanceAgreement_userIdToUser
      const totalAgreements = agreements.length
      
      let agreementStatus: 'approved' | 'pending' | 'not_submitted' | 'rejected' = 'not_submitted'
      let avgRating: number | null = null

      if (totalAgreements > 0) {
        const approvedCount = agreements.filter(a => a.approvalStatus === 'APPROVED').length
        const pendingCount = agreements.filter(a => a.approvalStatus === 'PENDING').length
        const rejectedCount = agreements.filter(a => a.approvalStatus === 'REJECTED').length

        if (approvedCount === totalAgreements) {
          agreementStatus = 'approved'
          approved++
        } else if (rejectedCount > 0) {
          agreementStatus = 'rejected'
          rejected++
        } else if (pendingCount > 0) {
          agreementStatus = 'pending'
          pending++
        } else {
          agreementStatus = 'not_submitted'
          notSubmitted++
        }

        // Calculate weighted average rating (matching my-rate API formula)
        let totalScore = 0
        let totalWeight = 0
        agreements.forEach(a => {
          if (a.weight) {
            totalWeight += a.weight
            if (a.rating) {
              totalScore += a.rating * a.weight
            }
          }
        })
        avgRating = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : null
      } else {
        notSubmitted++
      }

      return {
        id: emp.id,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
        email: emp.email,
        jobTitle: emp.jobTitle,
        agreementStatus,
        rating: avgRating,
        agreements: agreements.map(a => ({
          id: a.id,
          title: a.initiative?.title || a.title || 'Untitled',
          goal: a.initiative?.objective?.goal?.title || null,
          goalNumber: a.initiative?.objective?.goal?.goalNumber || null,
          objective: a.initiative?.objective?.title || null,
          measure: a.initiative?.measure || null,
          target: a.initiative?.target || null,
          approvalStatus: a.approvalStatus,
          rating: a.rating,
          weight: a.weight,
          status: a.status,
          percentComplete: a.percentComplete,
          progressNotes: a.progressNotes,
          evidenceUrl: a.evidenceUrl,
          evidenceNotes: a.evidenceNotes,
        }))
      }
    })

    // Get department name from first employee
    const departmentName = filteredEmployees.length > 0 ? filteredEmployees[0].departmentName : null

    // Calculate division average rating
    const allRatings = employeesWithStatus
      .filter(emp => emp.rating !== null)
      .map(emp => emp.rating as number)
    const divisionAverageRating = allRatings.length > 0 
      ? Math.round((allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length) * 10) / 10
      : null

    return NextResponse.json({
      divisionName,
      departmentName,
      employees: employeesWithStatus,
      stats: {
        total: filteredEmployees.length,
        approved,
        pending,
        notSubmitted: notSubmitted + rejected,
        averageRating: divisionAverageRating,
        ratedCount: allRatings.length
      }
    })
  } catch (error) {
    console.error('Error fetching division employees:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
