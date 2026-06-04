import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

// Get all DB IDs for a given user ID (handles ghost/merged accounts with same email)
async function getAllIdsForUser(userId: string): Promise<string[]> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (!u) return [userId]
  const variants = await prisma.user.findMany({
    where: { email: { equals: u.email, mode: 'insensitive' } },
    select: { id: true }
  })
  return variants.length > 0 ? variants.map(v => v.id) : [userId]
}

// Recursively collect all subordinate IDs (direct + indirect reports).
// Ghost-account aware: looks up direct reports by ALL IDs for the manager email.
async function getAllSubordinateIds(managerId: string, visited = new Set<string>()): Promise<string[]> {
  if (visited.has(managerId)) return []
  visited.add(managerId)

  // Resolve all DB IDs for this manager (catches ghost accounts)
  const allManagerIds = await getAllIdsForUser(managerId)
  allManagerIds.forEach(id => visited.add(id))

  const directReports = await prisma.user.findMany({
    where: { managerId: { in: allManagerIds }, status: 'ACTIVE', id: { notIn: [...visited] } },
    select: { id: true }
  })

  const ids: string[] = directReports.map(u => u.id)

  for (const report of directReports) {
    const childIds = await getAllSubordinateIds(report.id, visited)
    ids.push(...childIds)
  }

  return ids
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve all DB records for this user (handles ghost/merged accounts)
    const dbUserVariants = await prisma.user.findMany({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: {
        id: true,
        jobTitle: true,
        departmentId: true,
        departmentName: true,
        divisionName: true,
        roles: { select: { role: { select: { name: true } } } }
      }
    })

    // Pick the richest record as canonical
    const currentUser = dbUserVariants.length > 0
      ? dbUserVariants.reduce((best, r) => {
          const score = (r.jobTitle ? 2 : 0) + (r.departmentName ? 1 : 0) + (r.roles.length > 0 ? 2 : 0)
          const bestScore = (best.jobTitle ? 2 : 0) + (best.departmentName ? 1 : 0) + (best.roles.length > 0 ? 2 : 0)
          return score > bestScore ? r : best
        }, dbUserVariants[0])
      : null

    const actualUserId = currentUser?.id || user.id
    // All IDs for the logged-in user (ghost variants included)
    const selfAllIds = dbUserVariants.map(v => v.id)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    const userRoleNames = currentUser.roles.map(r => r.role.name.toUpperCase())
    const jobTitle = currentUser.jobTitle?.toUpperCase() || ''

    // Check if user is SG or Deputy SG (direct reports only)
    const isSGorDeputySG = userRoleNames.some(r => ['SG', 'DEPUTY_SG'].includes(r)) ||
                           jobTitle.includes('STATISTICIAN GENERAL') ||
                           jobTitle.includes('DEPUTY STATISTICIAN GENERAL')

    // Executive: sees all recursive subordinates in their department
    const isExecutiveLevel = !isSGorDeputySG && (
      userRoleNames.some(r => ['EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'ADMIN'].includes(r)) ||
      jobTitle.includes('EXECUTIVE')
    )

    // === Determine which users to show based on role ===
    let targetUserIds: string[] = []

    if (isSGorDeputySG) {
      // SG / DSG: ONLY their direct reports (by all self IDs)
      const directReports = await prisma.user.findMany({
        where: { managerId: { in: selfAllIds }, status: 'ACTIVE' },
        select: { id: true }
      })
      targetUserIds = directReports.map(u => u.id)

    } else {
      // Executive OR any manager/supervisor: recursive AD subordinates only
      // Start the walk from all ghost/canonical IDs of the logged-in user
      const visited = new Set<string>(selfAllIds)
      for (const selfId of selfAllIds) {
        const childIds = await getAllSubordinateIds(selfId, visited)
        targetUserIds.push(...childIds)
      }
    }

    // Deduplicate and exclude all self IDs (ghost variants too)
    const selfIdSet = new Set(selfAllIds)
    const allTargetIds = [...new Set(targetUserIds)]
      .filter(id => !selfIdSet.has(id))

    if (allTargetIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch target users with their agreements (active period only)
    const subordinates = await prisma.user.findMany({
      where: { id: { in: allTargetIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        position: true,
        departmentName: true,
        divisionName: true,
        department: { select: { id: true, name: true } },
        roles: { select: { role: { select: { name: true } } } },
        performanceAgreements: {
          where: {
            isAdhocContainer: false,
            ...(activePeriod?.id ? { performancePeriodId: activePeriod.id } : {})
          },
          include: {
            initiative: {
              include: {
                objective: {
                  include: {
                    goal: { select: { goalNumber: true, title: true } }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    })

    // Filter out anyone above us in the hierarchy (SG / DEPUTY_SG should never appear as subordinates)
    const filtered = subordinates.filter(u => {
      const roleNames = u.roles.map(r => r.role.name.toUpperCase())
      return !roleNames.some(r => ['SG', 'DEPUTY_SG'].includes(r))
    })

    // Map to frontend shape
    const result = filtered.map(u => {
      const agreements = u.performanceAgreements
      const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email
      const approvedCount = agreements.filter(a => a.approvalStatus === 'APPROVED').length
      const allApproved = agreements.length > 0 && agreements.every(a => a.approvalStatus === 'APPROVED')
      const ratedCount = agreements.filter(a => a.rating !== null).length
      const allRated = agreements.length > 0 && agreements.every(a => a.rating !== null)

      return {
        id: u.id,
        name: displayName,
        email: u.email,
        jobTitle: u.jobTitle || u.position || '—',
        role: u.roles[0]?.role?.name || 'STAFF',
        department: u.department 
          ? { id: u.department.id, name: u.department.name }
          : u.departmentName 
            ? { id: '', name: u.departmentName }
            : undefined,
        division: u.divisionName ? { id: '', name: u.divisionName } : undefined,
        performanceAgreements: agreements.map(a => ({
          ...a,
          user: {
            id: u.id,
            name: displayName,
            email: u.email,
            department: u.department 
              ? { name: u.department.name }
              : u.departmentName 
                ? { name: u.departmentName }
                : undefined,
            division: u.divisionName ? { name: u.divisionName } : undefined
          }
        })),
        totalAgreements: agreements.length,
        approvedCount,
        allApproved,
        ratedAgreements: ratedCount,
        allRated,
        readyForRating: agreements.filter(a =>
          a.rating !== null || (a.approvalStatus === 'APPROVED' && a.rating === null)
        ).length,
        notReady: agreements.filter(a =>
          a.rating === null && (!a.approvalStatus || a.approvalStatus === 'REJECTED')
        ).length,
        pendingApproval: agreements.filter(a =>
          a.rating === null && a.approvalStatus === 'PENDING'
        ).length,
        selfRatedNeedsReview: agreements.filter(a =>
          a.rating !== null && a.approvalStatus !== 'APPROVED'
        ).length,
        allCompleted: agreements.length > 0 && allApproved && allRated,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching reviews to complete:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
