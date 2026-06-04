import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export async function GET(req: NextRequest) {
  console.log('[EXPORT-PDF] Route called at', new Date().toISOString())
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
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
    const department = (currentUser.department?.name || '').toLowerCase()
    const email = currentUser.email.toLowerCase()
    
    const isODSpecialist = email.includes('gmuhongo') || 
      (jobTitle.includes('od specialist') && department.includes('human capital'))
    const isExecutive = jobTitle.includes('executive')
    const isSG = jobTitle.includes('statistician') && jobTitle.includes('general') && !jobTitle.includes('deputy')
    const isDeputySG = jobTitle.includes('deputy') && jobTitle.includes('statistician')
    const userRoles = (currentUser as any).roles?.map((r: any) => r.role?.name?.toUpperCase() || '') || []
    const isAdmin = userRoles.some((r: string) => r.includes('ADMIN'))

    if (!isExecutive && !isSG && !isDeputySG && !isAdmin && !isODSpecialist) {
      return NextResponse.json({ error: 'Access denied. Only executives, system admins, and OD specialists can export dashboard reports.' }, { status: 403 })
    }

    // Fetch dashboard statistics
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    })

    // Get all users with department info
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        position: true,
        departmentName: true,
        divisionName: true,
        department: { select: { id: true, name: true } }
      }
    })

    // Fetch active 360 cycle for filtering
    const activeCycleRecord = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      select: { id: true }
    }).catch(() => null)
    const activeCycleId = (activeCycleRecord as any)?.id

    // Get all performance agreements (non-container)
    const allAgreements = await prisma.performanceAgreement.findMany({
      where: {
        isAdhocContainer: false,
        ...(activePeriod?.id ? { performancePeriodId: activePeriod.id } : {})
      },
      select: {
        id: true,
        userId: true,
        approvalStatus: true,
        rating: true,
        weight: true,
        dueDate: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            departmentName: true,
            department: { select: { name: true } }
          }
        }
      }
    })

    // Fetch adhoc tasks + 360 ratings + user weights for full rating formula
    const [allAdhocTasksForRating, allUserWeightsForRating, allRating360Records] = await Promise.all([
      prisma.adhocTask.findMany({
        where: { approvalStatus: 'APPROVED' },
        select: { id: true, assignedToId: true, status: true }
      }),
      prisma.userTaskWeight.findMany({
        select: { userId: true, periodId: true, categories: true }
      }).catch(() => [] as any[]),
      prisma.rating360.findMany({
        where: activeCycleId ? { cycleId: activeCycleId } : {},
        select: { userId: true, selfRating: true, supervisorRating: true, averageRating: true }
      })
    ])

    // Person-level completion: a person is "complete" only when ALL their agreements are approved
    const totalStaff = allUsers.length
    const usersWithAgreements = allUsers.filter(u => allAgreements.some(a => a.userId === u.id))
    const completeUsers = allUsers.filter(u => {
      const userAgreements = allAgreements.filter(a => a.userId === u.id)
      return userAgreements.length > 0 && userAgreements.every(a => a.approvalStatus === 'APPROVED')
    })
    const incompleteUsers = allUsers.filter(u => !completeUsers.find(c => c.id === u.id))
    const completeCount = completeUsers.length
    const incompleteCount = incompleteUsers.length

    const ratedAgreements = allAgreements.filter(a => a.rating && a.rating > 0)
    
    // Calculate average rating
    let totalRatingSum = 0
    let totalRatingWeight = 0
    ratedAgreements.forEach(agreement => {
      if (agreement.rating && agreement.weight) {
        totalRatingSum += agreement.rating * agreement.weight
        totalRatingWeight += agreement.weight
      }
    })
    const averageRating = totalRatingWeight > 0 ? (totalRatingSum / totalRatingWeight).toFixed(2) : '0.00'

    // Group by department — person-level stats
    const departmentStatsMap = new Map<string, {
      name: string
      staffCount: number
      completeCount: number
      incompleteCount: number
      ratingSum: number
      ratingWeight: number
    }>()

    // Build dept map from all users
    allUsers.forEach(u => {
      const deptName = (u as any).departmentName || u.department?.name || 'Unknown'
      if (!departmentStatsMap.has(deptName)) {
        departmentStatsMap.set(deptName, { name: deptName, staffCount: 0, completeCount: 0, incompleteCount: 0, ratingSum: 0, ratingWeight: 0 })
      }
      const dept = departmentStatsMap.get(deptName)!
      dept.staffCount++
      const userAgreements = allAgreements.filter(a => a.userId === u.id)
      const isComplete = userAgreements.length > 0 && userAgreements.every(a => a.approvalStatus === 'APPROVED')
      if (isComplete) dept.completeCount++
      else dept.incompleteCount++
      userAgreements.forEach(a => {
        if (a.rating && a.rating > 0 && a.weight) {
          dept.ratingSum += a.rating * a.weight
          dept.ratingWeight += a.weight
        }
      })
    })

    // Generate PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPos = 20

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 128, 185)
    doc.text('Performance Management Dashboard Report', pageWidth / 2, yPos, { align: 'center' })
    
    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, pageWidth / 2, yPos, { align: 'center' })
    doc.text(`Report Period: ${activePeriod?.name || 'N/A'}`, pageWidth / 2, yPos + 5, { align: 'center' })
    
    yPos += 15
    doc.setTextColor(0)

    // Organization Overview Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 128, 185)
    doc.text('Organization Overview', 20, yPos)
    yPos += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)

    const overviewData = [
      ['Total Staff', totalStaff.toString()],
      ['Staff with Agreements', usersWithAgreements.length.toString()],
      ['Complete (All Actions Approved)', completeCount.toString()],
      ['Incomplete (Pending Approval)', incompleteCount.toString()],
      ['Completion Rate', totalStaff > 0 ? `${Math.round((completeCount / totalStaff) * 100)}%` : '0%'],
      ['Average Rating (1-5)', averageRating],
    ]

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Metric', 'Value']],
      body: overviewData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Department Performance Section
    if (yPos + 60 > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 128, 185)
    doc.text('Department Performance', 20, yPos)
    yPos += 8

    const deptData = Array.from(departmentStatsMap.values())
      .sort((a, b) => b.completeCount - a.completeCount)
      .map(dept => [
        dept.name,
        dept.staffCount.toString(),
        dept.completeCount.toString(),
        dept.incompleteCount.toString(),
        dept.staffCount > 0 ? `${Math.round((dept.completeCount / dept.staffCount) * 100)}%` : '0%',
        dept.ratingWeight > 0 ? (dept.ratingSum / dept.ratingWeight).toFixed(2) : 'N/A'
      ])

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Department', 'Staff', 'Complete', 'Incomplete', 'Rate', 'Avg Rating']],
      body: deptData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Quarterly Ratings Breakdown Section
    if (yPos + 60 > pageHeight - 20) { doc.addPage(); yPos = 20 }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(41, 128, 185)
    doc.text('Quarterly Ratings Breakdown (Financial Year: Q1 = Apr)', 20, yPos)
    yPos += 8

    const quarterDefs = [
      { q: 'Q1', months: [4,5,6], label: 'Apr \u2013 Jun' },
      { q: 'Q2', months: [7,8,9], label: 'Jul \u2013 Sep' },
      { q: 'Q3', months: [10,11,12], label: 'Oct \u2013 Dec' },
      { q: 'Q4', months: [1,2,3], label: 'Jan \u2013 Mar' },
    ]

    const quarterData = quarterDefs.map(({ q, months, label }) => {
      const inQ = allAgreements.filter(a => {
        if (!a.dueDate) return false
        const m = new Date(a.dueDate).getMonth() + 1
        return months.includes(m)
      })
      const rated = inQ.filter(a => a.rating && a.rating > 0)
      const totalW = inQ.reduce((s, a) => s + (a.weight || 0), 0)
      const ratedW = rated.reduce((s, a) => s + (a.weight || 0), 0)
      const wSum = rated.reduce((s, a) => s + ((a.rating || 0) * (a.weight || 0)), 0)
      const avg = ratedW > 0 ? (wSum / ratedW).toFixed(2) : 'N/A'
      const pct = inQ.length > 0 ? `${Math.round((rated.length / inQ.length) * 100)}%` : '0%'
      return [q, label, inQ.length.toString(), rated.length.toString(), pct, `${totalW}%`, avg]
    })

    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Quarter', 'Period', 'Total Actions', 'Rated', 'Rated %', 'Total Weight', 'Avg Rating']],
      body: quarterData,
      theme: 'grid',
      headStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 28 },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // ── Full 5-component rating formula (matches dashboard stats route) ──────
    const defaultPerfWeight = 75
    const default360Weight = 25
    const defaultAdhocWeight = 0
    const allApprovedAgreements = allAgreements.filter((a: any) => a.approvalStatus === 'APPROVED')

    // Build userId → user map for Top Performers lookup
    const userMap = new Map<string, any>()
    allUsers.forEach(u => userMap.set(u.id, u))

    // Build 360 rating map per user
    const rating360ByUserId = new Map<string, number>()
    ;(allRating360Records as any[]).forEach((r: any) => {
      if (r.averageRating != null) rating360ByUserId.set(r.userId, Number(r.averageRating))
      else if (r.selfRating != null) rating360ByUserId.set(r.userId, Number(r.selfRating))
    })

    // Bi-annual half determination (same as stats route)
    const _nowMonth = new Date().getUTCMonth() + 1
    const _H1_PERF_MONTHS = [4, 5, 6, 7, 8, 9]
    const _H2_PERF_MONTHS = [10, 11, 12, 1, 2, 3]
    const _isH1RatingWindow = _H2_PERF_MONTHS.includes(_nowMonth)
    const _activeHalfMonths = _isH1RatingWindow ? _H1_PERF_MONTHS : _H2_PERF_MONTHS

    const calcFinalRating = (userId: string): number => {
      let perfWeight = defaultPerfWeight
      let adhocW = defaultAdhocWeight
      let w360 = default360Weight

      const userWeight = (allUserWeightsForRating as any[]).find((w: any) =>
        w.userId === userId && (w.periodId === activePeriod?.id || w.periodId === null)
      )
      if (userWeight) {
        try {
          const cats = JSON.parse(userWeight.categories) as { id: string; weight: number }[]
          const getW = (id: string) => cats.find(c => c.id === id)?.weight ?? 0
          const rawPerf = getW('perf'), rawAdhoc = getW('adhoc'), rawRisk = getW('risk')
          const rawProject = getW('project'), rawAudit = getW('audit'), raw360 = getW('rating360')
          const rawTotal = rawPerf + rawAdhoc + rawRisk + rawProject + rawAudit + raw360
          const scale = rawTotal > 0 ? 100 / rawTotal : 0
          perfWeight = Math.round(rawPerf * scale * 100) / 100
          adhocW = Math.round(rawAdhoc * scale * 100) / 100
          w360 = Math.round(raw360 * scale * 100) / 100
        } catch (_e) { /* use defaults */ }
      }

      const userAgreements = allApprovedAgreements.filter((a: any) => {
        if (a.userId !== userId) return false
        if (!a.dueDate) return false
        const m = new Date(a.dueDate).getUTCMonth() + 1
        if (_activeHalfMonths.includes(m)) return true
        if (_isH1RatingWindow && a.rating != null && a.rating > 0) return true
        return false
      })
      let perfTotalScore = 0, perfTotalWeight = 0
      userAgreements.forEach((a: any) => {
        if (a.weight) {
          perfTotalWeight += a.weight
          if (a.rating) perfTotalScore += a.rating * a.weight
        }
      })
      const perfRating = perfTotalWeight > 0 ? perfTotalScore / perfTotalWeight : 0

      const userAdhoc = (allAdhocTasksForRating as any[]).filter((t: any) => t.assignedToId === userId)
      const adhocRate = userAdhoc.length > 0 ? userAdhoc.filter((t: any) => t.status === 'COMPLETED').length / userAdhoc.length : 0
      const adhocRating = adhocRate * 5

      const r360 = rating360ByUserId.get(userId) ?? 0

      return ((perfRating * perfWeight) + (adhocRating * adhocW) + (r360 * w360)) / 100
    }

    // Top Performers Section
    if (allApprovedAgreements.length > 0) {
      if (yPos + 60 > pageHeight - 20) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Top Performers (By Overall Performance Score)', 20, yPos)
      yPos += 5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(`Period: ${activePeriod?.name || 'Active Period'}  |  Ranked by final weighted score (PA ${defaultPerfWeight}% + 360° ${default360Weight}%)`, 20, yPos)
      doc.setTextColor(0)
      yPos += 8

      // Get all unique userIds with approved agreements
      const allUserIdsForRanking = [...new Set([
        ...allApprovedAgreements.map((a: any) => a.userId),
        ...(allRating360Records as any[]).filter((r: any) => r.averageRating != null || r.selfRating != null).map((r: any) => r.userId)
      ])]

      const topPerformers = allUserIdsForRanking
        .map((userId: any) => {
          const u = userMap.get(userId)
          const finalRating = calcFinalRating(userId)
          const pct = Math.round(finalRating * 20) // /5 * 100
          return {
            name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Unknown',
            jobTitle: u?.jobTitle || '',
            department: u?.department?.name || u?.departmentName || 'Unknown',
            finalRating,
            pct
          }
        })
        .filter(p => p.finalRating > 0)
        .sort((a, b) => b.finalRating - a.finalRating)
        .slice(0, 10)
        .map((p, i) => [
          (i + 1).toString(),
          p.name,
          p.jobTitle,
          p.department,
          p.finalRating.toFixed(2),
          `${p.pct}%`
        ])

      ;(doc as any).autoTable({
        startY: yPos,
        head: [['Rank', 'Employee', 'Job Title', 'Department', 'Rating (/5)', 'Score (%)']],
        body: topPerformers,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 45 },
          4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
        }
      })
      yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // ── 360-Degree Performance Feedback Report ──────────────────────────────────
    // Fetch competency scores inline (same logic as org-breakdown route)
    const parseCompScores360 = (s: string | null | undefined): Record<string, number> => {
      if (!s) return {}
      try { return (JSON.parse(s) as any)?.scores || {} } catch { return {} }
    }
    const compMap: Record<string, number[]> = {}
    const addScore360 = (label: string, score: number) => {
      if (!compMap[label]) compMap[label] = []
      compMap[label].push(score)
    }
    try {
      const allAnswers = await prisma.rating360Answer.findMany({ include: { question: true } })
      allAnswers.forEach((ans: any) => {
        const label = ans.question?.category || 'General'
        if (ans.rating != null) addScore360(label, Number(ans.rating))
      })
    } catch (_e) { /* table may not exist */ }
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
    const allRating360 = await prisma.rating360.findMany({
      where: { user: { status: 'ACTIVE' } },
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

    // Normalise competency labels so slight spelling variants (e.g. Customer-focussed vs Customer-focused) merge
    const normaliseLabel = (l: string) => l.trim().toLowerCase().replace(/[-_\s]+/g, ' ').replace(/focuss?ed/, 'customer-focussed')
    // Re-bucket using the dashboard's canonical label set when available
    const CANONICAL_LABELS: Record<string, string> = {
      'partnership': 'Partnership',
      'accountability': 'Accountability',
      'integrity': 'Integrity',
      'excellent performance': 'Excellent Performance',
      'customer-focussed': 'Customer-focussed',
      'customer focused': 'Customer-focussed',
      'customer-focused': 'Customer-focussed',
      'professionalism': 'Professionalism',
    }
    const canonicalCompMap: Record<string, number[]> = {}
    Object.entries(compMap).forEach(([rawLabel, scores]) => {
      const norm = normaliseLabel(rawLabel)
      const canonical = CANONICAL_LABELS[norm] || rawLabel
      if (!canonicalCompMap[canonical]) canonicalCompMap[canonical] = []
      canonicalCompMap[canonical].push(...scores)
    })

    // Build sorted competency list
    const competencies360 = Object.entries(canonicalCompMap)
      .filter(([, scores]) => scores.length > 0)
      .map(([label, scores]) => {
        const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        return { label, avg, count: scores.length }
      })
      .sort((a, b) => b.avg - a.avg)

    const allOrgScores = Object.values(canonicalCompMap).flat()
    const orgAvg360 = allOrgScores.length > 0
      ? Math.round((allOrgScores.reduce((a, b) => a + b, 0) / allOrgScores.length) * 100) / 100
      : null

    console.log('[PDF 360 DEBUG] competencies360:', competencies360.map(c => ({ label: c.label, avg: c.avg, count: c.count })))
    console.log('[PDF 360 DEBUG] orgAvg360:', orgAvg360, 'totalScores:', allOrgScores.length)

    const getRatingInterpretation = (r: number | null) => {
      if (r === null) return 'No Data'
      if (r >= 4.5) return 'Excellent Performance'
      if (r >= 3.5) return 'Exceeds Expectations'
      if (r >= 2.5) return 'Meets Expectations'
      if (r >= 1.5) return 'Below Expected Standard'
      return 'Unsatisfactory Performance'
    }

    const sectionBlue: [number, number, number] = [0, 51, 102]
    const sectionGreen: [number, number, number] = [21, 128, 61]
    const sectionOrange: [number, number, number] = [180, 83, 9]
    const sectionPurple: [number, number, number] = [88, 28, 135]
    const sectionTeal: [number, number, number] = [15, 118, 110]

    const checkPage = (neededHeight: number) => {
      if (yPos + neededHeight > pageHeight - 20) { doc.addPage(); yPos = 20 }
    }

    const drawSectionHeading = (title: string, color: [number, number, number]) => {
      checkPage(16)
      doc.setFillColor(...color)
      doc.rect(14, yPos - 4, pageWidth - 28, 10, 'F')
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(title, 17, yPos + 3)
      doc.setTextColor(0, 0, 0)
      yPos += 12
    }

    const drawSubHeading = (title: string) => {
      checkPage(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60, 60, 60)
      doc.text(title, 20, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
    }

    const drawWrappedText = (text: string, x: number, maxWidth: number, lineHeight: number) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const lines = doc.splitTextToSize(text, maxWidth)
      lines.forEach((line: string) => {
        checkPage(lineHeight)
        doc.text(line, x, yPos)
        yPos += lineHeight
      })
    }

    // ── Page break: start 360 report on new page ──
    try {
      doc.addPage()
      yPos = 20

    // Report title banner
    doc.setFillColor(0, 51, 102)
    doc.rect(0, 0, pageWidth, 16, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('360-Degree Performance Feedback Report', pageWidth / 2, 10, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Namibia Statistics Agency  |  ${activePeriod?.name || 'Active Period'}  |  Organisation-Wide`, pageWidth / 2, 15, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    yPos = 26

    // ─── Section 1: Overall Performance Insight ─────────────────────────────
    drawSectionHeading('1. Overall Performance Insight', sectionBlue)

    // Rating interpretation table
    drawSubHeading('Final Rating Interpretation')
    const interpTableBody = [
      ['1', 'Unsatisfactory Performance'],
      ['2', 'Below Expected Standard'],
      ['3', 'Meets Expectations'],
      ['4', 'Exceeds Expectations'],
      ['5', 'Excellent Performance'],
    ]
    checkPage(45)
    ;(doc as any).autoTable({
      startY: yPos,
      head: [['Rating', 'Interpretation']],
      body: interpTableBody,
      theme: 'grid',
      headStyles: { fillColor: sectionBlue, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 120 } },
      margin: { left: 20, right: 20 }
    })
    yPos = (doc as any).lastAutoTable.finalY + 6

    // Org average score callout
    checkPage(18)
    doc.setFillColor(240, 244, 255)
    doc.roundedRect(20, yPos, pageWidth - 40, 14, 2, 2, 'FD')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 51, 102)
    const orgScoreLabel = orgAvg360 !== null
      ? `Organisation Average 360° Score: ${orgAvg360.toFixed(2)} / 5.00  —  ${getRatingInterpretation(orgAvg360)}`
      : 'Organisation Average 360° Score: No Data Available'
    doc.text(orgScoreLabel, pageWidth / 2, yPos + 9, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    yPos += 20

    // Narrative
    drawSubHeading('Narrative')
    const narrative = orgAvg360 !== null
      ? `The results of the 360-degree assessment indicate that the organisation's overall performance meets organisational expectations, with an average score of ${orgAvg360.toFixed(2)} out of 5.00. Several competency areas demonstrate strong collective capability across the organisation. Staff contribute positively to the work environment and generally perform their responsibilities reliably. Strengthening certain competencies will further enhance overall effectiveness and contribution to the organisation's mandate.`
      : 'Insufficient 360-degree assessment data is currently available to generate a complete narrative. Please ensure that self-assessments and supervisor ratings have been completed for the active performance cycle.'
    drawWrappedText(narrative, 20, pageWidth - 40, 5)
    yPos += 4

    // ─── Section 2: Strengths Summary ───────────────────────────────────────
    drawSectionHeading('2. Strengths Summary', sectionGreen)
    drawWrappedText(
      'This section highlights areas where the organisation\'s performance exceeds expectations or demonstrates strong collective capability.',
      20, pageWidth - 40, 5
    )
    yPos += 2
    drawSubHeading('Based on the assessment results, the following areas have been identified as key strengths:')

    const strengths = competencies360.filter(c => c.avg >= 3.5)
    if (strengths.length > 0) {
      // List strengths as bullets with inline feedback
      const strengthFeedback: Record<string, string> = {
        'Partnership': 'Staff collaborate effectively with colleagues and stakeholders and contribute positively to team objectives.',
        'Accountability': 'Staff demonstrate strong ownership of responsibilities and consistent follow-through on commitments.',
        'Integrity': 'Staff demonstrate integrity in their work and adhere to professional and ethical standards.',
        'Excellent Performance': 'Staff generally meet or exceed the expected performance standards for their roles.',
        'Customer-focussed': 'Staff demonstrate a strong commitment to understanding and responding to stakeholder needs.',
        'Professionalism': 'Staff maintain a high standard of conduct, communication, and workplace behaviour.',
      }
      strengths.forEach(c => {
        checkPage(12)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(21, 128, 61)
        doc.text(`${c.label} (${c.avg.toFixed(2)} / 5.00)`, 22, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        yPos += 5
        const fb = strengthFeedback[c.label] || `This competency demonstrates strong collective capability across the organisation.`
        const lines = doc.splitTextToSize(`– ${fb}`, pageWidth - 50)
        lines.forEach((line: string) => { checkPage(5); doc.text(line, 26, yPos); yPos += 5 })
        yPos += 2
      })
      yPos += 2
      drawWrappedText(
        'These strengths contribute significantly to organisational performance and effectiveness. The organisation is encouraged to leverage these capabilities through continued collaboration, mentoring, and knowledge-sharing initiatives.',
        20, pageWidth - 40, 5
      )
    } else {
      drawWrappedText('No competency areas have been identified as organisational strengths at this time. Completing outstanding 360-degree assessments will enable this analysis.', 20, pageWidth - 40, 5)
    }
    yPos += 4

    // ─── Section 3: Development Areas ───────────────────────────────────────
    drawSectionHeading('3. Development Areas', sectionOrange)
    drawWrappedText(
      'This section highlights competencies where collective performance improvement or further organisational development is recommended.',
      20, pageWidth - 40, 5
    )
    yPos += 2
    drawSubHeading('The assessment results suggest that additional development may be beneficial in the following areas:')

    const devAreas = competencies360.filter(c => c.avg < 3.5).sort((a, b) => a.avg - b.avg)
    if (devAreas.length > 0) {
      const devFeedback: Record<string, string> = {
        'Partnership': 'Strengthening collaboration across departments and actively supporting team initiatives will enhance collective effectiveness.',
        'Accountability': 'Strengthening ownership of responsibilities and ensuring consistent follow-through on commitments will improve reliability and effectiveness.',
        'Integrity': 'Greater focus on ethical standards and transparent conduct is recommended. Promoting a culture of integrity at all levels will strengthen organisational trust.',
        'Excellent Performance': 'Greater focus on work planning, prioritisation, and quality of outputs will help enhance overall performance.',
        'Customer-focussed': 'Improvements in stakeholder responsiveness and service delivery are recommended. Anticipating stakeholder needs and improving service consistency will enhance the customer-focused culture.',
        'Professionalism': 'Greater attention to professional conduct, communication, and workplace behaviour is recommended.',
      }
      devAreas.forEach(c => {
        checkPage(12)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(180, 83, 9)
        doc.text(`${c.label} (${c.avg.toFixed(2)} / 5.00)`, 22, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)
        yPos += 5
        const fb = devFeedback[c.label] || `There is opportunity for improvement in ${c.label}. Targeted development initiatives will help strengthen this competency across the organisation.`
        const lines = doc.splitTextToSize(`– ${fb}`, pageWidth - 50)
        lines.forEach((line: string) => { checkPage(5); doc.text(line, 26, yPos); yPos += 5 })
        yPos += 2
      })
      yPos += 2
      drawWrappedText(
        'Addressing these areas will support continued professional growth across the organisation and improve collective contribution to organisational effectiveness.',
        20, pageWidth - 40, 5
      )
    } else {
      drawWrappedText('All competency areas currently meet or exceed expectations. No development areas have been identified at this time.', 20, pageWidth - 40, 5)
    }
    yPos += 4

    // ─── Section 4: Competency Feedback ─────────────────────────────────────
    drawSectionHeading('4. Competency Feedback', sectionPurple)
    drawWrappedText('Below is the interpretation of the organisation\'s average ratings for each competency area assessed during this performance cycle.', 20, pageWidth - 40, 5)
    yPos += 3

    // Competency definitions (rating guides + interpretation)
    const competencyDefs: Record<string, { guide: string[]; feedback: (avg: number) => string }> = {
      'Partnership': {
        guide: [
          '1 – Limited collaboration with colleagues and stakeholders',
          '2 – Inconsistent cooperation and teamwork',
          '3 – Maintains effective working relationships',
          '4 – Actively promotes collaboration and teamwork',
          '5 – Demonstrates exceptional partnership and relationship-building'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates a strong culture of collaboration. Staff generally maintain constructive working relationships and contribute positively to teamwork. Continued efforts to strengthen cross-departmental collaboration will further enhance partnership effectiveness.`
          : `The organisation's partnership score indicates opportunity for improvement. Strengthening collaboration across departments and actively supporting team initiatives will enhance collective effectiveness.`
      },
      'Accountability': {
        guide: [
          '1 – Responsibilities frequently not fulfilled',
          '2 – Inconsistent ownership of tasks and outcomes',
          '3 – Acceptable level of responsibility and reliability',
          '4 – Strong ownership and follow-through',
          '5 – Outstanding accountability and ownership of results'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates strong accountability. Staff generally fulfil their responsibilities and complete tasks as expected. Continued focus on proactive ownership and consistency of delivery will sustain this standard.`
          : `The assessment indicates areas for improvement in accountability. Strengthening consistency in follow-through and proactive ownership of responsibilities will improve organisational performance in this area.`
      },
      'Integrity': {
        guide: [
          '1 – Ethical standards not consistently demonstrated',
          '2 – Occasional concerns regarding transparency or fairness',
          '3 – Demonstrates acceptable ethical conduct',
          '4 – Strong commitment to ethical behaviour',
          '5 – Exemplary integrity and ethical leadership'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates a commendable commitment to integrity and ethical conduct. Continuing to promote transparency, fairness, and ethical decision-making will reinforce organisational trust and credibility.`
          : `The assessment suggests that greater focus on ethical standards and transparent conduct is recommended. Promoting a culture of integrity at all levels will strengthen organisational trust.`
      },
      'Excellent Performance': {
        guide: [
          '1 – Performance outcomes below required standards',
          '2 – Inconsistent quality or productivity',
          '3 – Performance meets expected standards',
          '4 – Performance exceeds normal expectations',
          '5 – Exceptional results and outstanding work quality'
        ],
        feedback: (avg) => avg >= 3.5
          ? `Organisational performance generally meets or exceeds expected standards. Continuing to focus on productivity, quality improvement, and proactive problem-solving will help achieve and sustain high performance levels.`
          : `Performance levels indicate room for improvement. Greater focus on work planning, prioritisation, and quality of outputs will help enhance overall organisational performance.`
      },
      'Customer-focussed': {
        guide: [
          '1 – Limited responsiveness to stakeholder needs',
          '2 – Inconsistent service delivery',
          '3 – Provides reliable service to stakeholders',
          '4 – Proactively responds to stakeholder needs',
          '5 – Delivers exceptional service and stakeholder engagement'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates a strong customer-focused culture. Staff provide reliable service and respond appropriately to stakeholder needs. Strengthening proactive responsiveness will further enhance service quality.`
          : `The feedback suggests that improvements in stakeholder responsiveness and service delivery are recommended. Anticipating stakeholder needs and improving service consistency will enhance the customer-focused culture.`
      },
      'Customer-Focused': {
        guide: [
          '1 – Limited responsiveness to stakeholder needs',
          '2 – Inconsistent service delivery',
          '3 – Provides reliable service to stakeholders',
          '4 – Proactively responds to stakeholder needs',
          '5 – Delivers exceptional service and stakeholder engagement'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates a strong customer-focused culture. Staff provide reliable service and respond appropriately to stakeholder needs. Strengthening proactive responsiveness will further enhance service quality.`
          : `The feedback suggests that improvements in stakeholder responsiveness and service delivery are recommended. Anticipating stakeholder needs and improving service consistency will enhance the customer-focused culture.`
      },
      'Customer Focused': {
        guide: [
          '1 – Limited responsiveness to stakeholder needs',
          '2 – Inconsistent service delivery',
          '3 – Provides reliable service to stakeholders',
          '4 – Proactively responds to stakeholder needs',
          '5 – Delivers exceptional service and stakeholder engagement'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation demonstrates a strong customer-focused culture. Staff provide reliable service and respond appropriately to stakeholder needs. Strengthening proactive responsiveness will further enhance service quality.`
          : `The feedback suggests that improvements in stakeholder responsiveness and service delivery are recommended. Anticipating stakeholder needs and improving service consistency will enhance the customer-focused culture.`
      },
      'Professionalism': {
        guide: [
          '1 – Professional conduct below expected standards',
          '2 – Inconsistent professional behaviour',
          '3 – Maintains acceptable professional standards',
          '4 – Demonstrates strong professionalism',
          '5 – Exemplary professional conduct and role model behaviour'
        ],
        feedback: (avg) => avg >= 3.5
          ? `The organisation maintains professional standards in interactions and work practices. Continuing to demonstrate respect, reliability, and effective communication will further strengthen professionalism across teams.`
          : `Greater attention to professional conduct, communication, and workplace behaviour is recommended. Promoting professionalism standards across the organisation will improve this competency.`
      }
    }

    if (competencies360.length > 0) {
      for (const comp of competencies360) {
        const def = competencyDefs[comp.label]
        checkPage(55)

        // Competency title bar
        doc.setFillColor(240, 240, 250)
        doc.rect(20, yPos, pageWidth - 40, 8, 'F')
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(88, 28, 135)
        doc.text(`${comp.label}  —  Avg: ${comp.avg.toFixed(2)} / 5.00  (${getRatingInterpretation(comp.avg)})  |  ${comp.count} responses`, 22, yPos + 5.5)
        doc.setTextColor(0, 0, 0)
        yPos += 11

        if (def) {
          // Rating guide
          const guideBody = def.guide.map(g => {
            const sep = g.indexOf(' – ')
            return [sep > -1 ? g.substring(0, sep) : '', sep > -1 ? g.substring(sep + 3) : g]
          })
          checkPage(guideBody.length * 7 + 14)
          ;(doc as any).autoTable({
            startY: yPos,
            head: [['Rating', 'Guide']],
            body: guideBody,
            theme: 'plain',
            headStyles: { fillColor: [230, 230, 245], textColor: [60, 60, 60], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 148 } },
            margin: { left: 24, right: 20 }
          })
          yPos = (doc as any).lastAutoTable.finalY + 3
          drawWrappedText(def.feedback(comp.avg), 24, pageWidth - 44, 4.5)
        } else {
          // Generic feedback for custom competencies
          const genericFeedback = comp.avg >= 3.5
            ? `The organisation demonstrates strong capability in ${comp.label}. This is a key organisational strength that should be maintained and further developed.`
            : `There is opportunity for improvement in ${comp.label}. Targeted development initiatives will help strengthen this competency across the organisation.`
          drawWrappedText(genericFeedback, 24, pageWidth - 44, 4.5)
        }
        yPos += 5
      }
    } else {
      drawWrappedText('No competency-level data is available for this reporting period. Please ensure 360-degree assessments have been completed.', 20, pageWidth - 40, 5)
      yPos += 4
    }

    // ─── Section 5: Recommended Development Actions ──────────────────────────
    drawSectionHeading('5. Recommended Development Actions', sectionTeal)
    drawWrappedText('Based on the feedback, the following actions may support continued professional growth:', 20, pageWidth - 40, 5)
    yPos += 3

    const actionItems = [
      'Participate in training programmes that strengthen collaboration, accountability, or performance management skills.',
      'Seek feedback from supervisors and colleagues on ways to enhance performance in key competency areas.',
      'Identify opportunities to take on new responsibilities or projects that build leadership and professional capability.',
      'Engage in mentoring, peer learning, or knowledge-sharing initiatives.',
    ]
    actionItems.forEach((item, idx) => {
      checkPage(10)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      const lines = doc.splitTextToSize(`${idx + 1}.  ${item}`, pageWidth - 46)
      lines.forEach((line: string, li: number) => {
        checkPage(5)
        doc.text(line, li === 0 ? 20 : 26, yPos)
        yPos += 5
      })
      yPos += 1
    })

    yPos += 4

    // ─── Competency Summary Table ─────────────────────────────────────────────
    if (competencies360.length > 0) {
      checkPage(50)
      drawSectionHeading('Competency Summary — Organisation Overview', sectionBlue)
      const summaryBody = competencies360.map((c, i) => [
        (i + 1).toString(),
        c.label,
        c.avg.toFixed(2),
        getRatingInterpretation(c.avg),
        c.count.toString(),
        c.avg >= 3.5 ? 'Strength' : 'Development Area'
      ])
      ;(doc as any).autoTable({
        startY: yPos,
        head: [['#', 'Competency', 'Avg Score', 'Interpretation', 'Responses', 'Classification']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: sectionBlue, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 50 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
          if (data.column.index === 5 && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === 'Strength' ? [21, 128, 61] : [180, 83, 9]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })
      yPos = (doc as any).lastAutoTable.finalY + 8
    }

    } catch (error360) {
      console.error('[PDF 360 ERROR] Failed to render 360 section:', error360)
      // Add error page
      doc.addPage()
      yPos = 20
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(200, 0, 0)
      doc.text('360-Degree Performance Feedback Report', pageWidth / 2, yPos, { align: 'center' })
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0)
      doc.text('An error occurred while generating the 360-degree feedback section.', pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
      doc.text('Please contact your system administrator.', pageWidth / 2, yPos, { align: 'center' })
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Page ${i} of ${totalPages} | Namibia Statistics Agency - Performance Management System`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dashboard-report-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error generating dashboard PDF:', error)
    return NextResponse.json({ error: 'Failed to generate dashboard PDF' }, { status: 500 })
  }
}
