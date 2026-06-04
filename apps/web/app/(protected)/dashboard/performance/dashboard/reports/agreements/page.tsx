'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Download,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Loader2,
  FileCheck,
  Star
} from 'lucide-react'

interface StaffAgreement {
  id: string
  userId: string
  userName: string
  department: string
  position: string
  email: string
  agreementStatus: 'approved' | 'pending' | 'draft' | 'none'
  ratingStatus: 'rated' | 'pending' | 'none'
  agreementCount: number
  approvedCount: number
  allRated: boolean
  averageRating: number | null
  lastUpdated: string | null
}

interface AgreementStats {
  totalStaff: number
  withApprovedAgreements: number
  withRatedAgreements: number
  pendingAgreements: number
}

export default function DownloadAgreementsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<StaffAgreement[]>([])
  const [stats, setStats] = useState<AgreementStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [downloading, setDownloading] = useState<string | null>(null)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [accessLevel, setAccessLevel] = useState<'all' | 'team' | 'none'>('none')
  const [canDownloadRated, setCanDownloadRated] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  // Check user access level
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/dashboard/performance/api/user/current')
        if (res.ok) {
          const userData = await res.json()
          const jobTitle = (userData.jobTitle || '').toLowerCase()
          const department = (userData.department?.name || userData.departmentName || '').toLowerCase()
          const email = (userData.email || '').toLowerCase()
          
          // Check for George Muhongo (OD Specialist) or Human Capital Executive - can download ALL + rated
          const isGeorgeMuhongo = email.includes('gmuhongo') || 
            (jobTitle.includes('od specialist') && department.includes('human capital'))
          const isHCExecutive = jobTitle.includes('executive') && department.includes('human capital')
          // SG / DSG / Board-level — organisation-wide full access
          const isSGLevel = jobTitle.includes('statistician general') ||
            jobTitle.includes('deputy statistician general') ||
            jobTitle.includes('board member') ||
            jobTitle.includes('board chair') ||
            jobTitle === 'sg' || jobTitle === 'dsg'
          
          if (isGeorgeMuhongo || isHCExecutive || isSGLevel) {
            setAccessLevel('all')
            setCanDownloadRated(true)
            setHasAccess(true)
          } 
          // Other Executives, Managers, Seniors - can download team agreements
          else if (jobTitle.includes('executive') || jobTitle.includes('manager') || 
                   jobTitle.includes('senior') || jobTitle.includes('head')) {
            setAccessLevel('team')
            setCanDownloadRated(false)
            setHasAccess(true)
          }
          // Regular staff - no access
          else {
            setAccessLevel('none')
            setCanDownloadRated(false)
            setHasAccess(false)
          }
        }
      } catch (error) {
        console.error('Error checking access:', error)
        setHasAccess(false)
      } finally {
        setAccessChecked(true)
      }
    }
    
    checkAccess()
  }, [])

  // Fetch staff agreements list
  useEffect(() => {
    if (!hasAccess || !accessChecked) return
    
    const fetchStaffAgreements = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/dashboard/performance/api/reports/agreements?level=${accessLevel}`)
        if (res.ok) {
          const data = await res.json()
          setStaffList(data.staff || [])
          setStats(data.stats || null)
        }
      } catch (error) {
        console.error('Error fetching staff agreements:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStaffAgreements()
  }, [hasAccess, accessChecked, accessLevel])

  const filteredStaff = staffList.filter(staff => 
    staff.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAll = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([])
    } else {
      setSelectedStaff(filteredStaff.map(s => s.userId))
    }
  }

  const handleSelectStaff = (userId: string) => {
    setSelectedStaff(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleDownloadSingle = async (userId: string, type: 'agreement' | 'rated') => {
    setDownloading(`${userId}-${type}`)
    const staff = staffList.find(s => s.userId === userId)
    const userName = staff?.userName || 'Employee'
    try {
      const res = await fetch(`/dashboard/performance/api/performance-agreements/export/${userId}`)
      if (!res.ok) { toast({ title: 'Failed to fetch agreement data', variant: 'destructive' }); return }

      const data = await res.json()
      const { agreements, user: targetUser, hasRatings, scoreSummary, activePeriod, signatoryChain, rating360, quarterBreakdown } = data

      // Load NSA stamp
      const stampImg = new Image()
      stampImg.crossOrigin = 'anonymous'
      stampImg.src = '/nored-stamp.png'
      await new Promise<void>(resolve => {
        const t = setTimeout(() => resolve(), 3000)
        stampImg.onload = () => { clearTimeout(t); resolve() }
        stampImg.onerror = () => { clearTimeout(t); resolve() }
      })
      const stampLoaded = stampImg.complete && stampImg.naturalWidth > 0
      const addStamp = (d: jsPDF, pw: number, ph: number) => {
        if (!stampLoaded) return
        d.addImage(stampImg, 'PNG', pw - 35, ph - 35, 25, 25)
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      doc.setFillColor(0, 51, 102)
      doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255)
      doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(targetUser?.name || userName, pageWidth / 2, 48, { align: 'center' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`${targetUser?.jobTitle || 'Staff'} - ${targetUser?.department || staff?.department || 'N/A'}`, pageWidth / 2, 55, { align: 'center' })

      if (activePeriod) {
        const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        doc.setFontSize(10)
        doc.text(`${activePeriod.name}: ${fmt(activePeriod.startDate)} - ${fmt(activePeriod.endDate)}`, pageWidth / 2, 61, { align: 'center' })
      }

      const regularAgreements = (agreements || []).filter((a: any) => !a.isAdhocContainer)
      const totalWeight = regularAgreements.reduce((sum: number, a: any) => sum + (a.weight || 0), 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 68, { align: 'center' })

      const includeRatings = type === 'rated' && hasRatings
      if (includeRatings && scoreSummary) {
        doc.text(`Overall Performance Score: ${scoreSummary.finalRating.toFixed(2)} / 5.0  (${scoreSummary.finalPercentage.toFixed(1)}%)`, pageWidth / 2, 74, { align: 'center' })
      }

      // Build table — no Rating or Evidence columns for 'agreement' type
      const tableData = regularAgreements.map((a: any) => {
        const goal = a.initiative?.objective?.goal
        const objective = a.initiative?.objective
        const initiative = a.initiative
        const dueDate = a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
        const statusMap: Record<string, string> = { APPROVED: 'Approved', PENDING: 'Pending', REJECTED: 'Rejected' }
        const statusLabel = statusMap[a.approvalStatus || ''] || 'Not Submitted'
        const row = [
          goal?.title || 'N/A',
          objective?.title || 'N/A',
          initiative?.title || a.title || 'N/A',
          initiative?.action || a.customAction || '',
          initiative?.measure || a.kpi || 'N/A',
          initiative?.target || a.target || 'N/A',
          `${a.weight || 0}%`,
          statusLabel,
          dueDate,
        ]
        if (includeRatings) {
          const rd = a.rating ? (a.rating >= 4 ? 'Excellent' : a.rating >= 3 ? 'Good' : 'Needs Improvement') : ''
          row.push(`${rd} ${a.rating ? `(${a.rating})` : ''}`.trim())
          row.push(a.evidenceUrl || '')
        }
        return row
      })

      const baseHeaders = ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Status', 'Deadline']
      const tableHeader = includeRatings ? [...baseHeaders, 'Rating', 'Evidence'] : baseHeaders

      const baseColStyles: any = {
        0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 34 },
        4: { cellWidth: 24 }, 5: { cellWidth: 22 }, 6: { cellWidth: 11, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' }, 8: { cellWidth: 18, halign: 'center' },
      }
      if (includeRatings) {
        baseColStyles[9] = { cellWidth: 20, halign: 'center' }
        baseColStyles[10] = { cellWidth: 26 }
      }

      autoTable(doc, {
        startY: includeRatings ? 80 : 75,
        head: [tableHeader],
        body: tableData,
        theme: 'grid',
        styles: { overflow: 'linebreak', cellWidth: 'wrap', fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        columnStyles: baseColStyles,
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text('This is an official Performance Agreement document.', pageWidth / 2, pageHeight - 10, { align: 'center' })
          doc.setTextColor(0, 0, 0)
          addStamp(doc, pageWidth, pageHeight)
        }
      })

      const AG_DARK_BLUE: [number,number,number] = [0, 51, 102]
      const AG_GOLD: [number,number,number] = [204, 153, 0]
      const getAgPerfLevel = (r: number) => r >= 4.5 ? 'Outstanding' : r >= 4.0 ? 'Excellent' : r >= 3.5 ? 'Very Good' : r >= 3.0 ? 'Good' : r >= 2.5 ? 'Satisfactory' : 'Needs Improvement'
      let agFinalY = (doc as any).lastAutoTable.finalY || 150

      // ── Quarterly Breakdown (Q1–Q4) ──
      if (includeRatings && quarterBreakdown && quarterBreakdown.length > 0) {
        const agQb = quarterBreakdown
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); agFinalY = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AG_DARK_BLUE)
        doc.text('QUARTERLY PERFORMANCE BREAKDOWN', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('NSA Financial Year: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 3
        const agQRows = agQb.map((q: any) => [
          `${q.quarter} (${q.label})`,
          q.total > 0 ? String(q.total) : '-',
          q.rated > 0 ? String(q.rated) : '-',
          q.avgRating != null ? `${q.avgRating.toFixed(2)} / 5` : '-',
          q.avgRating != null ? getAgPerfLevel(q.avgRating) : '-',
        ])
        autoTable(doc, {
          startY: agFinalY, head: [['Quarter', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']], body: agQRows, theme: 'grid',
          headStyles: { fillColor: AG_GOLD, textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', halign: 'center' },
          columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4 && data.cell.raw !== '-') {
              const lvl = data.cell.raw as string
              if (lvl === 'Outstanding' || lvl === 'Excellent') data.cell.styles.textColor = [0, 128, 0]
              else if (lvl === 'Needs Improvement') data.cell.styles.textColor = [180, 0, 0]
            }
          }
        })
        agFinalY = (doc as any).lastAutoTable.finalY || agFinalY + 40
        agFinalY += 8
        if (agFinalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); agFinalY = 20 }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AG_DARK_BLUE)
        doc.text('BI-ANNUAL PERFORMANCE BREAKDOWN', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('H1 = Q1 + Q2 (Apr–Sep)  |  H2 = Q3 + Q4 (Oct–Mar)', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 3
        const buildAgHalf = (qs: any[]) => {
          const tot = qs.reduce((s: number, q: any) => s + q.total, 0)
          const rat = qs.reduce((s: number, q: any) => s + q.rated, 0)
          const ratingSum = qs.reduce((s: number, q: any) => s + (q.avgRating != null ? q.avgRating * q.total : 0), 0)
          const avgR = tot > 0 && rat > 0 ? ratingSum / tot : null
          return { tot, rat, avgR }
        }
        const agh1 = buildAgHalf([agQb[0], agQb[1]])
        const agh2 = buildAgHalf([agQb[2], agQb[3]])
        const agHalfRows = [
          ['H1 – First Half (Apr – Sep)', String(agh1.tot || '-'), String(agh1.rat || '-'), agh1.avgR != null ? `${agh1.avgR.toFixed(2)} / 5` : '-', agh1.avgR != null ? getAgPerfLevel(agh1.avgR) : '-'],
          ['H2 – Second Half (Oct – Mar)', String(agh2.tot || '-'), String(agh2.rat || '-'), agh2.avgR != null ? `${agh2.avgR.toFixed(2)} / 5` : '-', agh2.avgR != null ? getAgPerfLevel(agh2.avgR) : '-'],
        ]
        autoTable(doc, {
          startY: agFinalY, head: [['Period', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']], body: agHalfRows, theme: 'grid',
          headStyles: { fillColor: AG_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', halign: 'center' },
          columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4 && data.cell.raw !== '-') {
              const lvl = data.cell.raw as string
              if (lvl === 'Outstanding' || lvl === 'Excellent') data.cell.styles.textColor = [0, 128, 0]
              else if (lvl === 'Needs Improvement') data.cell.styles.textColor = [180, 0, 0]
            }
          }
        })
        agFinalY = (doc as any).lastAutoTable.finalY || agFinalY + 30
      }

      // ============================================
      // 360-DEGREE BEHAVIOURAL COMPETENCY RATING
      // Always included when 360° data exists
      // ============================================
      if (rating360) {
        doc.addPage(); addStamp(doc, pageWidth, pageHeight)
        let y3 = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 51, 102)
        doc.text('360-DEGREE BEHAVIOURAL COMPETENCY RATING', pageWidth / 2, y3, { align: 'center' })
        doc.setTextColor(0, 0, 0); y3 += 7
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('NSA Behavioural Competency evaluation — Self, Supervisor, Dept. (Random) & Org. (Random)', pageWidth / 2, y3, { align: 'center' })
        doc.setTextColor(0, 0, 0); y3 += 6
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Cycle: ${rating360.cycleName || 'N/A'}`, 14, y3)
        doc.text(`Status: ${rating360.status || 'In Progress'}`, pageWidth - 14, y3, { align: 'right' })
        y3 += 8

        const a3FmtR = (v: number | null | undefined) => (v != null) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const a3RaterRows = [
          ['Self', a3FmtR(rating360.selfRating), rating360.selfStatus || (rating360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', a3FmtR(rating360.supervisorRating), rating360.supervisorStatus || (rating360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', a3FmtR(rating360.deptRandomRating), rating360.deptRandomStatus || (rating360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', a3FmtR(rating360.orgRandomRating), rating360.orgRandomStatus || (rating360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (rating360.averageRating != null) a3RaterRows.push(['Overall Average', `${Number(rating360.averageRating).toFixed(2)} / 5`, 'Combined'])

        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, y3); y3 += 2
        autoTable(doc, {
          startY: y3, head: [['Perspective', 'Rating', 'Status']], body: a3RaterRows, theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 45, halign: 'center' }, 2: { cellWidth: 50, halign: 'center' } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.column.index === 2) {
              const v = data.cell.raw as string
              if (v === 'Completed') { data.cell.styles.textColor = [46, 125, 50]; data.cell.styles.fontStyle = 'bold' }
              else if (v === 'Pending') { data.cell.styles.textColor = [180, 100, 0] }
            }
            if (data.row.index === a3RaterRows.length - 1 && a3RaterRows[a3RaterRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        y3 = (doc as any).lastAutoTable.finalY + 10

        const a3CompDetail = rating360.competencyDetail || []
        if (a3CompDetail.length > 0) {
          if (y3 + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); y3 = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, y3); doc.setTextColor(0, 0, 0); y3 += 2
          const a3FmtS = (v: number | null) => (v != null) ? Number(v).toFixed(2) : 'Pending'
          const a3FmtO = (v: number | null) => (v != null) ? `${Number(v).toFixed(2)} / 5` : '-'
          const a3CBody = a3CompDetail.map((c: any) => [c.competency, a3FmtS(c.selfScore), a3FmtS(c.supervisorScore), a3FmtS(c.deptRandomScore), a3FmtS(c.orgRandomScore), a3FmtO(c.overallAvg)])
          const a3Agg = (key: string) => { const vals = a3CompDetail.filter((c: any) => c[key] != null).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const a3OvArr = a3CompDetail.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
          a3CBody.push(['OVERALL AVERAGE', a3Agg('selfScore'), a3Agg('supervisorScore'), a3Agg('deptRandomScore'), a3Agg('orgRandomScore'), a3OvArr.length > 0 ? `${(a3OvArr.reduce((a: number, b: number) => a + b, 0) / a3OvArr.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: y3, head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']], body: a3CBody, theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === a3CBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < a3CBody.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
        } else if (rating360.competencyBreakdown?.length > 0 || rating360.categoryBreakdown?.length > 0) {
          const a3Legacy = rating360.competencyBreakdown?.length > 0 ? rating360.competencyBreakdown : rating360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          if (y3 + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); y3 = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, y3); y3 += 2
          autoTable(doc, {
            startY: y3, head: [['Competency / Category', 'Average Score', 'Responses']],
            body: a3Legacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount || 0}`]),
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
        }
      }

      // ── OVERALL PERFORMANCE SCORE SUMMARY ──
      if (includeRatings && scoreSummary) {
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); agFinalY = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AG_DARK_BLUE)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 10
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${targetUser?.name || userName}`, 14, agFinalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, agFinalY, { align: 'right' })
        agFinalY += 10
        const agComp = scoreSummary.components
        const agWts = scoreSummary.weights
        const agSummaryData = [
          ['Performance Agreements', `${agWts.performanceAgreement}%`, `${agComp.performanceAgreement.rating.toFixed(2)} / 5`, `${agComp.performanceAgreement.weightedScore.toFixed(2)}`, `${agComp.performanceAgreement.ratedCount || 0}/${agComp.performanceAgreement.initiativesCount} rated`],
          ['Ad-hoc Tasks', `${agWts.adhoc}%`, `${agComp.adhoc.rating.toFixed(2)} / 5`, `${agComp.adhoc.weightedScore.toFixed(2)}`, `${agComp.adhoc.tasksCompleted}/${agComp.adhoc.tasksTotal} completed`],
          ['Projects', `${agWts.projects}%`, `${agComp.projects.rating.toFixed(2)} / 5`, `${agComp.projects.weightedScore.toFixed(2)}`, agComp.projects.tasksTotal > 0 ? `${agComp.projects.tasksCompleted}/${agComp.projects.tasksTotal}` : 'No tasks'],
          ['Risk Management', `${agWts.riskManagement}%`, `${agComp.riskManagement.rating.toFixed(2)} / 5`, `${agComp.riskManagement.weightedScore.toFixed(2)}`, agComp.riskManagement.tasksTotal > 0 ? `${agComp.riskManagement.tasksCompleted}/${agComp.riskManagement.tasksTotal}` : 'No tasks'],
          ['Audit Tasks', `${agWts.audit}%`, `${agComp.audit.rating.toFixed(2)} / 5`, `${agComp.audit.weightedScore.toFixed(2)}`, agComp.audit.tasksTotal > 0 ? `${agComp.audit.tasksCompleted}/${agComp.audit.tasksTotal}` : 'No tasks'],
          ['360-Degree Rating', `${agWts.rating360 || 0}%`, `${(agComp.rating360?.rating || 0).toFixed(2)} / 5`, `${(agComp.rating360?.weightedScore || 0).toFixed(2)}`, agComp.rating360?.hasAnyRatings ? 'Completed' : 'Not started'],
          ['OVERALL TOTAL', '100%', `${scoreSummary.finalRating.toFixed(2)} / 5`, `${scoreSummary.finalRating.toFixed(2)}`, `${scoreSummary.finalPercentage.toFixed(1)}%`]
        ]
        autoTable(doc, {
          startY: agFinalY, head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']], body: agSummaryData, theme: 'grid',
          headStyles: { fillColor: AG_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.row.index === agSummaryData.length - 1) {
              data.cell.styles.fillColor = AG_DARK_BLUE; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        agFinalY = (doc as any).lastAutoTable.finalY || agFinalY + 60
        agFinalY += 6
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AG_DARK_BLUE)
        doc.text(`Overall Performance Level: ${getAgPerfLevel(scoreSummary.finalRating)}`, pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); agFinalY += 8
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, agFinalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Signature page
      doc.addPage()
      addStamp(doc, pageWidth, pageHeight)
      const sigStartY = 30

      // Build signatory boxes from the full chain + employee
      const allSigBoxes: { title: string; name: string; designation: string; signatureUrl: string | null; date: string }[] = [
        {
          title: 'EMPLOYEE',
          name: targetUser?.name || userName,
          designation: targetUser?.jobTitle || staff?.position || '',
          signatureUrl: targetUser?.signatureUrl || null,
          date: new Date().toLocaleDateString('en-ZA')
        },
        ...((signatoryChain || []).map((s: any) => ({
          title: s.role === 'SUPERVISOR' ? 'SUPERVISOR' : s.role === 'MANAGER' ? 'MANAGER' : s.role === 'DSG' ? 'DEPUTY SG' : 'EXECUTIVE',
          name: s.name || '',
          designation: s.designation || '',
          signatureUrl: s.signatureUrl || null,
          date: new Date().toLocaleDateString('en-ZA')
        })))
      ].filter(b => b.name && b.name.trim() !== '')

      // Remove duplicate names (keep first occurrence)
      const seenNames = new Set<string>()
      const sigBoxes = allSigBoxes.filter(b => {
        if (seenNames.has(b.name.toLowerCase())) return false
        seenNames.add(b.name.toLowerCase())
        return true
      })

      const boxHeight = 55
      const maxBoxWidth = 65
      const boxGap = 4
      const totalBoxesWidth = sigBoxes.length * maxBoxWidth + (sigBoxes.length - 1) * boxGap
      const sigStartX = (pageWidth - totalBoxesWidth) / 2

      for (let i = 0; i < sigBoxes.length; i++) {
        const box = sigBoxes[i]
        const boxX = sigStartX + i * (maxBoxWidth + boxGap)

        // Draw box
        doc.setDrawColor(0, 51, 102)
        doc.setLineWidth(0.5)
        doc.rect(boxX, sigStartY, maxBoxWidth, boxHeight)

        // Header fill
        doc.setFillColor(0, 51, 102)
        doc.rect(boxX, sigStartY, maxBoxWidth, 10, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text(box.title, boxX + maxBoxWidth / 2, sigStartY + 7, { align: 'center' })

        // Name
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(0, 51, 102)
        doc.text('Full Name:', boxX + 3, sigStartY + 16)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(box.name, boxX + 3, sigStartY + 21, { maxWidth: maxBoxWidth - 6 })

        // Designation
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(0, 51, 102)
        doc.text('Designation:', boxX + 3, sigStartY + 30)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(0, 0, 0)
        doc.text(box.designation || '', boxX + 3, sigStartY + 35, { maxWidth: maxBoxWidth - 6 })

        // Date
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(0, 51, 102)
        doc.text('Date:', boxX + 3, sigStartY + 42)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(box.date, boxX + 3, sigStartY + 47)

        // Signature line
        doc.setLineWidth(0.3)
        doc.setDrawColor(100, 100, 100)
        doc.line(boxX + 3, sigStartY + 53, boxX + maxBoxWidth - 3, sigStartY + 53)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(0, 51, 102)
        doc.text('Signature', boxX + maxBoxWidth / 2, sigStartY + 57, { align: 'center' })

        // Load and draw signature image if available
        if (box.signatureUrl) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = box.signatureUrl
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(() => resolve(), 5000)
              img.onload = () => { clearTimeout(timeout); resolve() }
              img.onerror = () => { clearTimeout(timeout); resolve() }
            })
            if (img.complete && img.naturalWidth > 0) {
              doc.addImage(img, 'PNG', boxX + 5, sigStartY + 44, maxBoxWidth - 10, 10)
            }
          } catch (_e) { /* skip if signature fails to load */ }
        }
      }

      doc.save(`${userName.replace(/\s+/g, '_')}_${type === 'rated' ? 'rated_' : ''}performance_agreement.pdf`)
    } catch (error) {
      console.error('Error downloading agreement:', error)
      toast({ title: 'Failed to generate PDF. Please try again.', variant: 'destructive' })
    } finally {
      setDownloading(null)
    }
  }

  const handleBulkDownload = async (type: 'agreement' | 'rated') => {
    if (selectedStaff.length === 0) return
    
    setBulkDownloading(true)
    try {
      const res = await fetch('/dashboard/performance/api/reports/download-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedStaff, type })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `performance_agreements_bulk_${type}.zip`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading bulk agreements:', error)
    } finally {
      setBulkDownloading(false)
    }
  }

  if (!accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Access Denied</h3>
                <p className="text-sm">This page is only accessible to Executives, Managers, Seniors, and authorized personnel.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Download Performance Agreements</h1>
        <p className="text-gray-500">
          {accessLevel === 'all' 
            ? 'Download signed performance agreements for all staff in the organisation'
            : 'Download signed performance agreements for staff reporting to you'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{stats?.totalStaff || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ready for Download</p>
                <p className="text-3xl font-bold text-green-600">{stats?.withApprovedAgreements || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FileCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rated Agreements</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.withRatedAgreements || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats?.pendingAgreements || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search by name, department, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              {selectedStaff.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">{selectedStaff.length} selected</span>
                  <Button 
                    variant="outline"
                    onClick={() => handleBulkDownload('agreement')}
                    disabled={bulkDownloading}
                  >
                    {bulkDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download Agreements
                  </Button>
                  {canDownloadRated && (
                    <Button 
                      onClick={() => handleBulkDownload('rated')}
                      disabled={bulkDownloading}
                    >
                      {bulkDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}
                      Download Rated
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All Header */}
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg font-medium text-sm">
                <Checkbox 
                  checked={selectedStaff.length === filteredStaff.length && filteredStaff.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <div className="flex-1 grid grid-cols-12 gap-4">
                  <span className="col-span-3">Name</span>
                  <span className="col-span-2">Department</span>
                  <span className="col-span-2">Position</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-3 text-right">Actions</span>
                </div>
              </div>

              {/* Staff List */}
              {filteredStaff.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No staff found matching your search
                </div>
              ) : (
                filteredStaff.map((staff) => (
                  <div 
                    key={staff.userId}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox 
                      checked={selectedStaff.includes(staff.userId)}
                      onCheckedChange={() => handleSelectStaff(staff.userId)}
                      disabled={staff.agreementStatus !== 'approved'}
                    />
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <p className="font-medium text-gray-900">{staff.userName}</p>
                        <p className="text-xs text-gray-500">{staff.email}</p>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">{staff.department}</div>
                      <div className="col-span-2 text-sm text-gray-600">{staff.position}</div>
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={staff.agreementStatus === 'approved' ? 'default' : 
                                    staff.agreementStatus === 'pending' ? 'secondary' : 'outline'}
                            className="w-fit text-xs"
                          >
                            {staff.agreementStatus === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {staff.agreementStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {staff.agreementStatus === 'approved' ? 'Approved' : 
                             staff.agreementStatus === 'pending' ? 'Pending' : 
                             staff.agreementStatus === 'draft' ? 'Draft' : 'None'}
                          </Badge>
                          {staff.ratingStatus === 'rated' && (
                            <Badge variant="outline" className="w-fit text-xs bg-purple-50 text-purple-700 border-purple-200">
                              <Star className="w-3 h-3 mr-1" />
                              Rated {staff.averageRating?.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        {staff.agreementStatus === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadSingle(staff.userId, 'agreement')}
                            disabled={downloading === `${staff.userId}-agreement`}
                          >
                            {downloading === `${staff.userId}-agreement` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-1" />
                                Agreement
                              </>
                            )}
                          </Button>
                        )}
                        {canDownloadRated && staff.allRated && (
                          <Button 
                            size="sm"
                            onClick={() => handleDownloadSingle(staff.userId, 'rated')}
                            disabled={downloading === `${staff.userId}-rated`}
                          >
                            {downloading === `${staff.userId}-rated` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Star className="w-4 h-4 mr-1" />
                                Rated
                              </>
                            )}
                          </Button>
                        )}
                        {staff.agreementStatus !== 'approved' && (
                          <span className="text-xs text-gray-400">Not available</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
