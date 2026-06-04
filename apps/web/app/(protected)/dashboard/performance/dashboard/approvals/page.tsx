'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { CheckSquare, Star, ExternalLink, Clock, FileText, Award, Download, Loader2, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TaskApprovalModal } from '@/components/performance/components/dashboard/task-approval-modal'
import { EvidencePreviewModal, parseEvidenceUrls } from '@/components/performance/components/dashboard/evidence-preview-modal'
import { colors } from '@/app/ui-standards'

interface PendingAgreement {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    jobTitle?: string | null
    department?: { name: string }
    division?: { name: string }
  }
  agreements: Array<{
    id: string
    title?: string
    description?: string
    kpi?: string
    target?: string
    customAction: string
    weight: number
    status?: string
    percentComplete?: number
    evidenceUrl?: string | null
    evidenceNotes?: string | null
    rating?: number | null
    progressNotes?: string | null
    approvalStatus?: string
    confirmedAt?: string | null
    approvedAt?: string | null
    completedAt?: string | null
    ratingApprovalLevel?: number | null
    ratingApprovalChain?: {
      chain: Array<{ level: number; userId: string; name: string; email: string; jobTitle: string | null }>
      approvals: Array<{ level: number; userId: string; name: string; action: string; approvedAt: string; comment: string | null; newRating?: number | null }>
    } | null
    initiative: {
      title: string
      measure?: string
      target?: string
      objective: {
        title: string
        goal: { title: string; goalNumber: string }
      }
    }
    performancePeriod?: {
      id: string
      name: string
      startDate: string
      endDate: string
    }
    dueDate: string
  }>
  submittedAt: string | null
  totalWeight: number
  overallStatus: string
  isComplete: boolean
  incompleteCount: number
  counts: {
    total: number
    pending: number
    approved: number
    rejected: number
    notSubmitted: number
  }
}

interface PendingTask {
  id: string
  title: string
  description?: string
  status: string
  dueDate: string
  completedAt?: string
  staffRating: number
  evidenceUrl?: string
  evidenceNotes?: string
  submittedForApproval?: string
  responsible: {
    id: string
    name: string
    email: string
    department?: {
      name: string
    }
    division?: {
      name: string
    }
  }
  initiative: {
    title: string
    objective: {
      title: string
      goal: {
        title: string
      }
    }
  }
}

