import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'team'

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      select: { id: true, email: true, jobTitle: true, departmentId: true, departmentName: true, divisionName: true, managerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Determine which users to fetch based on access level
    let usersToFetch: any[] = []
    
    // Base filter: exclude ghost/placeholder accounts (no department and no jobTitle, or non-ACTIVE status)
    const realUserFilter: any = {
      status: 'ACTIVE',
      OR: [
        { departmentName: { not: null } },
        { jobTitle: { not: null } },
      ]
    }

    const userSelect = {
      id: true, email: true, firstName: true, lastName: true,
      jobTitle: true, departmentName: true, divisionName: true,
      managerId: true, status: true
    }

    if (level === 'all') {
      usersToFetch = await prisma.user.findMany({
        where: realUserFilter,
        select: userSelect
      })
    } else {
      const directReports = await prisma.user.findMany({
        where: { managerId: currentUser.id, ...realUserFilter },
        select: userSelect
      })

      const jobTitle = (currentUser.jobTitle || '').toLowerCase()
      const isManager = jobTitle.includes('manager') || jobTitle.includes('senior') || jobTitle.includes('head')

      if (isManager && currentUser.departmentId) {
        const deptMembers = await prisma.user.findMany({
          where: {
            departmentId: currentUser.departmentId,
            id: { not: currentUser.id },
            ...realUserFilter
          },
          select: userSelect
        })
        usersToFetch = [...directReports, ...deptMembers]
      } else {
        usersToFetch = directReports
      }

      // Remove duplicates
      const uniqueIds = new Set<string>()
      usersToFetch = usersToFetch.filter(u => {
        if (uniqueIds.has(u.id)) return false
        uniqueIds.add(u.id)
        return true
      })
    }

    // Get agreements for these users
    const userIds = usersToFetch.map(u => u.id)
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: { in: userIds },
        performancePeriodId: activePeriod?.id,
        isAdhocContainer: false
      }
    })

    // Build staff list with agreement status
    const staffList = usersToFetch.map(user => {
      const userAgreements = agreements.filter(a => a.userId === user.id)
      const approvedAgreements = userAgreements.filter(a => a.approvalStatus === 'APPROVED')
      const pendingAgreements = userAgreements.filter(a => a.approvalStatus === 'PENDING')
      const ratedAgreements = approvedAgreements.filter(a => a.rating !== null && a.rating > 0)
      
      let agreementStatus: 'approved' | 'pending' | 'draft' | 'none' = 'none'
      if (approvedAgreements.length > 0) {
        agreementStatus = 'approved'
      } else if (pendingAgreements.length > 0) {
        agreementStatus = 'pending'
      } else if (userAgreements.length > 0) {
        agreementStatus = 'draft'
      }

      let ratingStatus: 'rated' | 'pending' | 'none' = 'none'
      // allRated = true only when every approved agreement has a rating
      const allRated = approvedAgreements.length > 0 && ratedAgreements.length === approvedAgreements.length
      if (ratedAgreements.length > 0) {
        ratingStatus = 'rated'
      } else if (approvedAgreements.length > 0) {
        ratingStatus = 'pending'
      }

      const avgRating = ratedAgreements.length > 0
        ? ratedAgreements.reduce((sum, a) => sum + (a.rating || 0), 0) / ratedAgreements.length
        : null

      return {
        id: user.id,
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        department: (user as any).departmentName || 'Unknown',
        position: user.jobTitle || (user as any).position || 'Staff',
        email: user.email,
        agreementStatus,
        ratingStatus,
        agreementCount: userAgreements.length,
        approvedCount: approvedAgreements.length,
        allRated,
        averageRating: avgRating ? Math.round((avgRating / 5) * 100) : null,
        lastUpdated: userAgreements.length > 0 
          ? userAgreements.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt.toISOString()
          : null
      }
    }).sort((a, b) => {
      // Sort by agreement status (approved first, then pending, then draft, then none)
      const statusOrder = { approved: 0, pending: 1, draft: 2, none: 3 }
      return statusOrder[a.agreementStatus] - statusOrder[b.agreementStatus]
    })

    // Calculate stats
    const stats = {
      totalStaff: staffList.length,
      withApprovedAgreements: staffList.filter(s => s.agreementStatus === 'approved').length,
      withRatedAgreements: staffList.filter(s => s.ratingStatus === 'rated').length,
      pendingAgreements: staffList.filter(s => s.agreementStatus === 'pending').length
    }

    return NextResponse.json({ staff: staffList, stats })
  } catch (error) {
    console.error('Error fetching staff agreements:', error)
    return NextResponse.json({ error: 'Failed to fetch staff agreements' }, { status: 500 })
  }
}
