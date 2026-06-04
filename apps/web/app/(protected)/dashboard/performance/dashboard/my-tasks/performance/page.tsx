'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Calendar, Target, CheckCircle, AlertCircle, X, Edit, Trash2, Shield, FileText, TrendingUp, Clock, RefreshCw, Award, Download, ExternalLink, Activity, ListChecks, Star, Scale, RotateCcw } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import { getPerformanceCycleDescription } from '@/lib/pms/performance-cycle'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { colors, gradients, shadows } from '@/app/ui-standards'

interface PerformanceAgreement {
  id: string
  title: string
  description?: string
  kpi?: string
  target?: string
  customAction?: string
  weight?: number
  dueDate: string
  status: string
  percentComplete: number
  evidenceUrl?: string
  evidenceNotes?: string
  rating?: number
  approvalStatus?: string
  isLocked?: boolean
  progressNotes?: string
  initiativeId?: string
  isAdhocContainer?: boolean
  isSystemGenerated?: boolean
  isDiscontinued?: boolean
  originalWeight?: number
  initiative?: {
    id: string
    title: string
    number?: string
    action?: string
    measure?: string
    target?: string
    reportingPeriods?: string[]
    quarterDates?: Record<string, any>
    primaryResponsibility?: string
    secondaryResponsibility?: string
    primaryResponsibleUser?: {
      id: string
      name: string
    } | null
    secondaryResponsibleUser?: {
      id: string
      name: string
    } | null
    objective: {
      title: string
      goal: {
        goalNumber: string
        title: string
      }
    }
  }
  supervisor?: {
    id: string
    name: string
    jobTitle?: string
    signatureUrl?: string
  }
}

interface SubordinateAgreement {
  id: string
  name: string
  email: string
  position?: string
  totalAgreements: number
  approvedAgreements: number
  pendingAgreements: number
  rejectedAgreements: number
  completionPercentage: number
  allApproved: boolean
  hasAgreements: boolean
  signatureUrl?: string
}