export default function ApprovalsPage() {
  const { data: session } = useSession()
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [pendingAgreements, setPendingAgreements] = useState<PendingAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null)
  const [selectedAgreement, setSelectedAgreement] = useState<PendingAgreement | null>(null)
  const [activeTab, setActiveTab] = useState<'tasks' | 'agreements'>('agreements')
  const [pendingDetailsAgreement, setPendingDetailsAgreement] = useState<PendingAgreement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'none' | 'partial'>('all')
  const [viewDetailsSubordinate, setViewDetailsSubordinate] = useState<PendingAgreement | null>(null)
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(null)
  const [pdfTypeModal, setPdfTypeModal] = useState<{ subordinate: PendingAgreement } | null>(null)
  const [ratingActionId, setRatingActionId] = useState<string | null>(null)
  const [ratingOverrideValue, setRatingOverrideValue] = useState<number>(3)
  const [ratingLoading, setRatingLoading] = useState<string | null>(null)
  const [ratingComment, setRatingComment] = useState<string>('')
  const [expandedAcceptedCards, setExpandedAcceptedCards] = useState<Set<string>>(new Set())
  const [detailsRatingTab, setDetailsRatingTab] = useState<'all' | 'awaiting' | 'rejected' | 'accepted' | 'unrated'>('all')
  const [detailsQuarterFilter, setDetailsQuarterFilter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all')
  const [ratingProgressFilter, setRatingProgressFilter] = useState<'all' | 'started' | 'not_started' | 'in_progress'>('all')
  const [previewEvidence, setPreviewEvidence] = useState<{ url: string | null; notes?: string | null } | null>(null)
  const [ratingConfirm, setRatingConfirm] = useState<{ agreementId: string; action: 'accept' | 'reject' | 'alter' | 'modify_accepted'; newRating?: number } | null>(null)
  
  // Read tab from URL parameter on component mount
  useEffect(() => {
    // Use window.location.search to avoid SSR issues
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'tasks' || tabParam === 'agreements') {
        setActiveTab(tabParam)
      }
    }
  }, [])
  
  // Check if user can approve tasks â€” any authenticated user may be a supervisor
  // The API handles actual authorization by checking managerId relationships
  const canApprove = !!session?.user?.id
  const hasFetchedRef = useRef(false)

  const fetchPendingApprovals = async () => {
    console.log('=== fetchPendingApprovals called ===')
    if (!canApprove) {
      setLoading(false)
      return
    }
    try {
      console.log('Fetching pending approvals...')
      const [tasksRes, agreementsRes] = await Promise.all([
        fetch('/dashboard/performance/api/targets/pending-approval'),
        fetch('/dashboard/performance/api/performance-agreements/pending-approval')
      ])
      
      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setPendingTasks(data)
      }
      
      if (agreementsRes.ok) {
        const data = await agreementsRes.json()
        console.log(`Received ${data.length} total agreements`)
        const needsAction = data.filter((a: PendingAgreement) => !a.isComplete || a.counts.pending > 0 || (a.counts as any).submitted > 0)
        console.log(`${needsAction.length} agreements need action`)
        setPendingAgreements(data)
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRatingAction = async (agreementId: string, action: 'accept' | 'reject' | 'alter' | 'modify_accepted', newRating?: number) => {
    // Validate comment required for reject/alter/modify_accepted
    if ((action === 'reject' || action === 'alter' || action === 'modify_accepted') && !ratingComment.trim()) {
      toast({ title: 'A comment is required for this action.', variant: 'destructive' })
      return
    }
    // Validate new rating required for alter/modify_accepted
    if ((action === 'alter' || action === 'modify_accepted') && (!newRating || newRating < 1 || newRating > 5)) {
      toast({ title: 'A valid rating (1-5) is required for this action.', variant: 'destructive' })
      return
    }
    setRatingLoading(agreementId)
    try {
      const endpoint = action === 'modify_accepted' 
        ? '/dashboard/performance/api/performance-agreements/modify-accepted-rating'
        : '/dashboard/performance/api/performance-agreements/update-rating'
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, action, newRating, comment: ratingComment.trim() || undefined })
      })
      if (res.ok) {
        await fetchPendingApprovals()
        // Refresh the viewDetailsSubordinate data
        if (viewDetailsSubordinate) {
          const freshRes = await fetch('/dashboard/performance/api/performance-agreements/pending-approval')
          if (freshRes.ok) {
            const freshData = await freshRes.json()
            const updated = freshData.find((s: any) => s.userId === viewDetailsSubordinate.userId)
            if (updated) setViewDetailsSubordinate(updated)
          }
        }
        setRatingActionId(null)
        setRatingComment('')
      } else {
        const err = await res.json()
        toast({ title: err.error || 'Failed to update rating', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      toast({ title: 'Failed to update rating', variant: 'destructive' })
    } finally {
      setRatingLoading(null)
    }
  }

  // Show modal to choose rated or unrated before downloading
  const handleDownloadClick = (subordinate: PendingAgreement, e: React.MouseEvent) => {
    e.stopPropagation()
    const allApproved = subordinate.agreements.length > 0 &&
      subordinate.agreements.every(a => a.approvalStatus === 'APPROVED')
    if (!allApproved) {
      toast({ title: 'Cannot download: Not all agreements are approved yet.', variant: 'destructive' })
      return
    }
    setPdfTypeModal({ subordinate })
  }

  // Download signed agreement PDF for a subordinate - exact same PDF as my-performance-agreements page
  const downloadAgreementPDF = async (subordinate: PendingAgreement, downloadType: 'rated' | 'unrated') => {
    console.log('[APPROVALS] Starting PDF download for:', subordinate.userId, subordinate.userName, 'type:', downloadType)
    setPdfTypeModal(null)
    setDownloadingUserId(subordinate.userId)
    
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      // Fetch the subordinate's full export data (same endpoint as my-tasks page uses)
      const apiUrl = `/dashboard/performance/api/performance-agreements/export/${subordinate.userId}`
      console.log('[APPROVALS] Fetching from:', apiUrl)
      const response = await fetch(apiUrl, {
        credentials: 'include'
      })
      console.log('[APPROVALS] Response status:', response.status, response.ok)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[APPROVALS] API error response:', errorText)
        throw new Error(`Failed to fetch subordinate data: ${response.status} ${errorText}`)
      }
      
      const { user, agreements, activePeriod, signatoryChain, hasRatings: apiHasRatings, scoreSummary, adhocTasks, rating360, quarterBreakdown } = await response.json()
      console.log('[APPROVALS] Fetched data:', { userName: user?.name, agreementsCount: agreements?.length, hasRatings: apiHasRatings })
      
      // For unrated download, treat as if no ratings regardless of API response
      const hasRatings = downloadType === 'rated' ? apiHasRatings : false
      
      // Create PDF - same format as subordinate would generate
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Load NSA stamp for watermark - define addStamp function before any table rendering
      const stampImg = new Image()
      stampImg.crossOrigin = 'anonymous'
      stampImg.src = '/nored-stamp.png'
      let stampLoaded = false
      
      // Define addStamp immediately so it's available in all callbacks
      const addStamp = (d: any, pw: number, ph: number) => {
        if (!stampLoaded) return
        try {
          d.addImage(stampImg, 'PNG', pw - 35, ph - 35, 25, 25)
        } catch (e) {
          console.error('Error adding stamp:', e)
        }
      }
      
      // Load stamp asynchronously
      await new Promise<void>(resolve => {
        const t = setTimeout(() => resolve(), 3000)
        stampImg.onload = () => { 
          stampLoaded = true
          clearTimeout(t)
          resolve()
        }
        stampImg.onerror = () => { 
          clearTimeout(t)
          resolve()
        }
      })

      // Compute employee initials (first letter of first + last name)
      const nameParts = (user.name || '').trim().split(/\s+/)
      const initials = nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : (nameParts[0]?.[0] || '').toUpperCase()
      
      // Add NSA Logo
      try {
        const logoRes = await fetch('/nored-logo.svg')
        const svgText = await logoRes.text()
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svgBlob)
        const img = new Image()
        img.src = url
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          setTimeout(reject, 5000)
        })
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 200
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, 200, 200)
          ctx.drawImage(img, 0, 0, 200, 200)
          doc.addImage(canvas.toDataURL('image/png'), 'PNG', pageWidth / 2 - 15, 10, 30, 30)
        }
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Logo error:', error)
        doc.setFillColor(0, 51, 102)
        doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      }
      
      doc.setTextColor(0, 0, 0)

      // Period info
      const formatPdfDate = (dateValue: any): string => {
        if (!dateValue) return 'Not set'
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return 'Not set'
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      }

      const startDate = activePeriod ? formatPdfDate(activePeriod.startDate) : 'Not set'
      const endDate = activePeriod ? formatPdfDate(activePeriod.endDate) : 'Not set'
      const periodName = activePeriod?.name || 'Performance Cycle'

      // 'Namibia Statistics Agency' subtitle below logo
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Namibia Statistics Agency', pageWidth / 2, 44, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      // Employee name prominently
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(user.name, pageWidth / 2, 52, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(periodName, pageWidth / 2, 59, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 65, { align: 'center' })

      // Calculate totals
      const regularAgreements = agreements.filter((a: any) => !a.isAdhocContainer)
      const totalWeight = regularAgreements.reduce((sum: number, a: any) => sum + (a.weight || 0), 0)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 72, { align: 'center' })

      if (hasRatings && scoreSummary) {
        doc.text(`Overall Performance Score: ${scoreSummary.finalRating.toFixed(2)} / 5.0  (${scoreSummary.finalPercentage.toFixed(1)}%)`, pageWidth / 2, 78, { align: 'center' })
      }
      
      // Prepare table data
      const tableData = regularAgreements.map((a: any) => {
        const goal = a.initiative?.objective?.goal
        const objective = a.initiative?.objective
        const initiative = a.initiative
        
        let dueDate = 'N/A'
        if (a.dueDate) {
          dueDate = new Date(a.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
        }
        
        const approvalStatusMap: Record<string, string> = { 'APPROVED': 'Approved', 'PENDING': 'Pending', 'REJECTED': 'Rejected', 'NOT_STARTED': 'Not Started' }
        const approvalStatus = approvalStatusMap[a.approvalStatus || ''] || 'Not Submitted'
        
        const ratingDisplay = a.rating 
          ? (a.rating >= 4 ? 'Exceptionally Well' : a.rating >= 3 ? 'Complete' : 'In Progress')
          : ''
        const ratingValue = a.rating ? `(${a.rating})` : ''
        
        const fullRow = [
          goal?.title || 'N/A',
          objective?.title || 'N/A',
          initiative?.title || a.title || 'N/A',
          initiative?.action || a.customAction || '',
          initiative?.measure || a.kpi || 'N/A',
          initiative?.target || a.target || 'N/A',
          `${a.weight || 0}%`,
          approvalStatus,
          dueDate,
          hasRatings ? `${ratingDisplay} ${ratingValue}`.trim() : '',
          a.evidenceUrl || ''
        ]
        // Unrated: drop Rating (index 9) and Sources of Evidence (index 10)
        return downloadType === 'unrated' ? fullRow.slice(0, 9) : fullRow
      })
      
      // Add ad-hoc container row if exists
      const adhocContainer = agreements.find((a: any) => a.isAdhocContainer)
      if (adhocContainer) {
        const adhocRating = adhocContainer.rating 
          ? (adhocContainer.rating >= 4 ? 'Exceptionally Well' : adhocContainer.rating >= 3 ? 'Complete' : 'In Progress')
          : ''
        const adhocFullRow = [
          '-', '-', 'Ad-hoc Tasks',
          hasRatings ? `See breakdown below (${adhocTasks?.length || 0} tasks)` : 'Various ad-hoc assignments',
          '-', '-', '10%', 'N/A',
          adhocContainer.dueDate ? new Date(adhocContainer.dueDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
          hasRatings ? `${adhocRating} (${adhocContainer.rating || '-'})` : '',
          ''
        ]
        tableData.push(downloadType === 'unrated' ? adhocFullRow.slice(0, 9) : adhocFullRow)
      }
      
      const tableStartY = hasRatings ? 85 : 80
      
      const tableHeaders = downloadType === 'unrated'
        ? ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Approval Status', 'Deadline']
        : ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Approval Status', 'Deadline', 'Rating', 'Sources of Evidence']

      const tableColumnStyles: any = downloadType === 'unrated'
        ? {
            0: { cellWidth: 28 }, 1: { cellWidth: 30 }, 2: { cellWidth: 34 }, 3: { cellWidth: 40 },
            4: { cellWidth: 28 }, 5: { cellWidth: 26 }, 6: { cellWidth: 13, halign: 'center' },
            7: { cellWidth: 20, halign: 'center' }, 8: { cellWidth: 22, halign: 'center' }
          }
        : {
            0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 34 },
            4: { cellWidth: 24 }, 5: { cellWidth: 22 }, 6: { cellWidth: 11, halign: 'center' },
            7: { cellWidth: 16, halign: 'center' }, 8: { cellWidth: 18, halign: 'center' },
            9: { cellWidth: 20, halign: 'center' }, 10: { cellWidth: 26 }
          }

      autoTable(doc, {
        startY: tableStartY,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        tableWidth: 'auto',
        styles: { overflow: 'linebreak', cellWidth: 'wrap', fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, valign: 'middle' },
        columnStyles: tableColumnStyles,
        margin: { left: 14, right: 14 },
        didDrawPage: function() {
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text('This is an official Performance Agreement document.', pageWidth / 2, pageHeight - 12, { align: 'center' })
        }
      })
      
      let finalY = (doc as any).lastAutoTable.finalY || 150

      const AP_DARK_BLUE: [number,number,number] = [0, 51, 102]
      const AP_GOLD: [number,number,number] = [204, 153, 0]
      const getApPerfLevel = (r: number) => r >= 4.5 ? 'Outstanding' : r >= 4.0 ? 'Excellent' : r >= 3.5 ? 'Very Good' : r >= 3.0 ? 'Good' : r >= 2.5 ? 'Satisfactory' : 'Needs Improvement'

      // ── Quarterly Breakdown (Q1–Q4) — before 360 and Summary ──
      if (quarterBreakdown && quarterBreakdown.length > 0) {
        const apQb = quarterBreakdown
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE)
        doc.text('QUARTERLY PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('NSA Financial Year: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const apQRows = apQb.map((q: any) => [
          `${q.quarter} (${q.label})`,
          q.total > 0 ? String(q.total) : '-',
          q.rated > 0 ? String(q.rated) : '-',
          q.avgRating != null ? `${q.avgRating.toFixed(2)} / 5` : '-',
          q.avgRating != null ? getApPerfLevel(q.avgRating) : '-',
        ])
        autoTable(doc, {
          startY: finalY, head: [['Quarter', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']], body: apQRows, theme: 'grid',
          headStyles: { fillColor: AP_GOLD, textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
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
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE)
        doc.text('BI-ANNUAL PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('H1 = Q1 + Q2 (Apr–Sep)  |  H2 = Q3 + Q4 (Oct–Mar)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const buildApHalf = (qs: any[]) => {
          const tot = qs.reduce((s: number, q: any) => s + q.total, 0)
          const rat = qs.reduce((s: number, q: any) => s + q.rated, 0)
          const ratingSum = qs.reduce((s: number, q: any) => s + (q.avgRating != null ? q.avgRating * q.total : 0), 0)
          const avgR = tot > 0 && rat > 0 ? ratingSum / tot : null
          return { tot, rat, avgR }
        }
        const ah1 = buildApHalf([apQb[0], apQb[1]])
        const ah2 = buildApHalf([apQb[2], apQb[3]])
        const apHalfRows = [
          ['H1 – First Half (Apr – Sep)', String(ah1.tot || '-'), String(ah1.rat || '-'), ah1.avgR != null ? `${ah1.avgR.toFixed(2)} / 5` : '-', ah1.avgR != null ? getApPerfLevel(ah1.avgR) : '-'],
          ['H2 – Second Half (Oct – Mar)', String(ah2.tot || '-'), String(ah2.rat || '-'), ah2.avgR != null ? `${ah2.avgR.toFixed(2)} / 5` : '-', ah2.avgR != null ? getApPerfLevel(ah2.avgR) : '-'],
        ]
        autoTable(doc, {
          startY: finalY, head: [['Period', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']], body: apHalfRows, theme: 'grid',
          headStyles: { fillColor: AP_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
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
      // ============================================
      if (rating360) {
        doc.addPage()
        addStamp(doc, pageWidth, pageHeight)
        finalY = 20

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 51, 102)
        doc.text('360-DEGREE BEHAVIOURAL COMPETENCY RATING', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 7

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text('NSA Behavioural Competency evaluation — Self, Supervisor, Dept. (Random) & Org. (Random)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 6

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Cycle: ${rating360.cycleName || 'N/A'}`, 14, finalY)
        doc.text(`Status: ${rating360.status || 'In Progress'}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 8

        const ap3FmtR = (v: number | null | undefined) => (v != null) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const ap3RaterRows: string[][] = [
          ['Self', ap3FmtR(rating360.selfRating), rating360.selfStatus || (rating360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', ap3FmtR(rating360.supervisorRating), rating360.supervisorStatus || (rating360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', ap3FmtR(rating360.deptRandomRating), rating360.deptRandomStatus || (rating360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', ap3FmtR(rating360.orgRandomRating), rating360.orgRandomStatus || (rating360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (rating360.averageRating != null) ap3RaterRows.push(['Overall Average', `${Number(rating360.averageRating).toFixed(2)} / 5`, 'Combined'])
        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, finalY); finalY += 2
        autoTable(doc, {
          startY: finalY, head: [['Perspective', 'Rating', 'Status']], body: ap3RaterRows, theme: 'grid',
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
            if (data.row.index === ap3RaterRows.length - 1 && ap3RaterRows[ap3RaterRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        const ap3CompDetail = rating360.competencyDetail || []
        if (ap3CompDetail.length > 0) {
          finalY += 10
          if (finalY + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, finalY)
          doc.setTextColor(0, 0, 0); finalY += 2
          const ap3FmtS = (v: number | null) => (v != null) ? Number(v).toFixed(2) : 'Pending'
          const ap3FmtO = (v: number | null) => (v != null) ? `${Number(v).toFixed(2)} / 5` : '-'
          const ap3CompBody = ap3CompDetail.map((c: any) => [c.competency, ap3FmtS(c.selfScore), ap3FmtS(c.supervisorScore), ap3FmtS(c.deptRandomScore), ap3FmtS(c.orgRandomScore), ap3FmtO(c.overallAvg)])
          const ap3Agg = (key: string) => { const vals = ap3CompDetail.filter((c: any) => c[key] != null).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const ap3OvArr = ap3CompDetail.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
          ap3CompBody.push(['OVERALL AVERAGE', ap3Agg('selfScore'), ap3Agg('supervisorScore'), ap3Agg('deptRandomScore'), ap3Agg('orgRandomScore'), ap3OvArr.length > 0 ? `${(ap3OvArr.reduce((a: number, b: number) => a + b, 0) / ap3OvArr.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: finalY, head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']], body: ap3CompBody, theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === ap3CompBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < ap3CompBody.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        } else if (rating360.competencyBreakdown?.length > 0 || rating360.categoryBreakdown?.length > 0) {
          const ap3Legacy = rating360.competencyBreakdown?.length > 0 ? rating360.competencyBreakdown : rating360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          finalY += 10
          if (finalY + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, finalY); finalY += 2
          autoTable(doc, {
            startY: finalY, head: [['Competency / Category', 'Average Score', 'Responses']],
            body: ap3Legacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount} response(s)`]),
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        }
      }

      // ── 360-DEGREE PERFORMANCE FEEDBACK REPORT (approvals) ──
      console.log('[APPROVALS] 360 data check:', { 
        hasRating360: !!rating360, 
        hasCompetencyDetail: !!rating360?.competencyDetail,
        competencyDetailLength: rating360?.competencyDetail?.length,
        rating360Keys: rating360 ? Object.keys(rating360) : []
      })
      
      if (rating360?.competencyDetail?.length > 0) {
        console.log('[APPROVALS] Rendering 360-Degree Performance Feedback Report')
        const fb360Ap = rating360.competencyDetail
        const NSA_COMPS_ORDER_AP = ['Integrity', 'Excellent Performance', 'Professionalism', 'Accountability', 'Partnership', 'Customer-focussed']
        type ApFbGuide = { ratings: string[]; getFeedback: (s: number) => string }
        const nsa360GuideAp: Record<string, ApFbGuide> = {
          'Integrity': { ratings: ['Ethical standards not consistently demonstrated','Occasional concerns regarding transparency or fairness','Demonstrates acceptable ethical conduct','Strong commitment to ethical behaviour','Exemplary integrity and ethical leadership'],
            getFeedback: (s) => s >= 4 ? 'Your rating demonstrates a strong commitment to integrity and ethical behaviour. Your transparency, fairness, and consistent ethical decision-making are recognised and valued within the organisation. Continue to serve as a role model for ethical leadership.' : s >= 3 ? 'Your rating indicates that you demonstrate integrity in your work and adhere to professional and ethical standards. Continuing to promote transparency, fairness, and ethical decision-making will reinforce trust within the organisation.' : 'The assessment suggests further development in demonstrating consistent ethical conduct is recommended. Focusing on transparency, adherence to organisational values, and fairness in decision-making will strengthen integrity and trust.' },
          'Excellent Performance': { ratings: ['Performance outcomes below required standards','Inconsistent quality or productivity','Performance meets expected standards','Performance exceeds normal expectations','Exceptional results and outstanding work quality'],
            getFeedback: (s) => s >= 4 ? 'Your rating reflects that your performance consistently exceeds expectations. The quality of your outputs, productivity, and commitment to excellence are commendable. Continue to pursue high standards and inspire others through your example.' : s >= 3 ? 'Your performance generally meets the expected standards for your role. Continuing to focus on productivity, quality improvement, and proactive problem-solving will help you achieve even higher levels of performance.' : 'The assessment indicates an opportunity to improve performance outcomes. Focusing on work quality, productivity, and ensuring outputs consistently meet organisational standards will enhance your contribution.' },
          'Professionalism': { ratings: ['Professional conduct below expected standards','Inconsistent professional behaviour','Maintains acceptable professional standards','Demonstrates strong professionalism','Exemplary professional conduct and role model behaviour'],
            getFeedback: (s) => s >= 4 ? 'Your rating reflects a strong commitment to professionalism. Your conduct, communication, and work ethic consistently demonstrate high standards. Continue to serve as a role model for professional behaviour and contribute to a positive workplace culture.' : s >= 3 ? 'You maintain professional behaviour in your interactions and work practices. Continuing to demonstrate respect, reliability, and effective communication will further strengthen professionalism.' : 'The assessment suggests an opportunity to further develop professional conduct. Focusing on communication, workplace behaviour, reliability, and adherence to professional standards will enhance your effectiveness.' },
          'Accountability': { ratings: ['Responsibilities frequently not fulfilled','Inconsistent ownership of tasks and outcomes','Acceptable level of responsibility and reliability','Strong ownership and follow-through','Outstanding accountability and ownership of results'],
            getFeedback: (s) => s >= 4 ? 'Your rating reflects strong ownership and consistent follow-through on your responsibilities. Your reliability and commitment to delivering results are recognised. Continue to demonstrate this standard and support a culture of accountability within your team.' : s >= 3 ? 'The assessment indicates that you generally fulfil your responsibilities and complete tasks as expected. Strengthening consistency in follow-through and proactive ownership of responsibilities will further improve performance in this area.' : 'The assessment highlights an opportunity to strengthen accountability. Developing greater ownership of tasks, ensuring consistent follow-through on commitments, and proactively managing responsibilities will positively impact effectiveness and reliability.' },
          'Partnership': { ratings: ['Limited collaboration with colleagues and stakeholders','Inconsistent cooperation and teamwork','Maintains effective working relationships','Actively promotes collaboration and teamwork','Demonstrates exceptional partnership and relationship-building'],
            getFeedback: (s) => s >= 4 ? 'Your rating demonstrates that you actively promote collaboration and contribute meaningfully to team objectives. Your ability to build and maintain effective relationships with colleagues and stakeholders is recognised. Continue to champion teamwork and strengthen cross-departmental partnerships.' : s >= 3 ? 'Your rating suggests that you generally maintain constructive relationships with colleagues and contribute positively to teamwork. Strengthening collaboration across departments and actively supporting team initiatives can further enhance partnership effectiveness.' : 'The assessment suggests further development in building collaborative relationships is recommended. Actively engaging with colleagues, seeking opportunities to support team objectives, and improving communication across stakeholder groups will strengthen partnership.' },
          'Customer-focussed': { ratings: ['Limited responsiveness to stakeholder needs','Inconsistent service delivery','Provides reliable service to stakeholders','Proactively responds to stakeholder needs','Delivers exceptional service and stakeholder engagement'],
            getFeedback: (s) => s >= 4 ? 'Your rating demonstrates that you proactively respond to stakeholder needs and deliver a high level of service. Your commitment to stakeholder satisfaction is recognised. Continue to anticipate and address stakeholder needs and promote a service-oriented culture.' : s >= 3 ? 'The feedback suggests that you provide reliable service and respond appropriately to stakeholder needs. Further strengthening responsiveness and anticipating stakeholder expectations can enhance service quality.' : 'The assessment highlights an opportunity to strengthen customer-focused behaviour. Improving responsiveness to stakeholder needs, enhancing service quality, and consistently prioritising stakeholder satisfaction will improve performance in this area.' },
        }
        const sortedFbAp = [...fb360Ap].sort((a: any, b: any) => { const ai = NSA_COMPS_ORDER_AP.indexOf(a.competency); const bi = NSA_COMPS_ORDER_AP.indexOf(b.competency); return ai === -1 && bi === -1 ? 0 : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi })
        const ovArrAp = sortedFbAp.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
        const overallAvgAp = ovArrAp.length > 0 ? ovArrAp.reduce((a, b) => a + b, 0) / ovArrAp.length : 0
        const strsAp = sortedFbAp.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) >= 3.5)
        const devAp = sortedFbAp.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) < 3.0)
        const dispStrsAp = strsAp.length > 0 ? strsAp : sortedFbAp.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(b.overallAvg) - Number(a.overallAvg)).slice(0, 3)
        const dispDevAp = devAp.length > 0 ? devAp : sortedFbAp.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(a.overallAvg) - Number(b.overallAvg)).filter((c: any) => Number(c.overallAvg) < 3.5).slice(0, 2)
        const narrAp = (s: number) => s >= 4.5 ? 'The results of the 360-degree assessment indicate that your overall performance is exceptional, consistently exceeding organisational expectations across all competency areas. Your contributions are highly valued, and you serve as a role model for colleagues. Continue to leverage your strengths and support the development of others within the organisation.' : s >= 4.0 ? 'The results of the 360-degree assessment indicate that your overall performance exceeds organisational expectations in several key competency areas. You demonstrate strong capabilities and contribute positively to team and organisational outcomes. Continued focus on sustaining these strengths while developing identified areas will further enhance your effectiveness.' : s >= 3.0 ? 'The results of the 360-degree assessment indicate that your overall performance meets organisational expectations, with several areas demonstrating strong capability. You contribute positively to the work environment and generally perform your responsibilities reliably. Strengthening certain competencies will further enhance your effectiveness and contribution to the organisation.' : s >= 2.0 ? 'The results of the 360-degree assessment indicate that there are opportunities for growth in your performance. While some areas show positive contributions, developing key competencies will be important for meeting organisational expectations. Engaging with available development resources and seeking feedback will support improvement.' : 'The results of the 360-degree assessment indicate that significant development is needed across most competency areas. A focused development plan, supported by your supervisor and relevant training opportunities, will be essential to improving performance and meeting organisational expectations.'

        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...AP_DARK_BLUE); doc.rect(14, finalY - 4, pageWidth - 28, 14, 'F')
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('360-DEGREE PERFORMANCE FEEDBACK REPORT', pageWidth / 2, finalY + 5, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 18
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
        doc.text(`Employee: ${user.name}   |   Cycle: ${rating360.cycleName || 'N/A'}   |   Overall Rating: ${overallAvgAp.toFixed(2)} / 5`, 14, finalY)
        doc.setTextColor(0, 0, 0); finalY += 10

        doc.setFillColor(...AP_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('1.  Overall Performance Insight', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Final Rating Interpretation', 14, finalY); finalY += 4
        autoTable(doc, {
          startY: finalY, theme: 'grid', head: [['Rating', 'Interpretation']],
          body: [['1','Unsatisfactory Performance'],['2','Below Expected Standard'],['3','Meets Expectations'],['4','Exceeds Expectations'],['5','Excellent Performance']],
          headStyles: { fillColor: AP_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5 },
          columnStyles: { 0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 120 } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(overallAvgAp)))) { data.cell.styles.fillColor = AP_GOLD; data.cell.styles.fontStyle = 'bold' } }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30; finalY += 5
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE); doc.text('Narrative', 14, finalY); finalY += 4
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9)
        const narrApLines = doc.splitTextToSize(narrAp(overallAvgAp), pageWidth - 28); doc.text(narrApLines, 14, finalY); finalY += narrApLines.length * 4 + 10

        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(34, 139, 34); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('2.  Strengths Summary', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text(doc.splitTextToSize('This section highlights areas where your performance exceeds expectations or demonstrates strong capability.', pageWidth - 28), 14, finalY); finalY += 8
        doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize('Based on the assessment results, the following areas have been identified as key strengths:', pageWidth - 28), 14, finalY); finalY += 8; doc.setFont('helvetica', 'normal')
        dispStrsAp.forEach((c: any) => {
          if (finalY + 15 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          const g = nsa360GuideAp[c.competency]; if (!g) return
          const sIdx = Math.min(4, Math.max(0, Math.round(Number(c.overallAvg)) - 1))
          doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 100, 0); doc.setFontSize(9)
          doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
          doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
          const dl = doc.splitTextToSize(g.ratings[sIdx], pageWidth - 36); doc.text(dl, 20, finalY); finalY += dl.length * 4 + 4
        })
        doc.text(doc.splitTextToSize('These strengths contribute significantly to team performance and organisational effectiveness. You are encouraged to continue leveraging these capabilities and to support colleagues through collaboration, mentoring, or knowledge sharing.', pageWidth - 28), 14, finalY); finalY += 12

        if (dispDevAp.length > 0) {
          if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(180, 40, 40); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
          doc.text('3.  Development Areas', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
          doc.setFontSize(9); doc.setFont('helvetica', 'normal')
          doc.text(doc.splitTextToSize('This section highlights competencies where performance improvement or further development is recommended.', pageWidth - 28), 14, finalY); finalY += 8
          doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize('The assessment results suggest that additional development may be beneficial in the following areas:', pageWidth - 28), 14, finalY); finalY += 8; doc.setFont('helvetica', 'normal')
          dispDevAp.forEach((c: any) => {
            if (finalY + 20 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
            const g = nsa360GuideAp[c.competency]; if (!g) return
            doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 40, 40); doc.setFontSize(9)
            doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
            const fl = doc.splitTextToSize(g.getFeedback(Number(c.overallAvg)), pageWidth - 32); doc.text(fl, 20, finalY); finalY += fl.length * 4 + 6
          })
          doc.text(doc.splitTextToSize('Addressing these areas will support your continued professional growth and improve your contribution to the organisation.', pageWidth - 28), 14, finalY); finalY += 10
        }

        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...AP_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('4.  Competency Feedback', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Below is the interpretation of your ratings for each competency area.', 14, finalY); finalY += 8
        sortedFbAp.forEach((c: any) => {
          const g = nsa360GuideAp[c.competency]; if (!g) return
          const score = c.overallAvg != null ? Number(c.overallAvg) : null
          if (finalY + 55 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(235, 241, 250); doc.rect(14, finalY, pageWidth - 28, 7, 'F')
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE)
          doc.text(`${c.competency}${score != null ? `  \u2014  ${score.toFixed(2)} / 5` : ''}`, 16, finalY + 5); doc.setTextColor(0, 0, 0); finalY += 11
          autoTable(doc, {
            startY: finalY, theme: 'grid', head: [['Rating', 'Guide']], body: g.ratings.map((desc, idx) => [String(idx + 1), desc]),
            headStyles: { fillColor: [100,100,100], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 1.5 },
            bodyStyles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 130 } },
            margin: { left: 14, right: 14 },
            didParseCell: (data: any) => { if (data.section === 'body' && score != null && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(score)))) { data.cell.styles.fillColor = AP_GOLD; data.cell.styles.fontStyle = 'bold' } }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 25; finalY += 3
          if (score != null) {
            doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 50)
            const fl = doc.splitTextToSize(g.getFeedback(score), pageWidth - 28); doc.text(fl, 14, finalY); finalY += fl.length * 4 + 10
          }
        })
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(...AP_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('5.  Recommended Development Actions', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        ;['Participate in training programmes that strengthen collaboration, accountability, or performance management skills.',
          'Seek feedback from supervisors and colleagues on ways to enhance performance in key competency areas.',
          'Identify opportunities to take on new responsibilities or projects that build leadership and professional capability.',
          'Engage in mentoring, peer learning, or knowledge-sharing initiatives.',
        ].forEach(action => {
          if (finalY + 12 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          const lines = doc.splitTextToSize(`\u2022  ${action}`, pageWidth - 30); doc.text(lines, 16, finalY); finalY += lines.length * 4 + 4
        })
      }

      // ── OVERALL PERFORMANCE SCORE SUMMARY ──
      if (hasRatings && scoreSummary) {
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 10
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${user.name}`, 14, finalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 10
        const comp = scoreSummary.components
        const weights = scoreSummary.weights
        const summaryTableData = [
          ['Performance Agreements', `${weights.performanceAgreement}%`, `${comp.performanceAgreement.rating.toFixed(2)} / 5`, `${comp.performanceAgreement.weightedScore.toFixed(2)}`, `${comp.performanceAgreement.ratedCount || 0}/${comp.performanceAgreement.initiativesCount} rated`],
          ['Ad-hoc Tasks', `${weights.adhoc}%`, `${comp.adhoc.rating.toFixed(2)} / 5`, `${comp.adhoc.weightedScore.toFixed(2)}`, `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed (${comp.adhoc.completionRate.toFixed(0)}%)`],
          ['Projects', `${weights.projects}%`, `${comp.projects.rating.toFixed(2)} / 5`, `${comp.projects.weightedScore.toFixed(2)}`, comp.projects.tasksTotal > 0 ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal} completed` : 'No project tasks'],
          ['Risk Management', `${weights.riskManagement}%`, `${comp.riskManagement.rating.toFixed(2)} / 5`, `${comp.riskManagement.weightedScore.toFixed(2)}`, comp.riskManagement.tasksTotal > 0 ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal} completed` : 'No risk tasks'],
          ['Audit Tasks', `${weights.audit}%`, `${comp.audit.rating.toFixed(2)} / 5`, `${comp.audit.weightedScore.toFixed(2)}`, comp.audit.tasksTotal > 0 ? `${comp.audit.tasksCompleted}/${comp.audit.tasksTotal} completed` : 'No audit tasks'],
          ['360-Degree Rating', `${weights.rating360 || 0}%`, `${(comp.rating360?.rating || 0).toFixed(2)} / 5`, `${(comp.rating360?.weightedScore || 0).toFixed(2)}`, comp.rating360?.hasAnyRatings ? (comp.rating360.hasCompleted ? 'Completed' : 'In progress') : 'Not started'],
          ['OVERALL TOTAL', '100%', `${scoreSummary.finalRating.toFixed(2)} / 5`, `${scoreSummary.finalRating.toFixed(2)}`, `${scoreSummary.finalPercentage.toFixed(1)}%`]
        ]
        autoTable(doc, {
          startY: finalY, head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']], body: summaryTableData, theme: 'grid',
          headStyles: { fillColor: AP_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: function(data: any) {
            if (data.row.index === summaryTableData.length - 1) {
              data.cell.styles.fillColor = AP_DARK_BLUE; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 10
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60
        finalY += 6
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...AP_DARK_BLUE)
        doc.text(`Overall Performance Level: ${getApPerfLevel(scoreSummary.finalRating)}`, pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 8
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Ad-hoc tasks breakdown (same as my-tasks page)
      if (hasRatings && adhocTasks && adhocTasks.length > 0) {
        if (finalY + 40 > pageHeight - 20) {
          doc.addPage()
          finalY = 20
        } else {
          finalY += 15
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 51, 102)
        doc.text('AD-HOC TASKS BREAKDOWN', 14, finalY)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(`Total Ad-hoc Tasks Completed: ${adhocTasks.length}`, 14, finalY + 6)

        const avgRating = adhocTasks.reduce((sum: number, t: any) => sum + (t.rating || 0), 0) / adhocTasks.length
        doc.text(`Average Rating: ${avgRating.toFixed(2)}/5`, 14, finalY + 12)

        const adhocTableData = adhocTasks.map((task: any, index: number) => {
          const completedDate = task.completedAt
            ? new Date(task.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A'
          return [index + 1, task.title || 'Untitled', task.description || '-', task.priority || 'MEDIUM', completedDate, `${task.rating}/5`]
        })

        autoTable(doc, {
          startY: finalY + 18,
          head: [['#', 'Task Title', 'Description', 'Priority', 'Completed Date', 'Rating']],
          body: adhocTableData,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
          bodyStyles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 60 }, 2: { cellWidth: 100 },
            3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 30, halign: 'center' }, 5: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 14, right: 14 }
        })

        finalY = (doc as any).lastAutoTable.finalY || finalY + 40
      }

      // ============================================
      // 360-DEGREE BEHAVIOURAL COMPETENCY RATING (legacy fallback only)
      // ============================================
      if (false && !hasRatings && rating360) {
        doc.addPage()
        addStamp(doc, pageWidth, pageHeight)
        finalY = 20

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 51, 102)
        doc.text('360-DEGREE BEHAVIOURAL COMPETENCY RATING', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 7

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text('NSA Behavioural Competency evaluation — Self, Supervisor, Dept. (Random) & Org. (Random)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 6

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Cycle: ${rating360.cycleName || 'N/A'}`, 14, finalY)
        doc.text(`Status: ${rating360.status || 'In Progress'}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 8

        const ap3FmtR = (v: number | null | undefined) => (v != null) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const ap3RaterRows = [
          ['Self', ap3FmtR(rating360.selfRating), rating360.selfStatus || (rating360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', ap3FmtR(rating360.supervisorRating), rating360.supervisorStatus || (rating360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', ap3FmtR(rating360.deptRandomRating), rating360.deptRandomStatus || (rating360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', ap3FmtR(rating360.orgRandomRating), rating360.orgRandomStatus || (rating360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (rating360.averageRating != null) ap3RaterRows.push(['Overall Average', `${Number(rating360.averageRating).toFixed(2)} / 5`, 'Combined'])

        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, finalY); finalY += 2

        autoTable(doc, {
          startY: finalY,
          head: [['Perspective', 'Rating', 'Status']],
          body: ap3RaterRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 45, halign: 'center' }, 2: { cellWidth: 50, halign: 'center' } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.column.index === 2) {
              const v = data.cell.raw as string
              if (v === 'Completed') { data.cell.styles.textColor = [46, 125, 50]; data.cell.styles.fontStyle = 'bold' }
              else if (v === 'Pending') { data.cell.styles.textColor = [180, 100, 0] }
            }
            if (data.row.index === ap3RaterRows.length - 1 && ap3RaterRows[ap3RaterRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40

        const ap3CompDetail = rating360.competencyDetail || []
        if (ap3CompDetail.length > 0) {
          finalY += 10
          if (finalY + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, finalY)
          doc.setTextColor(0, 0, 0); finalY += 2
          const ap3FmtS = (v: number | null) => (v != null) ? Number(v).toFixed(2) : 'Pending'
          const ap3FmtO = (v: number | null) => (v != null) ? `${Number(v).toFixed(2)} / 5` : '-'
          const ap3CompBody = ap3CompDetail.map((c: any) => [c.competency, ap3FmtS(c.selfScore), ap3FmtS(c.supervisorScore), ap3FmtS(c.deptRandomScore), ap3FmtS(c.orgRandomScore), ap3FmtO(c.overallAvg)])
          const ap3Agg = (key: string) => { const vals = ap3CompDetail.filter((c: any) => c[key] != null).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const ap3OvArr = ap3CompDetail.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
          ap3CompBody.push(['OVERALL AVERAGE', ap3Agg('selfScore'), ap3Agg('supervisorScore'), ap3Agg('deptRandomScore'), ap3Agg('orgRandomScore'), ap3OvArr.length > 0 ? `${(ap3OvArr.reduce((a: number, b: number) => a + b, 0) / ap3OvArr.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: finalY,
            head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']],
            body: ap3CompBody,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === ap3CompBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < ap3CompBody.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        } else if (rating360.competencyBreakdown?.length > 0 || rating360.categoryBreakdown?.length > 0) {
          const ap3Legacy = rating360.competencyBreakdown?.length > 0 ? rating360.competencyBreakdown : rating360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          finalY += 10
          if (finalY + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, finalY); finalY += 2
          autoTable(doc, {
            startY: finalY, head: [['Competency / Category', 'Average Score', 'Responses']],
            body: ap3Legacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount} response(s)`]),
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        }
      }

      // Signature section - uses signatoryChain from export API (same as my-tasks page)
      const userJobTitleLower = (user.jobTitle || '').toLowerCase()
      let employeeRoleLabel = 'EMPLOYEE'
      if (userJobTitleLower.includes('statistician') && userJobTitleLower.includes('general') && !userJobTitleLower.includes('deputy')) {
        employeeRoleLabel = 'STATISTICIAN GENERAL'
      } else if (userJobTitleLower.includes('deputy') && userJobTitleLower.includes('statistician')) {
        employeeRoleLabel = 'DEPUTY STATISTICIAN GENERAL'
      } else if (userJobTitleLower.includes('executive') && !userJobTitleLower.includes('deputy') && !userJobTitleLower.includes('assistant')) {
        employeeRoleLabel = 'EXECUTIVE'
      }

      const supervisorEntry = signatoryChain?.find((s: any) => s.role === 'SUPERVISOR')
      const managerEntry = signatoryChain?.find((s: any) => s.role === 'MANAGER')
      const executiveEntry = signatoryChain?.find((s: any) => s.role === 'EXECUTIVE' || s.role === 'DSG' || s.role === 'SG')
      const executiveRoleLabel = executiveEntry?.role === 'DSG' ? 'DEPUTY STATISTICIAN GENERAL' : executiveEntry?.role === 'SG' ? 'STATISTICIAN GENERAL' : 'EXECUTIVE'

      const signaturesData = {
        employee: {
          name: user.name,
          designation: user.jobTitle || '',
          signature: user.signatureUrl || null,
          date: new Date().toLocaleDateString('en-ZA')
        },
        supervisor: {
          name: supervisorEntry?.name || '',
          designation: supervisorEntry?.designation || '',
          signature: supervisorEntry?.signatureUrl || null,
          date: supervisorEntry ? new Date().toLocaleDateString('en-ZA') : null
        },
        manager: {
          name: managerEntry?.name || '',
          designation: managerEntry?.designation || '',
          signature: managerEntry?.signatureUrl || null,
          date: managerEntry?.signatureUrl ? new Date().toLocaleDateString('en-ZA') : null
        },
        executive: {
          name: executiveEntry?.name || '',
          designation: executiveEntry?.designation || '',
          signature: executiveEntry?.signatureUrl || null,
          date: executiveEntry?.signatureUrl ? new Date().toLocaleDateString('en-ZA') : null
        }
      }

      // Override employee role label in the box title
      doc.addPage([297, 336])
      await addSignatureSection(doc, 30, signaturesData, employeeRoleLabel, executiveRoleLabel)

      // Stamp footer (page number + initials) on every page now that all content is added
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        const pw = doc.internal.pageSize.getWidth()
        const ph = doc.internal.pageSize.getHeight()
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        // Page number â€” bottom center
        doc.setTextColor(100, 100, 100)
        doc.text(`Page ${p} of ${totalPages}`, pw / 2, ph - 6, { align: 'center' })
        // Initials â€” bottom right, styled
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 51, 102)
        doc.text(initials, pw - 14, ph - 6, { align: 'right' })
        doc.setTextColor(0, 0, 0)
      }

      // Save PDF
      const ratingStatus = downloadType === 'rated' ? 'Rated' : 'Unrated'
      const fileName = `Performance_Agreement_${ratingStatus}_${user.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error generating subordinate PDF:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: subordinate.userId,
        userName: subordinate.userName
      })
      toast({ 
        title: 'Failed to generate PDF', 
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive' 
      })
    } finally {
      setDownloadingUserId(null)
    }
  }

  // addSignatureSection helper - exact same as my-tasks/performance page
  const addSignatureSection = async (
    doc: any,
    startY: number,
    signaturesData: {
      employee: { name: string; designation: string; signature: string | null; date: string | null };
      supervisor: { name: string; designation: string; signature: string | null; date: string | null };
      manager: { name: string; designation: string; signature: string | null; date: string | null };
      executive: { name: string; designation: string; signature: string | null; date: string | null };
    },
    employeeRoleLabel = 'EMPLOYEE',
    executiveRoleLabel = 'EXECUTIVE'
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth()
    const boxHeight = 55
    const boxY = startY

    const allBoxes = [
      { title: employeeRoleLabel, ...signaturesData.employee },
      { title: 'SUPERVISOR', ...signaturesData.supervisor },
      { title: 'MANAGER', ...signaturesData.manager },
      { title: executiveRoleLabel, ...signaturesData.executive }
    ]

    const signatureBoxes = allBoxes.filter((box, index) => {
      if (!box.name || box.name.trim() === '') return false
      for (let j = index + 1; j < allBoxes.length; j++) {
        if (allBoxes[j].name && allBoxes[j].name.trim() === box.name.trim()) return false
      }
      return true
    })

    const maxBoxWidth = 65
    const boxGap = 4
    const totalBoxesWidth = (signatureBoxes.length * maxBoxWidth) + ((signatureBoxes.length - 1) * boxGap)
    const startX = (pageWidth - totalBoxesWidth) / 2
    const dynamicBoxWidth = maxBoxWidth

    for (let i = 0; i < signatureBoxes.length; i++) {
      const box = signatureBoxes[i]
      const boxX = startX + (i * (dynamicBoxWidth + 4))

      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.rect(boxX, boxY, dynamicBoxWidth, boxHeight)

      doc.setFillColor(0, 51, 102)
      doc.rect(boxX, boxY, dynamicBoxWidth, 8, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(box.title, boxX + dynamicBoxWidth / 2, boxY + 5.5, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Full Name:', boxX + 3, boxY + 14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.name || '_________________', boxX + 3, boxY + 19)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Designation:', boxX + 3, boxY + 26)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.designation || '_________________', boxX + 3, boxY + 31)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Date:', boxX + 3, boxY + 38)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.date || '_________________', boxX + 3, boxY + 43)

      doc.setLineWidth(0.3)
      doc.line(boxX + 3, boxY + 50, boxX + dynamicBoxWidth - 3, boxY + 50)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Signature', boxX + dynamicBoxWidth / 2, boxY + 54, { align: 'center' })

      if (box.signature) {
        try {
          const sigRes = await fetch(box.signature)
          const sigBlob = await sigRes.blob()
          const sigBlobUrl = URL.createObjectURL(sigBlob)
          const sigImg = new Image()
          sigImg.src = sigBlobUrl
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)
            sigImg.onload = () => { clearTimeout(timeout); resolve() }
            sigImg.onerror = (e) => { clearTimeout(timeout); reject(e) }
          })
          const sigCanvas = document.createElement('canvas')
          sigCanvas.width = sigImg.naturalWidth || 400
          sigCanvas.height = sigImg.naturalHeight || 200
          const sigCtx = sigCanvas.getContext('2d')
          if (sigCtx) {
            sigCtx.drawImage(sigImg, 0, 0)
            doc.addImage(sigCanvas.toDataURL('image/png'), 'PNG', boxX + 5, boxY + 44, dynamicBoxWidth - 10, 10)
          }
          URL.revokeObjectURL(sigBlobUrl)
        } catch (error) {
          console.error(`Error loading ${box.title} signature:`, error)
        }
      }
    }

    doc.setTextColor(0, 0, 0)

    // NSA Stamp â€” centered below signature section
    const stampSize = 60
    const stampX = (pageWidth - stampSize) / 2
    const stampY = boxY + boxHeight + 8
    try {
      const stampRes = await fetch('/nored-stamp.png')
      const stampBlob = await stampRes.blob()
      const stampBlobUrl = URL.createObjectURL(stampBlob)
      const stampImg = new Image()
      stampImg.src = stampBlobUrl
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3000)
        stampImg.onload = () => { clearTimeout(timeout); resolve() }
        stampImg.onerror = () => { clearTimeout(timeout); resolve() }
      })
      const stampCanvas = document.createElement('canvas')
      stampCanvas.width = stampImg.naturalWidth || 200
      stampCanvas.height = stampImg.naturalHeight || 200
      const stampCtx = stampCanvas.getContext('2d')
      if (stampCtx && stampImg.naturalWidth > 0) {
        stampCtx.drawImage(stampImg, 0, 0)
        doc.addImage(stampCanvas.toDataURL('image/png'), 'PNG', stampX, stampY, stampSize, stampSize)
      }
      URL.revokeObjectURL(stampBlobUrl)
    } catch {
      // stamp not critical, skip silently
    }
    doc.setTextColor(0, 0, 0)
  }

  useEffect(() => {
    if (!canApprove) return
    // Only run once when canApprove first becomes true; subsequent re-renders
    // of the session object must not re-trigger the full fetch.
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchPendingApprovals()
    // Auto-refresh every 30 seconds â€” set once only
    const interval = setInterval(fetchPendingApprovals, 30000)
    return () => clearInterval(interval)
  }, [canApprove])

  if (!canApprove) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm mt-2">Only supervisors can access task approvals</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Approvals</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Review and approve submissions from your team
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-base px-3 py-1">
            <Award className="h-4 w-4 mr-1" />
            {pendingAgreements.length} Subordinate{pendingAgreements.length !== 1 ? 's' : ''}
            {pendingAgreements.filter(a => a.counts.pending > 0).length > 0 && (
              <span className="ml-1 text-yellow-600">
                ({pendingAgreements.filter(a => a.counts.pending > 0).length} pending)
              </span>
            )}
          </Badge>
        </div>
      </div>

      {/* Summary metric cards - clickable filters */}
      {(() => {
        const totalCount = pendingAgreements.length
        const pendingCount = pendingAgreements.filter(a => a.counts.pending > 0).length
        const approvedCount = pendingAgreements.filter(a => a.isComplete).length
        const noneCount = pendingAgreements.filter(a => a.counts.total === 0).length
        const partialCount = totalCount - pendingCount - approvedCount - noneCount

        const cards = [
          {
            key: 'all' as const,
            label: 'Total Staff',
            count: totalCount,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            activeBg: 'ring-2 ring-blue-400',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )
          },
          {
            key: 'pending' as const,
            label: 'Pending Review',
            count: pendingCount,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            activeBg: 'ring-2 ring-yellow-400',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
          },
          {
            key: 'approved' as const,
            label: 'Fully Approved',
            count: approvedCount,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            activeBg: 'ring-2 ring-green-400',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
          },
          {
            key: 'partial' as const,
            label: 'In Progress',
            count: partialCount,
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            activeBg: 'ring-2 ring-purple-400',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            )
          },
          {
            key: 'none' as const,
            label: 'No Agreement',
            count: noneCount,
            iconBg: 'bg-gray-100',
            iconColor: 'text-gray-500',
            activeBg: 'ring-2 ring-gray-400',
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            )
          },
        ]

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-2">
            {cards.map(card => (
              <button
                key={card.key}
                onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : card.key)}
                className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all cursor-pointer ${statusFilter === card.key ? card.activeBg : ''}`}
              >
                <div className={`${card.iconBg} ${card.iconColor} p-2.5 rounded-full`}>
                  {card.icon}
                </div>
                <span className="text-2xl font-bold text-gray-800">{card.count}</span>
                <span className={`text-xs font-medium ${card.iconColor}`}>{card.label}</span>
              </button>
            ))}
          </div>
        )
      })()}

      {/* Rating progress stats row */}
      {(() => {
        const total = pendingAgreements.length

        // Started rating: at least one approved agreement has a rating set
        const startedRating = pendingAgreements.filter(a =>
          a.agreements.some((ag: any) => ag.approvalStatus === 'APPROVED' && ag.rating != null && ag.rating > 0)
        ).length

        // Not started: has approved agreements but zero ratings set
        const notStarted = pendingAgreements.filter(a => {
          const approved = a.agreements.filter((ag: any) => ag.approvalStatus === 'APPROVED')
          return approved.length > 0 && approved.every((ag: any) => ag.rating == null || ag.rating === 0)
        }).length

        // In progress: started rating but NOT all approved actions have a fully-accepted (level 99) rating
        const inProgress = pendingAgreements.filter(a => {
          const approved = a.agreements.filter((ag: any) => ag.approvalStatus === 'APPROVED')
          if (approved.length === 0) return false
          const hasAnyRating = approved.some((ag: any) => ag.rating != null && ag.rating > 0)
          const allFullyAccepted = approved.every((ag: any) => (ag.ratingApprovalLevel ?? 0) === 99)
          return hasAnyRating && !allFullyAccepted
        }).length

        const ratingCards = [
          {
            filterKey: 'started' as const,
            label: 'Started Rating',
            sub: total > 0 ? `${startedRating} of ${total} colleagues` : 'no agreements',
            value: startedRating,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            valueColor: 'text-blue-700',
            activeBg: 'ring-2 ring-blue-400 bg-blue-50',
            icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          },
          {
            filterKey: 'not_started' as const,
            label: 'Not Yet Started',
            sub: total > 0 ? `${notStarted} of ${total} colleagues` : 'no agreements',
            value: notStarted,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-500',
            valueColor: 'text-red-600',
            activeBg: 'ring-2 ring-red-400 bg-red-50',
            icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          },
          {
            filterKey: 'in_progress' as const,
            label: 'Rating In Progress',
            sub: 'started but not complete',
            value: inProgress,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            valueColor: 'text-amber-700',
            activeBg: 'ring-2 ring-amber-400 bg-amber-50',
            icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          },
        ]

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2">
            {ratingCards.map((card) => (
              <button
                key={card.filterKey}
                onClick={() => setRatingProgressFilter(prev => prev === card.filterKey ? 'all' : card.filterKey)}
                className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-1.5 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                  ratingProgressFilter === card.filterKey ? card.activeBg : ''
                }`}
              >
                <div className={`${card.iconBg} ${card.iconColor} p-2.5 rounded-full`}>
                  {card.icon}
                </div>
                <span className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</span>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{card.label}</span>
                <span className="text-[11px] text-gray-400 text-center leading-tight">
                  {ratingProgressFilter === card.filterKey ? '▲ Click to clear filter' : card.sub}
                </span>
              </button>
            ))}
          </div>
        )
      })()}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, email, department or job title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Unified Subordinates Grid - ALL subordinates, all statuses */}
      {(() => {
        const filtered = pendingAgreements.filter(a => {
          // Apply rating progress filter from stat cards
          if (ratingProgressFilter === 'started') {
            if (!a.agreements.some((ag: any) => ag.approvalStatus === 'APPROVED' && ag.rating != null && ag.rating > 0)) return false
          }
          if (ratingProgressFilter === 'not_started') {
            const approv = a.agreements.filter((ag: any) => ag.approvalStatus === 'APPROVED')
            if (approv.length === 0 || !approv.every((ag: any) => ag.rating == null || ag.rating === 0)) return false
          }
          if (ratingProgressFilter === 'in_progress') {
            const approv = a.agreements.filter((ag: any) => ag.approvalStatus === 'APPROVED')
            const hasAny = approv.some((ag: any) => ag.rating != null && ag.rating > 0)
            const allDone = approv.every((ag: any) => (ag.ratingApprovalLevel ?? 0) === 99)
            if (!hasAny || allDone) return false
          }
          // Apply approval status filter
          if (statusFilter === 'pending' && a.counts.pending === 0) return false
          if (statusFilter === 'approved' && !a.isComplete) return false
          if (statusFilter === 'none' && a.counts.total !== 0) return false
          if (statusFilter === 'partial' && (a.counts.total === 0 || a.isComplete || a.counts.pending > 0)) return false
          // Apply search filter
          if (!searchQuery.trim()) return true
          const q = searchQuery.toLowerCase()
          return (
            a.user.name.toLowerCase().includes(q) ||
            a.user.email.toLowerCase().includes(q) ||
            (a.user.department?.name || '').toLowerCase().includes(q) ||
            (a.user.jobTitle || '').toLowerCase().includes(q)
          )
        })
        // Sort: purely alphabetical A–Z by full name
        const sorted = [...filtered].sort((a, b) => a.user.name.localeCompare(b.user.name))

        const getStatusBadge = (agreement: typeof sorted[0]) => {
          if (agreement.isComplete) return <Badge className="bg-green-100 text-green-800 text-xs border border-green-300">✔ All Approved</Badge>
          switch (agreement.overallStatus) {
            case 'NO_ASSIGNMENTS': return <Badge className="bg-gray-100 text-gray-800 text-xs">No Agreement</Badge>
            case 'NOT_SUBMITTED': return <Badge className="bg-gray-100 text-gray-800 text-xs">Not Submitted</Badge>
            case 'PENDING': return <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ Pending Review</Badge>
            case 'MIXED': return (
              <div className="flex gap-1 flex-wrap">
                {agreement.counts.approved > 0 && <Badge className="bg-green-100 text-green-800 text-xs">✔ {agreement.counts.approved}</Badge>}
                {agreement.counts.rejected > 0 && <Badge className="bg-red-100 text-red-800 text-xs">✗ {agreement.counts.rejected}</Badge>}
                {agreement.counts.pending > 0 && <Badge className="bg-yellow-100 text-yellow-800 text-xs">⏳ {agreement.counts.pending}</Badge>}
              </div>
            )
            default: return <Badge className="bg-gray-100 text-gray-800 text-xs">Unknown</Badge>
          }
        }

        return sorted.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No subordinates found</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(agreement => {
              const ratedCount = agreement.agreements.filter((a: any) => a.rating != null && a.rating > 0).length
              // Compute weighted overall rating from rated approved actions
              const ratedApproved = agreement.agreements.filter((a: any) => a.approvalStatus === 'APPROVED' && a.rating != null && a.rating > 0)
              const totalApprovedWeight = agreement.agreements.filter((a: any) => a.approvalStatus === 'APPROVED').reduce((s: number, a: any) => s + (a.weight || 0), 0)
              const weightedRatingSum = ratedApproved.reduce((s: number, a: any) => s + (a.rating * (a.weight || 0)), 0)
              const overallRating = totalApprovedWeight > 0 && ratedApproved.length > 0
                ? weightedRatingSum / totalApprovedWeight
                : null
              const allApprovedRated = ratedApproved.length > 0 && ratedApproved.length === agreement.agreements.filter((a: any) => a.approvalStatus === 'APPROVED').length
              const canReview = agreement.counts.total > 0 && (agreement.counts.pending > 0 || agreement.counts.approved > 0 || agreement.counts.rejected > 0)
              const borderColor = agreement.isComplete ? 'border-green-400' : agreement.counts.pending > 0 ? 'border-yellow-400' : 'border-gray-200'

              return (
                <Card key={agreement.id} className={`hover:shadow-lg transition-all border-l-4 ${borderColor}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="h-4 w-4 text-purple-600 shrink-0" />
                          {agreement.user.name}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">{agreement.user.jobTitle || 'No job title'}</p>
                        <p className="text-sm text-gray-600 mt-1">{agreement.user.email}</p>
                        <p className="text-xs text-gray-500">{agreement.user.department?.name || 'Unknown Department'}</p>
                      </div>
                      <div className="shrink-0">
                        {agreement.isComplete && (
                          <Badge className="bg-green-100 text-green-800 border border-green-300">
                            <CheckSquare className="h-3 w-3 mr-1" />{agreement.counts.approved}
                          </Badge>
                        )}
                        {!agreement.isComplete && getStatusBadge(agreement)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-gray-500">Weight:</span> <span className="font-semibold">{agreement.totalWeight}%</span></div>
                      <div>
                        <span className="text-gray-500">Rated:</span>{' '}
                        {ratedCount > 0 ? (
                          <span className="font-medium">{ratedCount}/{agreement.agreements.filter((a: any) => a.approvalStatus === 'APPROVED').length} rated</span>
                        ) : (
                          <span className="text-gray-400">Nothing rated</span>
                        )}
                      </div>
                      {!agreement.isComplete && (
                        <>
                          <div><span className="text-gray-500">Actions:</span> <span className="font-medium">{agreement.counts.total}</span></div>
                          <div><span className="text-gray-500">Pending:</span> <span className="font-medium text-yellow-700">{agreement.counts.pending}</span></div>
                        </>
                      )}
                    </div>

                    {/* Overall Rating Display */}
                    {overallRating !== null ? (
                      <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${allApprovedRated ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <div className="flex items-center gap-1.5">
                          <Star className={`h-4 w-4 ${allApprovedRated ? 'text-green-600 fill-green-600' : 'text-amber-500 fill-amber-500'}`} />
                          <span className={`text-xs font-semibold ${allApprovedRated ? 'text-green-800' : 'text-amber-800'}`}>
                            Overall Rating
                          </span>
                          {!allApprovedRated && <span className="text-xs text-amber-600">(partial)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <svg key={s} className={`h-3.5 w-3.5 ${s <= Math.round(overallRating) ? (allApprovedRated ? 'text-green-500 fill-green-500' : 'text-amber-400 fill-amber-400') : 'text-gray-200 fill-gray-200'}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                            ))}
                          </div>
                          <span className={`text-sm font-bold ${allApprovedRated ? 'text-green-800' : 'text-amber-800'}`}>
                            {overallRating.toFixed(1)}<span className="text-xs font-normal">/5</span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg mb-3 bg-gray-50 border border-gray-200">
                        <Star className="h-4 w-4 text-gray-300" />
                        <span className="text-xs text-gray-400">No ratings yet</span>
                      </div>
                    )}

                    {/* Approved subordinate: View + Download buttons */}
                    {agreement.isComplete ? (
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1 text-green-600 border-green-300 hover:bg-green-50 text-xs px-2" onClick={() => { setViewDetailsSubordinate(agreement); setDetailsRatingTab('all') }}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View {agreement.counts.approved}
                        </Button>
                        {(() => {
                          const approvedList = agreement.agreements.filter((a: any) => a.approvalStatus === 'APPROVED')
                          const allRated = approvedList.length > 0 && approvedList.every((a: any) => a.rating != null && a.rating > 0)
                          const canDownload = agreement.isComplete
                          const downloadTitle = !canDownload ? 'All agreements must be approved first'
                            : !allRated ? `Rated PDF locked — ${approvedList.filter((a: any) => a.rating != null && a.rating > 0).length}/${approvedList.length} rated`
                            : 'Download agreement PDF'
                          return (
                            <Button variant="outline" size="sm"
                              className={`flex-1 text-xs px-2 ${canDownload ? 'text-blue-600 border-blue-300 hover:bg-blue-50' : 'text-gray-400 border-gray-200 cursor-not-allowed'}`}
                              onClick={(e) => handleDownloadClick(agreement, e)}
                              disabled={!canDownload || downloadingUserId === agreement.userId}
                              title={downloadTitle}
                            >
                              {downloadingUserId === agreement.userId ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                              {downloadingUserId === agreement.userId ? 'Wait...' : 'Download'}
                            </Button>
                          )
                        })()}
                      </div>
                    ) : agreement.counts.total === 0 ? (
                      <Button variant="outline" disabled className="w-full text-xs">No Agreement</Button>
                    ) : canReview ? (
                      <Button
                        className={`w-full ${agreement.counts.pending > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedAgreement(agreement) }}
                      >
                        {agreement.counts.pending > 0 ? 'Review Pending' : 'View Details'}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="w-full">View Details</Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      })()}


      {/* Task Approval Modal */}
      {selectedTask && (
        <TaskApprovalModal
          isOpen={!!selectedTask}
          onClose={() => {
            setSelectedTask(null)
            fetchPendingApprovals()
          }}
          task={selectedTask}
        />
      )}

      {/* Agreement Approval Modal */}
      {selectedAgreement && (
        <AgreementApprovalDialog
          isOpen={!!selectedAgreement}
          onClose={() => {
            setSelectedAgreement(null)
            fetchPendingApprovals()
          }}
          agreement={selectedAgreement}
        />
      )}

      {/* Pending Details Modal */}
      {pendingDetailsAgreement && (
        <PendingDetailsDialog
          isOpen={!!pendingDetailsAgreement}
          onClose={() => setPendingDetailsAgreement(null)}
          agreement={pendingDetailsAgreement}
          onReview={(agreement) => {
            setPendingDetailsAgreement(null)
            setSelectedAgreement(agreement)
          }}
        />
      )}

      {/* View Approved Agreements Modal */}
      {viewDetailsSubordinate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setViewDetailsSubordinate(null); setDetailsQuarterFilter('all'); setDetailsRatingTab('all') }}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-green-50 border-b border-green-200 p-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-6 w-6 text-green-600" />
                  {viewDetailsSubordinate.user.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {viewDetailsSubordinate.user.jobTitle || 'No job title'} · {viewDetailsSubordinate.user.email}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewDetailsSubordinate.user.department?.name || 'Unknown Department'}
                  {viewDetailsSubordinate.user.division?.name && ` · ${viewDetailsSubordinate.user.division.name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                  {viewDetailsSubordinate.agreements.filter(a => a.approvalStatus === 'APPROVED').length} Approved
                </Badge>
                <button 
                  onClick={() => setViewDetailsSubordinate(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Summary */}
            <div className="bg-primary/5 border-b p-3 flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Total Weight:</span>
                <span className="ml-1 font-bold text-gray-900">{viewDetailsSubordinate.totalWeight}%</span>
              </div>
              <div>
                <span className="text-gray-500">Submitted:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {viewDetailsSubordinate.submittedAt ? new Date(viewDetailsSubordinate.submittedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-1 font-medium text-green-600">{viewDetailsSubordinate.overallStatus}</span>
              </div>
            </div>

            {/* Quarter filter chips */}
            {(() => {
              const getQ = (d: string) => { const m = new Date(d).getMonth() + 1; if (m >= 4 && m <= 6) return 'Q1'; if (m >= 7 && m <= 9) return 'Q2'; if (m >= 10 && m <= 12) return 'Q3'; return 'Q4' }
              const allAp = viewDetailsSubordinate.agreements.filter(a => a.approvalStatus === 'APPROVED')
              const qCount = (q: string) => allAp.filter(a => a.dueDate && getQ(a.dueDate) === q).length
              const chips: Array<{ id: 'all'|'Q1'|'Q2'|'Q3'|'Q4'; label: string; sub: string }> = [
                { id: 'all', label: 'All', sub: `${allAp.length} actions` },
                { id: 'Q1', label: 'Q1', sub: `Apr–Jun · ${qCount('Q1')}` },
                { id: 'Q2', label: 'Q2', sub: `Jul–Sep · ${qCount('Q2')}` },
                { id: 'Q3', label: 'Q3', sub: `Oct–Dec · ${qCount('Q3')}` },
                { id: 'Q4', label: 'Q4', sub: `Jan–Mar · ${qCount('Q4')}` },
              ]
              const chipColors: Record<string, string> = { Q1: 'bg-blue-600 border-blue-600 text-white', Q2: 'bg-purple-600 border-purple-600 text-white', Q3: 'bg-orange-500 border-orange-500 text-white', Q4: 'bg-teal-600 border-teal-600 text-white', all: 'bg-gray-800 border-gray-800 text-white' }
              const chipInactive: Record<string, string> = { Q1: 'border-blue-300 text-blue-700 hover:bg-blue-50', Q2: 'border-purple-300 text-purple-700 hover:bg-purple-50', Q3: 'border-orange-300 text-orange-700 hover:bg-orange-50', Q4: 'border-teal-300 text-teal-700 hover:bg-teal-50', all: 'border-gray-300 text-gray-600 hover:bg-gray-50' }
              return (
                <div className="border-b bg-gray-50 px-4 py-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mr-1">Quarter</span>
                  {chips.map(c => (
                    <button key={c.id} onClick={() => setDetailsQuarterFilter(c.id)}
                      className={`flex flex-col items-center px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        detailsQuarterFilter === c.id ? chipColors[c.id] : `bg-white ${chipInactive[c.id]}`
                      }`}>
                      <span>{c.label}</span>
                      <span className={`text-[10px] font-normal ${ detailsQuarterFilter === c.id ? 'opacity-80' : 'text-gray-400' }`}>{c.sub}</span>
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Rating filter tabs */}
            {(() => {
              const getQ2 = (d: string) => { const m = new Date(d).getMonth() + 1; if (m >= 4 && m <= 6) return 'Q1'; if (m >= 7 && m <= 9) return 'Q2'; if (m >= 10 && m <= 12) return 'Q3'; return 'Q4' }
              const approved = viewDetailsSubordinate.agreements.filter(a => a.approvalStatus === 'APPROVED'
                && (detailsQuarterFilter === 'all' || (a.dueDate && getQ2(a.dueDate) === detailsQuarterFilter)))
              const awaitingCount = approved.filter(a => {
                const lvl = a.ratingApprovalLevel ?? 0
                const rated = a.rating != null
                const accepted = lvl === 99 || !!(a.progressNotes?.includes('--- Rating Accepted ('))
                return rated && !accepted && lvl !== -1
              }).length
              const rejectedCount = approved.filter(a => {
                const lvl = a.ratingApprovalLevel ?? 0
                const rejected = lvl === -1
                const altered = !!(a.ratingApprovalChain?.approvals?.some((ap: any) => ap.action === 'alter'))
                return rejected || altered
              }).length
              const acceptedCount = approved.filter(a => {
                const lvl = a.ratingApprovalLevel ?? 0
                return lvl === 99 || !!(a.progressNotes?.includes('--- Rating Accepted ('))
              }).length
              const unratedCount = approved.filter(a => a.rating == null).length
              const tabs: Array<{ id: 'all' | 'awaiting' | 'rejected' | 'accepted' | 'unrated'; label: string; count: number; color: string; activeColor: string }> = [
                { id: 'all', label: 'All Actions', count: approved.length, color: 'border-transparent text-gray-500 hover:text-gray-700', activeColor: 'border-primary text-primary bg-primary/5' },
                { id: 'unrated', label: 'Not Yet Rated', count: unratedCount, color: 'border-transparent text-gray-400 hover:text-gray-600', activeColor: 'border-gray-400 text-gray-700 bg-gray-50' },
                { id: 'awaiting', label: 'Awaiting Acceptance', count: awaitingCount, color: 'border-transparent text-amber-600 hover:text-amber-700', activeColor: 'border-amber-500 text-amber-700 bg-amber-50' },
                { id: 'rejected', label: 'Rejected / Altered', count: rejectedCount, color: 'border-transparent text-red-500 hover:text-red-600', activeColor: 'border-red-500 text-red-700 bg-red-50' },
                { id: 'accepted', label: 'Accepted Ratings', count: acceptedCount, color: 'border-transparent text-green-600 hover:text-green-700', activeColor: 'border-green-500 text-green-700 bg-green-50' },
              ]
              return (
                <div className="border-b bg-white px-4 flex gap-0">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsRatingTab(tab.id)}
                      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        detailsRatingTab === tab.id ? tab.activeColor : tab.color
                      }`}
                    >
                      {tab.label}
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
                        detailsRatingTab === tab.id
                          ? tab.id === 'awaiting' ? 'bg-amber-500 text-white'
                            : tab.id === 'rejected' ? 'bg-red-500 text-white'
                            : tab.id === 'accepted' ? 'bg-green-500 text-white'
                            : tab.id === 'unrated' ? 'bg-gray-500 text-white'
                            : 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Sort: rated actions first, then unrated */}
              {[...viewDetailsSubordinate.agreements]
                .filter(a => {
                  if (a.approvalStatus !== 'APPROVED') return false
                  // Quarter filter (NSA FY: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)
                  if (detailsQuarterFilter !== 'all' && a.dueDate) {
                    const m = new Date(a.dueDate).getMonth() + 1
                    const q = m >= 4 && m <= 6 ? 'Q1' : m >= 7 && m <= 9 ? 'Q2' : m >= 10 && m <= 12 ? 'Q3' : 'Q4'
                    if (q !== detailsQuarterFilter) return false
                  }
                  if (detailsRatingTab === 'all') return true
                  const lvl = a.ratingApprovalLevel ?? 0
                  const rated = a.rating != null
                  const accepted = lvl === 99 || !!(a.progressNotes?.includes('--- Rating Accepted ('))
                  if (detailsRatingTab === 'unrated') return a.rating == null
                  if (detailsRatingTab === 'awaiting') return rated && !accepted && lvl !== -1
                  if (detailsRatingTab === 'rejected') {
                    const rejected = lvl === -1
                    const altered = !!(a.ratingApprovalChain?.approvals?.some((ap: any) => ap.action === 'alter'))
                    return rejected || altered
                  }
                  if (detailsRatingTab === 'accepted') return accepted
                  return true
                })
                .sort((a, b) => {
                  const aRated = a.rating !== null && a.rating !== undefined ? 1 : 0
                  const bRated = b.rating !== null && b.rating !== undefined ? 1 : 0
                  return bRated - aRated
                })
                .map(agreement => {
                  const isRated = agreement.rating !== null && agreement.rating !== undefined
                  const chainLevel = agreement.ratingApprovalLevel ?? 0
                  const chainData = agreement.ratingApprovalChain
                  const isAccepted = chainLevel === 99 || !!(agreement.progressNotes?.includes('--- Rating Accepted ('))
                  const isChainRejected = chainLevel === -1
                  const acceptedMatch = agreement.progressNotes?.match(/--- Rating Accepted \(([^)]+)\) ---/)
                  const acceptedBy = acceptedMatch?.[1] || ''
                  const currentChainApprover = chainData?.chain?.find(c => c.level === chainLevel)
                  const _sessionEmail = (session?.user?.email || '').toLowerCase()
                  const _approverEmail = (currentChainApprover?.email || '').toLowerCase()
                  const isMyTurnToApprove = isRated && !isAccepted && !isChainRejected &&
                    (chainLevel === 0 || (chainLevel >= 1 && (
                      currentChainApprover?.userId === session?.user?.id ||
                      (!!_sessionEmail && !!_approverEmail && _sessionEmail === _approverEmail)
                    )))
                  const isExpanded = expandedAcceptedCards.has(agreement.id)
                  const borderColor = isRated ? (isAccepted ? 'border-green-400' : 'border-amber-400') : 'border-green-200'
                  const bgColor = isRated ? (isAccepted ? 'bg-green-50' : 'bg-amber-50') : 'bg-green-50'
                  const innerBorder = isRated ? 'border-amber-200' : 'border-green-100'
                  const innerBg = isRated ? 'bg-white' : 'bg-white'

                  // Auto-collapsed compact view for accepted cards (skip in 'accepted' tab â€” always show full)
                  if (isAccepted && !isExpanded && detailsRatingTab !== 'accepted') {
                    return (
                      <div key={agreement.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-green-50 border border-green-300 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <svg className="h-4 w-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          <span className="text-sm font-medium text-green-900 truncate">{agreement.initiative?.title || agreement.title || 'Untitled'}</span>
                          <span className="text-xs text-green-700 shrink-0">{agreement.weight}%</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1,2,3,4,5].map(s => (
                              <svg key={s} className={`h-3 w-3 ${s <= (agreement.rating || 0) ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-200'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            ))}
                          </div>
                          {acceptedBy && <span className="text-xs text-green-600 shrink-0 hidden sm:block">✔ {acceptedBy}</span>}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-green-700 hover:bg-green-100 shrink-0"
                          onClick={() => setExpandedAcceptedCards(prev => { const n = new Set(prev); n.add(agreement.id); return n })}
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          Expand
                        </Button>
                      </div>
                    )
                  }

                  return (
                  <div 
                    key={agreement.id} 
                    className={`p-4 ${bgColor} border-2 ${borderColor} rounded-lg ${isRated ? 'shadow-md' : ''}`}
                  >
                    {/* Collapse button for expanded accepted cards */}
                    {isAccepted && isExpanded && (
                      <div className="flex justify-end mb-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-green-700 hover:bg-green-100"
                          onClick={() => setExpandedAcceptedCards(prev => { const n = new Set(prev); n.delete(agreement.id); return n })}
                        >
                          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          Collapse
                        </Button>
                      </div>
                    )}
                    {/* Rated Banner */}
                    {isRated && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-amber-700 uppercase tracking-wide">Rated by Employee — {agreement.rating}/5</span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {agreement.initiative?.title || agreement.title || 'Untitled'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {agreement.initiative?.objective?.goal?.goalNumber && (
                            <span className="font-medium">{agreement.initiative.objective.goal.goalNumber}</span>
                          )}
                          {agreement.initiative?.objective?.goal?.goalNumber && ' → '}
                          {agreement.initiative?.objective?.title || ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={isRated ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'}>{agreement.weight}%</Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {agreement.dueDate ? new Date(agreement.dueDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    {agreement.customAction && (
                      <div className={`mb-3 p-2 ${innerBg} rounded border ${innerBorder}`}>
                        <p className="text-xs font-medium text-gray-500 uppercase">Action</p>
                        <p className="text-sm text-gray-800 mt-1">{agreement.customAction}</p>
                      </div>
                    )}

                    {/* Key Info: Weight + Evidence + Notes always visible */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                      <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                        <p className="text-xs font-medium text-gray-500 uppercase">Weight</p>
                        <p className="text-gray-800 mt-1 font-bold">{agreement.weight}%</p>
                      </div>
                      <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                        <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                        <p className="text-gray-800 mt-1">{agreement.status?.replace(/_/g, ' ') || 'Not Started'}</p>
                      </div>
                      <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                        <p className="text-xs font-medium text-gray-500 uppercase">Progress</p>
                        <p className="text-gray-800 mt-1">{agreement.percentComplete || 0}%</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {agreement.initiative?.measure && (
                        <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                          <p className="text-xs font-medium text-gray-500 uppercase">Measure</p>
                          <p className="text-gray-800 mt-1">{agreement.initiative.measure}</p>
                        </div>
                      )}
                      {(agreement.initiative?.target || agreement.target) && (
                        <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                          <p className="text-xs font-medium text-gray-500 uppercase">Target</p>
                          <p className="text-gray-800 mt-1">{agreement.initiative?.target || agreement.target}</p>
                        </div>
                      )}
                      {agreement.kpi && (
                        <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                          <p className="text-xs font-medium text-gray-500 uppercase">KPI</p>
                          <p className="text-gray-800 mt-1">{agreement.kpi}</p>
                        </div>
                      )}
                      {agreement.approvedAt && (
                        <div className={`p-2 ${innerBg} rounded border ${innerBorder}`}>
                          <p className="text-xs font-medium text-gray-500 uppercase">Approved</p>
                          <p className="text-gray-800 mt-1">{new Date(agreement.approvedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Evidence — always show prominently */}
                    {(agreement.evidenceUrl || agreement.evidenceNotes) && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">📎 Evidence Provided</p>
                        {agreement.evidenceNotes && (
                          <p className="text-sm text-gray-800 mb-2">{agreement.evidenceNotes}</p>
                        )}
                        {agreement.evidenceUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                            onClick={() => setPreviewEvidence({ url: agreement.evidenceUrl ?? null, notes: agreement.evidenceNotes ?? null })}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Preview Evidence
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Progress Notes — reason for incomplete status */}
                    {agreement.progressNotes && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-300">
                        <p className="text-xs font-bold text-amber-700 uppercase mb-1">⚠️ Reason for Incomplete Status</p>
                        <p className="text-sm text-gray-800">{agreement.progressNotes}</p>
                      </div>
                    )}

                    {/* Rating Management Controls — only for rated actions */}
                    {isRated && (() => {
                      const borderCls = isAccepted ? 'bg-green-50 border-green-400' : isChainRejected ? 'bg-red-50 border-red-300' : 'bg-amber-100 border-amber-300'
                      return (
                      <div className={`mt-4 p-3 rounded-lg border ${borderCls}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className={`h-4 w-4 ${isAccepted ? 'text-green-600 fill-green-600' : isChainRejected ? 'text-red-500 fill-red-500' : 'text-amber-600 fill-amber-600'}`} />
                            <span className={`text-sm font-bold ${isAccepted ? 'text-green-800' : isChainRejected ? 'text-red-700' : 'text-amber-800'}`}>
                              Employee Rating: {agreement.rating}/5
                            </span>
                            {isAccepted && (
                              <span className="text-xs bg-green-200 text-green-900 font-semibold px-2 py-0.5 rounded-full">✔ Fully Approved</span>
                            )}
                            {isChainRejected && (
                              <span className="text-xs bg-red-200 text-red-900 font-semibold px-2 py-0.5 rounded-full">✗ Rejected — Revision Required</span>
                            )}
                            {!isAccepted && !isChainRejected && chainLevel >= 1 && (
                              <span className="text-xs bg-amber-200 text-amber-900 font-semibold px-2 py-0.5 rounded-full">⏳ Awaiting Level {chainLevel}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`h-4 w-4 ${star <= (agreement.rating || 0) ? (isAccepted ? 'text-green-500 fill-green-500' : 'text-amber-500 fill-amber-500') : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>

                        {/* Approval chain progress */}
                        {chainData?.chain && chainData.chain.length > 0 && (() => {
                          // Clip display chain at first terminal approver (Executive/DSG/SG/Board).
                          // Levels beyond that should never be shown for regular-staff agreements.
                          const isTerminalJt = (jt: string | null | undefined) => {
                            if (!jt) return false
                            const t = jt.toLowerCase()
                            return t.includes('executive') || t.includes('statistician') ||
                              t.includes('board chair') || t.startsWith('dsg') ||
                              t === 'sg' || t.startsWith('sg ')
                          }
                          const termIdx = chainData!.chain.findIndex(c => isTerminalJt(c.jobTitle))
                          const displayChain = termIdx !== -1
                            ? chainData!.chain.slice(0, termIdx + 1)
                            : chainData!.chain
                          return (
                          <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wide">Approval Chain</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {displayChain.map((member, idx) => {
                                const appr = chainData!.approvals?.find(a => a.level === member.level)
                                const isCurrent = member.level === chainLevel && !isAccepted && !isChainRejected
                                const isDone = !!appr && appr.action !== 'reject'
                                const isRej = !!appr && appr.action === 'reject'
                                return (
                                  <span key={member.level} className="flex items-center gap-1">
                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                                      isDone ? 'bg-green-100 text-green-800 border-green-300' :
                                      isRej  ? 'bg-red-100 text-red-800 border-red-300' :
                                      isCurrent ? 'bg-amber-100 text-amber-800 border-amber-400 font-bold' :
                                      'bg-gray-100 text-gray-400 border-gray-200'
                                    }`}>
                                      {isDone ? '✔ ' : isRej ? '✗ ' : isCurrent ? '⏳ ' : '○ '}
                                      {member.name.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                    {idx < displayChain.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                          )
                        })()}

                        {/* Accepted state banner */}
                        {isAccepted && (
                          <div className="bg-green-100 border border-green-300 rounded p-2 mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4 text-green-700" />
                              <div>
                                <p className="text-sm font-semibold text-green-800">Rating fully approved through all levels</p>
                                {acceptedBy && <p className="text-xs text-green-700">{acceptedBy}</p>}
                              </div>
                            </div>
                            {/* Modify Rating button - only show to supervisors who can modify */}
                            {session?.user?.email && (() => {
                              // Check if current user is a supervisor in the chain
                              const userInChain = chainData?.chain?.find(c => 
                                c.email?.toLowerCase() === session.user.email.toLowerCase()
                              )
                              return userInChain
                            })() && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => setRatingActionId(ratingActionId === agreement.id ? null : agreement.id)}
                              >
                                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Modify Rating
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Rejected state banner */}
                        {isChainRejected && (
                          <div className="bg-red-50 border border-red-300 rounded p-2 mb-2">
                            <p className="text-sm font-semibold text-red-800">Rating rejected — awaiting employee revision</p>
                            {chainData?.approvals?.slice(-1)[0]?.comment && (
                              <p className="text-xs text-red-600 mt-0.5">{chainData.approvals.slice(-1)[0].comment}</p>
                            )}
                          </div>
                        )}

                        {/* Awaiting another approver */}
                        {!isAccepted && !isChainRejected && chainLevel >= 1 && !isMyTurnToApprove && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
                            <p className="text-xs text-gray-600">
                              ⏳ Awaiting approval from <strong>{currentChainApprover?.name || `Level ${chainLevel} approver`}</strong>
                              {currentChainApprover?.jobTitle && <span className="text-gray-400"> · {currentChainApprover.jobTitle}</span>}
                            </p>
                          </div>
                        )}

                        {/* Modification panel for accepted ratings */}
                        {isAccepted && ratingActionId === agreement.id && (
                          <div className="space-y-3 mt-3 pt-3 border-t border-green-300">
                            {/* Show subordinate's comment when rating is not 3/5 */}
                            {agreement.rating && agreement.rating !== 3 && agreement.progressNotes && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">📝 Employee's Comment</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{agreement.progressNotes}</p>
                              </div>
                            )}
                            <div className="bg-amber-50 border border-amber-200 rounded p-3">
                              <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Modify Accepted Rating</p>
                              <p className="text-xs text-amber-700">
                                This will restart the approval process for this rating. The employee will need to accept or reject your modification.
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">
                                New Rating <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={ratingOverrideValue}
                                onChange={(e) => setRatingOverrideValue(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                              >
                                <option value="">Select new rating...</option>
                                {[1,2,3,4,5].map(v => (
                                  <option key={v} value={v}>{v}/5 - {v === 1 ? 'Poor' : v === 2 ? 'Needs Improvement' : v === 3 ? 'Meets Expectations' : v === 4 ? 'Exceeds Expectations' : 'Outstanding'}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1">
                                Reason for Modification <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Explain why you're modifying this rating..."
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white resize-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                rows={3}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                onClick={() => setRatingConfirm({ agreementId: agreement.id, action: 'modify_accepted', newRating: ratingOverrideValue })}
                                disabled={ratingLoading === agreement.id || !ratingComment.trim() || !ratingOverrideValue}
                              >
                                {ratingLoading === agreement.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Modify Rating'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  setRatingActionId(null)
                                  setRatingComment('')
                                  setRatingOverrideValue(0)
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action panel — only when it's this user's turn */}
                        {!isAccepted && !isChainRejected && isMyTurnToApprove && ratingActionId === agreement.id ? (
                          <div className="space-y-3 mt-3 pt-3 border-t border-amber-300">
                            {/* Show subordinate's comment when rating is not 3/5 */}
                            {agreement.rating && agreement.rating !== 3 && agreement.progressNotes && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-blue-700 uppercase mb-2">📝 Employee's Comment</p>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{agreement.progressNotes}</p>
                              </div>
                            )}
                            <div>
                              <label className="text-xs font-medium text-amber-800 block mb-1">
                                Comment <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Enter your feedback for this rating..."
                                className="w-full border border-amber-300 rounded px-3 py-2 text-sm bg-white resize-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                rows={2}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-amber-800">Override Rating:</span>
                              <select
                                value={ratingOverrideValue}
                                onChange={(e) => setRatingOverrideValue(Number(e.target.value))}
                                className="border border-amber-300 rounded px-2 py-1 text-sm bg-white"
                              >
                                {[1,2,3,4,5].map(v => (
                                  <option key={v} value={v}>{v}/5</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                onClick={() => setRatingConfirm({ agreementId: agreement.id, action: 'alter', newRating: ratingOverrideValue })}
                                disabled={ratingLoading === agreement.id || !ratingComment.trim()}
                              >
                                {ratingLoading === agreement.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Override'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                                onClick={() => setRatingConfirm({ agreementId: agreement.id, action: 'reject' })}
                                disabled={ratingLoading === agreement.id || !ratingComment.trim()}
                              >
                                Reject Rating
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => { setRatingActionId(null); setRatingComment('') }}
                              >
                                Cancel
                              </Button>
                            </div>
                            {!ratingComment.trim() && (
                              <p className="text-[10px] text-red-500">A comment is required to reject or alter the rating.</p>
                            )}
                          </div>
                        ) : !isAccepted && !isChainRejected && isMyTurnToApprove ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => setRatingConfirm({ agreementId: agreement.id, action: 'accept', newRating: agreement.rating ?? 0 })}
                              disabled={ratingLoading === agreement.id}
                            >
                              {ratingLoading === agreement.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '✔ Accept Rating'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-700 border-amber-400 hover:bg-amber-50 text-xs"
                              onClick={() => { setRatingActionId(agreement.id); setRatingOverrideValue(agreement.rating || 3); setRatingComment('') }}
                            >
                              ✎ Reject / Alter Rating
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      )
                    })()}
                  </div>
                  )
                })}

              {/* Empty state for filtered tabs */}
              {detailsRatingTab !== 'all' && (() => {
                const filtered = viewDetailsSubordinate.agreements.filter(a => {
                  if (a.approvalStatus !== 'APPROVED') return false
                  const lvl = a.ratingApprovalLevel ?? 0
                  const rated = a.rating != null
                  const accepted = lvl === 99 || !!(a.progressNotes?.includes('--- Rating Accepted ('))
                  if (detailsRatingTab === 'unrated') return a.rating == null
                  if (detailsRatingTab === 'awaiting') return rated && !accepted && lvl !== -1
                  if (detailsRatingTab === 'rejected') {
                    const rejected = lvl === -1
                    const altered = !!(a.ratingApprovalChain?.approvals?.some((ap: any) => ap.action === 'alter'))
                    return rejected || altered
                  }
                  if (detailsRatingTab === 'accepted') return accepted
                  return false
                })
                if (filtered.length > 0) return null
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    {detailsRatingTab === 'unrated' ? (
                      <>
                        <div className="h-12 w-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-3">
                          <Star className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">All actions have been rated</p>
                        <p className="text-xs text-gray-400 mt-1">Every approved action has a rating submitted by the employee.</p>
                      </>
                    ) : detailsRatingTab === 'awaiting' ? (
                      <>
                        <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                          <Star className="h-6 w-6 text-amber-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">No ratings awaiting acceptance</p>
                        <p className="text-xs text-gray-400 mt-1">All rated actions have been fully approved or no ratings have been submitted yet.</p>
                      </>
                    ) : detailsRatingTab === 'accepted' ? (
                      <>
                        <div className="h-12 w-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-3">
                          <svg className="h-6 w-6 text-green-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-600">No accepted ratings yet</p>
                        <p className="text-xs text-gray-400 mt-1">Ratings that have been fully approved through the chain will appear here.</p>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-3">
                          <svg className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <p className="text-sm font-semibold text-gray-600">No rejected or altered ratings</p>
                        <p className="text-xs text-gray-400 mt-1">No ratings have been rejected or altered for this employee.</p>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Modal Footer */}
            <div className="border-t p-4 bg-gray-50 flex justify-end">
              <Button onClick={() => setViewDetailsSubordinate(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Type Selection Modal - must be in ApprovalsPage to access state */}
      {pdfTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPdfTypeModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Download className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Download Agreement PDF</h3>
              <p className="text-sm text-gray-500 mt-1">{pdfTypeModal.subordinate.user.name}</p>
              <p className="text-sm text-gray-400 mt-1">Choose the type of document to download</p>
            </div>
            {(() => {
              const approvedList = pdfTypeModal.subordinate.agreements.filter((a: any) => a.approvalStatus === 'APPROVED')
              const ratedCount = approvedList.filter((a: any) => a.rating != null && a.rating > 0).length
              const anyRated = approvedList.length > 0 && ratedCount > 0
              return (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => downloadAgreementPDF(pdfTypeModal.subordinate, 'unrated')}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 p-5 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-100">
                  <FileText className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900 text-sm">Unrated</p>
                  <p className="text-xs text-gray-500 mt-1">Agreement only â€” no ratings or evidence columns</p>
                </div>
              </button>
              <button
                onClick={anyRated ? () => downloadAgreementPDF(pdfTypeModal.subordinate, 'rated') : undefined}
                disabled={!anyRated}
                title={!anyRated ? 'No actions rated yet' : `Full document with ratings (${ratedCount}/${approvedList.length} actions rated)`}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                  anyRated
                    ? 'border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer group'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${anyRated ? 'bg-gray-100 group-hover:bg-green-100' : 'bg-gray-100'}`}>
                  <Star className={`h-6 w-6 ${anyRated ? 'text-gray-600 group-hover:text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className={`font-semibold text-sm ${anyRated ? 'text-gray-900' : 'text-gray-400'}`}>Rated</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {anyRated ? `Full document with ratings, scores & evidence` : 'No actions rated yet'}
                  </p>
                </div>
              </button>
            </div>
              )
            })()}
            <button
              onClick={() => setPdfTypeModal(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rating action confirmation dialog */}
      {ratingConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRatingConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${ratingConfirm.action === 'accept' ? 'bg-green-100' : ratingConfirm.action === 'reject' ? 'bg-red-100' : ratingConfirm.action === 'modify_accepted' ? 'bg-orange-100' : 'bg-amber-100'}`}>
                {ratingConfirm.action === 'accept' && <CheckSquare className="h-6 w-6 text-green-700" />}
                {ratingConfirm.action === 'reject' && <svg className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
                {ratingConfirm.action === 'alter' && <Star className="h-6 w-6 text-amber-700 fill-amber-200" />}
                {ratingConfirm.action === 'modify_accepted' && <svg className="h-6 w-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {ratingConfirm.action === 'accept' && 'Confirm Rating Acceptance'}
                  {ratingConfirm.action === 'reject' && 'Confirm Rating Rejection'}
                  {ratingConfirm.action === 'alter' && 'Confirm Rating Override'}
                  {ratingConfirm.action === 'modify_accepted' && 'Modify Accepted Rating'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {ratingConfirm.action === 'accept' && `You are about to accept a rating of ${ratingConfirm.newRating ?? 0}/5. This will advance the rating to the next approval level.`}
                  {ratingConfirm.action === 'reject' && 'You are about to reject this rating. The employee will be required to revise and resubmit their self-assessment.'}
                  {ratingConfirm.action === 'alter' && `You are about to override the rating to ${ratingConfirm.newRating}/5. Your comment will be recorded as justification for this change.`}
                  {ratingConfirm.action === 'modify_accepted' && `You are about to modify an already accepted rating from ${ratingConfirm.newRating ?? 0}/5. This will restart the approval process and the employee will need to accept or reject your modification.`}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border">
              This action is final and will be logged in the performance agreement audit trail.
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => setRatingConfirm(null)}>Cancel</Button>
              <Button
                className={ratingConfirm.action === 'accept' ? 'bg-green-600 hover:bg-green-700 text-white' : ratingConfirm.action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ratingConfirm.action === 'modify_accepted' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                onClick={() => { handleRatingAction(ratingConfirm.agreementId, ratingConfirm.action, ratingConfirm.newRating); setRatingConfirm(null) }}
                disabled={ratingLoading === ratingConfirm.agreementId}
              >
                {ratingLoading === ratingConfirm.agreementId ? <Loader2 className="h-4 w-4 animate-spin" /> : (ratingConfirm.action === 'accept' ? 'Yes, Accept Rating' : ratingConfirm.action === 'reject' ? 'Yes, Reject Rating' : ratingConfirm.action === 'modify_accepted' ? 'Yes, Modify Rating' : 'Yes, Override Rating')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence preview modal for supervisor review */}
      {previewEvidence && (
        <EvidencePreviewModal
          evidenceUrl={previewEvidence.url}
          evidenceNotes={previewEvidence.notes}
          open={!!previewEvidence.url}
          onClose={() => setPreviewEvidence(null)}
          title="Employee Evidence"
        />
      )}
    </div>
  )
}

// Pending Details Dialog Component
function PendingDetailsDialog({ isOpen, onClose, agreement, onReview }: {
  isOpen: boolean
  onClose: () => void
  agreement: PendingAgreement
  onReview: (agreement: PendingAgreement) => void
}) {
  const [editedInitiatives, setEditedInitiatives] = useState<Record<string, { customAction: string, weight: number }>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedInitiatives, setSavedInitiatives] = useState<Set<string>>(new Set())
  const [savedValues, setSavedValues] = useState<Record<string, { customAction: string, weight: number }>>({})

  if (!isOpen) return null

  // Get all non-approved initiatives
  const nonApprovedInitiatives = agreement.agreements.filter(a => 
    a.approvalStatus !== 'APPROVED'
  )

  const pendingCount = nonApprovedInitiatives.filter(a => a.approvalStatus === 'PENDING').length
  const rejectedCount = nonApprovedInitiatives.filter(a => a.approvalStatus === 'REJECTED').length
  const notSubmittedCount = nonApprovedInitiatives.filter(a => !a.approvalStatus).length

  const handleUpdate = async (initiativeId: string) => {
    const edited = editedInitiatives[initiativeId]
    if (!edited) return

    setIsSaving(true)
    try {
      const response = await fetch(`/dashboard/performance/api/performance-agreements/${initiativeId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edited)
      })

      if (response.ok) {
        toast({ title: 'Updated successfully!' })
        // Store the saved values
        setSavedValues(prev => ({
          ...prev,
          [initiativeId]: edited
        }))
        // Mark as saved
        setSavedInitiatives(prev => new Set(prev).add(initiativeId))
        // Remove from edited state
        const newEdited = { ...editedInitiatives }
        delete newEdited[initiativeId]
        setEditedInitiatives(newEdited)
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFieldChange = (initiativeId: string, field: 'customAction' | 'weight', value: string | number) => {
    // Get current values from agreement if not already in edited state
    const currentAgreement = nonApprovedInitiatives.find(a => a.id === initiativeId)
    
    setEditedInitiatives(prev => ({
      ...prev,
      [initiativeId]: {
        customAction: field === 'customAction' 
          ? value as string 
          : (prev[initiativeId]?.customAction || currentAgreement?.customAction || ''),
        weight: field === 'weight' 
          ? Number(value) 
          : (prev[initiativeId]?.weight ?? currentAgreement?.weight ?? 0)
      }
    }))
  }

  const getDisplayValue = (initiative: any, field: 'customAction' | 'weight') => {
    // Priority: edited > saved > original
    if (editedInitiatives[initiative.id]) {
      return editedInitiatives[initiative.id][field]
    }
    if (savedValues[initiative.id]) {
      return savedValues[initiative.id][field]
    }
    return initiative[field]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Pending Initiatives</h2>
              <p className="text-gray-600 mt-1">{agreement.user.name}'s Performance Agreement</p>
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>

          {/* Summary */}
          <div className="mt-4 flex gap-3">
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {pendingCount} Awaiting Review
              </Badge>
            )}
            {rejectedCount > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {rejectedCount} Rejected
              </Badge>
            )}
            {notSubmittedCount > 0 && (
              <Badge className="bg-gray-100 text-gray-800">
                {notSubmittedCount} Not Submitted
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {nonApprovedInitiatives.map((agr) => {
              const getStatusInfo = () => {
                if (agr.approvalStatus === 'PENDING') {
                  return { color: 'yellow', label: 'Awaiting Review', icon: '⏳' }
                } else if (agr.approvalStatus === 'REJECTED') {
                  return { color: 'red', label: 'Rejected', icon: '✗' }
                } else {
                  return { color: 'gray', label: 'Not Submitted', icon: '○' }
                }
              }

              const status = getStatusInfo()

              const isExpanded = expandedId === agr.id
              const hasEdits = !!editedInitiatives[agr.id]
              const isSaved = savedInitiatives.has(agr.id)
              const isRejected = agr.approvalStatus === 'REJECTED'
              const displayAction = getDisplayValue(agr, 'customAction')
              const displayWeight = getDisplayValue(agr, 'weight')

              return (
                <Card key={agr.id} className={`border-l-4 ${
                  status.color === 'yellow' ? 'border-yellow-500' :
                  status.color === 'red' ? 'border-red-500' :
                  'border-gray-400'
                }`}>
                  <CardContent className="p-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : agr.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-lg">{status.icon}</span>
                            <Badge className={
                              status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              status.color === 'red' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {status.label}
                            </Badge>
                            {hasEdits && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Edited
                              </Badge>
                            )}
                            {isRejected && isSaved && (
                              <Badge className="bg-green-100 text-green-800">
                                ✔ Saved
                              </Badge>
                            )}
                            {isRejected && !isSaved && (
                              <Badge className="bg-orange-100 text-orange-800">
                                Needs Save
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {(agr as any).isAdhocContainer 
                              ? `${agr.title} (${agr.weight}% - To be created during implementation)`
                              : agr.initiative?.title || agr.title || 'Untitled Agreement'}
                          </h3>
                          
                          <div className="text-sm text-gray-500 mb-2">
                            {(agr as any).isAdhocContainer 
                              ? agr.title === 'Ad-hoc Tasks' 
                                ? 'Day-to-day operational tasks assigned throughout the year'
                                : agr.title === 'Projects'
                                ? 'All project work tracked and completed during the year'
                                : agr.title === 'Risk Management'
                                ? 'Risk mitigation and compliance tasks throughout the year'
                                : 'System-generated container for completion-based rating'
                              : agr.initiative?.objective?.goal?.goalNumber && agr.initiative?.objective?.goal?.title
                              ? `${agr.initiative.objective.goal.goalNumber} → ${agr.initiative.objective.goal.title}`
                              : 'No goal information'}
                          </div>

                          {!isExpanded && displayAction && (
                            <div className="bg-gray-50 p-2 rounded text-sm">
                              <span className="font-medium">Action:</span> {String(displayAction).substring(0, 100)}
                              {String(displayAction).length > 100 ? '...' : ''}
                            </div>
                          )}

                          {!isExpanded && !displayAction && (
                            <div className="text-sm text-gray-400 italic">
                              No action plan provided yet
                            </div>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          {displayWeight ? (
                            <Badge variant="outline">{displayWeight}%</Badge>
                          ) : (
                            <span className="text-sm text-gray-400">No weight</span>
                          )}
                          <span className="text-xs text-gray-500">Click to edit</span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Edit Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Measure & Target (Read-only) */}
                        {agr.initiative?.measure && (
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="text-xs font-semibold text-blue-700 mb-1">MEASURE/KPI:</div>
                            <p className="text-sm">{agr.initiative.measure}</p>
                          </div>
                        )}

                        {agr.initiative?.target && (
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="text-xs font-semibold text-blue-700 mb-1">TARGET:</div>
                            <p className="text-sm">{agr.initiative.target}</p>
                          </div>
                        )}

                        {/* Editable Action */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Action Plan *
                          </label>
                          <textarea
                            value={displayAction || ''}
                            onChange={(e) => handleFieldChange(agr.id, 'customAction', e.target.value)}
                            placeholder="Describe specific actions (min 10 chars)..."
                            rows={4}
                            className="w-full border rounded p-2 text-sm"
                          />
                        </div>

                        {/* Editable Weight */}
                        <div>
                          <label htmlFor={`approval-weight-${agr.id}`} className="text-sm font-medium text-gray-700 block mb-1">
                            Weight (%) *
                          </label>
                          <input
                            id={`approval-weight-${agr.id}`}
                            name={`approvalWeight-${agr.id}`}
                            type="number"
                            value={displayWeight || ''}
                            onChange={(e) => handleFieldChange(agr.id, 'weight', e.target.value)}
                            min="1"
                            max="100"
                            className="w-32 border rounded p-2 text-sm"
                          />
                        </div>

                        {/* Action Buttons */}
                        {hasEdits && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const newEdited = { ...editedInitiatives }
                                delete newEdited[agr.id]
                                setEditedInitiatives(newEdited)
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(agr.id)}
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {nonApprovedInitiatives.length} initiative{nonApprovedInitiatives.length !== 1 ? 's' : ''} requiring attention
              {rejectedCount > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  ({rejectedCount} rejected - need resubmission)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {rejectedCount > 0 && (() => {
                // Get all rejected initiatives
                const rejectedInitiatives = nonApprovedInitiatives.filter(a => a.approvalStatus === 'REJECTED')
                
                // Check if all rejected items have been saved
                const allRejectedSaved = rejectedInitiatives.every(a => savedInitiatives.has(a.id))
                
                // Check if all have valid action and weight
                const incompleteRejected = rejectedInitiatives.filter(a => {
                  const action = getDisplayValue(a, 'customAction')
                  const weight = getDisplayValue(a, 'weight')
                  return !action || String(action).trim().length < 10 || !weight
                })

                const isDisabled = !allRejectedSaved || incompleteRejected.length > 0 || isSaving

                return (
                <Button 
                  onClick={async () => {
                    if (incompleteRejected.length > 0) {
                      toast({ title: `$1`, variant: "destructive" })
                      return
                    }

                    setIsSaving(true)
                    try {
                      const agreementsToSubmit = rejectedInitiatives.map(a => ({
                        id: a.id,
                        customAction: getDisplayValue(a, 'customAction'),
                        weight: getDisplayValue(a, 'weight')
                      }))
                      
                      console.log('=== Resubmitting Rejected Initiatives ===')
                      console.log('Agreements to submit:', agreementsToSubmit)
                      
                      const response = await fetch('/dashboard/performance/api/performance-agreements/submit-all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          agreements: agreementsToSubmit,
                          userId: agreement.userId // Pass the employee's user ID for validation
                        })
                      })

                      if (response.ok) {
                        toast({ title: `$1`, variant: "destructive" })
                        onClose()
                        window.location.reload() // Refresh to show updated status
                      } else {
                        const error = await response.json()
                        toast({ title: `$1`, variant: "destructive" })
                      }
                    } catch (error) {
                      toast({ title: 'Failed to resubmit', variant: 'destructive' })
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isDisabled}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!allRejectedSaved ? `Please save all ${rejectedInitiatives.length - savedInitiatives.size} rejected initiative(s) before resubmitting` : undefined}
                >
                  {isSaving ? 'Resubmitting...' : `Resubmit ${rejectedCount} Rejected`}
                </Button>
                )
              })()}
              {(pendingCount > 0 || agreement.counts.approved > 0) && (
                <Button 
                  onClick={() => onReview(agreement)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Review All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Agreement Approval Dialog Component
function AgreementApprovalDialog({ isOpen, onClose, agreement }: {
  isOpen: boolean
  onClose: () => void
  agreement: PendingAgreement
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [evidencePreview, setEvidencePreview] = useState<{ url: string | null; notes?: string | null } | null>(null)
  
  // Filter to only show initiatives that need review (PENDING only - resubmissions or new submissions)
  // Excludes already APPROVED items and the adhoc container (10% placeholder)
  const initiativesToReview = agreement.agreements.filter(a => 
    a.approvalStatus === 'PENDING' &&
    !(a as any).isAdhocContainer  // Filter out adhoc container - it auto-approves
  )
  
  // Initialize decisions with existing statuses
  const [decisions, setDecisions] = useState<Record<string, { status: 'approved' | 'rejected' | 'pending', comment?: string }>>(() => {
    const initial: Record<string, { status: 'approved' | 'rejected' | 'pending', comment?: string }> = {}
    initiativesToReview.forEach(a => {
      if (a.approvalStatus === 'APPROVED') {
        initial[a.id] = { status: 'approved' }
      } else if (a.approvalStatus === 'REJECTED') {
        initial[a.id] = { status: 'rejected' }
      }
    })
    return initial
  })
  
  const currentAgreement = initiativesToReview[currentIndex]
  const totalInitiatives = initiativesToReview.length
  const currentDecision = decisions[currentAgreement?.id] || { status: 'pending' }
  const isCurrentCompleted = currentAgreement?.status === 'COMPLETED'
  
  // If no initiatives to review, show message
  if (totalInitiatives === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">No Initiatives to Review</h2>
          <p className="text-gray-600 mb-4">
            This employee has not submitted any initiatives for approval yet.
          </p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    )
  }

  const handleApproveInitiative = () => {
    // Only allow approving PENDING items
    if (currentAgreement.approvalStatus !== 'PENDING') {
      toast({ title: 'This initiative has already been reviewed', variant: 'destructive' })
      return
    }
    
    setDecisions(prev => ({
      ...prev,
      [currentAgreement.id]: { status: 'approved' }
    }))
    
    // Move to next initiative
    if (currentIndex < totalInitiatives - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleRejectInitiative = () => {
    // Only allow rejecting PENDING items
    if (currentAgreement.approvalStatus !== 'PENDING') {
      toast({ title: 'This initiative has already been reviewed', variant: 'destructive' })
      return
    }
    
    if (!rejectComment.trim()) {
      toast({ title: 'Please provide a comment for rejection', variant: 'destructive' })
      return
    }
    
    setDecisions(prev => ({
      ...prev,
      [currentAgreement.id]: { status: 'rejected', comment: rejectComment }
    }))
    
    setShowRejectDialog(false)
    setRejectComment('')
    
    // Move to next initiative
    if (currentIndex < totalInitiatives - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSubmitAll = async () => {
    // Only need to review PENDING initiatives
    const pendingInitiatives = initiativesToReview.filter(a => a.approvalStatus === 'PENDING')
    const pendingReviewed = pendingInitiatives.filter(a => decisions[a.id]?.status !== 'pending').length
    
    if (pendingReviewed < pendingInitiatives.length) {
      toast({ title: `$1`, variant: "destructive" })
      return
    }

    // Only submit decisions for PENDING items (new reviews)
    const newDecisions = Object.entries(decisions)
      .filter(([id]) => {
        const initiative = initiativesToReview.find(a => a.id === id)
        console.log(`Checking initiative ${id}:`, {
          approvalStatus: initiative?.approvalStatus,
          willInclude: initiative?.approvalStatus === 'PENDING'
        })
        return initiative?.approvalStatus === 'PENDING'
      })
      .map(([agreementId, decision]) => ({
        agreementId,
        status: decision.status,
        comment: decision.comment
      }))

    console.log('New decisions to submit:', newDecisions)
    console.log('All decisions:', decisions)
    console.log('All initiatives:', initiativesToReview.map(i => ({ id: i.id, status: i.approvalStatus })))

    if (newDecisions.length === 0) {
      toast({ title: 'No new decisions to submit. All initiatives have already been reviewed.', variant: 'destructive' })
      onClose()
      return
    }

    setIsProcessing(true)
    try {
      const requestBody = {
        userId: agreement.userId,
        decisions: newDecisions
      }
      console.log('=== Submitting to API ===')
      console.log('Request body:', requestBody)
      console.log('JSON:', JSON.stringify(requestBody, null, 2))
      
      const res = await fetch('/dashboard/performance/api/performance-agreements/approve-individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', res.status, res.statusText)
      
      if (res.ok) {
        const result = await res.json()
        console.log('Success response:', result)
        
        // Build success message
        let message = ''
        if (result.approvedCount > 0) message += `${result.approvedCount} approved`
        if (result.rejectedCount > 0) {
          if (message) message += ', '
          message += `${result.rejectedCount} rejected`
        }
        if (result.skippedCount > 0) {
          if (message) message += '. '
          message += `Note: ${result.skippedCount} ${result.skippedCount > 1 ? 'were' : 'was'} already processed`
        }
        
        toast({ title: message || 'Reviews submitted successfully!', variant: 'destructive' })
        onClose() // This will trigger fetchPendingApprovals() in the parent
      } else {
        const error = await res.json()
        console.error('=== Server error ===')
        console.error('Error response:', error)
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: 'Failed to submit reviews', variant: 'destructive' })
    } finally {
      setIsProcessing(false)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < totalInitiatives - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  if (!isOpen) return null

  const reviewedCount = Object.keys(decisions).length
  const pendingInitiatives = initiativesToReview.filter(a => a.approvalStatus === 'PENDING')
  const pendingReviewedCount = pendingInitiatives.filter(a => decisions[a.id]?.status !== 'pending').length
  const allPendingReviewed = pendingInitiatives.length > 0 && pendingReviewedCount === pendingInitiatives.length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Review Performance Agreement</h2>
              <p className="text-gray-600 mt-1">{agreement.user.name} · {agreement.user.email}</p>
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
          
          {/* Progress */}
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Initiative {currentIndex + 1} of {totalInitiatives}
            </div>
            <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-600 h-full transition-all"
                style={{ width: `${pendingInitiatives.length > 0 ? (pendingReviewedCount / pendingInitiatives.length) * 100 : 100}%` }}
              />
            </div>
            <div className="text-sm font-medium text-purple-600">
              {pendingReviewedCount}/{pendingInitiatives.length} Pending Reviewed
            </div>
          </div>
        </div>

        {/* Initiative Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Decision Status */}
              {currentDecision.status !== 'pending' && (
                <div className="mb-4">
                  <Badge className={currentDecision.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {currentDecision.status === 'approved' ? '✔ Approved' : '✗ Rejected'}
                  </Badge>
                  {currentDecision.comment && (
                    <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                      <span className="font-medium">Comment:</span> {currentDecision.comment}
                    </div>
                  )}
                </div>
              )}

              {/* Goal Path */}
              <div className="text-xs text-gray-500">
                {currentAgreement.initiative.objective.goal.goalNumber} → {currentAgreement.initiative.objective.goal.title} → {currentAgreement.initiative.objective.title}
              </div>

              {/* Initiative Title */}
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-gray-900">{currentAgreement.initiative.title}</h3>
                <Badge variant="outline" className="text-lg px-3">{currentAgreement.weight}%</Badge>
              </div>

              {/* Measure & Target */}
              {currentAgreement.initiative.measure && (
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs font-semibold text-blue-700 mb-1">MEASURE/KPI:</div>
                  <p className="text-sm">{currentAgreement.initiative.measure}</p>
                </div>
              )}

              {currentAgreement.initiative.target && (
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs font-semibold text-blue-700 mb-1">TARGET:</div>
                  <p className="text-sm">{currentAgreement.initiative.target}</p>
                </div>
              )}

              {/* Staff's Action Plan */}
              <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-400">
                <div className="text-xs font-semibold text-purple-700 mb-2">STAFF'S ACTION PLAN:</div>
                <p className="text-sm">{currentAgreement.customAction}</p>
              </div>

              {/* Progress Status */}
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCurrentCompleted
                  ? 'bg-green-50 border-green-300'
                  : 'bg-amber-50 border-amber-300'
              }`}>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-600 mb-1">EMPLOYEE PROGRESS STATUS:</div>
                  <Badge className={`${
                    currentAgreement.status === 'COMPLETED' ? 'bg-green-600 text-white' :
                    currentAgreement.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {currentAgreement.status === 'COMPLETED' ? '✔ Completed' :
                     currentAgreement.status === 'IN_PROGRESS' ? '⏳ In Progress' :
                     'Not Started'}
                  </Badge>
                </div>
                {!isCurrentCompleted && (
                  <div className="text-amber-700 text-xs font-medium">
                    Awaiting completion by employee
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="text-sm text-gray-600">
                <strong>Due Date:</strong> {new Date(currentAgreement.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              {/* Evidence provided by employee */}
              {(currentAgreement.evidenceUrl || currentAgreement.evidenceNotes) && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-2"> Evidence Provided</p>
                  {currentAgreement.evidenceNotes && <p className="text-sm text-gray-700 mb-2">{currentAgreement.evidenceNotes}</p>}
                  {currentAgreement.evidenceUrl && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                      onClick={() => setEvidencePreview({ url: currentAgreement.evidenceUrl ?? null, notes: currentAgreement.evidenceNotes })}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Preview Evidence
                      {parseEvidenceUrls(currentAgreement.evidenceUrl ?? '').length > 1 && (
                        <span className="ml-1 text-blue-400">({parseEvidenceUrls(currentAgreement.evidenceUrl ?? '').length} files)</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between gap-3">
            {/* Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNext}
                disabled={currentIndex === totalInitiatives - 1}
              >
                Next →
              </Button>
            </div>

            {/* Decision Buttons */}
            <div className="flex gap-2">
              {currentAgreement.approvalStatus === 'PENDING' ? (
                // For PENDING items, allow review only when COMPLETED
                currentDecision.status === 'pending' ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={!isCurrentCompleted}
                      title={!isCurrentCompleted ? 'Can only reject after employee marks as Completed' : undefined}
                    >
                      Reject Initiative
                    </Button>
                    <Button
                      onClick={handleApproveInitiative}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!isCurrentCompleted}
                      title={!isCurrentCompleted ? 'Can only approve after employee marks action as Completed' : undefined}
                    >
                      Approve Initiative
                    </Button>
                    {!isCurrentCompleted && (
                      <span className="text-xs text-amber-600 font-medium self-center">
                        Waiting for employee to complete
                      </span>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newDecisions = { ...decisions }
                      delete newDecisions[currentAgreement.id]
                      setDecisions(newDecisions)
                    }}
                  >
                    Change Decision
                  </Button>
                )
              ) : (
                // For already APPROVED/REJECTED items, show read-only status
                <Badge className={
                  currentAgreement.approvalStatus === 'APPROVED' 
                    ? 'bg-green-100 text-green-800 text-lg px-4 py-2' 
                    : 'bg-red-100 text-red-800 text-lg px-4 py-2'
                }>
                  {currentAgreement.approvalStatus === 'APPROVED' ? '✔ Already Approved' : '✗ Already Rejected'}
                </Badge>
              )}
            </div>

            {/* Submit All - Only show when all PENDING items are reviewed */}
            {allPendingReviewed && (
              <Button
                onClick={handleSubmitAll}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? 'Submitting...' : `Submit ${pendingInitiatives.length} Review${pendingInitiatives.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>

        {/* Reject Dialog */}
        {showRejectDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Rejection Comment</h3>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Explain why you're rejecting this initiative..."
                className="w-full border rounded p-2 min-h-25"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false)
                    setRejectComment('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectInitiative}
                  disabled={!rejectComment.trim()}
                  className="flex-1"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-dialog evidence preview */}
      {evidencePreview && (
        <EvidencePreviewModal
          evidenceUrl={evidencePreview.url}
          evidenceNotes={evidencePreview.notes}
          open={!!evidencePreview.url}
          onClose={() => setEvidencePreview(null)}
          title="Employee Evidence"
        />
      )}
    </div>
  )
}
