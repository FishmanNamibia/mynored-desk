import { NextResponse } from 'next/server'
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

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual database user ID by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true, divisionName: true, departmentName: true, jobTitle: true }
    })
    const actualUserId = dbUser?.id || user.id

    const isExecutive = dbUser?.jobTitle?.toLowerCase().includes('executive') ||
                        dbUser?.jobTitle?.toLowerCase().includes('statistician general') ||
                        dbUser?.jobTitle?.toLowerCase().includes('deputy')
    const isManager = isExecutive ||
                      dbUser?.jobTitle?.toLowerCase().includes('manager') ||
                      dbUser?.jobTitle?.toLowerCase().includes('head')

    // Get all subordinate IDs recursively under the logged-in user
    const allSubordinateIds = await findAllSubordinateIds(actualUserId)

    // If no subordinates found via managerId chain, fall back to department-based lookup
    // This handles cases where managerId isn't set up in the DB
    let subordinateWhere: any
    if (allSubordinateIds.length > 0) {
      subordinateWhere = { id: { in: allSubordinateIds }, status: 'ACTIVE' }
    } else if (isManager && dbUser?.departmentName) {
      // Fallback: show all employees in the same department (excluding self)
      subordinateWhere = {
        departmentName: dbUser.departmentName,
        id: { not: actualUserId },
        status: 'ACTIVE'
      }
    } else {
      return NextResponse.json({
        divisions: [],
        isExecutive,
        currentUserDivision: dbUser?.divisionName || null
      })
    }

    // Fetch subordinates (or department peers as fallback) with their performance agreements
    const subordinates = await prisma.user.findMany({
      where: subordinateWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        divisionName: true,
        departmentName: true,
        managerId: true,
        PerformanceAgreement_PerformanceAgreement_userIdToUser: {
          where: { isAdhocContainer: false },
          select: { rating: true, weight: true }
        }
      }
    })

    // Identify which subordinates have their own subordinates (are managers)
    const managersWithSubordinates = new Set<string>()
    for (const u of subordinates) {
      if (u.managerId) {
        managersWithSubordinates.add(u.managerId)
      }
    }

    // Helper: compute weighted average rating for a user
    function computeUserRating(agreements: { rating: number | null; weight: number | null }[]): number | null {
      let totalScore = 0
      let totalWeight = 0
      for (const a of agreements) {
        if (a.weight) {
          totalWeight += a.weight
          if (a.rating) totalScore += a.rating * a.weight
        }
      }
      return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) / 100 : null
    }

    // Group subordinates by division
    const divisionGroups: Record<string, {
      divisionName: string
      departmentName: string | null
      manager: { id: string; name: string; jobTitle: string | null } | null
      employeeCount: number
      reportsToExecutive: boolean
      ratings: number[]
    }> = {}

    for (const u of subordinates) {
      const divName = u.divisionName || 'No Division Assigned'

      if (!divisionGroups[divName]) {
        divisionGroups[divName] = {
          divisionName: divName,
          departmentName: u.departmentName,
          manager: null,
          employeeCount: 0,
          reportsToExecutive: false,
          ratings: []
        }
      }

      // Check if this subordinate is a manager within this division
      const isMgr = managersWithSubordinates.has(u.id) &&
                     (u.jobTitle?.toLowerCase().includes('manager') ||
                      u.jobTitle?.toLowerCase().includes('head') ||
                      u.jobTitle?.toLowerCase().includes('senior'))

      if (isMgr && !divisionGroups[divName].manager) {
        divisionGroups[divName].manager = {
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown',
          jobTitle: u.jobTitle
        }
      }

      divisionGroups[divName].employeeCount++

      // Compute this user's rating and track it
      const userRating = computeUserRating((u as any).PerformanceAgreement_PerformanceAgreement_userIdToUser || [])
      if (userRating !== null) {
        divisionGroups[divName].ratings.push(userRating)
      }

      // Check if this user reports directly to the logged-in user
      if (u.managerId === actualUserId) {
        divisionGroups[divName].reportsToExecutive = true
      }
    }

    // Convert to array and sort
    const divisions = Object.values(divisionGroups)
      .sort((a, b) => {
        if (a.manager && !b.manager) return -1
        if (!a.manager && b.manager) return 1
        return a.divisionName.localeCompare(b.divisionName)
      })

    return NextResponse.json({
      divisions: divisions.map(d => ({
        divisionName: d.divisionName,
        departmentName: d.departmentName,
        manager: d.manager,
        employeeCount: d.employeeCount,
        reportsToExecutive: d.reportsToExecutive,
        averageScore: d.ratings.length > 0
          ? Math.round((d.ratings.reduce((s, r) => s + r, 0) / d.ratings.length) * 10) / 10
          : null,
        ratedCount: d.ratings.length
      })),
      isExecutive,
      currentUserDivision: dbUser?.divisionName || null
    })
  } catch (error) {
    console.error('Error fetching divisions by manager:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