export default function PerformanceAgreementPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [agreements, setAgreements] = useState<PerformanceAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<any>(null)
  const [periodLoading, setPeriodLoading] = useState(true)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [statsDialogOpen, setStatsDialogOpen] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null)
  const [selectedAgreement, setSelectedAgreement] = useState<PerformanceAgreement | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<{
    type: 'goal' | 'objective' | 'initiative'
    title: string
    number?: string
  } | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('my-agreement')
  const [subordinates, setSubordinates] = useState<SubordinateAgreement[]>([])
  const [subordinatesLoading, setSubordinatesLoading] = useState(false)
  const goalRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const hasAutoSelected = useRef(false)
  
  const [updateData, setUpdateData] = useState({
    status: 'NOT_STARTED',
    percentComplete: 0,
    progressNotes: '',
    evidenceUrl: '',
    evidenceNotes: '',
    rating: 0
  })
  
  const [savingStatus, setSavingStatus] = useState<string | null>(null) // agreementId being saved
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pdfTypeModal, setPdfTypeModal] = useState(false)
  const [incompleteAgreements, setIncompleteAgreements] = useState<string[]>([]) // Track IDs of incomplete agreements
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false) // Show dialog for fixing incomplete items
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false) // Show dialog for rejected items
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; title: string; message: string; isError: boolean }>({
    open: false,
    title: '',
    message: '',
    isError: false
  })

  // Weight allocation state for different task categories (dynamic array)
  interface TaskCategory {
    id: string
    name: string
    weight: number
  }
  // Default task categories - shown immediately for all users
  const defaultCategories: TaskCategory[] = [
    { id: 'perf', name: 'Performance Agreement Tasks', weight: 75 },
    { id: 'adhoc', name: 'Ad-Hoc', weight: 0 },
    { id: 'risk', name: 'Risk Tasks', weight: 0 },
    { id: 'project', name: 'Project Tasks', weight: 0 },
    { id: 'audit', name: 'Audit Tasks', weight: 0 },
    { id: 'rating360', name: '360 Degree Rating', weight: 25 }
  ]
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>(defaultCategories)
  const [tempCategories, setTempCategories] = useState<TaskCategory[]>(defaultCategories)
  const [weightsApproved, setWeightsApproved] = useState(false) // Lock weights after supervisor approval
  const [allAgreementsApproved, setAllAgreementsApproved] = useState(false) // Lock when all PAs approved
  const [pendingWeightCategories, setPendingWeightCategories] = useState<TaskCategory[] | null>(null)
  const [weightsLoaded, setWeightsLoaded] = useState(false)
  const [weightAllocationDialogOpen, setWeightAllocationDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [csvPreviewData, setCsvPreviewData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [unlockRequested, setUnlockRequested] = useState(false)
  const [isExecutive, setIsExecutive] = useState(false)
  const [isWeightManager, setIsWeightManager] = useState(false)

  // Weight redistribution state (workplan-only)
  const [redistributeDialogOpen, setRedistributeDialogOpen] = useState(false)
  const [redistributeWeights, setRedistributeWeights] = useState<Record<string, number>>({})
  const [redistributeSaving, setRedistributeSaving] = useState(false)

  // Derive regularAgreements and adhocContainer from agreements
  const regularAgreements = useMemo(() => 
    agreements.filter(a => !a.isAdhocContainer), 
    [agreements]
  )
  const adhocContainer = useMemo(() => 
    agreements.find(a => a.isAdhocContainer), 
    [agreements]
  )

  // Calculate total weight allocation from individual agreement weights (from Excel import)
  const totalWeightAllocation = useMemo(() => 
    regularAgreements.reduce((sum, agreement) => sum + (agreement.weight || 0), 0),
    [regularAgreements]
  )

  const exportToPDF = async (downloadType: 'rated' | 'unrated' = 'rated') => {
    // Validate total weight allocation equals 100%
    const totalWeight = regularAgreements.reduce((sum, a) => sum + (a.weight || 0), 0)
    if (totalWeight !== 100) {
      alert(`Cannot export: Your total weight allocation is ${totalWeight}%. It must equal exactly 100% before you can export your performance agreement.\n\nPlease ensure each initiative has a weight assigned and they sum to 100%.`)
      return
    }

    // Validate all agreements are approved
    if (!allApproved) {
      alert('Cannot export: All your initiatives must be approved by your supervisor before you can export the performance agreement.')
      return
    }

    setExportingPDF(true)
    try {
      // Fetch employee signature
      const employeeSignatureRes = await fetch('/dashboard/performance/api/user/signature')
      const employeeSignatureData = await employeeSignatureRes.json()
      const employeeSignature = employeeSignatureData.signatureUrl

      // Fetch department signatories (supervisor, manager, and executive from AD hierarchy)
      let supervisorData = null
      let managerData = null
      let executiveData = null
      try {
        const signatoriesRes = await fetch('/dashboard/performance/api/department-signatories')
        if (signatoriesRes.ok) {
          const signatoriesData = await signatoriesRes.json()
          supervisorData = signatoriesData.supervisor
          managerData = signatoriesData.manager
          executiveData = signatoriesData.executive
          console.log('Department signatories:', signatoriesData)
        }
      } catch (error) {
        console.error('Error fetching department signatories:', error)
      }

      // Fallback: if signatories API didn't return supervisor, try from agreement data
      if (!supervisorData && agreements[0]?.supervisor) {
        const sup = agreements[0].supervisor
        supervisorData = {
          name: sup.name || '',
          designation: sup.jobTitle || '',
          signatureUrl: sup.signatureUrl || null
        }
      }

      // Determine if this is a post-rating export (any agreement has a rating)
      const rawHasRatings = regularAgreements.some(a => a.rating !== null && a.rating !== undefined)
      const hasRatings = downloadType === 'unrated' ? false : rawHasRatings
      
      // Fetch ad-hoc tasks if this is a post-rating export
      let adhocTasks: any[] = []
      // Always fetch my-rate data so 360° section is available in all PDF types
      let myRateData: any = null
      if (hasRatings) {
        try {
          const adhocRes = await fetch('/dashboard/performance/api/adhoc-tasks')
          if (adhocRes.ok) {
            const adhocPayload = await adhocRes.json()
            const { tasks } = adhocPayload
            const allAdhocTasks = Array.isArray(tasks) ? tasks : []
            // Filter for tasks assigned to current user with ratings
            adhocTasks = allAdhocTasks.filter((task: any) => 
              task.assignedToId === session?.user?.id && task.rating !== null
            )
          }
        } catch (error) {
          console.error('Error fetching ad-hoc tasks:', error)
        }
      }
      try {
        const rateRes = await fetch('/dashboard/performance/api/performance-agreements/my-rate')
        if (rateRes.ok) {
          myRateData = await rateRes.json()
        }
      } catch (error) {
        console.error('Error fetching my-rate data:', error)
      }

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

      // Create PDF in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Add NSA Logo - Convert SVG to canvas for better compatibility
      try {
        const response = await fetch('/nored-logo.svg')
        const svgText = await response.text()
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(svgBlob)
        
        const img = new Image()
        img.src = url
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          setTimeout(reject, 5000) // Timeout after 5 seconds
        })
        
        // Convert to canvas for better PDF compatibility
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 200
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, 200, 200)
          const imgData = canvas.toDataURL('image/png')
          doc.addImage(imgData, 'PNG', pageWidth / 2 - 15, 10, 30, 30)
        }
        
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error loading logo:', error)
        // Fallback: Draw NSA text
        doc.setFillColor(0, 51, 102)
        doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      }
      
      // Reset text color
      doc.setTextColor(0, 0, 0)

      // Format period dates
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
      const employeeName = session?.user?.name || 'Employee'
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(employeeName, pageWidth / 2, 52, { align: 'center' })

      // Period cycle name and date range
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(periodName, pageWidth / 2, 59, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 65, { align: 'center' })

      // Calculate totals
      const totalWeight = regularAgreements.reduce((sum, a) => sum + (a.weight || 0), 0)

      // Use the full weighted total from all 5 components if available
      const finalRating = myRateData?.finalRating ?? 0
      const finalPercentage = myRateData?.finalPercentage ?? 0

      // Total Weight Allocation and Total Score
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 72, { align: 'center' })

      if (hasRatings && myRateData) {
        doc.text(`Overall Performance Score: ${finalRating.toFixed(2)} / 5.0  (${finalPercentage.toFixed(1)}%)`, pageWidth / 2, 78, { align: 'center' })
      }
      
      // Prepare table data - match user's screenshot format
      // Columns: Goal, Objective, Strategic Initiative, Actions, Measure, Targets, Weight, Approval Status, Deadline, Rating, Sources of Evidence
      const tableData = regularAgreements.map((agreement) => {
        const goal = agreement.initiative?.objective?.goal
        const objective = agreement.initiative?.objective
        const initiative = agreement.initiative
        
        // Format due date
        let dueDate = 'N/A'
        if (agreement.dueDate) {
          dueDate = new Date(agreement.dueDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
        
        // Approval status display
        const approvalStatusMap: Record<string, string> = {
          'APPROVED': 'Approved',
          'PENDING': 'Pending',
          'REJECTED': 'Rejected',
          'NOT_STARTED': 'Not Started'
        }
        const approvalStatus = approvalStatusMap[agreement.approvalStatus || ''] || 'Not Submitted'
        
        // Rating display
        const ratingDisplay = agreement.rating 
          ? (agreement.rating >= 4 ? 'Exceptionally Well' : agreement.rating >= 3 ? 'Complete' : 'In Progress')
          : ''
        const ratingValue = agreement.rating ? `(${agreement.rating})` : ''
        
        // Build row matching screenshot columns
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
          hasRatings ? `${ratingDisplay} ${ratingValue}`.trim() : '',
          agreement.evidenceUrl || ''
        ]
        
        return downloadType === 'unrated' ? row.slice(0, 9) : row
      })
      
      // Add ad-hoc container row at the end
      if (adhocContainer) {
        const adhocRating = adhocContainer.rating 
          ? (adhocContainer.rating >= 4 ? 'Exceptionally Well' : adhocContainer.rating >= 3 ? 'Complete' : 'In Progress')
          : ''
        const adhocRow = [
          '-', // Goal
          '-', // Objective
          'Ad-hoc Tasks', // Strategic Initiative
          hasRatings ? `See breakdown below (${adhocTasks.length} tasks)` : 'Various ad-hoc assignments',
          '-', // Measure
          '-', // Targets
          '10%', // Weight
          'N/A', // Approval Status
          new Date(adhocContainer.dueDate).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          hasRatings ? `${adhocRating} (${adhocContainer.rating || '-'})` : '',
          '' // Evidence
        ]
        
        tableData.push(downloadType === 'unrated' ? adhocRow.slice(0, 9) : adhocRow)
      }
      
      // Prepare table header matching screenshot
      const tableHeader = downloadType === 'unrated'
        ? ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Approval Status', 'Deadline']
        : ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Approval Status', 'Deadline', 'Rating', 'Sources of Evidence']
      
      // Define column styles for landscape A4 (~297mm width, 269mm usable with 14mm margins)
      const columnStyles: any = downloadType === 'unrated'
        ? {
            0: { cellWidth: 28 }, 1: { cellWidth: 30 }, 2: { cellWidth: 34 }, 3: { cellWidth: 40 },
            4: { cellWidth: 28 }, 5: { cellWidth: 26 }, 6: { cellWidth: 13, halign: 'center' },
            7: { cellWidth: 20, halign: 'center' }, 8: { cellWidth: 20, halign: 'center' }
          }
        : {
            0: { cellWidth: 24 },                      // Goal
            1: { cellWidth: 26 },                      // Objective
            2: { cellWidth: 28 },                      // Strategic Initiative
            3: { cellWidth: 34 },                      // Actions
            4: { cellWidth: 24 },                      // Measure
            5: { cellWidth: 22 },                      // Targets
            6: { cellWidth: 11, halign: 'center' },   // Weight
            7: { cellWidth: 16, halign: 'center' },   // Approval Status
            8: { cellWidth: 18, halign: 'center' },   // Deadline
            9: { cellWidth: 20, halign: 'center' },   // Rating
            10: { cellWidth: 26 }                      // Sources of Evidence
          }
      
      // Start Y position based on whether we have ratings
      const tableStartY = hasRatings ? 85 : 80
      
      // Add table (landscape has more width: ~297mm vs 210mm)
      autoTable(doc, {
        startY: tableStartY,
        head: [tableHeader],
        body: tableData,
        theme: 'grid',
        tableWidth: 'auto',
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
          fontSize: 8,
          cellPadding: 2.5
        },
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          valign: 'middle'
        },
        columnStyles,
        margin: { left: 14, right: 14 },
        didDrawPage: function(data: any) {
          // Footer
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text(
            'This is an official Performance Agreement document.',
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          )
          addStamp(doc, pageWidth, pageHeight)
        }
      })
      
      let finalY = (doc as any).lastAutoTable.finalY || 150
      
      // Add detailed ad-hoc tasks breakdown if this is a post-rating export
      if (hasRatings && adhocTasks.length > 0) {
        // Check if we need a new page for the ad-hoc section
        if (finalY + 40 > pageHeight - 20) {
          doc.addPage()
          addStamp(doc, pageWidth, pageHeight)
          finalY = 20
        } else {
          finalY += 15
        }
        
        // Ad-hoc tasks section header
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 51, 102)
        doc.text('AD-HOC TASKS BREAKDOWN', 14, finalY)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(`Total Ad-hoc Tasks Completed: ${adhocTasks.length}`, 14, finalY + 6)
        
        // Calculate average rating
        const avgRating = adhocTasks.reduce((sum: number, task: any) => sum + (task.rating || 0), 0) / adhocTasks.length
        doc.text(`Average Rating: ${avgRating.toFixed(2)}/5`, 14, finalY + 12)
        
        // Prepare ad-hoc tasks table data
        const adhocTableData = adhocTasks.map((task: any, index: number) => {
          const completedDate = task.completedAt 
            ? new Date(task.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A'
          
          return [
            index + 1,
            task.title || 'Untitled',
            task.description || '-',
            task.priority || 'MEDIUM',
            completedDate,
            `${task.rating}/5`
          ]
        })
        
        // Add ad-hoc tasks table
        autoTable(doc, {
          startY: finalY + 18,
          head: [['#', 'Task Title', 'Description', 'Priority', 'Completed Date', 'Rating']],
          body: adhocTableData,
          theme: 'striped',
          headStyles: {
            fillColor: [52, 152, 219],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },   // #
            1: { cellWidth: 60 },                      // Title
            2: { cellWidth: 100 },                     // Description
            3: { cellWidth: 20, halign: 'center' },   // Priority
            4: { cellWidth: 30, halign: 'center' },   // Completed Date
            5: { cellWidth: 20, halign: 'center' }    // Rating
          },
          margin: { left: 14, right: 14 }
        })
        
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40
      }
      
      const NSA_DARK_BLUE_MT: [number,number,number] = [0, 51, 102]
      const NSA_GOLD_MT: [number,number,number] = [204, 153, 0]
      const getPerfLevelMT = (r: number) => r >= 4.5 ? 'Outstanding' : r >= 4.0 ? 'Excellent' : r >= 3.5 ? 'Very Good' : r >= 3.0 ? 'Good' : r >= 2.5 ? 'Satisfactory' : 'Needs Improvement'

      // ── Quarterly Breakdown (Q1–Q4) ──
      if (myRateData?.quarterBreakdown && myRateData.quarterBreakdown.length > 0) {
        const qbMT = myRateData.quarterBreakdown
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NSA_DARK_BLUE_MT)
        doc.text('QUARTERLY PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('NSA Financial Year: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const qRowsMT = qbMT.map((q: any) => [
          `${q.quarter} (${q.label})`,
          q.total > 0 ? String(q.total) : '-',
          q.rated > 0 ? String(q.rated) : '-',
          q.avgRating != null ? `${q.avgRating.toFixed(2)} / 5` : '-',
          q.avgRating != null ? getPerfLevelMT(q.avgRating) : '-',
        ])
        autoTable(doc, {
          startY: finalY,
          head: [['Quarter', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: qRowsMT, theme: 'grid',
          headStyles: { fillColor: NSA_GOLD_MT, textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
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
        finalY += 8
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NSA_DARK_BLUE_MT)
        doc.text('BI-ANNUAL PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('H1 = Q1 + Q2 (Apr–Sep)  |  H2 = Q3 + Q4 (Oct–Mar)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const buildHalfMT = (qs: any[]) => {
          const tot = qs.reduce((s: number, q: any) => s + q.total, 0)
          const rat = qs.reduce((s: number, q: any) => s + q.rated, 0)
          const rs = qs.reduce((s: number, q: any) => s + (q.avgRating != null ? q.avgRating * q.total : 0), 0)
          const avgR = tot > 0 && rat > 0 ? rs / tot : null
          return { tot, rat, avgR }
        }
        const h1MT = buildHalfMT([qbMT[0], qbMT[1]])
        const h2MT = buildHalfMT([qbMT[2], qbMT[3]])
        autoTable(doc, {
          startY: finalY,
          head: [['Period', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: [
            ['H1 – First Half (Apr – Sep)', String(h1MT.tot || '-'), String(h1MT.rat || '-'), h1MT.avgR != null ? `${h1MT.avgR.toFixed(2)} / 5` : '-', h1MT.avgR != null ? getPerfLevelMT(h1MT.avgR) : '-'],
            ['H2 – Second Half (Oct – Mar)', String(h2MT.tot || '-'), String(h2MT.rat || '-'), h2MT.avgR != null ? `${h2MT.avgR.toFixed(2)} / 5` : '-', h2MT.avgR != null ? getPerfLevelMT(h2MT.avgR) : '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: NSA_DARK_BLUE_MT, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', halign: 'center' },
          columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30
      }

      // ============================================
      // 360-DEGREE BEHAVIOURAL COMPETENCY RATING (rated exports)
      // ============================================
      const r360pre = myRateData?.rating360Detail ?? null
      if (r360pre) {
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
        doc.text('NSA Behavioural Competency evaluation — rated by 4 perspectives: Self, Supervisor, Dept. (Random) & Org. (Random)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 6

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Cycle: ${r360pre.cycleName}`, 14, finalY)
        doc.text(`Overall Status: ${r360pre.status || 'In Progress'}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 8

        const fmtRating360 = (v: number | null | undefined) => (v !== null && v !== undefined) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const raterRows360: string[][] = [
          ['Self', fmtRating360(r360pre.selfRating), r360pre.selfStatus || (r360pre.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', fmtRating360(r360pre.supervisorRating), r360pre.supervisorStatus || (r360pre.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', fmtRating360(r360pre.deptRandomRating), r360pre.deptRandomStatus || (r360pre.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', fmtRating360(r360pre.orgRandomRating), r360pre.orgRandomStatus || (r360pre.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (r360pre.averageRating != null) raterRows360.push(['Overall Average', `${Number(r360pre.averageRating).toFixed(2)} / 5`, 'Combined'])

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, finalY)
        finalY += 2

        autoTable(doc, {
          startY: finalY,
          head: [['Perspective', 'Rating', 'Status']],
          body: raterRows360,
          theme: 'grid',
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
              else if (v === 'Not assigned') { data.cell.styles.textColor = [130, 130, 130] }
            }
            if (data.row.index === raterRows360.length - 1 && raterRows360[raterRows360.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40

        const compDetail360 = r360pre.competencyDetail || []
        if (compDetail360.length > 0) {
          finalY += 10
          if (finalY + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, finalY)
          doc.setTextColor(0, 0, 0); finalY += 2
          const fmtS360 = (v: number | null) => (v !== null && v !== undefined) ? Number(v).toFixed(2) : 'Pending'
          const fmtO360 = (v: number | null) => (v !== null && v !== undefined) ? `${Number(v).toFixed(2)} / 5` : '-'
          const cBody360 = compDetail360.map((c: any) => [c.competency, fmtS360(c.selfScore), fmtS360(c.supervisorScore), fmtS360(c.deptRandomScore), fmtS360(c.orgRandomScore), fmtO360(c.overallAvg)])
          const agg360 = (key: string) => { const vals = compDetail360.filter((c: any) => c[key] !== null && c[key] !== undefined).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const ovArr360 = compDetail360.filter((c: any) => c.overallAvg !== null).map((c: any) => Number(c.overallAvg))
          cBody360.push(['OVERALL AVERAGE', agg360('selfScore'), agg360('supervisorScore'), agg360('deptRandomScore'), agg360('orgRandomScore'), ovArr360.length > 0 ? `${(ovArr360.reduce((a: number, b: number) => a + b, 0) / ovArr360.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: finalY,
            head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']],
            body: cBody360,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === cBody360.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < cBody360.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        } else if (r360pre.competencyBreakdown?.length > 0 || r360pre.categoryBreakdown?.length > 0) {
          const legData360 = r360pre.competencyBreakdown?.length > 0 ? r360pre.competencyBreakdown : r360pre.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          finalY += 10
          if (finalY + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, finalY); finalY += 2
          autoTable(doc, {
            startY: finalY, head: [['Competency / Category', 'Average Score', 'Responses']],
            body: legData360.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount} response(s)`]),
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        }
      }

      // ── 360-DEGREE PERFORMANCE FEEDBACK REPORT ──
      if (r360pre?.competencyDetail?.length > 0) {
        const fb360Comps = r360pre.competencyDetail
        const NSA_COMPS_ORDER_FB = ['Integrity', 'Excellent Performance', 'Professionalism', 'Accountability', 'Partnership', 'Customer-focussed']
        const FB_DARK_BLUE: [number,number,number] = [0, 51, 102]
        const FB_GOLD: [number,number,number] = [204, 153, 0]
        type FbGuide = { ratings: string[]; getFeedback: (s: number) => string }
        const nsa360Guide: Record<string, FbGuide> = {
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
        const sortedFbComps = [...fb360Comps].sort((a: any, b: any) => { const ai = NSA_COMPS_ORDER_FB.indexOf(a.competency); const bi = NSA_COMPS_ORDER_FB.indexOf(b.competency); return ai === -1 && bi === -1 ? 0 : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi })
        const ovArrFb = sortedFbComps.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
        const overallAvgFb = ovArrFb.length > 0 ? ovArrFb.reduce((a, b) => a + b, 0) / ovArrFb.length : 0
        const strengthsFb = sortedFbComps.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) >= 3.5)
        const devAreasFb = sortedFbComps.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) < 3.0)
        const displayStrsFb = strengthsFb.length > 0 ? strengthsFb : sortedFbComps.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(b.overallAvg) - Number(a.overallAvg)).slice(0, 3)
        const displayDevFb = devAreasFb.length > 0 ? devAreasFb : sortedFbComps.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(a.overallAvg) - Number(b.overallAvg)).filter((c: any) => Number(c.overallAvg) < 3.5).slice(0, 2)
        const getOverallNarrFb = (s: number) => s >= 4.5 ? 'The results of the 360-degree assessment indicate that your overall performance is exceptional, consistently exceeding organisational expectations across all competency areas. Your contributions are highly valued, and you serve as a role model for colleagues. Continue to leverage your strengths and support the development of others within the organisation.' : s >= 4.0 ? 'The results of the 360-degree assessment indicate that your overall performance exceeds organisational expectations in several key competency areas. You demonstrate strong capabilities and contribute positively to team and organisational outcomes. Continued focus on sustaining these strengths while developing identified areas will further enhance your effectiveness.' : s >= 3.0 ? 'The results of the 360-degree assessment indicate that your overall performance meets organisational expectations, with several areas demonstrating strong capability. You contribute positively to the work environment and generally perform your responsibilities reliably. Strengthening certain competencies will further enhance your effectiveness and contribution to the organisation.' : s >= 2.0 ? 'The results of the 360-degree assessment indicate that there are opportunities for growth in your performance. While some areas show positive contributions, developing key competencies will be important for meeting organisational expectations. Engaging with available development resources and seeking feedback will support improvement.' : 'The results of the 360-degree assessment indicate that significant development is needed across most competency areas. A focused development plan, supported by your supervisor and relevant training opportunities, will be essential to improving performance and meeting organisational expectations.'

        // Page: Header
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...FB_DARK_BLUE); doc.rect(14, finalY - 4, pageWidth - 28, 14, 'F')
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('360-DEGREE PERFORMANCE FEEDBACK REPORT', pageWidth / 2, finalY + 5, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 18
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
        doc.text(`Employee: ${session?.user?.name || 'N/A'}   |   Cycle: ${r360pre.cycleName}   |   Overall Rating: ${overallAvgFb.toFixed(2)} / 5`, 14, finalY)
        doc.setTextColor(0, 0, 0); finalY += 10

        // Section 1: Overall Performance Insight
        doc.setFillColor(...FB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('1.  Overall Performance Insight', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Final Rating Interpretation', 14, finalY); finalY += 4
        autoTable(doc, {
          startY: finalY, theme: 'grid',
          head: [['Rating', 'Interpretation']],
          body: [['1','Unsatisfactory Performance'],['2','Below Expected Standard'],['3','Meets Expectations'],['4','Exceeds Expectations'],['5','Excellent Performance']],
          headStyles: { fillColor: FB_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5 },
          columnStyles: { 0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 120 } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(overallAvgFb)))) { data.cell.styles.fillColor = FB_GOLD; data.cell.styles.fontStyle = 'bold' } }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30; finalY += 5
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...FB_DARK_BLUE); doc.text('Narrative', 14, finalY); finalY += 4
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9)
        const narrFbLines = doc.splitTextToSize(getOverallNarrFb(overallAvgFb), pageWidth - 28)
        doc.text(narrFbLines, 14, finalY); finalY += narrFbLines.length * 4 + 10

        // Section 2: Strengths Summary
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(34, 139, 34); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('2.  Strengths Summary', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        const strIntrLines = doc.splitTextToSize('This section highlights areas where your performance exceeds expectations or demonstrates strong capability.', pageWidth - 28)
        doc.text(strIntrLines, 14, finalY); finalY += strIntrLines.length * 4 + 4
        doc.setFont('helvetica', 'bold')
        const strHdrLines = doc.splitTextToSize('Based on the assessment results, the following areas have been identified as key strengths:', pageWidth - 28)
        doc.text(strHdrLines, 14, finalY); finalY += strHdrLines.length * 4 + 4
        doc.setFont('helvetica', 'normal')
        displayStrsFb.forEach((c: any) => {
          if (finalY + 15 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          const g = nsa360Guide[c.competency]; if (!g) return
          const sIdx = Math.min(4, Math.max(0, Math.round(Number(c.overallAvg)) - 1))
          doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 100, 0); doc.setFontSize(9)
          doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
          doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
          const dLines = doc.splitTextToSize(g.ratings[sIdx], pageWidth - 36); doc.text(dLines, 20, finalY); finalY += dLines.length * 4 + 4
        })
        const strConclLines = doc.splitTextToSize('These strengths contribute significantly to team performance and organisational effectiveness. You are encouraged to continue leveraging these capabilities and to support colleagues through collaboration, mentoring, or knowledge sharing.', pageWidth - 28)
        doc.text(strConclLines, 14, finalY); finalY += strConclLines.length * 4 + 10

        // Section 3: Development Areas
        if (displayDevFb.length > 0) {
          if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(180, 40, 40); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
          doc.text('3.  Development Areas', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
          doc.setFontSize(9); doc.setFont('helvetica', 'normal')
          doc.text(doc.splitTextToSize('This section highlights competencies where performance improvement or further development is recommended.', pageWidth - 28), 14, finalY); finalY += 8
          doc.setFont('helvetica', 'bold')
          doc.text(doc.splitTextToSize('The assessment results suggest that additional development may be beneficial in the following areas:', pageWidth - 28), 14, finalY); finalY += 8
          doc.setFont('helvetica', 'normal')
          displayDevFb.forEach((c: any) => {
            if (finalY + 20 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
            const g = nsa360Guide[c.competency]; if (!g) return
            doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 40, 40); doc.setFontSize(9)
            doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
            const fbL = doc.splitTextToSize(g.getFeedback(Number(c.overallAvg)), pageWidth - 32); doc.text(fbL, 20, finalY); finalY += fbL.length * 4 + 6
          })
          doc.text(doc.splitTextToSize('Addressing these areas will support your continued professional growth and improve your contribution to the organisation.', pageWidth - 28), 14, finalY); finalY += 10
        }

        // Section 4: Competency Feedback
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...FB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('4.  Competency Feedback', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Below is the interpretation of your ratings for each competency area.', 14, finalY); finalY += 8
        sortedFbComps.forEach((c: any) => {
          const g = nsa360Guide[c.competency]; if (!g) return
          const score = c.overallAvg != null ? Number(c.overallAvg) : null
          if (finalY + 55 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(235, 241, 250); doc.rect(14, finalY, pageWidth - 28, 7, 'F')
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...FB_DARK_BLUE)
          doc.text(`${c.competency}${score != null ? `  \u2014  ${score.toFixed(2)} / 5` : ''}`, 16, finalY + 5); doc.setTextColor(0, 0, 0); finalY += 11
          autoTable(doc, {
            startY: finalY, theme: 'grid',
            head: [['Rating', 'Guide']],
            body: g.ratings.map((desc, idx) => [String(idx + 1), desc]),
            headStyles: { fillColor: [100,100,100], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 1.5 },
            bodyStyles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 130 } },
            margin: { left: 14, right: 14 },
            didParseCell: (data: any) => { if (data.section === 'body' && score != null && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(score)))) { data.cell.styles.fillColor = FB_GOLD; data.cell.styles.fontStyle = 'bold' } }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 25; finalY += 3
          if (score != null) {
            doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 50)
            const fbLines = doc.splitTextToSize(g.getFeedback(score), pageWidth - 28); doc.text(fbLines, 14, finalY); finalY += fbLines.length * 4 + 10
          }
        })

        // Section 5: Recommended Development Actions
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(...FB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
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

      // ============================================
      // 360-DEGREE BEHAVIOURAL COMPETENCY RATING (unrated export fallback)
      // ============================================
      const r360 = (!r360pre && myRateData?.rating360Detail) ? myRateData.rating360Detail : null
      if (r360) {
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
        doc.text('NSA Behavioural Competency evaluation — rated by 4 perspectives: Self, Supervisor, Dept. (Random) & Org. (Random)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 6

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Cycle: ${r360.cycleName}`, 14, finalY)
        doc.text(`Overall Status: ${r360.status || 'In Progress'}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 8

        // Rater status table — one row per perspective
        const fmtRating = (v: number | null | undefined) => (v !== null && v !== undefined) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const raterStatusRows = [
          ['Self', fmtRating(r360.selfRating), r360.selfStatus || (r360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', fmtRating(r360.supervisorRating), r360.supervisorStatus || (r360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', fmtRating(r360.deptRandomRating), r360.deptRandomStatus || (r360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', fmtRating(r360.orgRandomRating), r360.orgRandomStatus || (r360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (r360.averageRating != null) {
          raterStatusRows.push(['Overall Average', `${Number(r360.averageRating).toFixed(2)} / 5`, 'Combined'])
        }

        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, finalY)
        finalY += 2

        autoTable(doc, {
          startY: finalY,
          head: [['Perspective', 'Rating', 'Status']],
          body: raterStatusRows,
          theme: 'grid',
          headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 45, halign: 'center' },
            2: { cellWidth: 50, halign: 'center' },
          },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => {
            if (data.column.index === 2) {
              const v = data.cell.raw as string
              if (v === 'Completed') { data.cell.styles.textColor = [46, 125, 50]; data.cell.styles.fontStyle = 'bold' }
              else if (v === 'Pending') { data.cell.styles.textColor = [180, 100, 0] }
              else if (v === 'Not assigned') { data.cell.styles.textColor = [130, 130, 130] }
            }
            if (data.row.index === raterStatusRows.length - 1 && raterStatusRows[raterStatusRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40

        // Competency breakdown — NSA 4-perspective format
        const compDetail = r360.competencyDetail || []
        if (compDetail.length > 0) {
          finalY += 10
          if (finalY + 40 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, finalY)
          doc.setTextColor(0, 0, 0); finalY += 2

          const fmtScore = (v: number | null) => (v !== null && v !== undefined) ? Number(v).toFixed(2) : 'Pending'
          const fmtOv = (v: number | null) => (v !== null && v !== undefined) ? `${Number(v).toFixed(2)} / 5` : '-'
          const compBody = compDetail.map((c: any) => [
            c.competency,
            fmtScore(c.selfScore),
            fmtScore(c.supervisorScore),
            fmtScore(c.deptRandomScore),
            fmtScore(c.orgRandomScore),
            fmtOv(c.overallAvg),
          ])
          // Aggregate row
          const agg = (key: string) => {
            const vals = compDetail.filter((c: any) => c[key] !== null && c[key] !== undefined).map((c: any) => Number(c[key]))
            return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-'
          }
          const ovAgg = compDetail.filter((c: any) => c.overallAvg !== null).map((c: any) => Number(c.overallAvg))
          const ovAggStr = ovAgg.length > 0 ? `${(ovAgg.reduce((a: number, b: number) => a + b, 0) / ovAgg.length).toFixed(2)} / 5` : '-'
          compBody.push(['OVERALL AVERAGE', agg('selfScore'), agg('supervisorScore'), agg('deptRandomScore'), agg('orgRandomScore'), ovAggStr])

          autoTable(doc, {
            startY: finalY,
            head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']],
            body: compBody,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: {
              0: { cellWidth: 55, fontStyle: 'bold' },
              1: { cellWidth: 28, halign: 'center' },
              2: { cellWidth: 32, halign: 'center' },
              3: { cellWidth: 35, halign: 'center' },
              4: { cellWidth: 35, halign: 'center' },
              5: { cellWidth: 35, halign: 'center' },
            },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === compBody.length - 1) {
                data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold'
              }
              if (data.column.index > 0 && data.row.index < compBody.length - 1) {
                const v = data.cell.raw as string
                if (v === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
              }
            }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        } else if (r360.competencyBreakdown?.length > 0 || r360.categoryBreakdown?.length > 0) {
          // Legacy fallback
          const legacyData = r360.competencyBreakdown?.length > 0
            ? r360.competencyBreakdown
            : r360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          finalY += 10
          if (finalY + 30 > pageHeight - 20) { doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, finalY); finalY += 2
          const legacyRows = legacyData.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount} response(s)`])
          autoTable(doc, {
            startY: finalY, head: [['Competency / Category', 'Average Score', 'Responses']], body: legacyRows, theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
              margin: { left: 14, right: 14 }
            })
            finalY = (doc as any).lastAutoTable.finalY || finalY + 40
          }
        }
      
      // ── OVERALL PERFORMANCE SCORE SUMMARY ──
      if (hasRatings && myRateData) {
        doc.addPage(); addStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NSA_DARK_BLUE_MT)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 10
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${session?.user?.name || 'N/A'}`, 14, finalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 10
        const summComp = myRateData.components
        const summWeights = myRateData.weights
        const summaryTableData = [
          ['Performance Agreements', `${summWeights.performanceAgreement}%`, `${summComp.performanceAgreement.rating.toFixed(2)} / 5`, `${summComp.performanceAgreement.weightedScore.toFixed(2)}`, `${summComp.performanceAgreement.ratedCount || 0}/${summComp.performanceAgreement.initiativesCount} rated`],
          ['Ad-hoc Tasks', `${summWeights.adhoc}%`, `${summComp.adhoc.rating.toFixed(2)} / 5`, `${summComp.adhoc.weightedScore.toFixed(2)}`, `${summComp.adhoc.tasksCompleted}/${summComp.adhoc.tasksTotal} completed (${summComp.adhoc.completionRate.toFixed(0)}%)`],
          ['Projects', `${summWeights.projects}%`, `${summComp.projects.rating.toFixed(2)} / 5`, `${summComp.projects.weightedScore.toFixed(2)}`, summComp.projects.tasksTotal > 0 ? `${summComp.projects.tasksCompleted}/${summComp.projects.tasksTotal} completed (${summComp.projects.completionRate.toFixed(0)}%)` : 'No project tasks'],
          ['Risk Management', `${summWeights.riskManagement}%`, `${summComp.riskManagement.rating.toFixed(2)} / 5`, `${summComp.riskManagement.weightedScore.toFixed(2)}`, summComp.riskManagement.tasksTotal > 0 ? `${summComp.riskManagement.tasksCompleted}/${summComp.riskManagement.tasksTotal} completed (${summComp.riskManagement.completionRate.toFixed(0)}%)` : 'No risk tasks'],
          ['Audit Tasks', `${summWeights.audit}%`, `${summComp.audit.rating.toFixed(2)} / 5`, `${summComp.audit.weightedScore.toFixed(2)}`, summComp.audit.tasksTotal > 0 ? `${summComp.audit.tasksCompleted}/${summComp.audit.tasksTotal} completed (${summComp.audit.completionRate.toFixed(0)}%)` : 'No audit tasks'],
          ['360-Degree Rating', `${summWeights.rating360 || 0}%`, `${(summComp.rating360?.rating || 0).toFixed(2)} / 5`, `${(summComp.rating360?.weightedScore || 0).toFixed(2)}`, summComp.rating360?.hasAnyRatings ? (summComp.rating360.hasCompleted ? 'Completed' : 'In progress') : 'Not started'],
          ['OVERALL TOTAL', '100%', `${myRateData.finalRating.toFixed(2)} / 5`, `${myRateData.finalRating.toFixed(2)}`, `${myRateData.finalPercentage.toFixed(1)}%`],
        ]
        autoTable(doc, {
          startY: finalY, head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']], body: summaryTableData, theme: 'grid',
          headStyles: { fillColor: NSA_DARK_BLUE_MT, textColor: [255,255,255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.row.index === summaryTableData.length - 1) {
              data.cell.styles.fillColor = NSA_DARK_BLUE_MT; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 10
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60
        finalY += 6
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...NSA_DARK_BLUE_MT)
        doc.text(`Overall Performance Level: ${getPerfLevelMT(myRateData.finalRating)}`, pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 8
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Add signature section on last page
      const allApprovedForPDF = regularAgreements.length > 0 && regularAgreements.every(a => a.approvalStatus === 'APPROVED')
      
      // Prepare signatures data - auto-populate from AD/department hierarchy
      // Debug: log signature URLs
      console.log('📝 Signature URLs for PDF:')
      console.log('  Employee signature:', employeeSignature)
      console.log('  Supervisor data from API:', supervisorData)
      console.log('  Supervisor signatureUrl from API:', supervisorData?.signatureUrl)
      console.log('  Supervisor signatureUrl from agreement:', agreements[0]?.supervisor?.signatureUrl)
      console.log('  Final supervisor signature:', supervisorData?.signatureUrl || agreements[0]?.supervisor?.signatureUrl || 'null')
      
      const signaturesData = {
        employee: {
          name: session?.user?.name || '',
          designation: (session?.user as any)?.jobTitle || '',
          signature: employeeSignature,
          date: new Date().toLocaleDateString('en-ZA')
        },
        supervisor: {
          name: supervisorData?.name || agreements[0]?.supervisor?.name || '',
          designation: supervisorData?.designation || agreements[0]?.supervisor?.jobTitle || '',
          signature: supervisorData?.signatureUrl || agreements[0]?.supervisor?.signatureUrl || null,
          date: allApprovedForPDF ? new Date().toLocaleDateString('en-ZA') : null
        },
        manager: {
          name: managerData?.name || '',
          designation: managerData?.designation || '',
          signature: managerData?.signatureUrl || null,
          date: allApprovedForPDF && managerData?.signatureUrl ? new Date().toLocaleDateString('en-ZA') : null
        },
        executive: {
          name: executiveData?.name || '',
          designation: executiveData?.designation || '',
          signature: executiveData?.signatureUrl || null,
          date: allApprovedForPDF && executiveData?.signatureUrl ? new Date().toLocaleDateString('en-ZA') : null
        }
      }
      
      // Always add signature section on a new page for clean layout
      doc.addPage()
      addStamp(doc, pageWidth, pageHeight)
      await addSignatureSection(doc, 30, signaturesData)
      
      // Save PDF
      const ratingStatus = downloadType === 'rated' ? 'Rated' : 'Unrated'
      const fileName = `Performance_Agreement_${ratingStatus}_${session?.user?.name?.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`
      doc.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }
  
  const addSignatureSection = async (
    doc: jsPDF, 
    startY: number, 
    signaturesData: {
      employee: { name: string; designation: string; signature: string | null; date: string | null };
      supervisor: { name: string; designation: string; signature: string | null; date: string | null };
      manager: { name: string; designation: string; signature: string | null; date: string | null };
      executive: { name: string; designation: string; signature: string | null; date: string | null };
    }
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const boxHeight = 55
    const boxY = startY
    
    // Build signature boxes dynamically - skip duplicates in hierarchy
    const allBoxes = [
      { title: 'EMPLOYEE', ...signaturesData.employee },
      { title: 'SUPERVISOR', ...signaturesData.supervisor },
      { title: 'MANAGER', ...signaturesData.manager },
      { title: 'EXECUTIVE', ...signaturesData.executive }
    ]
    
    // Filter out boxes where the name is empty or matches a higher-level signatory
    const signatureBoxes = allBoxes.filter((box, index) => {
      if (!box.name || box.name.trim() === '') return false // Skip empty
      // Check if this name appears in a later (higher-level) box
      for (let j = index + 1; j < allBoxes.length; j++) {
        if (allBoxes[j].name && allBoxes[j].name.trim() === box.name.trim()) {
          return false // Skip - this person appears at higher level
        }
      }
      return true
    })
    
    // Use fixed maximum width per box (65mm) to prevent stretching
    const maxBoxWidth = 65
    const boxGap = 4
    const totalBoxesWidth = (signatureBoxes.length * maxBoxWidth) + ((signatureBoxes.length - 1) * boxGap)
    // Center the boxes horizontally
    const startX = (pageWidth - totalBoxesWidth) / 2
    const dynamicBoxWidth = maxBoxWidth
    
    for (let i = 0; i < signatureBoxes.length; i++) {
      const box = signatureBoxes[i]
      const boxX = startX + (i * (dynamicBoxWidth + 4))
      
      // Draw box border
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.rect(boxX, boxY, dynamicBoxWidth, boxHeight)
      
      // Title header with background
      doc.setFillColor(0, 51, 102)
      doc.rect(boxX, boxY, dynamicBoxWidth, 8, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(box.title, boxX + dynamicBoxWidth / 2, boxY + 5.5, { align: 'center' })
      
      // Reset text color
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
      
      // Full Name
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Full Name:', boxX + 3, boxY + 14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.name || '_________________', boxX + 3, boxY + 19)
      
      // Designation
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Designation:', boxX + 3, boxY + 26)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.designation || '_________________', boxX + 3, boxY + 31)
      
      // Date
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Date:', boxX + 3, boxY + 38)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.date || '_________________', boxX + 3, boxY + 43)
      
      // Signature line at bottom
      doc.setLineWidth(0.3)
      doc.line(boxX + 3, boxY + 50, boxX + dynamicBoxWidth - 3, boxY + 50)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 51, 102)
      doc.text('Signature', boxX + dynamicBoxWidth / 2, boxY + 54, { align: 'center' })
      
      // Add signature image if available
      if (box.signature) {
        console.log(`🖊️ Loading ${box.title} signature from:`, box.signature)
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous' // Enable CORS for image loading
          img.src = box.signature
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn(`⏱️ ${box.title} signature load timed out`)
              reject(new Error('Timeout'))
            }, 5000)
            img.onload = () => {
              clearTimeout(timeout)
              console.log(`✅ ${box.title} signature loaded successfully`)
              resolve()
            }
            img.onerror = (e) => {
              clearTimeout(timeout)
              console.error(`❌ ${box.title} signature failed to load:`, e)
              reject(e)
            }
          })
          doc.addImage(img, 'PNG', boxX + 5, boxY + 44, dynamicBoxWidth - 10, 10)
        } catch (error) {
          console.error(`Error loading ${box.title} signature:`, error)
        }
      } else {
        console.log(`⚠️ No signature URL for ${box.title}`)
      }
    }
    
    doc.setTextColor(0, 0, 0)
  }

  const exportSubordinateAgreement = async (userId: string, userName: string) => {
    try {
      // Fetch subordinate's performance agreement data
      const response = await fetch(`/dashboard/performance/api/performance-agreements/export/${userId}`)
      if (!response.ok) {
        alert('Failed to fetch subordinate agreement')
        return
      }

      const { agreements: subAgreements, user, adhocTasks, hasRatings, scoreSummary, rating360, quarterBreakdown } = await response.json()

      // Load NSA stamp
      const subStampImg = new Image()
      subStampImg.crossOrigin = 'anonymous'
      subStampImg.src = '/nored-stamp.png'
      await new Promise<void>(resolve => {
        const t = setTimeout(() => resolve(), 3000)
        subStampImg.onload = () => { clearTimeout(t); resolve() }
        subStampImg.onerror = () => { clearTimeout(t); resolve() }
      })
      const subStampLoaded = subStampImg.complete && subStampImg.naturalWidth > 0
      const addSubStamp = (d: jsPDF, pw: number, ph: number) => {
        if (!subStampLoaded) return
        d.addImage(subStampImg, 'PNG', pw - 35, ph - 35, 25, 25)
      }

      // Generate PDF similar to exportToPDF but with subordinate's data
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // ── NSA Logo ──
      try {
        const subLogoRes = await fetch('/nored-logo.svg')
        const subSvgText = await subLogoRes.text()
        const subSvgBlob = new Blob([subSvgText], { type: 'image/svg+xml' })
        const subUrl = URL.createObjectURL(subSvgBlob)
        const subLogoImg = new Image()
        subLogoImg.src = subUrl
        await new Promise((resolve, reject) => {
          subLogoImg.onload = resolve; subLogoImg.onerror = reject; setTimeout(reject, 5000)
        })
        const subCanvas = document.createElement('canvas')
        subCanvas.width = 200; subCanvas.height = 200
        const subCtx = subCanvas.getContext('2d')
        if (subCtx) {
          subCtx.fillStyle = 'white'; subCtx.fillRect(0, 0, 200, 200)
          subCtx.drawImage(subLogoImg, 0, 0, 200, 200)
          doc.addImage(subCanvas.toDataURL('image/png'), 'PNG', pageWidth / 2 - 15, 10, 30, 30)
        }
        URL.revokeObjectURL(subUrl)
      } catch {
        doc.setFillColor(0, 51, 102); doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
        doc.setFontSize(12); doc.setTextColor(255, 255, 255)
        doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      }
      doc.setTextColor(0, 0, 0)

      // Header text
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 51, 102)
      doc.text('Namibia Statistics Agency', pageWidth / 2, 44, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      doc.setFontSize(16); doc.setFont('helvetica', 'bold')
      doc.text(user.name, pageWidth / 2, 52, { align: 'center' })

      const subFormatDate = (v: any) => { const d = new Date(v); return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) }
      const subPeriodName = activePeriod?.name || 'Performance Cycle'
      const subStartDate = activePeriod?.startDate ? subFormatDate(activePeriod.startDate) : 'Not set'
      const subEndDate = activePeriod?.endDate ? subFormatDate(activePeriod.endDate) : 'Not set'

      doc.setFontSize(12); doc.setFont('helvetica', 'normal')
      doc.text(subPeriodName, pageWidth / 2, 59, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`${subStartDate} - ${subEndDate}`, pageWidth / 2, 65, { align: 'center' })

      // Prepare table data
      const regularSubAgreements = subAgreements.filter((a: any) => !a.isAdhocContainer)
      const adhocContainerSub = subAgreements.find((a: any) => a.isAdhocContainer)

      doc.setFontSize(10); doc.setFont('helvetica', 'bold')
      const subTotalWeight = regularSubAgreements.reduce((s: number, a: any) => s + (a.weight || 0), 0)
      doc.text(`Total Weight Allocation: ${subTotalWeight}%`, pageWidth / 2, 72, { align: 'center' })
      if (hasRatings && scoreSummary) {
        doc.text(`Overall Performance Score: ${scoreSummary.finalRating.toFixed(2)} / 5.0  (${scoreSummary.finalPercentage.toFixed(1)}%)`, pageWidth / 2, 78, { align: 'center' })
      }

      const tableData = regularSubAgreements.map((agreement: any, index: number) => {
        const goal = agreement.initiative?.objective?.goal
        const objective = agreement.initiative?.objective
        const initiative = agreement.initiative

        let reportingPeriod = 'N/A'
        if (initiative?.reportingPeriods && Array.isArray(initiative.reportingPeriods) && initiative.reportingPeriods.length > 0) {
          reportingPeriod = initiative.reportingPeriods.join(', ')
        }

        let dueDate = 'N/A'
        if (agreement.dueDate) {
          dueDate = new Date(agreement.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }

        const row = [
          index + 1,
          goal?.goalNumber || 'N/A',
          goal?.title || 'N/A',
          objective?.title || 'N/A',
          initiative?.number || 'N/A',
          initiative?.measure || 'N/A',
          initiative?.action || agreement.customAction || agreement.title,
          initiative?.target || agreement.target || 'N/A',
          `${agreement.weight || 0}%`,
          reportingPeriod,
          dueDate
        ]

        if (hasRatings) {
          row.push(agreement.rating ? `${agreement.rating}/5` : 'N/A')
        }

        return row
      })

      if (adhocContainerSub) {
        const adhocRow = [
          regularSubAgreements.length + 1,
          '-',
          '-',
          '-',
          '-',
          '-',
          'Ad-hoc Tasks',
          hasRatings ? `See detailed breakdown below (${adhocTasks.length} tasks)` : 'Various ad-hoc assignments throughout the year',
          '10%',
          'All Year',
          new Date(adhocContainerSub.dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        ]

        if (hasRatings) {
          adhocRow.push(adhocContainerSub.rating ? `${adhocContainerSub.rating}/5` : 'N/A')
        }

        tableData.push(adhocRow)
      }

      const tableHeader = ['#', 'Goal #', 'Goal', 'Objective', 'Init. #', 'Measure', 'Action', 'Target', 'Weight', 'Reporting Period', 'Due Date']
      if (hasRatings) {
        tableHeader.push('Rating')
      }

      const columnStyles: any = {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 10, halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 24 },
        6: { cellWidth: 52 },
        7: { cellWidth: 18 },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 18, halign: 'center' },
        10: { cellWidth: 18, halign: 'center' }
      }

      if (hasRatings) {
        columnStyles[11] = { cellWidth: 15, halign: 'center' }
      }

      autoTable(doc, {
        startY: hasRatings ? 70 : 60,
        head: [tableHeader],
        body: tableData,
        theme: 'grid',
        tableWidth: 'auto',
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
          fontSize: 8,
          cellPadding: 2.5
        },
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          cellPadding: 3
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          valign: 'middle'
        },
        columnStyles,
        margin: { left: 14, right: 14 },
        didDrawPage: function(data: any) {
          doc.setFontSize(8)
          doc.setTextColor(128)
          doc.text(
            'This is an official Performance Agreement document.',
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          )
          addSubStamp(doc, pageWidth, pageHeight)
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY || 150

      const SUB_DARK_BLUE: [number,number,number] = [0, 51, 102]
      const SUB_GOLD: [number,number,number] = [204, 153, 0]
      const getSubPerfLevel = (r: number) => r >= 4.5 ? 'Outstanding' : r >= 4.0 ? 'Excellent' : r >= 3.5 ? 'Very Good' : r >= 3.0 ? 'Good' : r >= 2.5 ? 'Satisfactory' : 'Needs Improvement'

      // ── Ad-hoc Tasks Breakdown ──
      if (hasRatings && adhocTasks && adhocTasks.length > 0) {
        if (finalY + 40 > pageHeight - 20) {
          doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20
        } else { finalY += 15 }
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 51, 102)
        doc.text('AD-HOC TASKS BREAKDOWN', 14, finalY)
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
        doc.text(`Total Ad-hoc Tasks Completed: ${adhocTasks.length}`, 14, finalY + 6)
        const avgAdhocRating = adhocTasks.reduce((sum: number, t: any) => sum + (t.rating || 0), 0) / adhocTasks.length
        doc.text(`Average Rating: ${avgAdhocRating.toFixed(2)}/5`, 14, finalY + 12)
        const adhocTableData = adhocTasks.map((task: any, index: number) => [
          index + 1, task.title || 'Untitled', task.description || '-', task.priority || 'MEDIUM',
          task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A',
          `${task.rating}/5`
        ])
        autoTable(doc, {
          startY: finalY + 18,
          head: [['#', 'Task Title', 'Description', 'Priority', 'Completed Date', 'Rating']],
          body: adhocTableData, theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
          bodyStyles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 60 }, 2: { cellWidth: 100 }, 3: { cellWidth: 20, halign: 'center' }, 4: { cellWidth: 30, halign: 'center' }, 5: { cellWidth: 20, halign: 'center' } },
          margin: { left: 14, right: 14 }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40
      }

      // ── Quarterly Breakdown (Q1–Q4) ──
      if (quarterBreakdown && quarterBreakdown.length > 0) {
        doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE)
        doc.text('QUARTERLY PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('NSA Financial Year: Q1 = Apr–Jun  |  Q2 = Jul–Sep  |  Q3 = Oct–Dec  |  Q4 = Jan–Mar', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const subQRows = quarterBreakdown.map((q: any) => [
          `${q.quarter} (${q.label})`,
          q.total > 0 ? String(q.total) : '-',
          q.rated > 0 ? String(q.rated) : '-',
          q.avgRating != null ? `${q.avgRating.toFixed(2)} / 5` : '-',
          q.avgRating != null ? getSubPerfLevel(q.avgRating) : '-',
        ])
        autoTable(doc, {
          startY: finalY,
          head: [['Quarter', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: subQRows, theme: 'grid',
          headStyles: { fillColor: SUB_GOLD, textColor: [0,0,0], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', halign: 'center' },
          columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addSubStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4 && data.cell.raw !== '-') {
              const lvl = data.cell.raw as string
              if (lvl === 'Outstanding' || lvl === 'Excellent') data.cell.styles.textColor = [0, 128, 0]
              else if (lvl === 'Needs Improvement') data.cell.styles.textColor = [180, 0, 0]
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        finalY += 8
        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE)
        doc.text('BI-ANNUAL PERFORMANCE BREAKDOWN', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 4
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100,100,100)
        doc.text('H1 = Q1 + Q2 (Apr–Sep)  |  H2 = Q3 + Q4 (Oct–Mar)', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 3
        const buildSubHalf = (qs: any[]) => {
          const tot = qs.reduce((s: number, q: any) => s + q.total, 0)
          const rat = qs.reduce((s: number, q: any) => s + q.rated, 0)
          const rs = qs.reduce((s: number, q: any) => s + (q.avgRating != null ? q.avgRating * q.total : 0), 0)
          const avgR = tot > 0 && rat > 0 ? rs / tot : null
          return { tot, rat, avgR }
        }
        const sh1 = buildSubHalf([quarterBreakdown[0], quarterBreakdown[1]])
        const sh2 = buildSubHalf([quarterBreakdown[2], quarterBreakdown[3]])
        autoTable(doc, {
          startY: finalY,
          head: [['Period', 'Total Actions', 'Rated', 'Avg Rating', 'Performance Level']],
          body: [
            ['H1 – First Half (Apr – Sep)', String(sh1.tot || '-'), String(sh1.rat || '-'), sh1.avgR != null ? `${sh1.avgR.toFixed(2)} / 5` : '-', sh1.avgR != null ? getSubPerfLevel(sh1.avgR) : '-'],
            ['H2 – Second Half (Oct – Mar)', String(sh2.tot || '-'), String(sh2.rat || '-'), sh2.avgR != null ? `${sh2.avgR.toFixed(2)} / 5` : '-', sh2.avgR != null ? getSubPerfLevel(sh2.avgR) : '-'],
          ],
          theme: 'grid',
          headStyles: { fillColor: SUB_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2.5 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5, valign: 'middle', halign: 'center' },
          columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', halign: 'left' }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 }, 3: { cellWidth: 35 }, 4: { cellWidth: 60 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addSubStamp(doc, pageWidth, pageHeight) }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30
      }

      // ── 360-DEGREE BEHAVIOURAL COMPETENCY RATING ──
      if (rating360) {
        doc.addPage()
        addSubStamp(doc, pageWidth, pageHeight)
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
        doc.text(`Employee: ${user.name}`, 14, finalY)
        doc.text(`Cycle: ${rating360.cycleName || 'N/A'}  |  Status: ${rating360.status || 'In Progress'}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 8

        const subFmtR = (v: number | null | undefined) => (v != null) ? `${Number(v).toFixed(2)} / 5` : 'Pending'
        const subRaterRows = [
          ['Self', subFmtR(rating360.selfRating), rating360.selfStatus || (rating360.selfRating != null ? 'Completed' : 'Pending')],
          ['Supervisor', subFmtR(rating360.supervisorRating), rating360.supervisorStatus || (rating360.supervisorRating != null ? 'Completed' : 'Pending')],
          ['Dept. (Random)', subFmtR(rating360.deptRandomRating), rating360.deptRandomStatus || (rating360.deptRandomRating != null ? 'Completed' : 'Pending')],
          ['Org. (Random)', subFmtR(rating360.orgRandomRating), rating360.orgRandomStatus || (rating360.orgRandomRating != null ? 'Completed' : 'Pending')],
        ]
        if (rating360.averageRating != null) subRaterRows.push(['Overall Average', `${Number(rating360.averageRating).toFixed(2)} / 5`, 'Combined'])

        doc.setFontSize(11); doc.setFont('helvetica', 'bold')
        doc.text('Rating by Perspective', 14, finalY); finalY += 2
        autoTable(doc, {
          startY: finalY,
          head: [['Perspective', 'Rating', 'Status']],
          body: subRaterRows,
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
            if (data.row.index === subRaterRows.length - 1 && subRaterRows[subRaterRows.length - 1][0] === 'Overall Average') {
              data.cell.styles.fillColor = [230, 240, 250]; data.cell.styles.fontStyle = 'bold'
            }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 40

        const subCompDetail = rating360.competencyDetail || []
        if (subCompDetail.length > 0) {
          finalY += 10
          if (finalY + 40 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(46, 125, 50)
          doc.text('NSA Behavioural Competency Breakdown', 14, finalY)
          doc.setTextColor(0, 0, 0); finalY += 2
          const subFmtS = (v: number | null) => (v != null) ? Number(v).toFixed(2) : 'Pending'
          const subFmtO = (v: number | null) => (v != null) ? `${Number(v).toFixed(2)} / 5` : '-'
          const subCompBody = subCompDetail.map((c: any) => [c.competency, subFmtS(c.selfScore), subFmtS(c.supervisorScore), subFmtS(c.deptRandomScore), subFmtS(c.orgRandomScore), subFmtO(c.overallAvg)])
          const subAgg = (key: string) => { const vals = subCompDetail.filter((c: any) => c[key] != null).map((c: any) => Number(c[key])); return vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(2) : '-' }
          const subOvArr = subCompDetail.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
          subCompBody.push(['OVERALL AVERAGE', subAgg('selfScore'), subAgg('supervisorScore'), subAgg('deptRandomScore'), subAgg('orgRandomScore'), subOvArr.length > 0 ? `${(subOvArr.reduce((a: number, b: number) => a + b, 0) / subOvArr.length).toFixed(2)} / 5` : '-'])
          autoTable(doc, {
            startY: finalY,
            head: [['Competency', 'Self', 'Supervisor', 'Dept. (Random)', 'Org. (Random)', 'Overall']],
            body: subCompBody,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 28, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' }, 5: { cellWidth: 35, halign: 'center' } },
            margin: { left: 14, right: 14 },
            didDrawPage: () => { addSubStamp(doc, pageWidth, pageHeight) },
            didParseCell: (data: any) => {
              if (data.row.index === subCompBody.length - 1) { data.cell.styles.fillColor = [46, 125, 50]; data.cell.styles.textColor = [255, 255, 255]; data.cell.styles.fontStyle = 'bold' }
              if (data.column.index > 0 && data.row.index < subCompBody.length - 1 && (data.cell.raw as string) === 'Pending') { data.cell.styles.textColor = [180, 100, 0]; data.cell.styles.fontStyle = 'italic' }
            }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        } else if ((rating360.competencyBreakdown?.length > 0) || (rating360.categoryBreakdown?.length > 0)) {
          const subLegacy = rating360.competencyBreakdown?.length > 0 ? rating360.competencyBreakdown : rating360.categoryBreakdown.map((c: any) => ({ competency: c.category, averageScore: c.averageScore, responseCount: c.responseCount }))
          finalY += 10
          if (finalY + 30 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
          doc.text('Competency / Category Scores', 14, finalY); finalY += 2
          autoTable(doc, {
            startY: finalY, head: [['Competency / Category', 'Average Score', 'Responses']], body: subLegacy.map((c: any) => [c.competency || c.category || 'General', c.averageScore != null ? `${Number(c.averageScore).toFixed(2)} / 5` : 'N/A', `${c.responseCount} response(s)`]), theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
            columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 40, halign: 'center' } },
            margin: { left: 14, right: 14 }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 40
        }
      }

      // ── 360-DEGREE PERFORMANCE FEEDBACK REPORT ──
      if (rating360?.competencyDetail?.length > 0) {
        const fb360Sub = rating360.competencyDetail
        const NSA_COMPS_ORDER_SUB = ['Integrity', 'Excellent Performance', 'Professionalism', 'Accountability', 'Partnership', 'Customer-focussed']
        type SubFbGuide = { ratings: string[]; getFeedback: (s: number) => string }
        const nsa360GuideSub: Record<string, SubFbGuide> = {
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
        const sortedFbSub = [...fb360Sub].sort((a: any, b: any) => { const ai = NSA_COMPS_ORDER_SUB.indexOf(a.competency); const bi = NSA_COMPS_ORDER_SUB.indexOf(b.competency); return ai === -1 && bi === -1 ? 0 : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi })
        const ovArrSub = sortedFbSub.filter((c: any) => c.overallAvg != null).map((c: any) => Number(c.overallAvg))
        const overallAvgSub = ovArrSub.length > 0 ? ovArrSub.reduce((a: number, b: number) => a + b, 0) / ovArrSub.length : 0
        const strsSub = sortedFbSub.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) >= 3.5)
        const devSub = sortedFbSub.filter((c: any) => c.overallAvg != null && Number(c.overallAvg) < 3.0)
        const dispStrsSub = strsSub.length > 0 ? strsSub : sortedFbSub.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(b.overallAvg) - Number(a.overallAvg)).slice(0, 3)
        const dispDevSub = devSub.length > 0 ? devSub : sortedFbSub.filter((c: any) => c.overallAvg != null).sort((a: any, b: any) => Number(a.overallAvg) - Number(b.overallAvg)).filter((c: any) => Number(c.overallAvg) < 3.5).slice(0, 2)
        const narrSub = (s: number) => s >= 4.5 ? 'The results of the 360-degree assessment indicate that overall performance is exceptional, consistently exceeding organisational expectations across all competency areas. Contributions are highly valued, and this individual serves as a role model for colleagues.' : s >= 4.0 ? 'The results of the 360-degree assessment indicate that overall performance exceeds organisational expectations in several key competency areas. Strong capabilities are demonstrated with positive contribution to team and organisational outcomes.' : s >= 3.0 ? 'The results of the 360-degree assessment indicate that overall performance meets organisational expectations, with several areas demonstrating strong capability. Strengthening certain competencies will further enhance effectiveness and contribution to the organisation.' : s >= 2.0 ? 'The results of the 360-degree assessment indicate that there are opportunities for growth in performance. Developing key competencies will be important for meeting organisational expectations.' : 'The results of the 360-degree assessment indicate that significant development is needed across most competency areas. A focused development plan will be essential to improving performance.'

        doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...SUB_DARK_BLUE); doc.rect(14, finalY - 4, pageWidth - 28, 14, 'F')
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('360-DEGREE PERFORMANCE FEEDBACK REPORT', pageWidth / 2, finalY + 5, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 18
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
        doc.text(`Employee: ${user.name}   |   Cycle: ${rating360.cycleName || 'N/A'}   |   Overall Rating: ${overallAvgSub.toFixed(2)} / 5`, 14, finalY)
        doc.setTextColor(0, 0, 0); finalY += 10

        doc.setFillColor(...SUB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('1.  Overall Performance Insight', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Final Rating Interpretation', 14, finalY); finalY += 4
        autoTable(doc, {
          startY: finalY, theme: 'grid', head: [['Rating', 'Interpretation']],
          body: [['1','Unsatisfactory Performance'],['2','Below Expected Standard'],['3','Meets Expectations'],['4','Exceeds Expectations'],['5','Excellent Performance']],
          headStyles: { fillColor: SUB_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 2 },
          bodyStyles: { fontSize: 9, cellPadding: 2.5 },
          columnStyles: { 0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 120 } },
          margin: { left: 14, right: 14 },
          didParseCell: (data: any) => { if (data.section === 'body' && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(overallAvgSub)))) { data.cell.styles.fillColor = SUB_GOLD; data.cell.styles.fontStyle = 'bold' } }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 30; finalY += 5
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE); doc.text('Narrative', 14, finalY); finalY += 4
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.setFontSize(9)
        const narrSubLines = doc.splitTextToSize(narrSub(overallAvgSub), pageWidth - 28); doc.text(narrSubLines, 14, finalY); finalY += narrSubLines.length * 4 + 10

        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(34, 139, 34); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('2.  Strengths Summary', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        doc.text(doc.splitTextToSize('This section highlights areas where performance exceeds expectations or demonstrates strong capability.', pageWidth - 28), 14, finalY); finalY += 8
        doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize('Based on the assessment results, the following areas have been identified as key strengths:', pageWidth - 28), 14, finalY); finalY += 8; doc.setFont('helvetica', 'normal')
        dispStrsSub.forEach((c: any) => {
          if (finalY + 15 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          const g = nsa360GuideSub[c.competency]; if (!g) return
          const sIdx = Math.min(4, Math.max(0, Math.round(Number(c.overallAvg)) - 1))
          doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 100, 0); doc.setFontSize(9)
          doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
          doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
          const dl = doc.splitTextToSize(g.ratings[sIdx], pageWidth - 36); doc.text(dl, 20, finalY); finalY += dl.length * 4 + 4
        })
        doc.text(doc.splitTextToSize('These strengths contribute significantly to team performance and organisational effectiveness.', pageWidth - 28), 14, finalY); finalY += 12

        if (dispDevSub.length > 0) {
          if (finalY + 35 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(180, 40, 40); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
          doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
          doc.text('3.  Development Areas', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
          doc.setFontSize(9); doc.setFont('helvetica', 'normal')
          doc.text(doc.splitTextToSize('This section highlights competencies where performance improvement or further development is recommended.', pageWidth - 28), 14, finalY); finalY += 8
          doc.setFont('helvetica', 'bold'); doc.text(doc.splitTextToSize('The assessment results suggest that additional development may be beneficial in the following areas:', pageWidth - 28), 14, finalY); finalY += 8; doc.setFont('helvetica', 'normal')
          dispDevSub.forEach((c: any) => {
            if (finalY + 20 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
            const g = nsa360GuideSub[c.competency]; if (!g) return
            doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 40, 40); doc.setFontSize(9)
            doc.text(`${c.competency} (${Number(c.overallAvg).toFixed(2)} / 5)`, 16, finalY); finalY += 5
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
            const fl = doc.splitTextToSize(g.getFeedback(Number(c.overallAvg)), pageWidth - 32); doc.text(fl, 20, finalY); finalY += fl.length * 4 + 6
          })
          doc.text(doc.splitTextToSize('Addressing these areas will support continued professional growth and improve contribution to the organisation.', pageWidth - 28), 14, finalY); finalY += 10
        }

        doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFillColor(...SUB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('4.  Competency Feedback', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text('Below is the interpretation of ratings for each competency area.', 14, finalY); finalY += 8
        sortedFbSub.forEach((c: any) => {
          const g = nsa360GuideSub[c.competency]; if (!g) return
          const score = c.overallAvg != null ? Number(c.overallAvg) : null
          if (finalY + 55 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          doc.setFillColor(235, 241, 250); doc.rect(14, finalY, pageWidth - 28, 7, 'F')
          doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE)
          doc.text(`${c.competency}${score != null ? `  \u2014  ${score.toFixed(2)} / 5` : ''}`, 16, finalY + 5); doc.setTextColor(0, 0, 0); finalY += 11
          autoTable(doc, {
            startY: finalY, theme: 'grid', head: [['Rating', 'Guide']],
            body: g.ratings.map((desc: string, idx: number) => [String(idx + 1), desc]),
            headStyles: { fillColor: [100,100,100], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: 1.5 },
            bodyStyles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 130 } },
            margin: { left: 14, right: 14 },
            didParseCell: (data: any) => { if (data.section === 'body' && score != null && data.column.index === 0 && Number(data.cell.raw) === Math.min(5, Math.max(1, Math.round(score)))) { data.cell.styles.fillColor = SUB_GOLD; data.cell.styles.fontStyle = 'bold' } }
          })
          finalY = (doc as any).lastAutoTable.finalY || finalY + 25; finalY += 3
          if (score != null) {
            doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(50, 50, 50)
            const fbLines = doc.splitTextToSize(g.getFeedback(score), pageWidth - 28); doc.text(fbLines, 14, finalY); finalY += fbLines.length * 4 + 10
          }
        })

        if (finalY + 35 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
        doc.setFillColor(...SUB_DARK_BLUE); doc.rect(14, finalY, pageWidth - 28, 8, 'F')
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('5.  Recommended Development Actions', 16, finalY + 5.5); doc.setTextColor(0, 0, 0); finalY += 12
        doc.setFontSize(9); doc.setFont('helvetica', 'normal')
        ;['Participate in training programmes that strengthen collaboration, accountability, or performance management skills.',
          'Seek feedback from supervisors and colleagues on ways to enhance performance in key competency areas.',
          'Identify opportunities to take on new responsibilities or projects that build leadership and professional capability.',
          'Engage in mentoring, peer learning, or knowledge-sharing initiatives.',
        ].forEach(action => {
          if (finalY + 12 > pageHeight - 20) { doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20 }
          const lines = doc.splitTextToSize(`\u2022  ${action}`, pageWidth - 30); doc.text(lines, 16, finalY); finalY += lines.length * 4 + 4
        })
      }

      // ── OVERALL PERFORMANCE SCORE SUMMARY ──
      if (hasRatings && scoreSummary) {
        doc.addPage(); addSubStamp(doc, pageWidth, pageHeight); finalY = 20
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 10
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${user.name}`, 14, finalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 10
        const comp = scoreSummary.components
        const wts = scoreSummary.weights
        const summaryData = [
          ['Performance Agreements', `${wts.performanceAgreement}%`, `${comp.performanceAgreement.rating.toFixed(2)} / 5`, `${comp.performanceAgreement.weightedScore.toFixed(2)}`, `${comp.performanceAgreement.ratedCount || 0}/${comp.performanceAgreement.initiativesCount} rated`],
          ['Ad-hoc Tasks', `${wts.adhoc}%`, `${comp.adhoc.rating.toFixed(2)} / 5`, `${comp.adhoc.weightedScore.toFixed(2)}`, `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed (${comp.adhoc.completionRate.toFixed(0)}%)`],
          ['Projects', `${wts.projects}%`, `${comp.projects.rating.toFixed(2)} / 5`, `${comp.projects.weightedScore.toFixed(2)}`, comp.projects.tasksTotal > 0 ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal} completed` : 'No project tasks'],
          ['Risk Management', `${wts.riskManagement}%`, `${comp.riskManagement.rating.toFixed(2)} / 5`, `${comp.riskManagement.weightedScore.toFixed(2)}`, comp.riskManagement.tasksTotal > 0 ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal} completed` : 'No risk tasks'],
          ['Audit Tasks', `${wts.audit}%`, `${comp.audit.rating.toFixed(2)} / 5`, `${comp.audit.weightedScore.toFixed(2)}`, comp.audit.tasksTotal > 0 ? `${comp.audit.tasksCompleted}/${comp.audit.tasksTotal} completed` : 'No audit tasks'],
          ['360-Degree Rating', `${wts.rating360}%`, `${comp.rating360.rating.toFixed(2)} / 5`, `${comp.rating360.weightedScore.toFixed(2)}`, comp.rating360.hasAnyRatings ? (comp.rating360.hasCompleted ? 'Completed' : 'In progress') : 'Not started'],
          ['OVERALL TOTAL', '100%', `${scoreSummary.finalRating.toFixed(2)} / 5`, `${scoreSummary.finalRating.toFixed(2)}`, `${scoreSummary.finalPercentage.toFixed(1)}%`]
        ]
        autoTable(doc, {
          startY: finalY, head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']], body: summaryData, theme: 'grid',
          headStyles: { fillColor: SUB_DARK_BLUE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didDrawPage: () => { addSubStamp(doc, pageWidth, pageHeight) },
          didParseCell: (data: any) => {
            if (data.row.index === summaryData.length - 1) { data.cell.styles.fillColor = SUB_DARK_BLUE; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.fontSize = 10 }
          }
        })
        finalY = (doc as any).lastAutoTable.finalY || finalY + 60; finalY += 6
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...SUB_DARK_BLUE)
        doc.text(`Overall Performance Level: ${getSubPerfLevel(scoreSummary.finalRating)}`, pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0); finalY += 8
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Add signature section
      if (finalY + 60 > pageHeight - 20) {
        doc.addPage()
        finalY = 20
      }

      // Signatures
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DIGITAL SIGNATURES', 14, finalY + 10)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      // Employee
      doc.text('Employee:', 14, finalY + 20)
      doc.text(user.name, 14, finalY + 26)

      if (user.signatureUrl) {
        try {
          const img = new Image()
          img.src = user.signatureUrl
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            setTimeout(reject, 3000)
          })
          doc.addImage(img, 'PNG', 45, finalY + 18, 50, 15)
        } catch (error) {
          doc.line(45, finalY + 25, 100, finalY + 25)
        }
      } else {
        doc.line(45, finalY + 25, 100, finalY + 25)
      }

      // Supervisor
      doc.text('Supervisor:', 14, finalY + 40)
      doc.text(user.supervisor?.name || session?.user?.name || 'N/A', 14, finalY + 46)

      if (user.supervisor?.signatureUrl) {
        try {
          const img = new Image()
          img.src = user.supervisor.signatureUrl
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            setTimeout(reject, 3000)
          })
          doc.addImage(img, 'PNG', 45, finalY + 38, 50, 15)
        } catch (error) {
          doc.line(45, finalY + 45, 100, finalY + 45)
        }
      } else {
        doc.line(45, finalY + 45, 100, finalY + 45)
      }

      // Save PDF
      const fileName = `Performance_Agreement_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error exporting subordinate agreement:', error)
      alert('Failed to export agreement')
    }
  }

  // Handle CSV import for user's own agreements
  // Parse CSV file into headers + rows for preview and import
  const parseCsvFile = async (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
    const text = await file.text()
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalizedText.split('\n').filter(line => line.trim())

    if (lines.length < 2) throw new Error('CSV file must have at least a header row and one data row')

    const firstLine = lines[0]
    let delimiter = ','
    if (firstLine.includes('\t')) delimiter = '\t'
    else if (firstLine.split(';').length > firstLine.split(',').length) delimiter = ';'

    const cleanFirstLine = firstLine.replace(/^\uFEFF/, '')
    const headers = cleanFirstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''))

    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      let values: string[]
      if (delimiter === '\t') {
        values = line.split('\t')
      } else if (delimiter === ';') {
        values = line.split(';')
      } else {
        values = []
        let current = ''
        let inQuotes = false
        for (let c = 0; c < line.length; c++) {
          const char = line[c]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            values.push(current)
            current = ''
          } else {
            current += char
          }
        }
        values.push(current)
      }

      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        let value = values[idx]?.trim() || ''
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"')
        }
        row[header] = value
      })

      const initiativeKey = headers.find(h =>
        h.toLowerCase().includes('strategic initiative') ||
        h.toLowerCase() === 'initiative'
      )
      const initiative = initiativeKey ? row[initiativeKey] : ''

      if (initiative?.trim()) {
        if (row['Goal'] && !row['Goal name']) {
          row['Goal name'] = row['Goal']
        }
        rows.push(row)
      }
    }

    return { headers, rows }
  }

  // Handle file selection — parse and show preview
  const handleCsvFileSelect = async (file: File | null) => {
    setImportFile(file)
    setCsvPreviewData(null)
    if (!file) return
    try {
      const parsed = await parseCsvFile(file)
      setCsvPreviewData(parsed)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to parse CSV')
    }
  }

  const handleImportAgreements = async () => {
    if (!importFile || !csvPreviewData || csvPreviewData.rows.length === 0) {
      alert('Please select a valid CSV file with data')
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: csvPreviewData.rows })
      })

      const result = await response.json()

      if (response.ok) {
        // Build detailed import message
        let importMessage = `Import Summary:\n• Agreements created: ${result.agreementsCreated || 0} of ${result.total || 0} rows\n• Goals created: ${result.goalsCreated || 0}\n• Objectives created: ${result.objectivesCreated || 0}\n• Initiatives created: ${result.initiativesCreated || 0}`
        
        // Add warning about skipped items
        const hasSkipped = (result.duplicatesSkipped > 0) || (result.rowsWithEmptyInitiative > 0) || (result.zeroWeightSkipped > 0)
        if (hasSkipped) {
          importMessage += '\n\n⚠️ SKIPPED ROWS:'
          if (result.zeroWeightSkipped > 0) {
            importMessage += `\n• ${result.zeroWeightSkipped} row(s) skipped — weight is 0% or not set (these actions are excluded from the database)`
          }
          if (result.duplicatesSkipped > 0) {
            importMessage += `\n• ${result.duplicatesSkipped} duplicate(s) already exist in database`
          }
          if (result.rowsWithEmptyInitiative > 0) {
            importMessage += `\n• ${result.rowsWithEmptyInitiative} row(s) with empty Strategic Initiative`
          }
          // Show first few skipped duplicates
          if (result.skippedDuplicates && result.skippedDuplicates.length > 0) {
            importMessage += '\n\nSkipped duplicates:'
            result.skippedDuplicates.slice(0, 5).forEach((dup: { title: string; action: string }) => {
              importMessage += `\n  - ${dup.title.substring(0, 40)}...`
            })
            if (result.skippedDuplicates.length > 5) {
              importMessage += `\n  ... and ${result.skippedDuplicates.length - 5} more`
            }
          }
        }
        
        importMessage += `\n\nPerformance Period: ${result.performancePeriod}`
        
        setMessageDialog({
          open: true,
          title: hasSkipped ? '⚠️ Import Completed with Warnings' : '✅ Import Successful',
          message: importMessage,
          isError: false
        })
        setImportDialogOpen(false)
        setImportFile(null)
        setCsvPreviewData(null)
        fetchAgreements()
      } else {
        setMessageDialog({
          open: true,
          title: '❌ Import Failed',
          message: result.error || 'Failed to import agreements',
          isError: true
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      setMessageDialog({
        open: true,
        title: '❌ Import Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        isError: true
      })
    } finally {
      setImporting(false)
    }
  }

  // Merge duplicate goals in the database
  const handleMergeDuplicateGoals = async () => {
    if (!confirm('This will merge all duplicate goals in the database. Continue?')) {
      return
    }
    
    try {
      const response = await fetch('/dashboard/performance/api/merge-duplicate-goals', {
        method: 'POST',
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setMessageDialog({
          open: true,
          title: '✅ Merge Completed',
          message: result.message,
          isError: false
        })
        // Refresh agreements to reflect changes
        fetchAgreements()
      } else {
        setMessageDialog({
          open: true,
          title: '❌ Merge Failed',
          message: result.error || 'Failed to merge duplicate goals',
          isError: true
        })
      }
    } catch (error) {
      console.error('Merge error:', error)
      setMessageDialog({
        open: true,
        title: '❌ Merge Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        isError: true
      })
    }
  }

  // Use stable reference to session user ID to prevent infinite re-renders
  const sessionUserId = session?.user?.id

  useEffect(() => {
    const fetchPeriodAndAgreements = async () => {
      try {
        // First check if there's an active performance period
        const periodResponse = await fetch('/dashboard/performance/api/performance-period', {
          credentials: 'include',
          cache: 'no-store'
        })
        if (periodResponse.ok) {
          const period = await periodResponse.json()
          setActivePeriod(period)
        } else {
          console.warn('Performance period fetch failed with status:', periodResponse.status)
        }
      } catch (error) {
        // Network error - API might not be available
        console.warn('Failed to fetch performance period (network error):', error instanceof Error ? error.message : error)
      } finally {
        setPeriodLoading(false)
      }
        
      // Then fetch agreements
      try {
        if (sessionUserId) {
          await fetchAgreements()
        }
      } catch (error) {
        console.warn('Failed to fetch agreements:', error instanceof Error ? error.message : error)
        setLoading(false)
      }
    }

    if (sessionUserId) {
      fetchPeriodAndAgreements()
    } else {
      setPeriodLoading(false)
      setLoading(false)
    }
  }, [sessionUserId]) // Use stable string ID instead of entire session object

  // Fetch user's task weights from database
  useEffect(() => {
    const fetchTaskWeights = async () => {
      if (!sessionUserId || weightsLoaded) return
      
      try {
        const response = await fetch('/dashboard/performance/api/user-task-weights', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          // Only update if we got valid categories back
          if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            setTaskCategories(data.categories)
            setTempCategories(data.categories)
            setWeightsApproved(data.isApproved || false)
          }
          if (data.allAgreementsApproved !== undefined) {
            setAllAgreementsApproved(data.allAgreementsApproved)
          }
          if (data.pendingCategories) {
            setPendingWeightCategories(data.pendingCategories)
          }
          if (data.isExecutive) {
            setIsExecutive(true)
          }
          if (data.isWeightManager) {
            setIsWeightManager(true)
          }
          if (data.hasUnlockRequest) {
            setUnlockRequested(true)
          }
          // If no valid categories, keep the defaults that were initialized
        }
      } catch (error) {
        console.warn('Failed to fetch task weights:', error)
        // Keep defaults - already initialized
      } finally {
        setWeightsLoaded(true)
      }
    }
    
    fetchTaskWeights()
  }, [sessionUserId, weightsLoaded])

  // Fetch subordinates when tab switches to subordinates
  useEffect(() => {
    if (activeTab === 'subordinates' && subordinates.length === 0) {
      fetchSubordinates()
    }
  }, [activeTab])

  // Auto-expand first rejected initiative
  useEffect(() => {
    if (agreements.length > 0 && !selectedInitiativeId) {
      const firstRejected = regularAgreements.find(a => a.approvalStatus === 'REJECTED')
      if (firstRejected) {
        // Auto-expand goal, objective, and initiative
        const goal = firstRejected.initiative?.objective?.goal?.goalNumber
        const objective = firstRejected.initiative?.objective?.title
        
        if (goal) setSelectedGoal(goal)
        if (objective) setSelectedObjective(objective)
        setSelectedInitiativeId(firstRejected.id)
        
        // Scroll to it after a brief delay
        setTimeout(() => {
          const element = document.getElementById(`initiative-${firstRejected.id}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [agreements.length]) // Only re-run when agreement count changes, not on every reference change

  // Cleanup: Force save on unmount
  useEffect(() => {
    return () => {
      const pendingTimeouts = Object.keys(saveTimeoutRef.current)
      if (pendingTimeouts.length > 0) {
        console.log('Component unmounting, forcing save of pending changes...')
        for (const id of pendingTimeouts) {
          if (saveTimeoutRef.current[id]) {
            clearTimeout(saveTimeoutRef.current[id])
          }
        }
      }
    }
  }, [])

  useEffect(() => {
    // Auto-select first goal when agreements load (only once on initial load)
    if (agreements.length > 0 && !hasAutoSelected.current) {
      const firstGoal = regularAgreements[0]?.initiative?.objective?.goal?.goalNumber
      if (firstGoal) {
        setSelectedGoal(firstGoal)
        hasAutoSelected.current = true
      }
    }
  }, [agreements.length]) // Only trigger on agreement count change

  // Handle URL parameters for highlight and filter
  useEffect(() => {
    const highlight = searchParams.get('highlight')
    const filter = searchParams.get('filter')
    
    if (highlight && agreements.length > 0) {
      setHighlightedId(highlight)
      
      // Find the agreement to expand
      const agreement = agreements.find(a => a.id === highlight)
      if (agreement) {
        const goal = agreement.initiative?.objective?.goal?.goalNumber
        const objective = agreement.initiative?.objective?.title
        
        if (goal) setSelectedGoal(goal)
        if (objective) setSelectedObjective(objective)
        setSelectedInitiativeId(agreement.id)
        
        // Scroll to it
        setTimeout(() => {
          const element = itemRefs.current[highlight]
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Flash highlight
            element.style.animation = 'pulse 1s ease-in-out 3'
          }
        }, 500)
      }
    }
    
    if (filter) {
      setStatusFilter(filter.toUpperCase())
    }
  }, [searchParams, agreements.length]) // Use length for stability

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements', {
        credentials: 'include'
      })
      
      console.log('📡 API Response Status:', response.status, response.statusText)
      
      const data = await response.json()
      
      // Check if response is an error
      if (!response.ok) {
        console.error('❌ API Error Status:', response.status)
        console.error('❌ API Error Data:', data)
        if (data.error) {
          console.error('Error message:', data.error)
          console.error('Error details:', data.details)
        }
        setAgreements([])
        return
      }

      // Extract agreements array from response object
      const agreementsData = data.agreements || data
      if (!Array.isArray(agreementsData)) {
        console.error('❌ Invalid response format:', data)
        setAgreements([])
        return
      }
      
      console.log('📊 Fetched Agreements:', agreementsData)
      console.log('📊 Total count:', agreementsData?.length)
      console.log('📊 Regular agreements:', agreementsData?.filter((a: any) => !a.isAdhocContainer)?.length)
      console.log('📊 Containers:', agreementsData?.filter((a: any) => a.isAdhocContainer)?.length)
      
      // Log approval status breakdown
      const regularData = agreementsData?.filter((a: any) => !a.isAdhocContainer)
      console.log('📊 APPROVAL STATUS BREAKDOWN:')
      console.log('  - APPROVED:', regularData?.filter((a: any) => a.approvalStatus === 'APPROVED')?.length)
      console.log('  - PENDING:', regularData?.filter((a: any) => a.approvalStatus === 'PENDING')?.length)
      console.log('  - REJECTED:', regularData?.filter((a: any) => a.approvalStatus === 'REJECTED')?.length)
      console.log('  - NOT SUBMITTED:', regularData?.filter((a: any) => !a.approvalStatus)?.length)
      
      // Log each regular agreement details
      regularData?.forEach((a: any, index: number) => {
        console.log(`📋 Agreement ${index + 1}:`, {
          id: a.id?.substring(0, 8),
          title: a.title,
          approvalStatus: a.approvalStatus,
          weight: a.weight,
          hasInitiative: !!a.initiative,
          initiativeTitle: a.initiative?.title,
          goalNumber: a.initiative?.objective?.goal?.goalNumber
        })
      })
      
      setAgreements(agreementsData)
    } catch (error) {
      console.error('Failed to fetch performance agreements:', error)
      setAgreements([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSubordinates = async () => {
    setSubordinatesLoading(true)
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/subordinates')
      const data = await response.json()
      
      if (!response.ok || !Array.isArray(data)) {
        console.error('❌ API Error fetching subordinates:', data)
        setSubordinates([])
        return
      }
      
      console.log('👥 Fetched Subordinates:', data.length)
      setSubordinates(data)
    } catch (error) {
      console.error('Failed to fetch subordinates:', error)
      setSubordinates([])
    } finally {
      setSubordinatesLoading(false)
    }
  }

  const handleGoalClick = (goalNumber: string) => {
    const isCollapsing = selectedGoal === goalNumber
    const newSelectedGoal = isCollapsing ? null : goalNumber
    
    // Reset objectives and initiatives when collapsing or switching goals
    setSelectedObjective(null)
    setSelectedInitiativeId(null)
    setSelectedGoal(newSelectedGoal)
    
    // Smooth scroll to the goal section after a short delay to allow for expansion
    if (newSelectedGoal && goalRefs.current[goalNumber]) {
      setTimeout(() => {
        goalRefs.current[goalNumber]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }

  const handleObjectiveClick = (objective: string) => {
    const isCollapsing = selectedObjective === objective
    setSelectedObjective(isCollapsing ? null : (objective || null))
    // Reset initiative selection when switching objectives
    setSelectedInitiativeId(null)
  }

  const handleInitiativeClick = async (initiativeId: string) => {
    // Force save any pending changes before switching initiatives
    const pendingTimeouts = Object.keys(saveTimeoutRef.current)
    if (pendingTimeouts.length > 0) {
      console.log('Forcing save of pending changes before navigation...')
      // Trigger all pending saves immediately
      for (const id of pendingTimeouts) {
        if (saveTimeoutRef.current[id]) {
          clearTimeout(saveTimeoutRef.current[id])
          // Find the agreement and save its current state
          const agreement = agreements.find(a => a.id === id)
          if (agreement) {
            try {
              await fetch(`/dashboard/performance/api/performance-agreements/${id}/draft`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customAction: agreement.customAction,
                  weight: agreement.weight
                })
              })
              console.log('Forced save successful for:', id)
            } catch (error) {
              console.error('Forced save failed:', error)
            }
          }
        }
      }
      saveTimeoutRef.current = {}
    }
    
    setSelectedInitiativeId(selectedInitiativeId === initiativeId ? null : initiativeId)
  }

  const updateAgreementField = (agreementId: string, field: 'customAction' | 'weight', value: string | number) => {
    // Clear incomplete marker for this agreement when user starts editing
    if (incompleteAgreements.includes(agreementId)) {
      setIncompleteAgreements(prev => prev.filter(id => id !== agreementId))
    }
    
    // If updating weight, validate that total doesn't exceed 100%
    if (field === 'weight') {
      const numericValue = typeof value === 'number' ? value : parseInt(value) || 0
      
      // Calculate what the total would be with this new weight
      const otherAgreementsWeight = agreements
        .filter(a => !a.isAdhocContainer && a.id !== agreementId)
        .reduce((sum, a) => sum + (a.weight || 0), 0)
      
      const proposedTotal = otherAgreementsWeight + numericValue
      
      // If it would exceed 100%, cap it at the maximum allowed
      if (proposedTotal > 100) {
        const maxAllowed = 100 - otherAgreementsWeight
        value = Math.max(0, maxAllowed) // Ensure it's not negative
        
        // Show brief notification
        const message = maxAllowed > 0 
          ? `Weight capped at ${maxAllowed}% (Total cannot exceed 100%)`
          : 'Cannot add more weight - total is already at 100%'
        
        // Use a temporary toast-like notification instead of alert
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded shadow-lg z-50 animate-fade-in'
        toast.textContent = message
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.style.opacity = '0'
          toast.style.transition = 'opacity 0.3s'
          setTimeout(() => document.body.removeChild(toast), 300)
        }, 3000)
      }
    }
    
    // Update local state immediately for responsive UI
    setAgreements(prev => {
      const newAgreements = prev.map(agreement => {
        if (agreement.id === agreementId) {
          return { ...agreement, [field]: value }
        }
        return agreement
      })
      return newAgreements
    })

    // Clear any existing save timeout for this agreement
    if (saveTimeoutRef.current[agreementId]) {
      clearTimeout(saveTimeoutRef.current[agreementId])
    }

    // Show saving indicator
    setSavingStatus(agreementId)

    // Debounce: Save to database after 500ms of no changes
    saveTimeoutRef.current[agreementId] = setTimeout(async () => {
      try {
        console.log('Saving to:', `/dashboard/performance/api/performance-agreements/${agreementId}/draft`, { [field]: value })
        const response = await fetch(`/dashboard/performance/api/performance-agreements/${agreementId}/draft`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Save failed:', errorData)
          alert(`Failed to save: ${errorData.error}`)
          setSavingStatus(null)
          return
        }
        
        console.log('Save successful')
        
        // Brief "Saved" confirmation
        setTimeout(() => {
          setSavingStatus(null)
        }, 1000)
      } catch (error) {
        console.error('Error auto-saving:', error)
        alert('Failed to save changes. Please try again.')
        setSavingStatus(null)
      }
    }, 500) // Wait 500ms after last keystroke
  }

  const calculateTotalWeight = () => {
    return agreements
      .filter(a => !a.isAdhocContainer) // Exclude ad-hoc container
      .reduce((sum, agreement) => sum + (agreement.weight || 0), 0)
  }

  // Mark/unmark a workplan action as discontinued (N/A)
  const handleDiscontinue = async (agreement: PerformanceAgreement, discontinued: boolean) => {
    const label = agreement.initiative?.title || agreement.title
    const confirmMsg = discontinued
      ? `Mark "${label}" as Not Applicable?\n\nThis will zero its weight (${agreement.weight ?? 0}%) so you can redistribute it to other actions.`
      : `Restore "${label}" as applicable?\n\nIts original weight (${agreement.originalWeight ?? 0}%) will be restored.`
    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(
        `/dashboard/performance/api/performance-agreements/${agreement.id}/discontinue`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ discontinued })
        }
      )
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to update action')
        return
      }
      await fetchAgreements()
    } catch (err) {
      console.error('Error toggling discontinue:', err)
      alert('Failed to update. Please try again.')
    }
  }

  // Open the redistribute weight dialog – initialise with current weights
  const openRedistributeDialog = () => {
    const initial: Record<string, number> = {}
    regularAgreements
      .filter(a => a.isSystemGenerated && !a.isDiscontinued)
      .forEach(a => { initial[a.id] = a.weight ?? 0 })
    setRedistributeWeights(initial)
    setRedistributeDialogOpen(true)
  }

  // Save redistributed weights to the API
  const handleSaveRedistribution = async () => {
    const activeAgreements = regularAgreements.filter(a => a.isSystemGenerated && !a.isDiscontinued)
    const total = activeAgreements.reduce((sum, a) => sum + (redistributeWeights[a.id] ?? 0), 0)
    if (total !== 100) {
      alert(`Total weight must equal exactly 100% (currently ${total}%). Please adjust the values.`)
      return
    }

    setRedistributeSaving(true)
    try {
      const weights = [
        ...activeAgreements.map(a => ({ id: a.id, weight: redistributeWeights[a.id] ?? 0 })),
        // Include discontinued agreements with weight 0
        ...regularAgreements.filter(a => a.isSystemGenerated && a.isDiscontinued).map(a => ({ id: a.id, weight: 0 }))
      ]

      const res = await fetch('/dashboard/performance/api/performance-agreements/redistribute-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weights })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to save weights')
        return
      }
      setRedistributeDialogOpen(false)
      await fetchAgreements()
    } catch (err) {
      console.error('Error saving redistribution:', err)
      alert('Failed to save. Please try again.')
    } finally {
      setRedistributeSaving(false)
    }
  }

  const handleSubmitAllForApproval = async () => {
    // Only validate and submit initiatives that are not yet approved or pending
    // Exclude ad-hoc container from submission
    const itemsToSubmit = agreements.filter(a => 
      !a.isAdhocContainer && (!a.approvalStatus || a.approvalStatus === 'REJECTED')
    )

    if (itemsToSubmit.length === 0) {
      alert('All initiatives are already submitted or approved.')
      return
    }

    // Validate items to submit have actions and weights
    const invalidAgreements = itemsToSubmit.filter(a => 
      !a.customAction || a.customAction.trim().length < 10 || !a.weight
    )

    if (invalidAgreements.length > 0) {
      // Mark incomplete agreements for visual highlighting
      setIncompleteAgreements(invalidAgreements.map(a => a.id))
      
      // Open the incomplete initiatives dialog
      setIncompleteDialogOpen(true)
      
      return
    }
    
    // Clear incomplete markers if validation passes
    setIncompleteAgreements([])

    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/submit-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreements: itemsToSubmit.map(a => ({
            id: a.id,
            customAction: a.customAction,
            weight: a.weight
          }))
        })
      })

      const data = await response.json()

      if (response.ok) {
        const supervisorInfo = data.supervisorName && data.supervisorName !== 'Unknown' 
          ? `\n\nSent to: ${data.supervisorName}\nNotification: ${data.notificationSent ? '✅ Sent' : '⚠️ Not sent (no supervisor assigned)'}`
          : '\n\n⚠️ No supervisor assigned - please contact HR to set your manager.'
        
        setMessageDialog({
          open: true,
          title: '✅ Submitted for Approval',
          message: `Successfully submitted ${itemsToSubmit.length} initiative${itemsToSubmit.length > 1 ? 's' : ''} for approval!${supervisorInfo}`,
          isError: false
        })
        // Refresh data
        fetchAgreements()
      } else {
        alert(`Failed to submit: ${data.error}`)
      }
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Failed to submit for approval')
    }
  }

  const handleUpdate = async () => {
    if (!selectedAgreement) return
    
    // Validation for completion
    if (updateData.status === 'COMPLETED') {
      if (!updateData.evidenceUrl || updateData.rating === 0) {
        alert('Evidence and rating are required for completion')
        return
      }
      
      // Additional evidence required for 4-5 star ratings
      if (updateData.rating >= 4 && (!updateData.evidenceNotes || updateData.evidenceNotes.trim().length < 20)) {
        alert('Additional evidence notes (at least 20 characters) are required for ratings of 4 stars or higher')
        return
      }
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/performance-agreements/${selectedAgreement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        alert('Updated successfully!')
        setUpdateDialogOpen(false)
        fetchAgreements()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Get unique goals sorted in ascending order by goal number
  // Use a Map to ensure unique goal numbers (prevents duplicate keys)
  const goalsMap = new Map<string, { number: string; title: string }>()
  regularAgreements
    .map(a => a.initiative?.objective?.goal)
    .filter((g): g is NonNullable<typeof g> => g !== null && g !== undefined)
    .forEach(g => {
      if (!goalsMap.has(g.goalNumber)) {
        goalsMap.set(g.goalNumber, { number: g.goalNumber, title: g.title })
      }
    })
  
  const uniqueGoals = Array.from(goalsMap.values())
    .sort((a, b) => {
      // Extract numeric part from goal number (e.g., "1" from "GOAL-1", "2" from "GOAL-2")
      const numA = parseInt(a.number.replace(/\D/g, '')) || 0
      const numB = parseInt(b.number.replace(/\D/g, '')) || 0
      return numA - numB
    })

  // Get objectives for selected goal
  const objectivesForSelectedGoal = Array.from(
    new Set(
      regularAgreements
        .filter(a => a.initiative?.objective?.goal?.goalNumber === selectedGoal)
        .map(a => a.initiative?.objective?.title)
        .filter(Boolean)
    )
  )
  
  const filteredAgreements = regularAgreements.filter(a => {
    if (!selectedGoal) return true
    if (a.initiative?.objective?.goal?.goalNumber !== selectedGoal) return false
    if (!selectedObjective) return true
    return a.initiative?.objective?.title === selectedObjective
  })

  const stats = {
    totalActions: regularAgreements.length,
    completed: regularAgreements.filter(a => a.status === 'COMPLETED').length,
    notStarted: regularAgreements.filter(a => a.status === 'NOT_STARTED').length,
    inProgress: regularAgreements.filter(a => a.status === 'IN_PROGRESS').length,
    totalDue: regularAgreements.filter(a => a.status !== 'COMPLETED').length,
    overdue: regularAgreements.filter(a => {
      const dueDate = new Date(a.dueDate)
      const now = new Date()
      return dueDate < now && a.status !== 'COMPLETED'
    }).length,
    dueThisMonth: regularAgreements.filter(a => {
      const dueDate = new Date(a.dueDate)
      const now = new Date()
      return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
    }).length
  }

  if (loading || periodLoading) return <div className="p-3 sm:p-4 lg:p-6">Loading...</div>

  // Check if performance period is set by Human Capital
  if (!activePeriod) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Performance Agreement Period Not Set
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-800">
              The Human Capital department has not yet set the performance agreement period for this cycle.
            </p>
            <p className="text-yellow-800">
              Performance agreements will become available once the Human Capital executive sets the submission deadline and period dates.
            </p>
            <p className="text-sm text-yellow-700 mt-4">
              Please check back later or contact Human Capital for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Helper function to safely format dates
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'Not set'
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return 'Not set'
    return date.toLocaleDateString()
  }

  // Helper function to safely parse dates
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return null
    return date
  }

  // Check if submission deadline has passed
  const submissionDeadlineDate = parseDate(activePeriod.submissionDeadline)
  const today = new Date()
  // Set time to start of day for fair comparison
  today.setHours(0, 0, 0, 0)
  
  // Default to open if no valid deadline is set
  let isSubmissionOpen = true
  let daysUntilDeadline = 0
  
  if (submissionDeadlineDate) {
    const deadlineWithTime = new Date(submissionDeadlineDate)
    deadlineWithTime.setHours(23, 59, 59, 999)
    isSubmissionOpen = today <= deadlineWithTime
    daysUntilDeadline = Math.ceil((deadlineWithTime.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (!isSubmissionOpen) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Performance Agreement Submission Closed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-800">
              <strong>Submission Deadline:</strong> {formatDate(activePeriod.submissionDeadline)}
            </p>
            <p className="text-red-800 font-medium mt-4">
              The performance agreement submission period has ended. The deadline was {formatDate(activePeriod.submissionDeadline)}.
            </p>
            <p className="text-red-700 text-sm mt-2">
              If you need to make changes to your performance agreements, please contact the Human Capital department.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check overall approval status (exclude ad-hoc container)
  const approvedCount = regularAgreements.filter(a => a.approvalStatus === 'APPROVED').length
  const rejectedCount = regularAgreements.filter(a => a.approvalStatus === 'REJECTED').length
  const pendingCount = regularAgreements.filter(a => a.approvalStatus === 'PENDING').length
  const notSubmittedCount = regularAgreements.filter(a => !a.approvalStatus || a.approvalStatus === null).length
  
  const allApproved = regularAgreements.length > 0 && approvedCount === regularAgreements.length
  const allPending = regularAgreements.length > 0 && pendingCount === regularAgreements.length
  const hasRejected = rejectedCount > 0
  const hasMixed = (approvedCount > 0 || rejectedCount > 0) && (approvedCount + rejectedCount < regularAgreements.length)
  const canExport = allApproved && totalWeightAllocation === 100

  // Check if all rejected items are ready for resubmission
  const rejectedItems = regularAgreements.filter(a => a.approvalStatus === 'REJECTED')
  const allRejectedItemsReady = rejectedItems.length > 0 && rejectedItems.every(item => 
    item.customAction && 
    item.customAction.length >= 10 && 
    item.weight && 
    item.weight > 0
  )

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">My Performance Agreement</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Strategic initiatives assigned to you</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = '/dashboard/performance/api/performance-agreements/import'
            }}
            className="border-blue-500 text-blue-700 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="border-green-500 text-green-700 hover:bg-green-50"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Import My Agreements</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMergeDuplicateGoals}
            className="hidden sm:inline-flex border-orange-500 text-orange-700 hover:bg-orange-50"
          >
            Merge Duplicate Goals
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete all ${agreements.length} of your performance agreements? This cannot be undone.`)) {
                return
              }
              try {
                const response = await fetch('/dashboard/performance/api/performance-agreements/delete-all', {
                  method: 'DELETE',
                  credentials: 'include'
                })
                const result = await response.json()
                if (response.ok) {
                  setMessageDialog({
                    open: true,
                    title: '✅ Deleted',
                    message: result.message,
                    isError: false
                  })
                  setAgreements([])
                } else {
                  alert(result.error || 'Failed to delete')
                }
              } catch (error) {
                console.error('Delete error:', error)
                alert('Failed to delete agreements')
              }
            }}
            className="hidden sm:inline-flex border-red-500 text-red-700 hover:bg-red-50"
          >
            Delete All
          </Button>
        </div>
      </div>

      {/* Performance Period Info Banner with Gradient Ambient Effect */}
      <div 
        className="relative overflow-hidden rounded-md"
        style={{ 
          background: gradients.navyHeader,
          boxShadow: shadows.banner
        }}
      >
        {/* Gold glow ambient effect - top-right */}
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 opacity-40"
          style={{ 
            background: gradients.goldGlowEllipse,
            filter: 'blur(80px)'
          }}
        />
        {/* Subtle gold glow - bottom-left */}
        <div 
          className="absolute -bottom-16 -left-16 w-64 h-64 opacity-20"
          style={{ 
            background: gradients.goldGlow,
            filter: 'blur(60px)'
          }}
        />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg shrink-0" style={{ backgroundColor: colors.goldSubtle }}>
                <Calendar className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: colors.gold }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base sm:text-xl leading-tight" style={{ color: colors.textWhite }}>{activePeriod.name}</h3>
                <p className="text-xs sm:text-sm mt-0.5" style={{ color: colors.textMuted }}>
                  Period: {formatDate(activePeriod.startDate)} – {formatDate(activePeriod.endDate)}
                </p>
              </div>
            </div>
            <div className="flex sm:flex-col sm:items-end items-center gap-3 sm:gap-0">
              <div>
                <p className="text-xs sm:text-sm" style={{ color: colors.textMuted }}>Submission Deadline</p>
                <p className="font-bold text-base sm:text-lg sm:mt-1" style={{ color: colors.gold }}>{formatDate(activePeriod.submissionDeadline)}</p>
              </div>
              {daysUntilDeadline > 0 && (
                <p className={`text-xs font-semibold px-2 py-1 rounded inline-block sm:mt-1 ${
                  daysUntilDeadline <= 7 ? 'bg-red-500/20 text-red-200' : 
                  daysUntilDeadline <= 14 ? 'bg-orange-500/20 text-orange-200' : 
                  'bg-green-500/20 text-green-200'
                }`}>
                  {daysUntilDeadline} {daysUntilDeadline === 1 ? 'day' : 'days'} remaining
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agreement Completion Status Banner */}
      {agreements.length > 0 && (
        <div className={`border-l-4 p-4 rounded ${
          canExport 
            ? 'bg-green-50 border-green-500' 
            : allApproved && totalWeightAllocation !== 100
            ? 'bg-orange-50 border-orange-500'
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {canExport ? (
                <>
                  <svg className="w-8 h-8 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-green-900 font-bold text-base sm:text-lg">Agreement Complete ✓</h2>
                    <p className="text-green-700 text-sm">All {regularAgreements.length} initiatives have been approved by your supervisor and weight allocation is 100%. You can now export and track progress.</p>
                    <p className="text-green-600 text-xs mt-1 italic">Export includes your signature and your supervisor's signature</p>
                  </div>
                </>
              ) : allApproved && totalWeightAllocation !== 100 ? (
                <>
                  <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h2 className="text-orange-900 font-bold text-lg">⚠️ Weight Allocation Incomplete</h2>
                    <p className="text-orange-700 text-sm">All {regularAgreements.length} initiatives have been approved, but your weight allocation is {totalWeightAllocation}%.</p>
                    <p className="text-orange-600 text-xs mt-1 font-medium">You must allocate exactly 100% weight before your agreement is complete and you can export.</p>
                  </div>
                  <Button 
                    disabled={true}
                    className="bg-gray-400 cursor-not-allowed text-white"
                    title={`Cannot export: Weight allocation must be 100% (currently ${totalWeightAllocation}%)`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Approved Performance Agreement
                  </Button>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h2 className="text-yellow-900 font-bold text-lg">⚠️ Agreement Not Yet Complete</h2>
                    <p className="text-yellow-700 text-sm">
                      Your performance agreement is <strong>not finalized</strong> until all initiatives are approved by your supervisor. 
                      {notSubmittedCount > 0 && ` ${notSubmittedCount} initiative${notSubmittedCount > 1 ? 's' : ''} not yet submitted.`}
                      {pendingCount > 0 && ` ${pendingCount} awaiting supervisor review.`}
                      {rejectedCount > 0 && ` ${rejectedCount} rejected - needs revision and resubmission.`}
                    </p>
                    <p className="text-yellow-600 text-xs mt-1 italic">
                      You can draft and edit initiatives below, but the agreement will only be finalized once your supervisor approves all items.
                    </p>
                  </div>
                  <Button 
                    onClick={() => exportToPDF('unrated')}
                    disabled={exportingPDF || regularAgreements.length === 0}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {exportingPDF ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export for Signatures
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
            {canExport && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={() => setPdfTypeModal(true)}
                  disabled={exportingPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {exportingPDF ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Download Agreement</>
                  )}
                </Button>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{approvedCount}/{regularAgreements.length}</div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
              </div>
            )}
            {!canExport && (
              <div className="flex flex-col items-end gap-1">
                <div className="text-2xl font-bold text-gray-900">{approvedCount}/{regularAgreements.length}</div>
                <div className="text-xs text-gray-600">Approved</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner for Incomplete Agreements */}
      {incompleteAgreements.length > 0 && !incompleteDialogOpen && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-lg mb-1">
                ⚠️ Action Required: {incompleteAgreements.length} Initiative{incompleteAgreements.length > 1 ? 's' : ''} Incomplete
              </h3>
              <p className="text-red-800 mb-3">
                Please fill in <strong>actions</strong> (minimum 10 characters) and <strong>weights</strong> for all initiatives before submitting.
              </p>
              <Button
                onClick={() => setIncompleteDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Fix {incompleteAgreements.length} Incomplete Initiative{incompleteAgreements.length > 1 ? 's' : ''}
              </Button>
            </div>
            <button
              onClick={() => setIncompleteAgreements([])}
              className="text-red-600 hover:text-red-800 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <div className="flex gap-2 items-center">
          {/* Weight Allocation Table - Always visible for all users */}
          {taskCategories.length > 0 && (
            <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
              <div className="flex">
                {taskCategories.map((cat, idx) => (
                  <div key={cat.id} className={`px-3 py-2 bg-gray-50 text-center ${idx < taskCategories.length - 1 ? 'border-r' : ''}`}>
                    <div className="text-xs text-gray-500 truncate max-w-[80px]" title={cat.name}>{cat.name}</div>
                    <div className="font-bold text-blue-600">{cat.weight}</div>
                  </div>
                ))}
              </div>
              {isWeightManager ? (
                pendingWeightCategories ? (
                  <Badge className="mx-2 bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" /> Pending Approval
                  </Badge>
                ) : weightsApproved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mx-2 border-green-500 text-green-700 hover:bg-green-50"
                    onClick={async () => {
                      try {
                        const res = await fetch('/dashboard/performance/api/user-task-weights', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ action: 'request-unlock' })
                        })
                        if (res.ok) {
                          const data = await res.json()
                          if (data.selfUnlocked) {
                            setWeightsApproved(false)
                            setTempCategories([...taskCategories])
                            setNewCategoryName('')
                            setWeightAllocationDialogOpen(true)
                          }
                        } else {
                          const data = await res.json()
                          alert(data.error || 'Failed to unlock')
                        }
                      } catch { alert('Failed to unlock weights') }
                    }}
                  >
                    Allocate Weight
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mx-2 border-green-500 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      setTempCategories([...taskCategories])
                      setNewCategoryName('')
                      setWeightAllocationDialogOpen(true)
                  }}
                >
                  Allocate Weight
                </Button>
                )
              ) : null}
            </div>
          )}
          
          {/* Redistribute Weight button – only for workplan users with N/A actions */}
          {regularAgreements.some(a => a.isSystemGenerated) && (
            regularAgreements.some(a => a.isSystemGenerated && a.isDiscontinued) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={openRedistributeDialog}
                className="border-purple-500 text-purple-700 hover:bg-purple-50"
              >
                <Scale className="w-4 h-4 mr-1" />
                Redistribute Weight
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={openRedistributeDialog}
                className="border-purple-400 text-purple-600 hover:bg-purple-50"
                title="Mark actions as N/A first, then redistribute their weight"
              >
                <Scale className="w-4 h-4 mr-1" />
                Redistribute Weight
              </Button>
            )
          )}

          {/* Show Submit button if there are items not yet submitted */}
          {notSubmittedCount > 0 && (
            <Button onClick={handleSubmitAllForApproval}>
              Submit for Approval
            </Button>
          )}
          
          {/* All Pending */}
          {allPending && (
            <Badge className="bg-yellow-100 text-yellow-800 text-base px-4 py-2">
              ⏳ {pendingCount} Initiative{pendingCount > 1 ? 's' : ''} Awaiting Approval
            </Badge>
          )}
          
          {/* All Approved */}
          {allApproved && (
            <Badge className="bg-green-100 text-green-800 text-base px-4 py-2">
              ✓ All Approved - Track Progress Below
            </Badge>
          )}
          
          {/* Mixed Status */}
          {hasMixed && (
            <div className="flex gap-2">
              {approvedCount > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  ✓ {approvedCount} Approved
                </Badge>
              )}
              {rejectedCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  ✗ {rejectedCount} Rejected
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  ⏳ {pendingCount} Pending
                </Badge>
              )}
            </div>
          )}
          
          {/* Only Rejected */}
          {hasRejected && !hasMixed && rejectedCount === regularAgreements.length && (
            <Badge className="bg-red-100 text-red-800 text-base px-4 py-2">
              ✗ Rejected - Revise & Resubmit
            </Badge>
          )}
        </div>
      </div>

      {/* Rejection Alert - Clickable */}
      {rejectedCount > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setRejectionDialogOpen(true)}
            className="w-full bg-red-50 border-l-4 border-red-500 p-4 rounded hover:bg-red-100 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3 shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-800 font-semibold">
                  {rejectedCount} Initiative{rejectedCount > 1 ? 's' : ''} Rejected - Click to View
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  Click here to see all rejected items and quickly navigate to each one.
                </p>
              </div>
              <ExternalLink className="w-5 h-5 text-red-600 ml-2" />
            </div>
          </button>

          {/* Global Resubmit Button - Only active when ALL rejected items are ready */}
          {allRejectedItemsReady ? (
            <Button
              type="button"
              onClick={async () => {
                if (!confirm(`Resubmit all ${rejectedCount} rejected initiative${rejectedCount > 1 ? 's' : ''} for approval?`)) {
                  return
                }

                try {
                  const response = await fetch('/dashboard/performance/api/performance-agreements/resubmit-all', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  })

                  const data = await response.json()

                  if (response.ok) {
                    setMessageDialog({
                      open: true,
                      title: 'Success',
                      message: `✓ Successfully resubmitted ${data.count} initiative${data.count > 1 ? 's' : ''} for approval!`,
                      isError: false
                    })
                    fetchAgreements()
                  } else {
                    setMessageDialog({
                      open: true,
                      title: 'Resubmission Failed',
                      message: `Error: ${data.error}\n\nDetails: ${JSON.stringify(data, null, 2)}`,
                      isError: true
                    })
                  }
                } catch (error) {
                  console.error('Error resubmitting:', error)
                  setMessageDialog({
                    open: true,
                    title: 'Network Error',
                    message: `An error occurred while resubmitting.\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease check your internet connection and try again.`,
                    isError: true
                  })
                }
              }}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resubmit All {rejectedCount} Rejected Item{rejectedCount > 1 ? 's' : ''} for Approval
            </Button>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-yellow-600 mr-3 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-800 font-semibold text-sm">Complete All Fixes Before Resubmitting</h4>
                  <p className="text-yellow-700 text-xs mt-1">
                    Make sure all rejected items have:
                  </p>
                  <ul className="text-yellow-700 text-xs mt-1 list-disc list-inside">
                    <li>Action plan (minimum 10 characters)</li>
                    <li>Weight assigned (greater than 0)</li>
                  </ul>
                  <p className="text-yellow-700 text-xs mt-2 italic">
                    Once all rejected items are fixed, the "Resubmit All" button will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <KpiGrid columns={4}>
        <KpiCard
          icon={Target}
          label="Total Actions"
          value={stats.totalActions}
          color="blue"
          onClick={() => setStatsDialogOpen('totalActions')}
        />
        <KpiCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          color="green"
          onClick={() => setStatsDialogOpen('completed')}
        />
        <KpiCard
          icon={Clock}
          label="Not Started"
          value={stats.notStarted}
          color="amber"
          onClick={() => setStatsDialogOpen('notStarted')}
        />
        <KpiCard
          icon={Activity}
          label="In Progress"
          value={stats.inProgress}
          color="blue"
          onClick={() => setStatsDialogOpen('inProgress')}
        />
        <KpiCard
          icon={ListChecks}
          label="Total Due"
          value={stats.totalDue}
          color="purple"
          onClick={() => setStatsDialogOpen('totalDue')}
        />
        <KpiCard
          icon={AlertCircle}
          label="Overdue"
          value={stats.overdue}
          color="red"
          onClick={() => setStatsDialogOpen('overdue')}
        />
        <KpiCard
          icon={Calendar}
          label="Due This Month"
          value={stats.dueThisMonth}
          color="orange"
          onClick={() => setStatsDialogOpen('dueThisMonth')}
        />
      </KpiGrid>

      {/* Hierarchical Accordion Structure */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {uniqueGoals.map((goal) => {
              const objectivesForGoal = Array.from(
                new Set(
                  regularAgreements
                    .filter(a => a.initiative?.objective?.goal?.goalNumber === goal.number)
                    .map(a => a.initiative?.objective?.title)
                    .filter((title): title is string => Boolean(title))
                )
              ).sort((a, b) => a.localeCompare(b)) // Sort objectives alphabetically

              return (
                <div 
                  key={goal.number} 
                  className="border rounded-lg"
                  ref={(el) => { goalRefs.current[goal.number] = el }}
                >
                  {/* Goal Level */}
                  <button
                    onClick={() => handleGoalClick(goal.number)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <svg
                        className={`w-5 h-5 shrink-0 transition-transform mt-0.5 ${
                          selectedGoal === goal.number ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-bold text-black text-left wrap-break-word flex-1">
                        {goal.number.toUpperCase().startsWith('GOAL') ? goal.number.replace('-', ' ') : `Goal ${goal.number}`}: {goal.title}
                      </span>
                    </div>
                  </button>

                  {/* Objectives Level */}
                  {selectedGoal === goal.number && (
                    <div className="border-t">
                      {objectivesForGoal.map((objective) => {
                        const initiativesForObjective = regularAgreements
                          .filter(
                            a => a.initiative?.objective?.goal?.goalNumber === goal.number &&
                                 a.initiative?.objective?.title === objective
                          )
                          .sort((a, b) => {
                            // Sort by initiative number (e.g., "1.1.1", "1.1.2")
                            const numA = a.initiative?.number || a.title || ''
                            const numB = b.initiative?.number || b.title || ''
                            return numA.localeCompare(numB, undefined, { numeric: true })
                          })

                        return (
                          <div key={objective} className="border-b last:border-b-0">
                            {/* Objective Level */}
                            <button
                              onClick={() => handleObjectiveClick(objective || '')}
                              className="w-full px-4 py-3 pl-12 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
                            >
                              <div className="flex items-start gap-2 flex-1">
                                <svg
                                  className={`w-4 h-4 shrink-0 transition-transform mt-0.5 ${
                                    selectedObjective === objective ? 'rotate-90' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="font-semibold text-black text-left wrap-break-word flex-1">
                                  Strategic Objective: {objective}
                                </span>
                              </div>
                              <Badge className="bg-green-200 text-green-900">
                                {initiativesForObjective.length} {initiativesForObjective.length === 1 ? 'Initiative' : 'Initiatives'}
                              </Badge>
                            </button>

                            {/* Strategic Initiatives Level */}
                            {selectedObjective === objective && (
                              <div>
                                {initiativesForObjective.map((agreement) => {
                                  const initiative = agreement.initiative
                                  if (!initiative) return null
                                  
                                  const isRejected = agreement.approvalStatus === 'REJECTED'
                                  const isApproved = agreement.approvalStatus === 'APPROVED'
                                  const isPending = agreement.approvalStatus === 'PENDING'
                                  const isRatingRejected = isApproved && agreement.rating === 0
                                  
                                  // Extract supervisor feedback from progressNotes
                                  const supervisorFeedbackMatch = agreement.progressNotes?.match(/--- Supervisor Feedback \(([^)]+)\) ---\n([\s\S]*?)(?=\n\n---|$)/)
                                  const supervisorFeedbackAuthor = supervisorFeedbackMatch?.[1] || ''
                                  const supervisorFeedbackText = supervisorFeedbackMatch?.[2]?.trim() || ''
                                  
                                  const isIncomplete = incompleteAgreements.includes(agreement.id)
                                  
                                  return (
                                    <div 
                                      key={agreement.id} 
                                      id={`initiative-${agreement.id}`}
                                      ref={(el) => { itemRefs.current[agreement.id] = el }}
                                      className={`border-b last:border-b-0 transition-all duration-300 ${
                                        highlightedId === agreement.id ? 'border-l-8 border-blue-600 bg-blue-50 shadow-lg ring-2 ring-blue-300' :
                                        isIncomplete ? 'border-l-8 border-red-600 bg-red-50 shadow-lg' :
                                        isRatingRejected ? 'border-l-4 border-orange-500 bg-orange-50' :
                                        isRejected ? 'border-l-4 border-red-500' :
                                        agreement.isDiscontinued ? 'border-l-4 border-gray-400 bg-gray-50 opacity-75' : ''
                                      }`}
                                    >
                                      {agreement.isDiscontinued && (
                                        <div className="bg-gray-500 text-white px-4 py-2 text-sm font-semibold flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <X className="w-4 h-4" />
                                            MARKED AS NOT APPLICABLE — Weight freed for redistribution
                                          </div>
                                          {agreement.isSystemGenerated && agreement.approvalStatus !== 'APPROVED' && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDiscontinue(agreement, false) }}
                                              className="text-xs underline hover:no-underline text-gray-200"
                                            >
                                              Undo
                                            </button>
                                          )}
                                        </div>
                                      )}
                                      {isIncomplete && (
                                        <div className="bg-red-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4" />
                                          INCOMPLETE - Please fill in action (min 10 chars) and weight
                                        </div>
                                      )}
                                      {isRatingRejected && (
                                        <div className="bg-orange-500 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4" />
                                          RATING REJECTED — Your self-rating was rejected. Please review the feedback and re-rate.
                                        </div>
                                      )}
                                      
                                      {/* Strategic Initiative Header */}
                                      <button
                                        onClick={() => handleInitiativeClick(agreement.id)}
                                        className={`w-full px-4 py-3 pl-20 flex items-center justify-between transition-colors ${
                                          isIncomplete ? 'bg-red-100 hover:bg-red-200' :
                                          isRejected ? 'bg-red-50 hover:bg-red-100' :
                                          isApproved ? 'bg-green-50 hover:bg-green-100' :
                                          isPending ? 'bg-yellow-50 hover:bg-yellow-100' :
                                          'bg-purple-50 hover:bg-purple-100'
                                        }`}
                                      >
                                        <div className="flex items-start gap-2 flex-1">
                                          {isRejected && (
                                            <svg className="w-5 h-5 shrink-0 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                          {isApproved && (
                                            <svg className="w-5 h-5 shrink-0 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                          {isPending && (
                                            <svg className="w-5 h-5 shrink-0 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                          <svg
                                            className={`w-4 h-4 shrink-0 transition-transform mt-0.5 ${
                                              selectedInitiativeId === agreement.id ? 'rotate-90' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                          <span className={`font-medium text-left wrap-break-word flex-1 ${
                                            isRejected ? 'text-red-900' :
                                            isApproved ? 'text-green-900' :
                                            isPending ? 'text-yellow-900' :
                                            'text-blue-600'
                                          }`}>
                                            {initiative.number ? `Initiative ${initiative.number}: ` : 'Strategic Initiative: '}
                                            {initiative.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isRejected && (
                                            <Badge className="bg-red-200 text-red-900 animate-pulse">
                                              Action Required
                                            </Badge>
                                          )}
                                          {isRatingRejected && (
                                            <Badge className="bg-orange-200 text-orange-900 animate-pulse">
                                              ★ Rating Rejected
                                            </Badge>
                                          )}
                                          <Badge className={
                                            agreement.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                            agreement.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                                            'bg-red-500 text-white'
                                          }>
                                            {agreement.percentComplete}%
                                          </Badge>
                                        </div>
                                      </button>

                                      {/* Initiative Details */}
                                      {selectedInitiativeId === agreement.id && (
                                        <div className="pl-24 py-3 px-4 space-y-3 bg-gray-50">
                                          {/* Approval Status Badge */}
                                          {agreement.approvalStatus && (
                                            <div className="mb-2 space-y-2">
                                              <Badge className={
                                                isRatingRejected ? 'bg-orange-100 text-orange-800' :
                                                agreement.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                agreement.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                agreement.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                              }>
                                                {agreement.approvalStatus === 'PENDING' ? '⏳ Awaiting Supervisor Approval' :
                                                 isRatingRejected ? '★ Approved — Self-Rating Rejected' :
                                                 agreement.approvalStatus === 'APPROVED' ? '✓ Approved by Supervisor' :
                                                 agreement.approvalStatus === 'REJECTED' ? '✗ Rejected - Needs Revision' :
                                                 'Not Submitted'}
                                              </Badge>

                                              {/* Show rating rejection feedback */}
                                              {isRatingRejected && supervisorFeedbackText && (
                                                <div className="bg-orange-50 border border-orange-300 p-3 rounded text-sm">
                                                  <div className="font-semibold text-orange-800 mb-1 flex items-center gap-1">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Supervisor Feedback on Your Rating
                                                    {supervisorFeedbackAuthor && <span className="font-normal text-orange-600"> — {supervisorFeedbackAuthor}</span>}
                                                  </div>
                                                  <div className="text-orange-900">{supervisorFeedbackText}</div>
                                                  <div className="mt-2 text-xs text-orange-700 font-medium">Please re-rate this action after reviewing the feedback above.</div>
                                                </div>
                                              )}

                                              {/* Show rejection comment if rejected by supervisor (approvalStatus) */}
                                              {agreement.approvalStatus === 'REJECTED' && agreement.progressNotes && (
                                                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                                                  <div className="font-semibold text-red-800 mb-1">Supervisor's Comment:</div>
                                                  <div className="text-red-700">{agreement.progressNotes}</div>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* From Initiative (Read-only) */}
                                          <div className="border-l-4 border-blue-400 pl-3 py-2 bg-blue-50 rounded">
                                            <div className="text-xs font-semibold text-blue-700 mb-1">FROM STRATEGIC INITIATIVE:</div>
                                            <div className="text-sm"><strong>Measure/KPI:</strong> {initiative.measure || agreement.kpi || '-'}</div>
                                            <div className="text-sm"><strong>Target:</strong> {initiative.target || '-'}</div>
                                            <div className="text-sm"><strong>Due Date:</strong> {agreement.dueDate ? new Date(agreement.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</div>
                                          </div>

                                          {/* Action and Weight - Editable based on status */}
                                          <div className="border-l-4 border-purple-400 pl-3 py-2 bg-purple-50 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="text-xs font-semibold text-purple-700">YOUR ACTION & WEIGHT:</div>
                                              {savingStatus === agreement.id && (
                                                <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                                              )}
                                            </div>
                                            
                                            {/* Allow full editing if not submitted, or if rejected */}
                                            {(!agreement.approvalStatus || agreement.approvalStatus === 'REJECTED') ? (
                                              <div className="space-y-3">
                                                <div>
                                                  <Label className="text-sm">Action Plan *</Label>
                                                  <Textarea
                                                    key={`action-${agreement.id}`}
                                                    value={agreement.customAction || ''}
                                                    onChange={(e) => updateAgreementField(agreement.id, 'customAction', e.target.value)}
                                                    placeholder="Describe specific actions you'll take to achieve the measure/target (min 10 chars)..."
                                                    rows={3}
                                                    className="mt-1"
                                                  />
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    {(agreement.customAction || '').length} characters
                                                  </p>
                                                </div>
                                                <div>
                                                  <Label htmlFor={`weight-${agreement.id}`} className="text-sm">
                                                    Weight (%) *
                                                    <span className="text-xs text-gray-500 ml-2">
                                                      (Max: {(() => {
                                                        const otherWeight = agreements
                                                          .filter(a => !a.isAdhocContainer && a.id !== agreement.id)
                                                          .reduce((sum, a) => sum + (a.weight || 0), 0)
                                                        return Math.max(0, 100 - otherWeight)
                                                      })()}%)
                                                    </span>
                                                  </Label>
                                                  <Input
                                                    id={`weight-${agreement.id}`}
                                                    name={`weight-${agreement.id}`}
                                                    key={`weight-${agreement.id}`}
                                                    type="number"
                                                    value={agreement.weight || 0}
                                                    onChange={(e) => updateAgreementField(agreement.id, 'weight', parseInt(e.target.value) || 0)}
                                                    onFocus={(e) => e.target.select()} // Select all text on focus for easy editing
                                                    min={0}
                                                    max={(() => {
                                                      const otherWeight = agreements
                                                        .filter(a => !a.isAdhocContainer && a.id !== agreement.id)
                                                        .reduce((sum, a) => sum + (a.weight || 0), 0)
                                                      return Math.max(0, 100 - otherWeight)
                                                    })()}
                                                    className="mt-1 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                  />
                                                </div>
                                              </div>
                                            ) : agreement.approvalStatus === 'APPROVED' && totalWeightAllocation !== 100 ? (
                                              /* Allow weight editing only when approved but total weight is not 100% */
                                              <div className="space-y-2">
                                                <div className="text-sm"><strong>Action:</strong> {agreement.customAction}</div>
                                                <div className="flex items-center gap-2">
                                                  <Label htmlFor={`weight-approved-${agreement.id}`} className="text-sm font-semibold">
                                                    Weight:
                                                  </Label>
                                                  <Input
                                                    id={`weight-approved-${agreement.id}`}
                                                    type="number"
                                                    value={agreement.weight || 0}
                                                    onChange={(e) => updateAgreementField(agreement.id, 'weight', parseInt(e.target.value) || 0)}
                                                    onFocus={(e) => e.target.select()}
                                                    min={0}
                                                    max={(() => {
                                                      const otherWeight = agreements
                                                        .filter(a => !a.isAdhocContainer && a.id !== agreement.id)
                                                        .reduce((sum, a) => sum + (a.weight || 0), 0)
                                                      return Math.max(0, 100 - otherWeight)
                                                    })()}
                                                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                  />
                                                  <span className="text-sm">%</span>
                                                  <span className="text-xs text-orange-600 ml-2">
                                                    (Adjust to reach 100% total)
                                                  </span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-1">
                                                {agreement.customAction ? (
                                                  <div className="text-sm"><strong>Action:</strong> {agreement.customAction}</div>
                                                ) : (
                                                  <div className="text-sm text-gray-400">No action set</div>
                                                )}
                                                {agreement.weight ? (
                                                  <div className="text-sm font-semibold"><strong>Weight:</strong> {agreement.weight}%</div>
                                                ) : (
                                                  <div className="text-sm text-gray-400">No weight set</div>
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Mark as N/A — workplan only, not yet approved */}
                                          {agreement.isSystemGenerated && agreement.approvalStatus !== 'APPROVED' && agreement.approvalStatus !== 'PENDING' && (
                                            <div className={`border-l-4 pl-3 py-2 rounded ${agreement.isDiscontinued ? 'border-gray-400 bg-gray-50' : 'border-amber-400 bg-amber-50'}`}>
                                              <div className="text-xs font-semibold text-amber-700 mb-2">ACTION NOT APPLICABLE?</div>
                                              <p className="text-xs text-gray-600 mb-2">
                                                If this action was cascaded from the annual workplan but is not applicable to your role, mark it as N/A. Its weight will be freed for redistribution to your other actions.
                                              </p>
                                              {agreement.isDiscontinued ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-7 border-gray-400 text-gray-700 hover:bg-gray-100"
                                                  onClick={() => handleDiscontinue(agreement, false)}
                                                >
                                                  <RotateCcw className="h-3 w-3 mr-1" />
                                                  Restore Action
                                                </Button>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-7 border-amber-500 text-amber-700 hover:bg-amber-100"
                                                  onClick={() => handleDiscontinue(agreement, true)}
                                                >
                                                  <X className="h-3 w-3 mr-1" />
                                                  Mark as Not Applicable (N/A)
                                                </Button>
                                              )}
                                            </div>
                                          )}

                                          {/* Progress Section (only if approved) */}
                                          {agreement.approvalStatus === 'APPROVED' && (
                                            <div className="space-y-2">
                                              <div>
                                                <Badge className={
                                                  agreement.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                                                  agreement.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                                                  'bg-red-500 text-white'
                                                }>
                                                  {agreement.status || 'Not Started'}
                                                </Badge>
                                              </div>
                                              <div className="flex gap-2 items-center">
                                                <Progress value={agreement.percentComplete} className="flex-1" />
                                                <span className="text-xs font-medium">{agreement.percentComplete}%</span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Update Progress Button (only if approved) */}
                                          {agreement.approvalStatus === 'APPROVED' && (
                                            <div className="flex gap-2">
                                              <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="text-xs h-7"
                                                onClick={() => {
                                                  setSelectedAgreement(agreement)
                                                  setUpdateData({
                                                    status: agreement.status,
                                                    percentComplete: agreement.percentComplete,
                                                    progressNotes: agreement.progressNotes || '',
                                                    evidenceUrl: agreement.evidenceUrl || '',
                                                    evidenceNotes: agreement.evidenceNotes || '',
                                                    rating: agreement.rating || 0
                                                  })
                                                  setUpdateDialogOpen(true)
                                                }}
                                              >
                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                Update Progress
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={updateData.status} 
                onValueChange={(v) => {
                  const newData = {...updateData, status: v}
                  // Automatically set progress based on status
                  if (v === 'NOT_STARTED') {
                    newData.percentComplete = 0
                  } else if (v === 'IN_PROGRESS') {
                    newData.percentComplete = 10
                  } else if (v === 'COMPLETED') {
                    newData.percentComplete = 100
                  }
                  setUpdateData(newData)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started (0%)</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress (10%)</SelectItem>
                  <SelectItem value="COMPLETED">Completed (100%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Progress: {updateData.percentComplete}%
              </p>
            </div>
            {updateData.status === 'COMPLETED' && (
              <>
                <div>
                  <Label>Evidence URL *</Label>
                  <Input value={updateData.evidenceUrl} onChange={(e) => setUpdateData({...updateData, evidenceUrl: e.target.value})} />
                </div>
                <div>
                  <Label>Rating *</Label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUpdateData({...updateData, rating: star})}
                        className={`text-3xl ${star <= updateData.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Additional Evidence Required for 4-5 Stars */}
                {updateData.rating >= 4 && (
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                    <Label className="text-orange-700 font-semibold">
                      Additional Evidence Notes * (Required for 4-5 star ratings)
                    </Label>
                    <p className="text-xs text-orange-600 mb-2">
                      Please provide detailed evidence and justification for this high rating (minimum 20 characters)
                    </p>
                    <Textarea 
                      value={updateData.evidenceNotes} 
                      onChange={(e) => setUpdateData({...updateData, evidenceNotes: e.target.value})}
                      placeholder="Provide detailed evidence and justification for your rating..."
                      className="mt-1"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Characters: {updateData.evidenceNotes?.length || 0} / 20 minimum
                    </p>
                  </div>
                )}
              </>
            )}
            {updateData.status === 'IN_PROGRESS' && (
              <div>
                <Label>Progress Notes</Label>
                <Textarea 
                  value={updateData.progressNotes} 
                  onChange={(e) => setUpdateData({...updateData, progressNotes: e.target.value})}
                  placeholder="Add notes about your progress..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDetail?.type === 'goal' && 'Goal Details'}
              {selectedDetail?.type === 'objective' && 'Strategic Objective Details'}
              {selectedDetail?.type === 'initiative' && 'Strategic Initiative Details'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDetail?.number && (
              <div>
                <Label className="text-sm font-semibold text-gray-600">Number</Label>
                <p className="text-lg font-bold text-blue-600">{selectedDetail.number}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold text-gray-600">
                {selectedDetail?.type === 'goal' && 'Goal Title'}
                {selectedDetail?.type === 'objective' && 'Objective Title'}
                {selectedDetail?.type === 'initiative' && 'Initiative Title'}
              </Label>
              <p className="text-base mt-1">{selectedDetail?.title}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Detail Dialog */}
      <Dialog open={statsDialogOpen !== null} onOpenChange={() => setStatsDialogOpen(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {statsDialogOpen === 'totalActions' && 'All Performance Agreements'}
              {statsDialogOpen === 'completed' && 'Completed Agreements'}
              {statsDialogOpen === 'notStarted' && 'Not Started Agreements'}
              {statsDialogOpen === 'inProgress' && 'In Progress Agreements'}
              {statsDialogOpen === 'totalDue' && 'All Due Agreements'}
              {statsDialogOpen === 'overdue' && 'Overdue Agreements'}
              {statsDialogOpen === 'dueThisMonth' && 'Agreements Due This Month'}
            </DialogTitle>
            <DialogDescription>
              {statsDialogOpen === 'totalActions' && `Showing all ${stats.totalActions} performance agreements`}
              {statsDialogOpen === 'completed' && `Showing ${stats.completed} completed agreements`}
              {statsDialogOpen === 'notStarted' && `Showing ${stats.notStarted} agreements not yet started`}
              {statsDialogOpen === 'inProgress' && `Showing ${stats.inProgress} agreements in progress`}
              {statsDialogOpen === 'totalDue' && `Showing ${stats.totalDue} incomplete agreements`}
              {statsDialogOpen === 'overdue' && `Showing ${stats.overdue} overdue agreements`}
              {statsDialogOpen === 'dueThisMonth' && `Showing ${stats.dueThisMonth} agreements due this month`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {regularAgreements
              .filter(a => {
                const dueDate = new Date(a.dueDate)
                const now = new Date()
                
                if (statsDialogOpen === 'totalActions') return true
                if (statsDialogOpen === 'completed') return a.status === 'COMPLETED'
                if (statsDialogOpen === 'notStarted') return a.status === 'NOT_STARTED'
                if (statsDialogOpen === 'inProgress') return a.status === 'IN_PROGRESS'
                if (statsDialogOpen === 'totalDue') return a.status !== 'COMPLETED'
                if (statsDialogOpen === 'overdue') return dueDate < now && a.status !== 'COMPLETED'
                if (statsDialogOpen === 'dueThisMonth') return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
                return false
              })
              .map((agreement) => (
                <Card key={agreement.id} className="hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base">{agreement.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{agreement.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={
                            agreement.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                            agreement.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          }>
                            {agreement.status || 'Not Started'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Due: {new Date(agreement.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress value={agreement.percentComplete} className="w-20" />
                            <span className="text-xs font-medium">{agreement.percentComplete}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {regularAgreements.filter(a => {
              const dueDate = new Date(a.dueDate)
              const now = new Date()
              
              if (statsDialogOpen === 'totalActions') return true
              if (statsDialogOpen === 'completed') return a.status === 'COMPLETED'
              if (statsDialogOpen === 'notStarted') return a.status === 'NOT_STARTED'
              if (statsDialogOpen === 'inProgress') return a.status === 'IN_PROGRESS'
              if (statsDialogOpen === 'totalDue') return a.status !== 'COMPLETED'
              if (statsDialogOpen === 'overdue') return dueDate < now && a.status !== 'COMPLETED'
              if (statsDialogOpen === 'dueThisMonth') return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
              return false
            }).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No agreements found in this category
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setStatsDialogOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incomplete Initiatives Dialog */}
      <Dialog open={incompleteDialogOpen} onOpenChange={setIncompleteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Fix Incomplete Initiatives ({incompleteAgreements.length})
            </DialogTitle>
            <DialogDescription>
              Complete the required fields below to submit your performance agreement. All initiatives must have an action plan (min 10 chars) and a weight assigned.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {incompleteAgreements.map((agreementId, index) => {
              const agreement = agreements.find(a => a.id === agreementId)
              if (!agreement || !agreement.initiative) return null
              
              const initiative = agreement.initiative
              const missingAction = !agreement.customAction || agreement.customAction.trim().length < 10
              const missingWeight = !agreement.weight
              
              return (
                <div 
                  key={agreementId}
                  className="border-2 border-red-300 rounded-lg p-4 bg-red-50 space-y-3"
                >
                  {/* Initiative Header */}
                  <div className="flex items-start gap-2 pb-2 border-b border-red-200">
                    <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-600 mb-1">
                        Goal {initiative.objective.goal.goalNumber} → {initiative.objective.title}
                      </div>
                      <div className="font-semibold text-gray-900">
                        {initiative.number && `${initiative.number}: `}{initiative.title}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        <strong>Target:</strong> {initiative.target || 'Not specified'}
                      </div>
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="flex gap-2 items-center text-sm">
                    <span className="font-semibold text-red-700">Missing:</span>
                    {missingAction && (
                      <Badge variant="destructive" className="text-xs">
                        Action Plan
                      </Badge>
                    )}
                    {missingWeight && (
                      <Badge variant="destructive" className="text-xs">
                        Weight
                      </Badge>
                    )}
                  </div>

                  {/* Editable Fields */}
                  <div className="space-y-3 bg-white p-3 rounded border border-red-200">
                    {/* Action Field */}
                    <div>
                      <Label htmlFor={`incomplete-action-${agreementId}`} className="text-sm font-semibold">
                        Your Action Plan *
                        {missingAction && (
                          <span className="text-red-600 ml-2 text-xs">(Required - min 10 chars)</span>
                        )}
                      </Label>
                      <Textarea
                        id={`incomplete-action-${agreementId}`}
                        value={agreement.customAction || ''}
                        onChange={(e) => updateAgreementField(agreementId, 'customAction', e.target.value)}
                        placeholder="Describe specific actions you'll take to achieve the measure/target..."
                        rows={3}
                        className={`mt-1 ${missingAction ? 'border-red-500 focus:ring-red-500' : 'border-green-500'}`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-600">
                          {(agreement.customAction || '').length} / 10 characters minimum
                        </p>
                        {!missingAction && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Complete
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Weight Field */}
                    <div>
                      <Label htmlFor={`incomplete-weight-${agreementId}`} className="text-sm font-semibold">
                        Weight (%) *
                        {missingWeight && (
                          <span className="text-red-600 ml-2 text-xs">(Required)</span>
                        )}
                        <span className="text-xs text-gray-500 ml-2 font-normal">
                          (Max: {(() => {
                            const otherWeight = agreements
                              .filter(a => !a.isAdhocContainer && a.id !== agreementId)
                              .reduce((sum, a) => sum + (a.weight || 0), 0)
                            return Math.max(0, 60 - otherWeight)
                          })()}%)
                        </span>
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id={`incomplete-weight-${agreementId}`}
                          type="number"
                          value={agreement.weight || 0}
                          onChange={(e) => updateAgreementField(agreementId, 'weight', parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          min={0}
                          max={(() => {
                            const otherWeight = agreements
                              .filter(a => !a.isAdhocContainer && a.id !== agreementId)
                              .reduce((sum, a) => sum + (a.weight || 0), 0)
                            return Math.max(0, 60 - otherWeight)
                          })()}
                          className={`w-24 ${missingWeight ? 'border-red-500 focus:ring-red-500' : 'border-green-500'}`}
                        />
                        {!missingWeight && (
                          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex border rounded overflow-hidden">
                {taskCategories.slice(0, 5).map((cat, idx) => (
                  <div key={cat.id} className={`px-2 py-1 bg-gray-50 text-xs ${idx < Math.min(taskCategories.length, 5) - 1 ? 'border-r' : ''}`}>
                    <span className="text-gray-500">{cat.name.split(' ')[0]}:</span> <span className="font-bold text-blue-600">{cat.weight}</span>
                  </div>
                ))}
              </div>
              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                Total: {taskCategories.reduce((sum, c) => sum + c.weight, 0)}%
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIncompleteDialogOpen(false)
                  setIncompleteAgreements([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Re-validate and try to submit
                  setIncompleteDialogOpen(false)
                  handleSubmitAllForApproval()
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Save & Submit for Approval
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejected Items Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <X className="w-6 h-6 text-red-600" />
              Rejected Initiatives ({rejectedCount})
            </DialogTitle>
            <DialogDescription>
              Click any item below to jump directly to it and fix the issues
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {regularAgreements
              .filter(a => a.approvalStatus === 'REJECTED')
              .map((agreement) => {
                const initiative = agreement.initiative
                return (
                  <div
                    key={agreement.id}
                    className="border-2 border-red-300 rounded-lg p-4 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    {/* Initiative Header */}
                    <div className="flex items-start gap-2 pb-3 border-b border-red-200">
                      <X className="w-5 h-5 text-red-600 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-red-900 text-base">
                              {initiative?.title || 'Initiative'}
                            </h3>
                            {initiative?.number && (
                              <p className="text-xs text-red-600 font-mono mt-1">
                                #{initiative.number}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-red-600 text-white shrink-0">
                            REJECTED
                          </Badge>
                        </div>
                        
                        {/* Goal & Objective */}
                        <div className="mt-2 text-xs text-red-700 space-y-1">
                          <div>
                            <span className="font-semibold">Goal:</span> {initiative?.objective?.goal?.goalNumber} - {initiative?.objective?.goal?.title}
                          </div>
                          <div>
                            <span className="font-semibold">Objective:</span> {initiative?.objective?.title}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Your Action */}
                    {agreement.customAction && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-red-700">Your Action:</p>
                        <p className="text-sm text-red-900 mt-1">{agreement.customAction}</p>
                      </div>
                    )}

                    {/* Supervisor's Comment */}
                    {agreement.progressNotes && (
                      <div className="mt-3 bg-red-100 border border-red-200 p-3 rounded">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-red-800">Supervisor's Comment:</p>
                            <p className="text-sm text-red-900 mt-1 wrap-break-word">{agreement.progressNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          setRejectionDialogOpen(false)
                          
                          // Expand the sections
                          const goal = initiative?.objective?.goal?.goalNumber
                          const objective = initiative?.objective?.title
                          
                          if (goal) setSelectedGoal(goal)
                          if (objective) setSelectedObjective(objective)
                          setSelectedInitiativeId(agreement.id)
                          
                          // Scroll to it
                          setTimeout(() => {
                            const element = itemRefs.current[agreement.id]
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                          }, 300)
                        }}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Go to This Item & Fix It
                      </Button>
                    </div>
                  </div>
                )
              })}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copyable Message Dialog */}
      <Dialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className={messageDialog.isError ? 'text-red-600 flex items-center gap-2' : 'text-green-600 flex items-center gap-2'}>
              {messageDialog.isError ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  {messageDialog.title}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {messageDialog.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {messageDialog.isError ? 'You can copy the error details below for debugging' : 'Operation completed successfully'}
            </DialogDescription>
          </DialogHeader>
          
          <div className={`p-4 rounded border ${messageDialog.isError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-96 select-text">
              {messageDialog.message}
            </pre>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(messageDialog.message)
                alert('Copied to clipboard!')
              }}
            >
              Copy to Clipboard
            </Button>
            <Button
              type="button"
              onClick={() => setMessageDialog(prev => ({ ...prev, open: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weight Allocation Dialog */}
      <Dialog open={weightAllocationDialogOpen} onOpenChange={setWeightAllocationDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Allocate Performance Weights
            </DialogTitle>
            <DialogDescription>
              Distribute weights across task categories. Total must equal 100%. Add or remove categories as needed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Dynamic Category List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {tempCategories.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Input
                      value={cat.name}
                      onChange={(e) => {
                        const updated = [...tempCategories]
                        updated[idx] = { ...cat, name: e.target.value }
                        setTempCategories(updated)
                      }}
                      placeholder="Category name"
                      className="text-sm"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={cat.weight}
                      onChange={(e) => {
                        const updated = [...tempCategories]
                        updated[idx] = { ...cat, weight: parseInt(e.target.value) || 0 }
                        setTempCategories(updated)
                      }}
                      className="text-center font-bold"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                    onClick={() => {
                      if (tempCategories.length <= 1) {
                        alert('You must have at least one category')
                        return
                      }
                      setTempCategories(tempCategories.filter((_, i) => i !== idx))
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Category */}
            <div className="flex items-center gap-2 p-2 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="flex-1">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 border-green-500 hover:bg-green-50"
                onClick={() => {
                  if (!newCategoryName.trim()) {
                    alert('Please enter a category name')
                    return
                  }
                  const newId = `cat_${Date.now()}`
                  setTempCategories([...tempCategories, { id: newId, name: newCategoryName.trim(), weight: 0 }])
                  setNewCategoryName('')
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {/* Total Display */}
            <div className={`p-3 rounded-lg border-2 text-center ${
              tempCategories.reduce((sum, c) => sum + c.weight, 0) === 100
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}>
              <span className="text-lg font-bold">
                Total: {tempCategories.reduce((sum, c) => sum + c.weight, 0)}%
              </span>
              {tempCategories.reduce((sum, c) => sum + c.weight, 0) === 100 
                ? <span className="text-green-600 ml-2">✓</span>
                : <span className="text-red-600 ml-2">(Must = 100%)</span>
              }
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWeightAllocationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const total = tempCategories.reduce((sum, c) => sum + c.weight, 0)
                if (total !== 100) {
                  alert('Total weight must equal 100%')
                  return
                }
                if (tempCategories.some(c => !c.name.trim())) {
                  alert('All categories must have a name')
                  return
                }
                
                // Save to database
                try {
                  const response = await fetch('/dashboard/performance/api/user-task-weights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ categories: tempCategories })
                  })
                  
                  if (response.ok) {
                    const data = await response.json()
                    if (data.needsApproval) {
                      // Weights were submitted for supervisor approval
                      setPendingWeightCategories(tempCategories)
                      alert('Your weight allocation change has been submitted for supervisor approval.')
                    } else {
                      setTaskCategories([...tempCategories])
                      setWeightsApproved(true)
                    }
                    setWeightAllocationDialogOpen(false)
                  } else {
                    const data = await response.json()
                    alert(data.error || 'Failed to save weights')
                  }
                } catch (error) {
                  console.error('Failed to save weights:', error)
                  alert('Failed to save weights. Please try again.')
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Save Weights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Agreements Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open)
        if (!open) { setImportFile(null); setCsvPreviewData(null) }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Import My Performance Agreements
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to preview and import your performance agreements.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2 overflow-y-auto flex-1">
            {/* Step 1: Download Template */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <strong>Step 1:</strong> Download the template CSV format.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = '/dashboard/performance/api/performance-agreements/import'
                }}
                className="border-blue-500 text-blue-700 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* Step 2: File Upload */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Step 2:</strong> Upload your filled CSV file to preview before importing.
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => handleCsvFileSelect(e.target.files?.[0] || null)}
              />
            </div>

            {/* Step 3: Editable CSV Preview Table */}
            {csvPreviewData && csvPreviewData.rows.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 border-b px-3 py-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-800">
                    Preview: {csvPreviewData.rows.length} row{csvPreviewData.rows.length !== 1 ? 's' : ''} found — click any cell to edit
                  </p>
                  <Badge className="bg-green-100 text-green-700">Editable</Badge>
                </div>
                <div className="overflow-auto max-h-[350px]">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600 border-r border-b whitespace-nowrap w-8">#</th>
                        {csvPreviewData.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left font-semibold text-gray-600 border-r border-b whitespace-nowrap min-w-[100px]">{h}</th>
                        ))}
                        <th className="px-2 py-1.5 border-b w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-0.5 text-gray-400 border-r text-center">{rowIdx + 1}</td>
                          {csvPreviewData.headers.map((h, colIdx) => (
                            <td key={colIdx} className="px-0 py-0 border-r">
                              <input
                                type="text"
                                className="w-full px-2 py-1 text-xs bg-transparent border-0 outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 min-w-[80px]"
                                value={row[h] || ''}
                                onChange={(e) => {
                                  const updated = { ...csvPreviewData }
                                  updated.rows = [...updated.rows]
                                  updated.rows[rowIdx] = { ...updated.rows[rowIdx], [h]: e.target.value }
                                  setCsvPreviewData(updated)
                                }}
                              />
                            </td>
                          ))}
                          <td className="px-1 py-0.5 text-center">
                            <button
                              className="text-red-400 hover:text-red-600 text-xs"
                              title="Remove row"
                              onClick={() => {
                                const updated = { ...csvPreviewData }
                                updated.rows = updated.rows.filter((_, i) => i !== rowIdx)
                                setCsvPreviewData(updated)
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {csvPreviewData && csvPreviewData.rows.length === 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                No valid data rows found. Make sure your CSV has a &quot;Strategic Initiative&quot; column with values.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false)
                setImportFile(null)
                setCsvPreviewData(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportAgreements}
              disabled={!csvPreviewData || csvPreviewData.rows.length === 0 || importing}
              className="bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Import {csvPreviewData ? `${csvPreviewData.rows.length} Agreement${csvPreviewData.rows.length !== 1 ? 's' : ''}` : 'Agreements'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Weight Redistribution Dialog ── */}
      <Dialog open={redistributeDialogOpen} onOpenChange={setRedistributeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              Redistribute Action Weights
            </DialogTitle>
            <DialogDescription>
              Reassign the weight freed by N/A actions to your remaining active actions. Total must equal exactly 100%.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const activeAgreements = regularAgreements.filter(a => a.isSystemGenerated && !a.isDiscontinued)
            const discontinuedAgreements = regularAgreements.filter(a => a.isSystemGenerated && a.isDiscontinued)
            const currentTotal = activeAgreements.reduce((sum, a) => sum + (redistributeWeights[a.id] ?? 0), 0)
            const isValid = currentTotal === 100
            const freedWeight = discontinuedAgreements.reduce((sum, a) => sum + (a.originalWeight ?? 0), 0)

            return (
              <div className="space-y-4 py-2">
                {discontinuedAgreements.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-800 mb-1">
                      {freedWeight}% freed from {discontinuedAgreements.length} N/A action{discontinuedAgreements.length > 1 ? 's' : ''}:
                    </p>
                    <ul className="text-xs text-purple-700 list-disc list-inside space-y-0.5">
                      {discontinuedAgreements.map(a => (
                        <li key={a.id}>{a.initiative?.title || a.title} ({a.originalWeight ?? 0}%)</li>
                      ))}
                    </ul>
                  </div>
                )}

                {discontinuedAgreements.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    No actions have been marked as N/A yet. Open individual actions and click <strong>"Mark as Not Applicable (N/A)"</strong> to free their weight for redistribution.
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase px-1">
                    <span>Active Action</span>
                    <span>Weight (%)</span>
                  </div>
                  {activeAgreements.map(a => (
                    <div key={a.id} className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate" title={a.initiative?.title || a.title}>
                          {a.initiative?.number ? `${a.initiative.number}: ` : ''}{a.initiative?.title || a.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {a.initiative?.objective?.goal?.title || ''}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={redistributeWeights[a.id] ?? 0}
                        onChange={e => setRedistributeWeights(prev => ({
                          ...prev,
                          [a.id]: parseInt(e.target.value) || 0
                        }))}
                        onFocus={e => e.target.select()}
                        className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-sm text-gray-500 w-4">%</span>
                    </div>
                  ))}
                </div>

                {/* Running total */}
                <div className={`flex items-center justify-between rounded-lg px-4 py-3 font-bold text-sm ${
                  isValid ? 'bg-green-50 border border-green-300 text-green-800' :
                  currentTotal > 100 ? 'bg-red-50 border border-red-300 text-red-800' :
                  'bg-yellow-50 border border-yellow-300 text-yellow-800'
                }`}>
                  <span>Total</span>
                  <span>{currentTotal}% / 100%</span>
                </div>

                {!isValid && (
                  <p className="text-xs text-red-600 text-center">
                    {currentTotal > 100
                      ? `Over by ${currentTotal - 100}% — please reduce some weights`
                      : `${100 - currentTotal}% still unallocated — please distribute the remaining weight`}
                  </p>
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRedistributeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRedistribution}
              disabled={redistributeSaving || regularAgreements.filter(a => a.isSystemGenerated && !a.isDiscontinued).reduce((s, a) => s + (redistributeWeights[a.id] ?? 0), 0) !== 100}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {redistributeSaving ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Scale className="w-4 h-4 mr-2" />Save Redistribution</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pdfTypeModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
          onClick={() => setPdfTypeModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Download className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Download Agreement PDF</h3>
              <p className="text-sm text-gray-500 mt-1">{session?.user?.name}</p>
              <p className="text-sm text-gray-400 mt-1">Choose the type of document to download</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => { setPdfTypeModal(false); exportToPDF('unrated') }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 p-5 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-100">
                  <FileText className="h-6 w-6 text-gray-500 group-hover:text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Unrated</p>
                  <p className="text-xs text-gray-500 mt-1">Agreement only — no ratings or evidence columns</p>
                </div>
              </button>
              {(() => {
                // Q1 = April–June (months 4, 5, 6) in the financial year
                const q1Initiatives = regularAgreements.filter(a => {
                  const d = a.dueDate
                  if (!d) return false
                  const m = new Date(d).getMonth() + 1
                  return [4, 5, 6].includes(m)
                })
                const q1AllRated = q1Initiatives.length > 0 && q1Initiatives.every(
                  a => a.status === 'COMPLETED' && a.rating && a.rating > 0
                )
                const hasNoQ1Actions = q1Initiatives.length === 0
                const anyRatedActions = regularAgreements.some(
                  a => a.status === 'COMPLETED' && a.rating && a.rating > 0
                )
                // Enable if: Q1 actions all rated, OR no Q1 actions but has rated actions in other quarters
                const ratedDisabled = hasNoQ1Actions ? !anyRatedActions : !q1AllRated
                const ratedCount = regularAgreements.filter(a => a.status === 'COMPLETED' && a.rating && a.rating > 0).length
                return (
                  <button
                    onClick={() => { if (!ratedDisabled) { setPdfTypeModal(false); exportToPDF('rated') } }}
                    disabled={ratedDisabled}
                    title={ratedDisabled
                      ? hasNoQ1Actions
                        ? 'No rated actions found in any quarter.'
                        : `Rated export requires all Q1 actions (Apr–Jun) to be rated. ${q1Initiatives.filter(a => a.status === 'COMPLETED' && a.rating && a.rating > 0).length}/${q1Initiatives.length} Q1 actions rated.`
                      : 'Download rated agreement'}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all group ${
                      ratedDisabled
                        ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-amber-400 hover:bg-amber-50 cursor-pointer'
                    }`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${ratedDisabled ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-amber-100'}`}>
                      <Star className={`h-6 w-6 ${ratedDisabled ? 'text-gray-300' : 'text-gray-500 group-hover:text-amber-600'}`} />
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold ${ratedDisabled ? 'text-gray-400' : 'text-gray-900'}`}>Rated</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {ratedDisabled
                          ? hasNoQ1Actions
                            ? 'No rated actions found'
                            : `${q1Initiatives.filter(a => a.status === 'COMPLETED' && a.rating && a.rating > 0).length}/${q1Initiatives.length} Q1 actions rated`
                          : `Full document with ratings, scores & evidence (${ratedCount} rated)`}
                      </p>
                    </div>
                  </button>
                )
              })()}
            </div>
            <button
              onClick={() => setPdfTypeModal(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
