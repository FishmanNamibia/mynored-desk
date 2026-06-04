import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import ExcelJS from 'exceljs'

// Helper: resolve a user ID to the canonical (richest) DB record — fixes ghost/merged accounts
async function resolveCanonical(uid: string) {
  const u = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true, managerId: true }
  })
  if (!u) return null
  const dups = await prisma.user.findMany({
    where: { email: { equals: u.email, mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true, jobTitle: true, position: true, signatureUrl: true, managerId: true }
  })
  if (dups.length <= 1) return u
  const best = dups.reduce((b, r) => {
    const s = (r.firstName ? 2 : 0) + (r.jobTitle ? 2 : 0) + (r.signatureUrl ? 1 : 0) + (r.managerId ? 1 : 0)
    const bs = (b.firstName ? 2 : 0) + (b.jobTitle ? 2 : 0) + (b.signatureUrl ? 1 : 0) + (b.managerId ? 1 : 0)
    return s > bs ? r : b
  }, dups[0])
  return { ...best, email: u.email }
}

// Helper: build signatory chain (used by Excel export only)
async function buildSignatoryChain(userId: string, managerId: string | null) {
  const signatoryChain: { role: string; name: string; designation: string; signatureUrl: string | null }[] = []
  
  const isExecutiveTitle = (title: string | null) => {
    if (!title) return false
    const t = title.toLowerCase()
    return t.includes('executive') && !t.includes('deputy') && !t.includes('assistant')
  }

  const isDeputyStatisticianGeneral = (title: string | null) => {
    if (!title) return false
    const t = title.toLowerCase()
    return t.includes('deputy') && t.includes('statistician')
  }

  const isStatisticianGeneral = (title: string | null) => {
    if (!title) return false
    const t = title.toLowerCase()
    return t.includes('statistician') && t.includes('general') && !t.includes('deputy')
  }

  // Walk up the management chain
  let currentManagerId = managerId
  const visited = new Set<string>()
  
  while (currentManagerId && !visited.has(currentManagerId)) {
    visited.add(currentManagerId)
    
    const mgr = await resolveCanonical(currentManagerId)
    
    if (!mgr) break
    
    const name = `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim()
    const designation = mgr.jobTitle || mgr.position || ''
    const signatureUrl = mgr.signatureUrl || null
    
    if (isStatisticianGeneral(mgr.jobTitle)) {
      signatoryChain.push({ role: 'SG', name, designation, signatureUrl })
      break
    } else if (isDeputyStatisticianGeneral(mgr.jobTitle)) {
      signatoryChain.push({ role: 'DSG', name, designation, signatureUrl })
      break
    } else if (isExecutiveTitle(mgr.jobTitle)) {
      signatoryChain.push({ role: 'EXECUTIVE', name, designation, signatureUrl })
      break
    } else {
      const role = signatoryChain.length === 0 ? 'SUPERVISOR' : 'MANAGER'
      signatoryChain.push({ role, name, designation, signatureUrl })
      currentManagerId = mgr.managerId
    }
  }
  
  return signatoryChain
}

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check access - must be executive, manager, senior, or OD Specialist
    const currentUser = await prisma.user.findFirst({
      where: { email: { equals: authUser.email, mode: 'insensitive' } },
      select: { id: true, email: true, jobTitle: true, departmentName: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const jobTitle = (currentUser.jobTitle || '').toLowerCase()
    const department = (currentUser.departmentName || '').toLowerCase()
    const email = currentUser.email.toLowerCase()
    
    const isExecutive = jobTitle.includes('executive')
    const isManager = jobTitle.includes('manager') || jobTitle.includes('senior') || jobTitle.includes('head')
    const isODSpecialist = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isSG = jobTitle.includes('statistician') && jobTitle.includes('general')
    const isDeputySG = jobTitle.includes('deputy') && jobTitle.includes('statistician')
    const isAdmin = jobTitle.includes('admin') || jobTitle.includes('system')
    
    if (!isExecutive && !isManager && !isODSpecialist && !isSG && !isDeputySG && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'excel'
    const type = searchParams.get('type') || 'approved' // 'approved' or 'rated'

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Build query based on type
    const whereClause: any = {
      isAdhocContainer: false,
      approvalStatus: 'APPROVED'
    }

    if (activePeriod?.id) {
      whereClause.performancePeriodId = activePeriod.id
    }

    if (type === 'rated') {
      whereClause.rating = { not: null, gt: 0 }
    }

    // Fetch all agreements with user data
    const agreements = await prisma.performanceAgreement.findMany({
      where: whereClause,
      select: {
        id: true, title: true, userId: true, weight: true, rating: true,
        approvalStatus: true, dueDate: true, kpi: true, target: true,
        customAction: true, evidenceUrl: true,
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            jobTitle: true, departmentName: true, signatureUrl: true, managerId: true
          }
        },
        initiative: {
          select: {
            id: true, title: true, action: true, measure: true, target: true,
            objective: {
              select: {
                id: true, title: true,
                goal: { select: { id: true, title: true, goalNumber: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } }
      ]
    })

    if (format === 'excel') {
      return await generateExcelExport(agreements, type, activePeriod)
    } else {
      // PDF generation must happen client-side (jsPDF is browser-only)
      // Return JSON data grouped by user so the client can generate PDFs
      const userMap = new Map<string, any>()
      for (const ag of agreements) {
        if (!userMap.has(ag.userId)) {
          userMap.set(ag.userId, { user: ag.user, agreements: [] })
        }
        userMap.get(ag.userId).agreements.push(ag)
      }
      return NextResponse.json({
        users: Array.from(userMap.values()),
        activePeriod,
        type
      })
    }

  } catch (error) {
    console.error('Error exporting agreements:', error)
    return NextResponse.json({ error: 'Failed to export agreements' }, { status: 500 })
  }
}

async function generateExcelExport(agreements: any[], type: string, activePeriod: any) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Performance Summary')

  // Group agreements by user
  const userStatsMap = new Map<string, any>()
  
  agreements.forEach((agreement) => {
    const userId = agreement.userId
    if (!userStatsMap.has(userId)) {
      userStatsMap.set(userId, {
        user: agreement.user,
        totalAgreements: 0,
        approvedAgreements: 0,
        pendingAgreements: 0,
        rejectedAgreements: 0,
        ratedAgreements: 0,
        totalWeight: 0,
        ratingSum: 0,
        ratedWeight: 0
      })
    }
    
    const stats = userStatsMap.get(userId)!
    stats.totalAgreements++
    
    if (agreement.approvalStatus === 'APPROVED') {
      stats.approvedAgreements++
    } else if (agreement.approvalStatus === 'PENDING') {
      stats.pendingAgreements++
    } else if (agreement.approvalStatus === 'REJECTED') {
      stats.rejectedAgreements++
    }
    
    stats.totalWeight += agreement.weight || 0
    
    if (agreement.rating && agreement.rating > 0) {
      stats.ratedAgreements++
      stats.ratingSum += agreement.rating * (agreement.weight || 0)
      stats.ratedWeight += agreement.weight || 0
    }
  })

  // Set column widths for summary view
  worksheet.columns = [
    { header: 'Employee Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 35 },
    { header: 'Department', key: 'department', width: 30 },
    { header: 'Position', key: 'position', width: 30 },
    { header: 'Total Agreements', key: 'totalAgreements', width: 18 },
    { header: 'Approved', key: 'approved', width: 12 },
    { header: 'Pending', key: 'pending', width: 12 },
    { header: 'Rejected', key: 'rejected', width: 12 },
    { header: 'Rated Agreements', key: 'rated', width: 18 },
    { header: 'Total Weight (%)', key: 'totalWeight', width: 16 },
    { header: 'Average Rating (1-5)', key: 'avgRating', width: 20 },
    { header: 'Completion Rate (%)', key: 'completionRate', width: 20 }
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2980B9' }
  }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(1).height = 20

  // Add user summary rows
  Array.from(userStatsMap.values()).forEach((userStats) => {
    const user = userStats.user
    const avgRating = userStats.ratedWeight > 0 
      ? (userStats.ratingSum / userStats.ratedWeight).toFixed(2)
      : 'N/A'
    
    const completionRate = userStats.totalAgreements > 0
      ? Math.round((userStats.ratedAgreements / userStats.totalAgreements) * 100)
      : 0

    worksheet.addRow({
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
      email: user?.email || 'N/A',
      department: user?.departmentName || 'Unknown',
      position: user?.jobTitle || 'Staff',
      totalAgreements: userStats.totalAgreements,
      approved: userStats.approvedAgreements,
      pending: userStats.pendingAgreements,
      rejected: userStats.rejectedAgreements,
      rated: userStats.ratedAgreements,
      totalWeight: userStats.totalWeight,
      avgRating: avgRating,
      completionRate: completionRate
    })
  })

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="performance-agreements-${type}-${new Date().toISOString().split('T')[0]}.xlsx"`
    }
  })
}

