'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Download,
  FileText,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface EmployeeStats {
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
}

interface ReportStats {
  totalStaff: number
  agreementsSubmitted: number
  agreementsApproved: number
  agreementsPending: number
  averageRating: number
  organizationCompletion: number
  staffWithApprovedAgreements: number
  departments: DepartmentStats[]
  topPerformers: PerformerStats[]
  bottomPerformers: PerformerStats[]
  allEmployees: EmployeeStats[]
}

interface DepartmentStats {
  name: string
  staffCount: number
  submittedCount: number
  approvedCount: number
  averageRating: number
  completionRate: number
}

interface PerformerStats {
  userId?: string
  name: string
  department: string
  position: string
  rating: number
  completionRate: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<'organization' | 'department' | 'individual'>('organization')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [downloadingUser, setDownloadingUser] = useState<string | null>(null)
  const ITEMS_PER_PAGE = 10

  // Check if user has access to reports
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/dashboard/performance/api/user/current')
        if (res.ok) {
          const userData = await res.json()
          const jobTitle = (userData.jobTitle || '').toLowerCase()
          const department = (userData.department?.name || userData.departmentName || '').toLowerCase()
          const email = (userData.email || '').toLowerCase()
          
          // Check for Executive roles
          const isExecutive = jobTitle.includes('executive')
          // Check for SG / DSG / Board-level roles
          const isSGLevel = jobTitle.includes('statistician general') ||
            jobTitle.includes('deputy statistician general') ||
            jobTitle.includes('board member') ||
            jobTitle.includes('board chair') ||
            jobTitle === 'sg' || jobTitle === 'dsg'
          // Check for Manager/Senior roles
          const isManager = jobTitle.includes('manager') || jobTitle.includes('senior') || jobTitle.includes('head')
          // Check for George Muhongo (OD Specialist)
          const isGeorgeMuhongo = email.includes('gmuhongo') || 
            (jobTitle.includes('od specialist') && department.includes('human capital'))
          
          const canAccess = isExecutive || isSGLevel || isManager || isGeorgeMuhongo
          setHasAccess(canAccess)
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

  // Fetch report stats
  useEffect(() => {
    if (!hasAccess || !accessChecked) return
    
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch('/dashboard/performance/api/reports/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching report stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [hasAccess, accessChecked])

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(true)
    try {
      const res = await fetch(`/dashboard/performance/api/reports/export?format=${format}&level=${selectedLevel}&department=${selectedDepartment}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `performance-report-${selectedLevel}.${format === 'excel' ? 'xlsx' : 'pdf'}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    } finally {
      setExporting(false)
    }
  }

  // Export all agreements (approved or rated) in Excel or PDF format
  const handleExportAllAgreements = async (format: 'pdf' | 'excel', type: 'approved' | 'rated') => {
    setExporting(true)
    try {
      if (format === 'excel') {
        // Excel is generated server-side
        const res = await fetch(`/dashboard/performance/api/reports/agreements/export?format=excel&type=${type}`)
        if (!res.ok) { toast({ title: 'Failed to export Excel. Please try again.', variant: 'destructive' }); return }
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `performance-agreements-${type}.xlsx`
        document.body.appendChild(a); a.click(); a.remove()
        window.URL.revokeObjectURL(url)
        return
      }

      // PDF: fetch user list from server, generate PDFs client-side, zip them
      const res = await fetch(`/dashboard/performance/api/reports/agreements/export?format=pdf&type=${type}`)
      if (!res.ok) { toast({ title: 'Failed to fetch agreement data. Please try again.', variant: 'destructive' }); return }
      const { users, activePeriod: period } = await res.json()

      if (!users || users.length === 0) {
        toast({ title: 'No agreements found to export.', variant: 'destructive' })
        return
      }

      const zip = new JSZip()

      // Load NSA stamp once for all PDFs in bulk export
      const bulkStampImg = new Image()
      bulkStampImg.crossOrigin = 'anonymous'
      bulkStampImg.src = '/nored-stamp.png'
      await new Promise<void>(resolve => {
        const t = setTimeout(() => resolve(), 3000)
        bulkStampImg.onload = () => { clearTimeout(t); resolve() }
        bulkStampImg.onerror = () => { clearTimeout(t); resolve() }
      })
      const bulkStampLoaded = bulkStampImg.complete && bulkStampImg.naturalWidth > 0
      const addBulkStamp = (d: jsPDF, pw: number, ph: number) => {
        if (!bulkStampLoaded) return
        d.addImage(bulkStampImg, 'PNG', pw - 35, ph - 35, 25, 25)
      }

      for (const { user: u, agreements: userAgreements } of users) {
        const userName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.email || 'Unknown'
        const regularAgreements = (userAgreements || []).filter((a: any) => !a.isAdhocContainer)
        if (regularAgreements.length === 0) continue

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Header — NSA logo block
        doc.setFillColor(0, 51, 102)
        doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
        doc.setFontSize(12); doc.setTextColor(255, 255, 255)
        doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
        doc.setTextColor(0, 0, 0)

        doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text(userName, pageWidth / 2, 48, { align: 'center' })
        doc.setFontSize(12); doc.setFont('helvetica', 'normal')
        doc.text(`${u?.jobTitle || 'Staff'} - ${u?.departmentName || 'N/A'}`, pageWidth / 2, 55, { align: 'center' })

        if (period) {
          const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
          doc.setFontSize(10)
          doc.text(`${period.name}: ${fmt(period.startDate)} - ${fmt(period.endDate)}`, pageWidth / 2, 61, { align: 'center' })
        }

        const totalWeight = regularAgreements.reduce((s: number, a: any) => s + (a.weight || 0), 0)
        const hasRatings = type === 'rated' && regularAgreements.some((a: any) => a.rating && a.rating > 0)
        doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 68, { align: 'center' })

        const tableData = regularAgreements.map((agreement: any) => {
          const goal = agreement.initiative?.objective?.goal
          const objective = agreement.initiative?.objective
          const initiative = agreement.initiative
          const dueDate = agreement.dueDate
            ? new Date(agreement.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A'
          const statusMap: Record<string, string> = { APPROVED: 'Approved', PENDING: 'Pending', REJECTED: 'Rejected' }
          const approvalStatus = statusMap[agreement.approvalStatus || ''] || 'Not Submitted'
          const ratingDisplay = agreement.rating
            ? (agreement.rating >= 4 ? 'Excellent' : agreement.rating >= 3 ? 'Good' : 'Needs Improvement')
            : ''
          const row = [
            goal?.title || 'N/A',
            objective?.title || 'N/A',
            initiative?.title || agreement.title || 'N/A',
            initiative?.action || agreement.customAction || '',
            initiative?.measure || agreement.kpi || 'N/A',
            initiative?.target || agreement.target || 'N/A',
            `${agreement.weight || 0}%`,
            approvalStatus,
            dueDate,
          ]
          if (hasRatings) {
            row.push(`${ratingDisplay}${agreement.rating ? ` (${agreement.rating})` : ''}`.trim())
            row.push(agreement.evidenceUrl || '')
          }
          return row
        })

        const baseHeaders = ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Status', 'Deadline']
        const tableHeader = hasRatings ? [...baseHeaders, 'Rating', 'Evidence'] : baseHeaders
        const baseColStyles: any = {
          0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 34 },
          4: { cellWidth: 24 }, 5: { cellWidth: 22 }, 6: { cellWidth: 11, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' }, 8: { cellWidth: 18, halign: 'center' },
        }
        if (hasRatings) { baseColStyles[9] = { cellWidth: 20, halign: 'center' }; baseColStyles[10] = { cellWidth: 26 } }

        autoTable(doc, {
          startY: 75,
          head: [tableHeader],
          body: tableData,
          theme: 'grid',
          styles: { overflow: 'linebreak', cellWidth: 'wrap', fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
          columnStyles: baseColStyles,
          margin: { left: 14, right: 14 },
          didDrawPage: () => {
            doc.setFontSize(8); doc.setTextColor(128)
            doc.text('This is an official Performance Agreement document.', pageWidth / 2, pageHeight - 10, { align: 'center' })
            doc.setTextColor(0, 0, 0)
            addBulkStamp(doc, pageWidth, pageHeight)
          }
        })

        // Fetch signatoryChain for this user from export API
        let bulkSignatoryChain: any[] = []
        let bulkUserSignatureUrl: string | null = null
        let bulkRating360: any = null
        try {
          const exportRes = await fetch(`/dashboard/performance/api/performance-agreements/export/${u.id}`)
          if (exportRes.ok) {
            const exportData = await exportRes.json()
            bulkSignatoryChain = exportData.signatoryChain || []
            bulkUserSignatureUrl = exportData.user?.signatureUrl || null
            bulkRating360 = exportData.rating360 || null
          }
        } catch (_e) { /* skip */ }

        // 360-degree breakdown page (if employee has ratings)
        if (bulkRating360 && (bulkRating360.selfRating != null || bulkRating360.supervisorRating != null || bulkRating360.peerAverage != null || bulkRating360.averageRating != null)) {
          doc.addPage(); addBulkStamp(doc, pageWidth, pageHeight)
          let y3 = 20
          doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 51, 102)
          doc.text('360-DEGREE BEHAVIOURAL COMPETENCY RATING', pageWidth / 2, y3, { align: 'center' })
          doc.setTextColor(0, 0, 0); y3 += 8
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
          doc.text(`Cycle: ${bulkRating360.cycleName || 'N/A'}   |   Status: ${bulkRating360.status || 'N/A'}`, pageWidth / 2, y3, { align: 'center' })
          doc.setTextColor(0, 0, 0); y3 += 6
          const bRaterRows: any[] = []
          if (bulkRating360.selfRating != null) bRaterRows.push(['Self Assessment', `${Number(bulkRating360.selfRating).toFixed(2)} / 5`, '1'])
          if (bulkRating360.supervisorRating != null) bRaterRows.push(['Supervisor', `${Number(bulkRating360.supervisorRating).toFixed(2)} / 5`, '1'])
          if (bulkRating360.peerAverage != null) bRaterRows.push(['Peer Rating Average', `${Number(bulkRating360.peerAverage).toFixed(2)} / 5`, `${bulkRating360.peerCount || 0}`])
          if (bulkRating360.subordinateAverage != null) bRaterRows.push(['Subordinate Rating Average', `${Number(bulkRating360.subordinateAverage).toFixed(2)} / 5`, `${bulkRating360.subordinateCount || 0}`])
          if (bulkRating360.averageRating != null) bRaterRows.push(['OVERALL AVERAGE', `${Number(bulkRating360.averageRating).toFixed(2)} / 5`, '-'])
          autoTable(doc, {
            startY: y3, head: [['Rater Type', 'Score (out of 5)', 'Respondents']], body: bRaterRows, theme: 'grid',
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 50, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addBulkStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => { if (data.row.index === bRaterRows.length - 1) { data.cell.styles.fillColor = [0, 51, 102]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' } }
          })
          y3 = (doc as any).lastAutoTable.finalY + 10
          const bCompDetail = bulkRating360.competencyDetail || []
          const bLegacy = bCompDetail.length === 0 ? (bulkRating360.competencyBreakdown?.length > 0 ? bulkRating360.competencyBreakdown : bulkRating360.categoryBreakdown || []) : []
          const bFmt = (v: number | null) => v !== null ? Number(v).toFixed(2) : '-'
          const bAgg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '-'
          if (bCompDetail.length > 0) {
            if (y3 + 40 > pageHeight - 20) { doc.addPage(); addBulkStamp(doc, pageWidth, pageHeight); y3 = 20 }
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
            doc.text('Behavioural Competency Breakdown', 14, y3); doc.setTextColor(0, 0, 0); y3 += 2
            const bCBody = bCompDetail.map((c: any) => [c.competency, bFmt(c.selfScore), bFmt(c.supervisorScore), bFmt(c.peerAvgScore), `${Number(c.overallAvg).toFixed(2)} / 5`])
            const bCSelf = bCompDetail.filter((c: any) => c.selfScore !== null).map((c: any) => Number(c.selfScore))
            const bCSup = bCompDetail.filter((c: any) => c.supervisorScore !== null).map((c: any) => Number(c.supervisorScore))
            const bCPeer = bCompDetail.filter((c: any) => c.peerAvgScore !== null).map((c: any) => Number(c.peerAvgScore))
            const bCOv = bCompDetail.map((c: any) => Number(c.overallAvg))
            bCBody.push(['OVERALL', bAgg(bCSelf), bAgg(bCSup), bAgg(bCPeer), `${bAgg(bCOv)} / 5`])
            autoTable(doc, {
              startY: y3, head: [['Competency', 'Self', 'Supervisor', 'Peer Avg', 'Overall Avg']], body: bCBody, theme: 'grid',
              headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
              bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
              columnStyles: { 0: { cellWidth: 65, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 35, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' }, 4: { cellWidth: 40, halign: 'center' } },
              margin: { left: 14, right: 14 },
              didDrawPage: () => { addBulkStamp(doc, pageWidth, pageHeight) },
              didParseCell: (data: any) => { if (data.row.index === bCBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' } }
            })
          } else if (bLegacy.length > 0) {
            if (y3 + 30 > pageHeight - 20) { doc.addPage(); addBulkStamp(doc, pageWidth, pageHeight); y3 = 20 }
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
            doc.text('Competency / Category Scores', 14, y3); y3 += 2
            const bLBody = bLegacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount || 0}`])
            autoTable(doc, {
              startY: y3, head: [['Competency / Category', 'Average Score', 'Responses']], body: bLBody, theme: 'grid',
              headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
              bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
              columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
              margin: { left: 14, right: 14 }
            })
          }
        }

        // Signature page
        doc.addPage()
        addBulkStamp(doc, pageWidth, pageHeight)
        const bulkSigStartY = 30
        const bulkAllBoxes: { title: string; name: string; designation: string; signatureUrl: string | null }[] = [
          { title: 'EMPLOYEE', name: userName, designation: u?.jobTitle || '', signatureUrl: bulkUserSignatureUrl },
          ...bulkSignatoryChain.map((s: any) => ({
            title: s.role === 'SUPERVISOR' ? 'SUPERVISOR' : s.role === 'MANAGER' ? 'MANAGER' : s.role === 'DSG' ? 'DEPUTY SG' : 'EXECUTIVE',
            name: s.name || '', designation: s.designation || '', signatureUrl: s.signatureUrl || null
          }))
        ].filter(b => b.name && b.name.trim() !== '')
        const bulkSeenNames = new Set<string>()
        const bulkSigBoxes = bulkAllBoxes.filter(b => {
          if (bulkSeenNames.has(b.name.toLowerCase())) return false
          bulkSeenNames.add(b.name.toLowerCase()); return true
        })
        const bulkMaxW = 65, bulkGap = 4
        const bulkTotalW = bulkSigBoxes.length * bulkMaxW + (bulkSigBoxes.length - 1) * bulkGap
        const bulkStartX = (pageWidth - bulkTotalW) / 2
        const bulkBoxH = 55
        for (let bi = 0; bi < bulkSigBoxes.length; bi++) {
          const box = bulkSigBoxes[bi]
          const bx = bulkStartX + bi * (bulkMaxW + bulkGap)
          doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5)
          doc.rect(bx, bulkSigStartY, bulkMaxW, bulkBoxH)
          doc.setFillColor(0, 51, 102); doc.rect(bx, bulkSigStartY, bulkMaxW, 10, 'F')
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
          doc.text(box.title, bx + bulkMaxW / 2, bulkSigStartY + 7, { align: 'center' })
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
          doc.text('Full Name:', bx + 3, bulkSigStartY + 16)
          doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
          doc.text(box.name, bx + 3, bulkSigStartY + 21, { maxWidth: bulkMaxW - 6 })
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
          doc.text('Designation:', bx + 3, bulkSigStartY + 30)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(0, 0, 0)
          doc.text(box.designation || '', bx + 3, bulkSigStartY + 35, { maxWidth: bulkMaxW - 6 })
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
          doc.text('Date:', bx + 3, bulkSigStartY + 42)
          doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
          doc.text(new Date().toLocaleDateString('en-ZA'), bx + 3, bulkSigStartY + 47)
          doc.setLineWidth(0.3); doc.setDrawColor(100, 100, 100)
          doc.line(bx + 3, bulkSigStartY + 53, bx + bulkMaxW - 3, bulkSigStartY + 53)
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
          doc.text('Signature', bx + bulkMaxW / 2, bulkSigStartY + 57, { align: 'center' })
          if (box.signatureUrl) {
            try {
              const img = new Image(); img.crossOrigin = 'anonymous'; img.src = box.signatureUrl
              await new Promise<void>(resolve => {
                const t = setTimeout(() => resolve(), 5000)
                img.onload = () => { clearTimeout(t); resolve() }
                img.onerror = () => { clearTimeout(t); resolve() }
              })
              if (img.complete && img.naturalWidth > 0)
                doc.addImage(img, 'PNG', bx + 5, bulkSigStartY + 44, bulkMaxW - 10, 10)
            } catch (_e) { /* skip */ }
          }
        }

        const pdfBytes = doc.output('arraybuffer')
        const sanitized = userName.replace(/[^a-z0-9]/gi, '_')
        zip.file(`${sanitized}_performance_agreement.pdf`, pdfBytes)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = zipUrl
      a.download = `performance-agreements-${type}-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(zipUrl)
    } catch (error) {
      console.error('Error exporting agreements:', error)
      toast({ title: 'Error exporting agreements. Please try again.', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  // Download individual employee's performance agreement
  const handleDownloadAgreement = async (userId: string, userName: string) => {
    setDownloadingUser(userId)
    try {
      const res = await fetch(`/dashboard/performance/api/performance-agreements/export/${userId}`)
      if (!res.ok) {
        toast({ title: 'Failed to fetch agreement data', variant: 'destructive' })
        return
      }

      const data = await res.json()
      const { agreements, user: targetUser, adhocTasks, hasRatings, scoreSummary, rating360, activePeriod, signatoryChain, quarterBreakdown } = data

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

      // Generate PDF client-side using jsPDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Add NSA Logo placeholder
      doc.setFillColor(0, 51, 102)
      doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255)
      doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      // Header
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(targetUser.name || userName, pageWidth / 2, 48, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`${targetUser.jobTitle || 'Staff'} - ${targetUser.department || 'N/A'}`, pageWidth / 2, 55, { align: 'center' })

      if (activePeriod) {
        const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        doc.setFontSize(10)
        doc.text(`${activePeriod.name}: ${formatDate(activePeriod.startDate)} - ${formatDate(activePeriod.endDate)}`, pageWidth / 2, 61, { align: 'center' })
      }

      // Filter regular agreements
      const regularAgreements = agreements.filter((a: any) => !a.isAdhocContainer)
      const totalWeight = regularAgreements.reduce((sum: number, a: any) => sum + (a.weight || 0), 0)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 68, { align: 'center' })

      if (hasRatings && scoreSummary) {
        doc.text(`Overall Performance Score: ${scoreSummary.finalRating.toFixed(2)} / 5.0  (${scoreSummary.finalPercentage.toFixed(1)}%)`, pageWidth / 2, 74, { align: 'center' })
      }

      // Prepare table data
      const tableData = regularAgreements.map((agreement: any) => {
        const goal = agreement.initiative?.objective?.goal
        const objective = agreement.initiative?.objective
        const initiative = agreement.initiative

        const dueDate = agreement.dueDate 
          ? new Date(agreement.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
          : 'N/A'

        const approvalStatusMap: Record<string, string> = {
          'APPROVED': 'Approved', 'PENDING': 'Pending', 'REJECTED': 'Rejected', 'NOT_STARTED': 'Not Started'
        }
        const approvalStatus = approvalStatusMap[agreement.approvalStatus || ''] || 'Not Submitted'

        const ratingDisplay = agreement.rating 
          ? (agreement.rating >= 4 ? 'Excellent' : agreement.rating >= 3 ? 'Good' : 'Needs Improvement')
          : ''
        const ratingValue = agreement.rating ? `(${agreement.rating})` : ''

        return [
          goal?.title || 'N/A',
          objective?.title || 'N/A',
          initiative?.title || agreement.title || 'N/A',
          initiative?.action || agreement.customAction || '',
          initiative?.measure || agreement.kpi || 'N/A',
          initiative?.target || agreement.target || 'N/A',
          `${agreement.weight || 0}%`,
          approvalStatus,
          dueDate,
          hasRatings ? `${ratingDisplay} ${ratingValue}`.trim() : '',
          agreement.evidenceUrl || ''
        ]
      })

      const tableHeader = ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Status', 'Deadline', 'Rating', 'Evidence']

      autoTable(doc, {
        startY: hasRatings ? 80 : 75,
        head: [tableHeader],
        body: tableData,
        theme: 'grid',
        styles: { overflow: 'linebreak', cellWidth: 'wrap', fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 34 },
          4: { cellWidth: 24 }, 5: { cellWidth: 22 }, 6: { cellWidth: 11, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' }, 8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 20, halign: 'center' }, 10: { cellWidth: 26 }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text('This is an official Performance Agreement document.', pageWidth / 2, pageHeight - 10, { align: 'center' })
          addStamp(doc, pageWidth, pageHeight)
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY || 150

      const RP_DARK_BLUE: [number,number,number] = [0, 51, 102]
      const RP_GOLD: [number,number,number] = [204, 153, 0]
      const getRpPerfLevel = (r: number) => r >= 4.5 ? 'Outstanding' : r >= 4.0 ? 'Excellent' : r >= 3.5 ? 'Very Good' : r >= 3.0 ? 'Good' : r >= 2.5 ? 'Satisfactory' : 'Needs Improvement'

      // ── Quarterly Breakdown (Q1–Q4) ──
      if (hasRatings && quarterBreakdown && quarterBreakdown.length > 0) {
        const rpQb = quarterBreakdown
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...RP_DARK_BLUE)
        doc.text('QUARTERLY PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('NSA Financial Year: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const rpQRows = rpQb.map((q: any) => [
          `${q.quarter} (${q.label})`,
          q.total > 0 ? String(q.total) : '-',
          q.rated > 0 ? String(q.rated) : '-',
          q.avgRating != null ? `${q.avgRating.toFixed(2)} / 5` : '-',
          q.avgRating != null ? getRpPerfLevel(q.avgRating) : '-',
        ])
        autoTable(doc, {
          startY: finalY,
          head: [['Quarter', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: rpQRows, theme: 'grid',
          headStyles: { fillColor: RP_GOLD, textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
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
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40

        // ── Bi-annual Breakdown (H1 / H2) ──
        finalY += 8
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...RP_DARK_BLUE)
        doc.text('BI-ANNUAL PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('H1 = Q1 + Q2 (Apr–Sep)  |  H2 = Q3 + Q4 (Oct–Mar)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const buildRpHalf = (qs: any[]) => {
          const tot = qs.reduce((s: number, q: any) => s + q.total, 0)
          const rat = qs.reduce((s: number, q: any) => s + q.rated, 0)
          const ratingSum = qs.reduce((s: number, q: any) => s + (q.avgRating != null ? q.avgRating * q.total : 0), 0)
          const avgR = tot > 0 && rat > 0 ? ratingSum / tot : null
          return { tot, rat, avgR }
        }
        const rh1 = buildRpHalf([rpQb[0], rpQb[1]])
        const rh2 = buildRpHalf([rpQb[2], rpQb[3]])
        const rpHalfRows = [
          ['H1 – First Half (Apr – Sep)', String(rh1.tot || '-'), String(rh1.rat || '-'), rh1.avgR != null ? `${rh1.avgR.toFixed(2)} / 5` : '-', rh1.avgR != null ? getRpPerfLevel(rh1.avgR) : '-'],
          ['H2 – Second Half (Oct – Mar)', String(rh2.tot || '-'), String(rh2.rat || '-'), rh2.avgR != null ? `${rh2.avgR.toFixed(2)} / 5` : '-', rh2.avgR != null ? getRpPerfLevel(rh2.avgR) : '-'],
        ]
        autoTable(doc, {
          startY: finalY,
          head: [['Period', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: rpHalfRows, theme: 'grid',
          headStyles: { fillColor: RP_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
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
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30
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

        const i3FmtR = (v: number | null | undefined) => (v != null) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const i3RaterRows = [
          ['Self', i3FmtR(rating360.selfRating), rating360.selfStatus || (rating360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', i3FmtR(rating360.supervisorRating), rating360.supervisorStatus || (rating360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', i3FmtR(rating360.deptRandomRating), rating360.deptRandomStatus || (rating360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', i3FmtR(rating360.orgRandomRating), rating360.orgRandomStatus || (rating360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (rating360.averageRating != null) i3RaterRows.push(['Overall Average', `${Number(rating360.averageRating).toFixed(2)} / 5`, 'Combined'])

        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, y3); y3 += 2
        autoTable(doc, {
          startY: y3, head: [['Perspective', 'Rating', 'Status']], body: i3RaterRows, theme: 'grid',
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
            if (data.row.index === i3RaterRows.length - 1 && i3RaterRows[i3RaterRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        y3 = (doc as any).lastAutoTable.finalY + 10

        const i3CompDetail = rating360.competencyDetail || []
        if (i3CompDetail.length > 0) {
          if (y3 + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); y3 = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, y3); doc.setTextColor(0, 0, 0); y3 += 2
          const i3FmtS = (v: number | null) => (v != null) ? Number(v).toFixed(2) : 'Pending'
          const i3FmtO = (v: number | null) => (v != null) ? `${Number(v).toFixed(2)} / 5` : '-'
          const i3CBody = i3CompDetail.map((c: any) => [c.competency, i3FmtS(c.selfScore), i3FmtS(c.supervisorScore), i3FmtS(c.deptRandomScore), i3FmtS(c.orgRandomScore), i3FmtO(c.overallAvg)])
          const i3Agg = (key: string) => { const vals = i3CompDetail.filter((c: any) => c[key] != null).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const i3OvArr = i3CompDetail.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
          i3CBody.push(['OVERALL AVERAGE', i3Agg('selfScore'), i3Agg('supervisorScore'), i3Agg('deptRandomScore'), i3Agg('orgRandomScore'), i3OvArr.length > 0 ? `${(i3OvArr.reduce((a: number, b: number) => a + b, 0) / i3OvArr.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: y3, head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']], body: i3CBody, theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === i3CBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < i3CBody.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
        } else if (rating360.competencyBreakdown?.length > 0 || rating360.categoryBreakdown?.length > 0) {
          const i3Legacy = rating360.competencyBreakdown?.length > 0 ? rating360.competencyBreakdown : rating360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          if (y3 + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); y3 = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, y3); y3 += 2
          autoTable(doc, {
            startY: y3, head: [['Competency / Category', 'Average Score', 'Responses']],
            body: i3Legacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount || 0}`]),
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
        }
      }

      // ── OVERALL PERFORMANCE SCORE SUMMARY ──
      if (hasRatings && scoreSummary) {
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...RP_DARK_BLUE)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 10
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${targetUser.name}`, 14, finalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 10
        const comp = scoreSummary.components
        const wts = scoreSummary.weights
        const summaryData = [
          ['Performance Agreements', `${wts.performanceAgreement}%`, `${comp.performanceAgreement.rating.toFixed(2)} / 5`, `${comp.performanceAgreement.weightedScore.toFixed(2)}`, `${comp.performanceAgreement.ratedCount || 0}/${comp.performanceAgreement.initiativesCount} rated`],
          ['Ad-hoc Tasks', `${wts.adhoc}%`, `${comp.adhoc.rating.toFixed(2)} / 5`, `${comp.adhoc.weightedScore.toFixed(2)}`, `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed`],
          ['Projects', `${wts.projects}%`, `${comp.projects.rating.toFixed(2)} / 5`, `${comp.projects.weightedScore.toFixed(2)}`, comp.projects.tasksTotal > 0 ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal}` : 'No tasks'],
          ['Risk Management', `${wts.riskManagement}%`, `${comp.riskManagement.rating.toFixed(2)} / 5`, `${comp.riskManagement.weightedScore.toFixed(2)}`, comp.riskManagement.tasksTotal > 0 ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal}` : 'No tasks'],
          ['Audit Tasks', `${wts.audit}%`, `${comp.audit.rating.toFixed(2)} / 5`, `${comp.audit.weightedScore.toFixed(2)}`, comp.audit.tasksTotal > 0 ? `${comp.audit.tasksCompleted}/${comp.audit.tasksTotal}` : 'No tasks'],
          ['360-Degree Rating', `${wts.rating360 || 0}%`, `${(comp.rating360?.rating || 0).toFixed(2)} / 5`, `${(comp.rating360?.weightedScore || 0).toFixed(2)}`, comp.rating360?.hasAnyRatings ? 'Completed' : 'Not started'],
          ['OVERALL TOTAL', '100%', `${scoreSummary.finalRating.toFixed(2)} / 5`, `${scoreSummary.finalRating.toFixed(2)}`, `${scoreSummary.finalPercentage.toFixed(1)}%`]
        ]
        autoTable(doc, {
          startY: finalY, head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']], body: summaryData, theme: 'grid',
          headStyles: { fillColor: RP_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.row.index === summaryData.length - 1) {
              data.cell.styles.fillColor = RP_DARK_BLUE; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60
        finalY += 6
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...RP_DARK_BLUE)
        doc.text(`Overall Performance Level: ${getRpPerfLevel(scoreSummary.finalRating)}`, pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 8
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Add signature section
      doc.addPage()
      addStamp(doc, pageWidth, pageHeight)
      const indivSigStartY = 30
      const indivAllBoxes: { title: string; name: string; designation: string; signatureUrl: string | null }[] = [
        { title: 'EMPLOYEE', name: targetUser.name || userName, designation: targetUser.jobTitle || '', signatureUrl: targetUser.signatureUrl || null },
        ...((signatoryChain || []).map((s: any) => ({
          title: s.role === 'SUPERVISOR' ? 'SUPERVISOR' : s.role === 'MANAGER' ? 'MANAGER' : s.role === 'DSG' ? 'DEPUTY SG' : 'EXECUTIVE',
          name: s.name || '', designation: s.designation || '', signatureUrl: s.signatureUrl || null
        })))
      ].filter(b => b.name && b.name.trim() !== '')
      const indivSeenNames = new Set<string>()
      const indivSigBoxes = indivAllBoxes.filter(b => {
        if (indivSeenNames.has(b.name.toLowerCase())) return false
        indivSeenNames.add(b.name.toLowerCase()); return true
      })
      const indivMaxW = 65, indivGap = 4
      const indivTotalW = indivSigBoxes.length * indivMaxW + (indivSigBoxes.length - 1) * indivGap
      const indivStartX = (pageWidth - indivTotalW) / 2
      const indivBoxH = 55
      for (let ii = 0; ii < indivSigBoxes.length; ii++) {
        const box = indivSigBoxes[ii]
        const bx = indivStartX + ii * (indivMaxW + indivGap)
        doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5)
        doc.rect(bx, indivSigStartY, indivMaxW, indivBoxH)
        doc.setFillColor(0, 51, 102); doc.rect(bx, indivSigStartY, indivMaxW, 10, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255)
        doc.text(box.title, bx + indivMaxW / 2, indivSigStartY + 7, { align: 'center' })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
        doc.text('Full Name:', bx + 3, indivSigStartY + 16)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
        doc.text(box.name, bx + 3, indivSigStartY + 21, { maxWidth: indivMaxW - 6 })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
        doc.text('Designation:', bx + 3, indivSigStartY + 30)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(0, 0, 0)
        doc.text(box.designation || '', bx + 3, indivSigStartY + 35, { maxWidth: indivMaxW - 6 })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
        doc.text('Date:', bx + 3, indivSigStartY + 42)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
        doc.text(new Date().toLocaleDateString('en-ZA'), bx + 3, indivSigStartY + 47)
        doc.setLineWidth(0.3); doc.setDrawColor(100, 100, 100)
        doc.line(bx + 3, indivSigStartY + 53, bx + indivMaxW - 3, indivSigStartY + 53)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0, 51, 102)
        doc.text('Signature', bx + indivMaxW / 2, indivSigStartY + 57, { align: 'center' })
        if (box.signatureUrl) {
          try {
            const img = new Image(); img.crossOrigin = 'anonymous'; img.src = box.signatureUrl
            await new Promise<void>(resolve => {
              const t = setTimeout(() => resolve(), 5000)
              img.onload = () => { clearTimeout(t); resolve() }
              img.onerror = () => { clearTimeout(t); resolve() }
            })
            if (img.complete && img.naturalWidth > 0)
              doc.addImage(img, 'PNG', bx + 5, indivSigStartY + 44, indivMaxW - 10, 10)
          } catch (_e) { /* skip */ }
        }
      }

      // Save PDF
      doc.save(`${userName.replace(/\s+/g, '_')}_performance_agreement.pdf`)

    } catch (error) {
      console.error('Error downloading agreement:', error)
      toast({ title: 'Failed to generate PDF. Please try again.', variant: 'destructive' })
    } finally {
      setDownloadingUser(null)
    }
  }

  // Filter and paginate employees
  const filteredEmployees = stats?.allEmployees?.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []
  
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE)
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
          <p className="text-gray-500">Comprehensive performance insights and analytics</p>
        </div>
      </div>

      {/* Summary Stats Cards */}
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
                <p className="text-sm text-gray-500">Agreements Approved</p>
                <p className="text-3xl font-bold text-green-600">{stats?.staffWithApprovedAgreements || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-600">{stats?.agreementsPending || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Rating</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.averageRating?.toFixed(1) || '0.0'} <span className="text-lg font-normal text-purple-400">/ 5</span></p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Level Tabs */}
      <Tabs value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization">Organisation</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="download">Download Agreements</TabsTrigger>
        </TabsList>

        {/* Organisation Level */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organisation Overview
              </CardTitle>
              <CardDescription>
                Performance summary across the entire organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Completion Rate</span>
                    <span className="text-sm font-bold text-blue-600">{stats?.organizationCompletion || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${stats?.organizationCompletion || 0}%` }}
                    />
                  </div>
                </div>

                {/* Narrative */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Executive Summary</h4>
                  <p className="text-sm text-blue-800">
                    The organisation has <strong>{stats?.totalStaff || 0}</strong> staff members. 
                    Out of these, <strong>{stats?.staffWithApprovedAgreements || 0}</strong> staff have fully approved performance agreements, 
                    representing a <strong>{stats?.organizationCompletion || 0}%</strong> completion rate. 
                    There are currently <strong>{stats?.agreementsPending || 0}</strong> agreements pending approval. 
                    The average performance rating across the organisation is <strong>{stats?.averageRating?.toFixed(1) || 0} / 5</strong>.
                  </p>
                </div>

                {/* Top Performers */}
                {stats?.topPerformers && stats.topPerformers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      Top Performers
                    </h4>
                    <div className="space-y-2">
                      {stats.topPerformers.slice(0, 5).map((performer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{performer.name}</p>
                              <p className="text-xs text-gray-500">{performer.department} • {performer.position}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            {Number(performer.rating).toFixed(1)} / 5
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Level */}
        <TabsContent value="department" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Department Performance
                  </CardTitle>
                  <CardDescription>
                    Performance breakdown by department
                  </CardDescription>
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {stats?.departments?.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(selectedDepartment === 'all' ? stats?.departments : stats?.departments?.filter(d => d.name === selectedDepartment))?.map((dept, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                      <Badge variant={dept.completionRate >= 80 ? 'default' : dept.completionRate >= 50 ? 'secondary' : 'destructive'}>
                        {dept.completionRate}% Complete
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Staff</p>
                        <p className="font-semibold">{dept.staffCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Submitted</p>
                        <p className="font-semibold">{dept.submittedCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Approved</p>
                        <p className="font-semibold text-green-600">{dept.approvedCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Rating</p>
                        <p className="font-semibold text-purple-600">{dept.averageRating?.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${dept.completionRate >= 80 ? 'bg-green-600' : dept.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${dept.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Level */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Individual Performance
                  </CardTitle>
                  <CardDescription>
                    All staff members with their performance ratings
                  </CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search by name, email, or department..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-3 bg-gray-100 rounded-lg font-medium text-sm text-gray-700 mb-2">
                <div className="col-span-4">Employee</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Agreements</div>
                <div className="col-span-2 text-center">Avg Rating</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Employee List */}
              <div className="space-y-2">
                {paginatedEmployees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No employees found matching your search' : 'No employees data available'}
                  </div>
                ) : (
                  paginatedEmployees.map((employee, index) => (
                    <div key={employee.userId} className="grid grid-cols-12 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors items-center">
                      <div className="col-span-4">
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.email}</p>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">
                        {employee.department}
                      </div>
                      <div className="col-span-2 text-sm">
                        <span className="text-green-600 font-medium">{employee.approvedCount}</span>
                        <span className="text-gray-400"> / {employee.agreementCount}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        {employee.allRated && employee.avgRating > 0 ? (
                          <Badge variant={employee.avgRating >= 80 ? 'default' : employee.avgRating >= 50 ? 'secondary' : 'outline'}>
                            {employee.avgRating}%
                          </Badge>
                        ) : employee.ratedCount > 0 ? (
                          <span className="text-xs text-amber-600">
                            {employee.ratedCount}/{employee.approvedCount} rated
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not rated</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        {employee.hasApprovedAgreements ? (
                          <Badge variant={employee.avgRating >= 80 ? 'default' : employee.avgRating >= 50 ? 'secondary' : 'outline'}>
                            {employee.approvedCount} approved
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No approved</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employees
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Download Agreements Tab */}
        <TabsContent value="download" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download Performance Agreements
              </CardTitle>
              <CardDescription>
                Export comprehensive performance agreements data for all users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Approved Agreements Section */}
              <div className="p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Approved Agreements</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Export all approved performance agreements across the organization. 
                  Excel includes comprehensive data for all users, PDF generates a zip file with individual agreements.
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportAllAgreements('excel', 'approved')}
                    disabled={exporting}
                    className="bg-white"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export Excel (All Approved)
                  </Button>
                  <Button 
                    onClick={() => handleExportAllAgreements('pdf', 'approved')}
                    disabled={exporting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Export PDF Zip (All Approved)
                  </Button>
                </div>
              </div>

              {/* Rated Agreements Section */}
              <div className="p-6 border-2 border-green-200 rounded-lg bg-green-50">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Rated Agreements</h3>
                <p className="text-sm text-green-700 mb-4">
                  Export only rated performance agreements (agreements with performance ratings). 
                  Excel includes comprehensive data, PDF generates a zip file with individual rated agreements.
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleExportAllAgreements('excel', 'rated')}
                    disabled={exporting}
                    className="bg-white"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export Excel (All Rated)
                  </Button>
                  <Button 
                    onClick={() => handleExportAllAgreements('pdf', 'rated')}
                    disabled={exporting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Export PDF Zip (All Rated)
                  </Button>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Export Information:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Excel exports</strong> contain comprehensive data for all users in a single spreadsheet</li>
                      <li><strong>PDF exports</strong> generate a zip file containing individual PDF agreements for each user</li>
                      <li><strong>Approved</strong> includes all agreements with approved status</li>
                      <li><strong>Rated</strong> includes only agreements that have been rated (performance scores assigned)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
