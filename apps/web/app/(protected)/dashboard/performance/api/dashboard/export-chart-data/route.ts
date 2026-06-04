import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

// NSA Dark Blue brand color
const DARK_BLUE: [number, number, number] = [0, 48, 107]
const GOLD: [number, number, number] = [184, 157, 72]
const LEFT_MARGIN = 20
const RIGHT_MARGIN = 20

export async function GET(request: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(request)
    if (!authUser?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      // @ts-ignore
      include: { department: true, roles: { include: { role: true } } }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check access permissions - only Executives, System Admins, and OD Specialist
    const jobTitle = (currentUser.jobTitle || '').toLowerCase()
    const department = (currentUser.department?.name || (currentUser as any).departmentName || '').toLowerCase()
    const email = currentUser.email.toLowerCase()
    
    const isODSpecialist = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isExecutive = jobTitle.includes('executive')
    const isSG = jobTitle.includes('statistician') && jobTitle.includes('general') && !jobTitle.includes('deputy')
    const isDeputySG = jobTitle.includes('deputy') && jobTitle.includes('statistician')
    const userRoles = (currentUser as any).roles?.map((r: any) => r.role?.name?.toUpperCase() || '') || []
    const isAdmin = userRoles.some((r: string) => r.includes('ADMIN'))

    if (!isExecutive && !isSG && !isDeputySG && !isAdmin && !isODSpecialist) {
      return NextResponse.json({ error: 'Access denied. Only executives, system admins, and OD specialists can export chart data.' }, { status: 403 })
    }

    // Fetch active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Get all users with departmentName from AD
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        position: true,
        departmentName: true,
        department: { select: { name: true } }
      }
    })

    // Build a userId -> departmentName lookup from users table (AD field)
    const userDeptMap = new Map<string, string>()
    allUsers.forEach(u => {
      const deptName = u.department?.name || u.departmentName || 'Unknown'
      userDeptMap.set(u.id, deptName)
    })

    // === MERGED USER DEDUPLICATION (ghost fix — same rules as stats/route.ts) ===
    // Step 1: exclude ghost/test accounts (missing both dept+job, or name starts with test/demo)
    const baseFiltered = allUsers.filter(u => {
      const hasDept = !!(u.department?.name || (u as any).departmentName)
      const hasJob = !!(u.jobTitle || u.position)
      if (!hasDept && !hasJob) return false
      const displayName = (`${(u as any).firstName || ''} ${(u as any).lastName || ''}`).trim().toLowerCase()
      if (displayName.startsWith('test') || displayName.startsWith('demo')) return false
      return true
    })
    // Step 2: build email->all-records map from ALL users (pre-filter) so ghost IDs are still in canonicalToAllIds
    const emailToAllRecords = new Map<string, typeof allUsers>()
    allUsers.forEach(u => {
      const key = u.email.toLowerCase()
      if (!emailToAllRecords.has(key)) emailToAllRecords.set(key, [])
      emailToAllRecords.get(key)!.push(u)
    })
    // Step 3: deduplicate baseFiltered by email, keeping richest record per email
    const emailBestMap = new Map<string, (typeof allUsers)[0]>()
    for (const u of baseFiltered) {
      const key = u.email.toLowerCase()
      const existing = emailBestMap.get(key)
      if (!existing) {
        emailBestMap.set(key, u)
      } else {
        const existScore = (existing.jobTitle ? 2 : 0) + ((existing as any).departmentName ? 1 : 0)
        const newScore = (u.jobTitle ? 2 : 0) + ((u as any).departmentName ? 1 : 0)
        if (newScore > existScore) emailBestMap.set(key, u)
      }
    }
    const dedupedUsers = Array.from(emailBestMap.values())
    // canonical userId -> all DB IDs sharing same email
    const canonicalToAllIds = new Map<string, string[]>()
    dedupedUsers.forEach(u => {
      const recs = emailToAllRecords.get(u.email.toLowerCase()) || []
      canonicalToAllIds.set(u.id, recs.map(r => r.id))
    })

    // Get all performance agreements
    const allAgreements = await prisma.performanceAgreement.findMany({
      where: activePeriod?.id ? { performancePeriodId: activePeriod.id, isAdhocContainer: false } : { isAdhocContainer: false },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            departmentName: true,
            department: { select: { name: true } }
          }
        }
      }
    })

    // Fetch adhoc tasks and user weights for rating calculation
    const allAdhocTasks = await prisma.adhocTask.findMany({
      where: { approvalStatus: 'APPROVED' },
      select: { id: true, assignedToId: true, status: true }
    })

    const allUserWeights = await prisma.userTaskWeight.findMany({
      where: activePeriod?.id ? { periodId: activePeriod.id } : { periodId: null },
      select: { userId: true, periodId: true, categories: true }
    })

    // Fetch 360 ratings — use averageRating (or selfRating fallback), exactly matching stats/route.ts
    const allRating360Export = await prisma.rating360.findMany({
      select: { userId: true, selfRating: true, averageRating: true }
    })
    // Build userId -> 360 score (averageRating preferred, selfRating as fallback)
    const rating360ByUserId = new Map<string, number>()
    ;(allRating360Export as any[]).forEach((r: any) => {
      if (r.averageRating != null) {
        rating360ByUserId.set(r.userId, Number(r.averageRating))
      } else if (r.selfRating != null) {
        rating360ByUserId.set(r.userId, Number(r.selfRating))
      }
    })

    const now = new Date()

    // ============================================================
    // RATING CALCULATION — exact same formula as stats/route.ts
    // Default weights: PA=75%, 360=25% (matches my-rate API defaults)
    // ============================================================
    const allApprovedAgreements = allAgreements.filter(a => a.approvalStatus === 'APPROVED')
    const defaultPerfWeight = 75
    const defaultAdhocWeight = 0
    const defaultProjectsWeight = 0
    const defaultRiskWeight = 0
    const defaultAuditWeight = 0
    const default360Weight = 25

    const calculateUserFinalRating = (userId: string): number => {
      let perfWeight = defaultPerfWeight
      let adhocW = defaultAdhocWeight
      let projectsW = defaultProjectsWeight
      let riskW = defaultRiskWeight
      let auditW = defaultAuditWeight
      let w360 = default360Weight

      const userWeight = (allUserWeights as any[]).find((w: any) =>
        w.userId === userId && (w.periodId === activePeriod?.id || w.periodId === null)
      )
      if (userWeight) {
        try {
          const categories = JSON.parse(userWeight.categories) as { id: string; weight: number }[]
          const getW = (id: string) => categories.find(c => c.id === id)?.weight ?? 0
          const rawPerf = getW('perf'), rawAdhoc = getW('adhoc'), rawRisk = getW('risk')
          const rawProject = getW('project'), rawAudit = getW('audit'), raw360 = getW('rating360')
          const rawTotal = rawPerf + rawAdhoc + rawRisk + rawProject + rawAudit + raw360
          const scale = rawTotal > 0 ? 100 / rawTotal : 0
          perfWeight = Math.round(rawPerf * scale * 100) / 100
          adhocW = Math.round(rawAdhoc * scale * 100) / 100
          projectsW = Math.round(rawProject * scale * 100) / 100
          riskW = Math.round(rawRisk * scale * 100) / 100
          auditW = Math.round(rawAudit * scale * 100) / 100
          w360 = Math.round(raw360 * scale * 100) / 100
        } catch (e) { /* use defaults */ }
      }

      const allIdsForUser = canonicalToAllIds.get(userId) || [userId]
      const userAgreements = allApprovedAgreements.filter(a => allIdsForUser.includes(a.userId))
      let perfTotalScore = 0, perfTotalWeight = 0
      userAgreements.forEach(a => {
        if (a.weight) {
          perfTotalWeight += a.weight
          if (a.rating) perfTotalScore += a.rating * a.weight
        }
      })
      const perfRating = perfTotalWeight > 0 ? perfTotalScore / perfTotalWeight : 0

      const userAdhocTasks = (allAdhocTasks as any[]).filter((t: any) => allIdsForUser.includes(t.assignedToId))
      const completedAdhoc = userAdhocTasks.filter((t: any) => t.status === 'COMPLETED').length
      const adhocRating = userAdhocTasks.length > 0 ? (completedAdhoc / userAdhocTasks.length) * 5 : 0

      // 360 score: check all merged IDs for this canonical user
      const rating360Score = allIdsForUser.reduce((best: number, id: string) => {
        const s = rating360ByUserId.get(id)
        return (s != null && s > best) ? s : best
      }, 0)

      const weightedScore =
        (perfRating * perfWeight) +
        (adhocRating * adhocW) +
        (0 * projectsW) +
        (0 * riskW) +
        (0 * auditW) +
        (rating360Score * w360)

      return weightedScore / 100
    }

    // Build per-user agreement lookup
    const userAgreementsMap = new Map<string, typeof allAgreements>()
    allAgreements.forEach(agreement => {
      if (!userAgreementsMap.has(agreement.userId)) userAgreementsMap.set(agreement.userId, [])
      userAgreementsMap.get(agreement.userId)!.push(agreement)
    })

    // Helper: collect agreements across all merged IDs for one canonical user
    const getAllAgreementsForUser = (userId: string): typeof allAgreements => {
      const ids = canonicalToAllIds.get(userId) || [userId]
      return ids.flatMap(id => userAgreementsMap.get(id) || [])
    }

    // Person-level helpers
    const isPersonComplete = (userId: string) => {
      const uas = getAllAgreementsForUser(userId)
      return uas.length > 0 && uas.every(a => a.approvalStatus === 'APPROVED')
    }
    const isPersonRated = (userId: string) => {
      const uas = getAllAgreementsForUser(userId)
      return uas.some(a => (a as any).rating && (a as any).rating > 0)
    }

    // Group by department using AD departmentName — person-level counts
    const departmentMap = new Map<string, any>()

    // Seed departments from deduplicated users only (no ghost accounts)
    dedupedUsers.forEach(u => {
      const deptName = u.department?.name || (u as any).departmentName || 'Unknown'
      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          name: deptName,
          userIds: new Set<string>(),
          completeUserIds: new Set<string>(),
          incompleteUserIds: new Set<string>(),
          ratedUserIds: new Set<string>(),
          overdueCount: 0,
        })
      }
      const dept = departmentMap.get(deptName)!
      const uas = getAllAgreementsForUser(u.id)
      if (uas.length > 0) {
        dept.userIds.add(u.id)
        if (isPersonComplete(u.id)) dept.completeUserIds.add(u.id)
        else dept.incompleteUserIds.add(u.id)
        if (isPersonRated(u.id)) dept.ratedUserIds.add(u.id)
      }
      // Overdue: user has agreements, not complete, and submission deadline passed
      uas.forEach(a => {
        const dueDate = (a as any).dueDate
        if (dueDate) {
          const due = new Date(dueDate)
          if (due < now && a.approvalStatus !== 'APPROVED' && (a as any).status !== 'COMPLETED') {
            dept.overdueCount++
          }
        }
      })
    })

    // Convert to array and calculate percentages
    const departmentData = Array.from(departmentMap.values())
      .filter(dept => dept.userIds.size > 0)
      .map(dept => ({
        name: dept.name,
        userCount: dept.userIds.size,
        total: dept.userIds.size,           // person-level: users with agreements
        approved: dept.completeUserIds.size, // person-level: users with all approved
        pending: dept.incompleteUserIds.size, // person-level: users not complete
        rated: dept.ratedUserIds.size,
        incomplete: dept.incompleteUserIds.size,
        overdue: dept.overdueCount,
        ratedRate: dept.userIds.size > 0 ? Math.round((dept.ratedUserIds.size / dept.userIds.size) * 100) : 0,
        approvalRate: dept.userIds.size > 0 ? Math.round((dept.completeUserIds.size / dept.userIds.size) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Calculate summary statistics — person-level (deduplicated, no ghost accounts)
    const totalStaff = dedupedUsers.length
    const usersWithAgreements = dedupedUsers.filter(u => getAllAgreementsForUser(u.id).length > 0)
    const totalAgreements = usersWithAgreements.length  // 1 point per user
    const completeUsers = usersWithAgreements.filter(u => isPersonComplete(u.id))
    const incompleteUsers = usersWithAgreements.filter(u => !isPersonComplete(u.id))
    const approvedAgreements = completeUsers.length                    // users with ALL approved
    const pendingAgreements = totalStaff - approvedAgreements          // everyone not yet complete (incl. no agreements)
    const ratedAgreements = usersWithAgreements.filter(u => isPersonRated(u.id)).length
    const overdueAgreements = allAgreements.filter(a => {
      const dueDate = (a as any).dueDate
      if (!dueDate) return false
      const due = new Date(dueDate)
      return due < now && a.approvalStatus !== 'APPROVED' && (a as any).status !== 'COMPLETED'
    }).length
    const ratedRate = totalAgreements > 0 ? Math.round((ratedAgreements / totalAgreements) * 100) : 0
    // Completion rate: approved staff out of ALL staff on the system
    const approvalRate = totalStaff > 0 ? Math.round((approvedAgreements / totalStaff) * 100) : 0

    // ==============================
    // Generate PDF
    // ==============================
    const doc = new jsPDF('l', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - LEFT_MARGIN - RIGHT_MARGIN
    let yPos = 15

    // Try to load NSA logo
    let logoBase64: string | null = null
    try {
      const logoPath = path.join(process.cwd(), 'public', 'nored-logo.png')
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64')
    } catch (e) {
      console.error('Could not load NSA logo:', e)
    }

    // ==============================
    // COVER / HEADER with logo
    // ==============================
    // Dark blue header bar
    doc.setFillColor(...DARK_BLUE)
    doc.rect(0, 0, pageWidth, 45, 'F')

    // Gold accent line
    doc.setFillColor(...GOLD)
    doc.rect(0, 45, pageWidth, 1.5, 'F')

    // Logo on the left
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', LEFT_MARGIN, 5, 28, 35)
    }

    // Title text (white on dark blue)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    const titleX = logoBase64 ? LEFT_MARGIN + 34 : LEFT_MARGIN
    doc.text('Performance Agreement Trends Report', titleX, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 215, 235)
    const generatedByName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email
    doc.text(`Namibia Statistics Agency`, titleX, 26)
    doc.text(`Report Period: ${activePeriod?.name || 'N/A'}`, titleX, 31)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, titleX, 36)
    doc.text(`Generated By: ${generatedByName}`, titleX, 41)

    yPos = 55

    // ==============================
    // EXECUTIVE SUMMARY
    // ==============================
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Executive Summary', LEFT_MARGIN, yPos)

    // Underline
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 52, yPos + 1.5)
    yPos += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)

    const topDept = departmentData.length > 0 ? departmentData.reduce((best, d) => d.approvalRate > best.approvalRate ? d : best, departmentData[0]) : null
    const lowDept = departmentData.length > 0 ? departmentData.reduce((worst, d) => d.ratedRate < worst.ratedRate ? d : worst, departmentData[0]) : null

    const summaryLines = [
      `This report provides an overview of Performance Agreement trends across ${departmentData.length} department(s) within the Namibia Statistics Agency for the ${activePeriod?.name || 'current'} performance period.`,
      ``,
      `As of ${new Date().toLocaleDateString('en-GB')}, the organization has ${totalStaff} staff members, of whom ${totalAgreements} have performance agreements. Of these, ${approvedAgreements} (${approvalRate}%) are complete (all agreements approved), ${pendingAgreements} remain incomplete, and ${ratedAgreements} (${ratedRate}%) have been rated. There are ${overdueAgreements} overdue agreement(s).`,
      ``,
      topDept ? `The department with the highest completion rate is "${topDept.name}" at ${topDept.approvalRate}%.` : '',
      lowDept && departmentData.length > 1 ? `The department requiring the most attention for ratings is "${lowDept.name}" with a rated rate of ${lowDept.ratedRate}%.` : ''
    ].filter(l => l !== '')

    summaryLines.forEach(line => {
      const splitLines = doc.splitTextToSize(line, contentWidth)
      doc.text(splitLines, LEFT_MARGIN, yPos)
      yPos += splitLines.length * 4.5
    })

    yPos += 5

    // ==============================
    // ORGANIZATION OVERVIEW TABLE
    // ==============================
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Organization Overview', LEFT_MARGIN, yPos)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 55, yPos + 1.5)
    yPos += 7

    const overviewData = [
      ['Total Staff', totalStaff.toString()],
      ['Staff with Agreements', totalAgreements.toString()],
      ['Complete (All Agreements Approved)', approvedAgreements.toString()],
      ['Incomplete (Pending Approval)', pendingAgreements.toString()],
      ['Staff Rated', ratedAgreements.toString()],
      ['Overdue Agreements', overdueAgreements.toString()],
      ['Departments', departmentData.length.toString()],
      ['Completion Rate', `${approvalRate}%`]
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: overviewData,
      theme: 'grid',
      margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
      headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [240, 245, 250] }
    })

    yPos = (doc as any).lastAutoTable.finalY + 12

    // ==============================
    // QUARTERLY BREAKDOWN TABLE (org-wide)
    // ==============================
    if (yPos + 55 > pageHeight - 20) { doc.addPage(); yPos = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Quarterly Ratings Breakdown — Organisation', LEFT_MARGIN, yPos)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 100, yPos + 1.5)
    yPos += 7
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Financial year quarters: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', LEFT_MARGIN, yPos)
    yPos += 5

    const quarterDefs = [
      { q: 'Q1', months: [4,5,6], label: 'Apr – Jun' },
      { q: 'Q2', months: [7,8,9], label: 'Jul – Sep' },
      { q: 'Q3', months: [10,11,12], label: 'Oct – Dec' },
      { q: 'Q4', months: [1,2,3], label: 'Jan – Mar' },
    ]

    // Org quarterly — person-level: count employees whose ANY agreement falls in quarter
    const orgQuarterData = quarterDefs.map(({ q, months, label }) => {
      // Employees who have at least one agreement with dueDate in this quarter
      const empInQ = dedupedUsers.filter(u => {
        const uas = getAllAgreementsForUser(u.id)
        return uas.some(a => { const dd = (a as any).dueDate; return dd && months.includes(new Date(dd).getMonth() + 1) })
      })
      // Employees who have ALL their in-quarter agreements rated
      const empRated = empInQ.filter(u => {
        const uas = getAllAgreementsForUser(u.id).filter(a => { const dd = (a as any).dueDate; return dd && months.includes(new Date(dd).getMonth() + 1) })
        return uas.length > 0 && uas.every(a => (a as any).rating != null && (a as any).rating > 0)
      })
      // Weighted avg rating across rated agreements in quarter
      const ratedAgs = empInQ.flatMap(u => getAllAgreementsForUser(u.id).filter(a => {
        const dd = (a as any).dueDate
        return dd && months.includes(new Date(dd).getMonth() + 1) && (a as any).rating != null && (a as any).rating > 0
      }))
      const ratedW = ratedAgs.reduce((s, a) => s + ((a as any).weight || 0), 0)
      const wSum = ratedAgs.reduce((s, a) => s + (((a as any).rating || 0) * ((a as any).weight || 0)), 0)
      const avg = ratedW > 0 ? (wSum / ratedW).toFixed(2) : 'N/A'
      const pct = empInQ.length > 0 ? `${Math.round((empRated.length / empInQ.length) * 100)}%` : '0%'
      return [q, label, empInQ.length.toString(), empRated.length.toString(), pct, avg]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Quarter', 'Period', 'Staff with Actions', 'Staff Fully Rated', 'Rated %', 'Avg Rating (1–5)']],
      body: orgQuarterData,
      theme: 'grid',
      margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
      headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 38, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [235, 242, 252] }
    })
    yPos = (doc as any).lastAutoTable.finalY + 12

    // ==============================
    // PER-DEPARTMENT OVERVIEW TABLES
    // ==============================
    doc.addPage()
    yPos = 20

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Department Overviews', LEFT_MARGIN, yPos)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 60, yPos + 1.5)
    yPos += 10

    for (const dept of departmentData) {
      // Each dept overview table: same format as org overview
      const deptCompletionRate = dept.userCount > 0 ? Math.round((dept.approved / dept.userCount) * 100) : 0

      // Check if table fits on current page (approx 55mm per table)
      if (yPos + 60 > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }

      // Department name as sub-heading
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK_BLUE)
      doc.text(dept.name, LEFT_MARGIN, yPos)
      doc.setDrawColor(...GOLD)
      doc.setLineWidth(0.5)
      doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + Math.min(dept.name.length * 2.2, contentWidth), yPos + 1.5)
      yPos += 6

      // Count dept total staff (including those without agreements)
      const deptTotalStaff = dedupedUsers.filter(u =>
        (u.department?.name || (u as any).departmentName || 'Unknown') === dept.name
      ).length
      const deptWithoutAgreements = deptTotalStaff - dept.userCount

      const deptOverviewData = [
        ['Total Staff (Department)', deptTotalStaff.toString()],
        ['Staff with Agreements', dept.userCount.toString()],
        ['Staff without Agreements', deptWithoutAgreements.toString()],
        ['Complete (All Agreements Approved)', dept.approved.toString()],
        ['Incomplete (Pending Approval)', dept.pending.toString()],
        ['Staff Rated', dept.rated.toString()],
        ['Overdue Agreements', dept.overdue.toString()],
        ['Completion Rate', `${deptCompletionRate}%`],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: deptOverviewData,
        theme: 'grid',
        margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
        headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.6 },
          1: { cellWidth: contentWidth * 0.4, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [240, 245, 250] }
      })
      yPos = (doc as any).lastAutoTable.finalY + 4

      // Dept quarterly breakdown
      const deptUserIds = new Set(
        dedupedUsers.filter(u => (u.department?.name || (u as any).departmentName || 'Unknown') === dept.name).map(u => u.id)
      )
      // Dept quarterly — person-level counts
      const deptUserIdsArr = Array.from(deptUserIds)
      const deptQData = quarterDefs.map(({ q, months, label }) => {
        const empInQ = deptUserIdsArr.filter(uid => {
          const uas = getAllAgreementsForUser(uid)
          return uas.some(a => { const dd = (a as any).dueDate; return dd && months.includes(new Date(dd).getMonth() + 1) })
        })
        const empRated = empInQ.filter(uid => {
          const uas = getAllAgreementsForUser(uid).filter(a => { const dd = (a as any).dueDate; return dd && months.includes(new Date(dd).getMonth() + 1) })
          return uas.length > 0 && uas.every(a => (a as any).rating != null && (a as any).rating > 0)
        })
        const ratedAgs = empInQ.flatMap(uid => getAllAgreementsForUser(uid).filter(a => {
          const dd = (a as any).dueDate
          return dd && months.includes(new Date(dd).getMonth() + 1) && (a as any).rating != null && (a as any).rating > 0
        }))
        const ratedW = ratedAgs.reduce((s, a) => s + ((a as any).weight || 0), 0)
        const wSum = ratedAgs.reduce((s, a) => s + (((a as any).rating || 0) * ((a as any).weight || 0)), 0)
        const avg = ratedW > 0 ? (wSum / ratedW).toFixed(2) : 'N/A'
        const pct = empInQ.length > 0 ? `${Math.round((empRated.length / empInQ.length) * 100)}%` : '0%'
        return [q, label, empInQ.length.toString(), empRated.length.toString(), pct, avg]
      })
      if (deptQData.some(r => parseInt(r[2]) > 0)) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...DARK_BLUE)
        doc.text('Quarterly Breakdown (Staff)', LEFT_MARGIN, yPos + 3)
        yPos += 5
        autoTable(doc, {
          startY: yPos,
          head: [['Q', 'Period', 'Staff w/ Actions', 'Fully Rated', 'Rated %', 'Avg Rating']],
          body: deptQData,
          theme: 'grid',
          margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
          headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 30 },
            2: { cellWidth: 32, halign: 'center' },
            3: { cellWidth: 26, halign: 'center' },
            4: { cellWidth: 24, halign: 'center' },
            5: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
          },
          alternateRowStyles: { fillColor: [235, 242, 252] }
        })
        yPos = (doc as any).lastAutoTable.finalY + 10
      } else {
        yPos = (doc as any).lastAutoTable.finalY + 10
      }
    }

    // ==============================
    // BUILD INDIVIDUAL RATING RECORDS
    // ==============================
    // Build a rated record for every canonical user who has at least one approved agreement
    const individualRatings = dedupedUsers
      .filter(u => getAllAgreementsForUser(u.id).some(a => a.approvalStatus === 'APPROVED'))
      .map(u => {
        const rating = calculateUserFinalRating(u.id)
        const ratingPct = Math.round((rating / 5) * 100)
        const deptName = u.department?.name || (u as any).departmentName || 'Unknown'
        const userAgs = getAllAgreementsForUser(u.id)
        const allApproved = userAgs.length > 0 && userAgs.every(a => a.approvalStatus === 'APPROVED')
        return {
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          jobTitle: u.jobTitle || u.position || '—',
          department: deptName,
          rating: Math.round(rating * 100) / 100,
          ratingPct,
          status: allApproved ? 'Complete' : 'Pending',
        }
      })
      .sort((a, b) => b.ratingPct - a.ratingPct)

    // ==============================
    // ORG-WIDE RATING COMPARISON TABLE
    // ==============================
    doc.addPage()
    yPos = 20

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Organisation-Wide Rating Comparison', LEFT_MARGIN, yPos)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 95, yPos + 1.5)
    yPos += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(`Top 5 staff with approved agreements, ranked by rating (highest to lowest). Period: ${activePeriod?.name || 'N/A'}`, LEFT_MARGIN, yPos)
    yPos += 6

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Name', 'Job Title', 'Department', 'Rating (/5)', 'Score (%)', 'Status']],
      body: individualRatings.slice(0, 5).map((r, i) => [
        (i + 1).toString(),
        r.name,
        r.jobTitle,
        r.department,
        r.rating.toFixed(2),
        `${r.ratingPct}%`,
        r.status,
      ]),
      theme: 'grid',
      margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
      headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 55 },
        3: { cellWidth: 55 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [240, 245, 250] },
      didParseCell: (data: any) => {
        if (data.column.index === 6 && data.section === 'body') {
          const val = data.cell.raw as string
          if (val === 'Complete') data.cell.styles.textColor = [22, 163, 74]
          else data.cell.styles.textColor = [234, 88, 12]
        }
      }
    })

    // ==============================
    // PER-DEPARTMENT RATING COMPARISON TABLES
    // ==============================
    // Group unique departments from rated users, preserve sort order by avg rating desc
    const deptRatingMap = new Map<string, typeof individualRatings>()
    individualRatings.forEach(r => {
      if (!deptRatingMap.has(r.department)) deptRatingMap.set(r.department, [])
      deptRatingMap.get(r.department)!.push(r)
    })

    // Sort departments by their average rating desc
    const deptsSorted = Array.from(deptRatingMap.entries())
      .map(([name, members]) => ({
        name,
        members, // already sorted highest first
        avgRating: members.length > 0
          ? Math.round((members.reduce((s, m) => s + m.ratingPct, 0) / members.length) * 10) / 10
          : 0,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)

    doc.addPage()
    yPos = 20

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK_BLUE)
    doc.text('Department-Level Rating Comparison', LEFT_MARGIN, yPos)
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.8)
    doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 90, yPos + 1.5)
    yPos += 7

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Each department listed with staff ranked by rating (highest to lowest). Departments ordered by average rating.', LEFT_MARGIN, yPos)
    yPos += 8

    for (const dept of deptsSorted) {
      if (yPos + 35 > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }

      // Department heading with avg rating
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK_BLUE)
      doc.text(`${dept.name}`, LEFT_MARGIN, yPos)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Avg Rating: ${dept.avgRating}%  |  ${dept.members.length} staff rated`, LEFT_MARGIN + Math.min(dept.name.length * 2.2 + 5, contentWidth - 60), yPos)
      doc.setDrawColor(...GOLD)
      doc.setLineWidth(0.5)
      doc.line(LEFT_MARGIN, yPos + 1.5, pageWidth - RIGHT_MARGIN, yPos + 1.5)
      yPos += 6

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Name', 'Job Title', 'Rating (/5)', 'Score (%)', 'Status']],
        body: dept.members.map((m, i) => [
          (i + 1).toString(),
          m.name,
          m.jobTitle,
          m.rating.toFixed(2),
          `${m.ratingPct}%`,
          m.status,
        ]),
        theme: 'grid',
        margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
        headStyles: { fillColor: [30, 70, 130], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65 },
          2: { cellWidth: 80 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [240, 245, 250] },
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.section === 'body') {
            const val = data.cell.raw as string
            if (val === 'Complete') data.cell.styles.textColor = [22, 163, 74]
            else data.cell.styles.textColor = [234, 88, 12]
          }
        }
      })

      yPos = (doc as any).lastAutoTable.finalY + 10
    }

    // ==============================
    // 360-DEGREE ANALYSIS SECTION
    // ==============================
    try {
      // --- helpers (same logic as org-breakdown route) ---
      const parseCompScores360 = (s: string | null | undefined): Record<string, number> => {
        if (!s) return {}
        try { return (JSON.parse(s) as any)?.scores || {} } catch { return {} }
      }
      const getRatingLevel360 = (score: number | null): string => {
        if (score === null) return 'No Data'
        if (score >= 4.5) return 'Outstanding'
        if (score >= 4.0) return 'Excellent'
        if (score >= 3.5) return 'Very Good'
        if (score >= 3.0) return 'Good'
        if (score >= 2.5) return 'Satisfactory'
        if (score >= 2.0) return 'Needs Improvement'
        return 'Unacceptable'
      }

      // --- collect competency scores from all three sources ---
      const compMap360: Record<string, { scores: number[]; label: string }> = {}
      const addScore360 = (label: string, score: number) => {
        if (!compMap360[label]) compMap360[label] = { scores: [], label }
        compMap360[label].scores.push(score)
      }

      // Source 1: QuestionnaireResponse
      try {
        const allResponses = await (prisma as any).questionnaireResponse.findMany({
          include: { QuestionnaireQuestion: { include: { QuestionnaireSubsection: true } } }
        })
        allResponses.forEach((resp: any) => {
          const label = resp.QuestionnaireQuestion?.QuestionnaireSubsection?.institutionalValue
            || resp.QuestionnaireQuestion?.QuestionnaireSubsection?.title || 'General'
          if (resp.rating != null) addScore360(label, Number(resp.rating))
        })
      } catch (_e) { /* table may not exist */ }

      // Source 2: Rating360Answer
      try {
        const allAnswers = await (prisma as any).rating360Answer.findMany({ include: { question: true } })
        allAnswers.forEach((ans: any) => {
          const label = ans.question?.category || 'General'
          if (ans.rating != null) addScore360(label, Number(ans.rating))
        })
      } catch (_e) { /* table may not exist */ }

      // Source 3: rating360 selfComments / supervisorComments / peerRatings (primary path)
      const allRating360 = await prisma.rating360.findMany({
        where: { user: { status: 'ACTIVE' } } as any,
        select: {
          selfRating: true, selfComments: true,
          supervisorRating: true, supervisorComments: true,
          peerRatings: { select: { comments: true, rating: true } }
        }
      })
      allRating360.forEach((r: any) => {
        if (r.selfRating != null)
          Object.entries(parseCompScores360(r.selfComments)).forEach(([c, s]) => addScore360(c, s as number))
        if (r.supervisorRating != null)
          Object.entries(parseCompScores360(r.supervisorComments)).forEach(([c, s]) => addScore360(c, s as number))
        r.peerRatings?.forEach((p: any) => {
          if (p.rating != null)
            Object.entries(parseCompScores360(p.comments)).forEach(([c, s]) => addScore360(c, s as number))
        })
      })

      const competencies360 = Object.values(compMap360)
        .map(c => {
          const avg = c.scores.length > 0
            ? Math.round((c.scores.reduce((a, b) => a + b, 0) / c.scores.length) * 100) / 100 : null
          return { competency: c.label, averageScore: avg, responseCount: c.scores.length, ratingLevel: getRatingLevel360(avg) }
        })
        .filter(c => c.responseCount > 0)
        .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))

      const allScores360 = Object.values(compMap360).flatMap(c => c.scores)
      const orgAverage360 = allScores360.length > 0
        ? Math.round((allScores360.reduce((a, b) => a + b, 0) / allScores360.length) * 100) / 100 : null

      const totalRatings360 = await (prisma as any).rating360.count({ where: { user: { status: 'ACTIVE' } } })
      const completedRatings360 = await (prisma as any).rating360.count({ where: { user: { status: 'ACTIVE' }, status: 'COMPLETED' } })
      const inProgressRatings360 = await (prisma as any).rating360.count({ where: { user: { status: 'ACTIVE' }, status: 'IN_PROGRESS' } })
      const ratedEmployees360 = await (prisma as any).rating360.count({
        where: { user: { status: 'ACTIVE' }, OR: [{ selfRating: { not: null } }, { supervisorRating: { not: null } }] }
      })
      const participationPct = totalStaff > 0 ? Math.round((ratedEmployees360 / totalStaff) * 100) : 0

      if (competencies360.length > 0 || orgAverage360 !== null) {
        doc.addPage()
        yPos = 20

        // Section header
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...DARK_BLUE)
        doc.text('360-Degree Behavioural Competency Analysis', LEFT_MARGIN, yPos)
        doc.setDrawColor(...GOLD)
        doc.setLineWidth(0.8)
        doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 110, yPos + 1.5)
        yPos += 7

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 80)
        doc.text(
          'Organisation-wide 360-degree rating across NSA Institutional Values / Behavioural Competencies.',
          LEFT_MARGIN, yPos
        )
        yPos += 5

        // --- Overview stats row ---
        const overviewScore = orgAverage360 !== null ? `${orgAverage360.toFixed(2)} / 5` : 'No Data'
        const overviewLevel = getRatingLevel360(orgAverage360)

        autoTable(doc, {
          startY: yPos,
          head: [['Org Average Score', 'Rating Level', 'Staff Participated', 'Completion Rate', 'Fully Done', 'In Progress', 'Total Responses']],
          body: [[
            overviewScore,
            overviewLevel,
            `${ratedEmployees360} / ${totalStaff} (${participationPct}%)`,
            `${participationPct}%`,
            completedRatings360.toString(),
            inProgressRatings360.toString(),
            allScores360.length.toString(),
          ]],
          theme: 'grid',
          margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
          headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
          styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: DARK_BLUE },
            1: { fontStyle: 'bold' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 1) {
              const v = data.cell.raw as string
              if (v === 'Outstanding' || v === 'Excellent') data.cell.styles.textColor = [22, 163, 74]
              else if (v === 'Very Good' || v === 'Good') data.cell.styles.textColor = [37, 99, 235]
              else if (v === 'Satisfactory') data.cell.styles.textColor = [180, 100, 0]
              else if (v === 'Needs Improvement' || v === 'Unacceptable') data.cell.styles.textColor = [220, 38, 38]
            }
          }
        })
        yPos = (doc as any).lastAutoTable.finalY + 10

        // --- Competency breakdown table ---
        if (competencies360.length > 0) {
          if (yPos + 40 > pageHeight - 20) { doc.addPage(); yPos = 20 }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...DARK_BLUE)
          doc.text('Institutional Value / Competency Breakdown', LEFT_MARGIN, yPos)
          doc.setDrawColor(...GOLD)
          doc.setLineWidth(0.5)
          doc.line(LEFT_MARGIN, yPos + 1.5, LEFT_MARGIN + 90, yPos + 1.5)
          yPos += 6

          const compBody = competencies360.map((c, i) => [
            (i + 1).toString(),
            c.competency,
            c.averageScore !== null ? `${c.averageScore.toFixed(2)} / 5` : 'No Data',
            c.ratingLevel,
            c.responseCount.toString(),
          ])

          // Totals / averages row
          const totalResponses = competencies360.reduce((s, c) => s + c.responseCount, 0)
          const validScores = competencies360.filter(c => c.averageScore !== null)
          const overallAvg = validScores.length > 0
            ? (validScores.reduce((s, c) => s + (c.averageScore ?? 0), 0) / validScores.length).toFixed(2)
            : 'N/A'
          compBody.push(['', 'OVERALL AVERAGE', `${overallAvg} / 5`, getRatingLevel360(overallAvg !== 'N/A' ? parseFloat(overallAvg) : null), `${totalResponses} total`])

          autoTable(doc, {
            startY: yPos,
            head: [['#', 'Institutional Value / Competency', 'Average Score', 'Rating Level', 'Responses']],
            body: compBody,
            theme: 'grid',
            margin: { left: LEFT_MARGIN, right: RIGHT_MARGIN },
            headStyles: { fillColor: DARK_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 12, halign: 'center' },
              1: { cellWidth: contentWidth * 0.42 },
              2: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
              3: { cellWidth: 42, halign: 'center' },
              4: { cellWidth: 30, halign: 'center' },
            },
            alternateRowStyles: { fillColor: [235, 242, 255] },
            didParseCell: (data: any) => {
              if (data.section === 'body') {
                // Colour the rating level column
                if (data.column.index === 3) {
                  const v = data.cell.raw as string
                  if (v === 'Outstanding' || v === 'Excellent') { data.cell.styles.textColor = [22, 163, 74]; data.cell.styles.fontStyle = 'bold' }
                  else if (v === 'Very Good' || v === 'Good') { data.cell.styles.textColor = [37, 99, 235]; data.cell.styles.fontStyle = 'bold' }
                  else if (v === 'Satisfactory') data.cell.styles.textColor = [180, 100, 0]
                  else if (v === 'Needs Improvement' || v === 'Unacceptable') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold' }
                }
                // Highlight totals row
                if (data.row.index === compBody.length - 1) {
                  data.cell.styles.fillColor = DARK_BLUE
                  data.cell.styles.textColor = [255, 255, 255]
                  data.cell.styles.fontStyle = 'bold'
                }
              }
            }
          })
          yPos = (doc as any).lastAutoTable.finalY + 8

          // Caption
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(120, 120, 120)
          doc.text(
            `${allScores360.length} total responses across ${competencies360.length} competency/value area(s). Data sourced from NSA 360° Rating System.`,
            LEFT_MARGIN, yPos
          )
          yPos += 6
        }
      }
    } catch (err360) {
      console.error('[export] 360 section skipped due to error:', err360)
    }

    // ==============================
    // FOOTER + STAMP on all pages
    // ==============================
    const totalPages = (doc as any).internal.getNumberOfPages()

    // Load stamp image once
    let stampBase64: string | null = null
    try {
      const stampPath = path.join(process.cwd(), 'public', 'nored-stamp.png')
      const stampBuffer = fs.readFileSync(stampPath)
      stampBase64 = stampBuffer.toString('base64')
    } catch (e) {
      stampBase64 = null
    }

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const pgW = doc.internal.pageSize.getWidth()
      const pgH = doc.internal.pageSize.getHeight()

      // Stamp image: right side, above footer
      if (stampBase64) {
        const stampW = 70
        const stampH = 68
        const stampX = pgW - RIGHT_MARGIN - stampW  // right-aligned
        const stampY = pgH - 12 - stampH - 4        // just above footer bar
        doc.addImage(`data:image/png;base64,${stampBase64}`, 'PNG', stampX, stampY, stampW, stampH)
      }

      // Dark blue footer bar
      doc.setFillColor(...DARK_BLUE)
      doc.rect(0, pgH - 12, pgW, 12, 'F')

      // Gold accent line above footer
      doc.setFillColor(...GOLD)
      doc.rect(0, pgH - 12, pgW, 0.8, 'F')

      doc.setFontSize(7)
      doc.setTextColor(200, 215, 235)
      doc.text(
        `Page ${i} of ${totalPages}`,
        LEFT_MARGIN,
        pgH - 5
      )
      doc.text(
        'Namibia Statistics Agency - Performance Management System',
        pgW - RIGHT_MARGIN,
        pgH - 5,
        { align: 'right' }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="NSA-Performance-Report-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('=== EXPORT CHART DATA ERROR ===')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error object:', error)
    return NextResponse.json({ 
      error: 'Failed to generate chart data export',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
