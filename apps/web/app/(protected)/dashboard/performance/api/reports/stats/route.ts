import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      select: { id: true, email: true, jobTitle: true, departmentId: true, departmentName: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check access - must be executive, manager, senior, or OD Specialist
    const jobTitle = (currentUser.jobTitle || '').toLowerCase()
    const department = (currentUser.departmentName || '').toLowerCase()
    const email = currentUser.email.toLowerCase()
    
    const isExecutive = jobTitle.includes('executive')
    const isHumanCapitalExecutive = isExecutive && department.includes('human capital')
    const isManager = jobTitle.includes('manager') || jobTitle.includes('senior') || jobTitle.includes('head')
    const isODSpecialist = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isSG = jobTitle.includes('statistician') && jobTitle.includes('general') && !jobTitle.includes('deputy')
    const isDeputySG = jobTitle.includes('deputy') && jobTitle.includes('statistician')
    const isAdmin = jobTitle.includes('admin') || jobTitle.includes('system')
    
    if (!isExecutive && !isManager && !isODSpecialist && !isSG && !isDeputySG && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine if user has full access to all employees or department-only access
    // Full access: OD Specialist, ADMIN, Human Capital Executive
    // Department-only: Everyone else (executives, managers, SG, Deputy SG)
    const hasFullAccess = isODSpecialist || isAdmin || isHumanCapitalExecutive
    const userDepartment = currentUser.departmentName || ''

    // Get active performance period (or most recent one)
    let activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })
    
    // If no active period, get the most recent one
    if (!activePeriod) {
      activePeriod = await prisma.performancePeriod.findFirst({
        orderBy: { startDate: 'desc' }
      })
    }

    // Get all real users — exclude ghost/placeholder accounts (non-ACTIVE or missing dept+jobTitle)
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { departmentName: { not: null } },
          { jobTitle: { not: null } },
        ]
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        username: true, jobTitle: true, departmentName: true,
        divisionName: true, departmentId: true, managerId: true, status: true
      }
    })

    // Get all performance agreements for real users only
    const agreementWhere: any = {
      isAdhocContainer: false,
      userId: { in: users.map(u => u.id) }
    }
    if (activePeriod?.id) {
      agreementWhere.performancePeriodId = activePeriod.id
    }

    const agreements = await prisma.performanceAgreement.findMany({
      where: agreementWhere,
      select: {
        id: true, userId: true, approvalStatus: true, weight: true, rating: true,
        dueDate: true,
        updatedAt: true,
        user: {
          select: { id: true, departmentName: true }
        }
      }
    })

    // Active bi-annual half determination
    const _rsNowMonth = new Date().getUTCMonth() + 1
    const _rsH1Months = [4, 5, 6, 7, 8, 9]
    const _rsH2Months = [10, 11, 12, 1, 2, 3]
    const _rsIsH1Window = _rsH2Months.includes(_rsNowMonth)
    const _rsActiveMonths = _rsIsH1Window ? _rsH1Months : _rsH2Months

    // Calculate stats
    const totalStaff = users.length // ghost accounts already excluded above
    const agreementsSubmitted = agreements.filter(a => 
      a.approvalStatus === 'PENDING' || a.approvalStatus === 'APPROVED'
    ).length
    const agreementsApproved = agreements.filter(a => a.approvalStatus === 'APPROVED').length
    const agreementsPending = agreements.filter(a => a.approvalStatus === 'PENDING').length

    // Calculate average rating using WEIGHTED scores per employee
    // Include employees who have ANY rated agreements (partial or complete)
    let totalWeightedScores = 0
    let employeesWithAnyRatings = 0
    
    const userRatingMap = new Map<string, { weightedScore: number, totalWeight: number, allRated: boolean, ratedCount: number, totalCount: number }>()
    
    for (const user of users) {
      const allUserApproved = agreements.filter(a => a.userId === user.id && a.approvalStatus === 'APPROVED')
      if (allUserApproved.length === 0) continue

      // Filter to active half (include rated carry-overs from inactive half)
      const userApprovedAgreements = allUserApproved.filter((a: any) => {
        if (!a.dueDate) return false
        const m = new Date(a.dueDate).getUTCMonth() + 1
        if (_rsActiveMonths.includes(m)) return true
        if (a.rating != null && a.rating > 0) return true // carry-over
        return false
      })
      if (userApprovedAgreements.length === 0) continue
      
      const totalWeight = userApprovedAgreements.reduce((sum: number, a: any) => sum + (a.weight || 0), 0)
      const ratedAgreements = userApprovedAgreements.filter((a: any) => a.rating !== null && a.rating > 0)
      const allRated = ratedAgreements.length === userApprovedAgreements.length && userApprovedAgreements.length > 0
      
      let weightedScore = 0
      if (ratedAgreements.length > 0) {
        const ratedWeight = ratedAgreements.reduce((sum: number, a: any) => sum + (a.weight || 0), 0)
        if (ratedWeight > 0) {
          const ratingSum = ratedAgreements.reduce((sum: number, a: any) => sum + ((a.rating || 0) * (a.weight || 0)), 0)
          weightedScore = ratingSum / ratedWeight
        }
      }
      
      userRatingMap.set(user.id, { 
        weightedScore, 
        totalWeight, 
        allRated, 
        ratedCount: ratedAgreements.length, 
        totalCount: userApprovedAgreements.length 
      })
      
      // Include in org average if employee has ANY ratings
      if (weightedScore > 0) {
        totalWeightedScores += weightedScore
        employeesWithAnyRatings++
      }
    }
    
    // Average rating out of 5 (rounded to 1 decimal place)
    const averageRating = employeesWithAnyRatings > 0 
      ? Math.round((totalWeightedScores / employeesWithAnyRatings) * 10) / 10
      : 0

    // Users with at least one approved agreement
    const usersWithApproved = new Set(
      agreements.filter(a => a.approvalStatus === 'APPROVED').map(a => a.userId)
    ).size
    
    // Overall completion rate: percentage of total staff who have approved agreements
    const organizationCompletion = totalStaff > 0 
      ? Math.round((usersWithApproved / totalStaff) * 100) 
      : 0

    // Department stats - track unique users and weighted scores
    const departmentMap = new Map<string, {
      name: string
      staffCount: number
      usersWithSubmitted: Set<string>
      usersWithApproved: Set<string>
      totalWeightedScores: number
      employeesWithAnyRatings: number
    }>()

    // Initialize departments from users
    for (const user of users) {
      const deptName = user.departmentName || 'Unknown'
      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          name: deptName,
          staffCount: 0,
          usersWithSubmitted: new Set(),
          usersWithApproved: new Set(),
          totalWeightedScores: 0,
          employeesWithAnyRatings: 0
        })
      }
      departmentMap.get(deptName)!.staffCount++
      
      // Add user's weighted score to department if they have ANY ratings
      const userRating = userRatingMap.get(user.id)
      if (userRating && userRating.weightedScore > 0) {
        departmentMap.get(deptName)!.totalWeightedScores += userRating.weightedScore
        departmentMap.get(deptName)!.employeesWithAnyRatings++
      }
    }

    // Add agreement stats to departments - track unique users
    for (const agreement of agreements) {
      const deptName = agreement.user?.departmentName || 'Unknown'
      const dept = departmentMap.get(deptName)
      if (dept && agreement.userId) {
        if (agreement.approvalStatus === 'PENDING' || agreement.approvalStatus === 'APPROVED') {
          dept.usersWithSubmitted.add(agreement.userId)
        }
        if (agreement.approvalStatus === 'APPROVED') {
          dept.usersWithApproved.add(agreement.userId)
        }
      }
    }

    const departments = Array.from(departmentMap.values()).map(dept => ({
      name: dept.name,
      staffCount: dept.staffCount,
      submittedCount: dept.usersWithSubmitted.size,
      approvedCount: dept.usersWithApproved.size,
      averageRating: dept.employeesWithAnyRatings > 0 
        ? Math.round((dept.totalWeightedScores / dept.employeesWithAnyRatings) * 10) / 10
        : 0,
      completionRate: dept.staffCount > 0 ? Math.round((dept.usersWithApproved.size / dept.staffCount) * 100) : 0
    })).sort((a, b) => b.completionRate - a.completionRate)

    // Calculate ALL employees with their stats using weighted scores
    const allEmployees: { 
      userId: string
      name: string
      email: string
      department: string
      position: string
      agreementCount: number
      approvedCount: number
      ratedCount: number
      avgRating: number
      hasApprovedAgreements: boolean
      allRated: boolean
    }[] = []
    
    for (const user of users) {
      const userAgreements = agreements.filter(a => a.userId === user.id)
      const approvedAgreements = userAgreements.filter(a => a.approvalStatus === 'APPROVED')
      const ratedAgreements = approvedAgreements.filter(a => a.rating && a.rating > 0)
      
      // Get pre-calculated weighted score
      const userRating = userRatingMap.get(user.id)
      const weightedScore = userRating?.weightedScore || 0
      const allRated = userRating?.allRated || false
      
      allEmployees.push({
        userId: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        department: user.departmentName || 'Unknown',
        position: user.jobTitle || 'Staff',
        agreementCount: userAgreements.length,
        approvedCount: approvedAgreements.length,
        ratedCount: ratedAgreements.length,
        avgRating: Math.round(weightedScore * 10) / 10, // Weighted score out of 5, rounded to 1 decimal
        hasApprovedAgreements: approvedAgreements.length > 0,
        allRated
      })
    }

    // Sort by average rating (highest first), then by name
    allEmployees.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating
      return a.name.localeCompare(b.name)
    })

    // Filter employees based on access level
    // Full access (OD Specialist, ADMIN, HC Executive): see all employees
    // Department-only (others): see only employees in same department
    const filteredEmployees = hasFullAccess 
      ? allEmployees 
      : allEmployees.filter(emp => emp.department.toLowerCase() === userDepartment.toLowerCase())

    // Top performers (those with ratings)
    const topPerformers = allEmployees
      .filter(u => u.avgRating > 0)
      .slice(0, 10)
      .map(u => ({
        userId: u.userId,
        name: u.name,
        department: u.department,
        position: u.position,
        rating: u.avgRating,
        completionRate: u.approvedCount > 0 ? Math.round((u.ratedCount / u.approvedCount) * 100) : 0
      }))

    // Bottom performers (lowest ratings among those with ratings)
    const bottomPerformers = allEmployees
      .filter(u => u.avgRating > 0)
      .slice(-5)
      .reverse()
      .map(u => ({
        userId: u.userId,
        name: u.name,
        department: u.department,
        position: u.position,
        rating: u.avgRating,
        completionRate: u.approvedCount > 0 ? Math.round((u.ratedCount / u.approvedCount) * 100) : 0
      }))

    return NextResponse.json({
      totalStaff,
      agreementsSubmitted,
      agreementsApproved,
      agreementsPending,
      averageRating,
      organizationCompletion,
      staffWithApprovedAgreements: usersWithApproved, // Unique staff count with approved agreements
      departments,
      topPerformers,
      bottomPerformers,
      allEmployees: filteredEmployees // Filtered list based on access level
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    return NextResponse.json({ error: 'Failed to fetch report stats' }, { status: 500 })
  }
}
