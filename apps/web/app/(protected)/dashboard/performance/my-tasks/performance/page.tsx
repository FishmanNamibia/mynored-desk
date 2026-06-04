'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useMemo } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { useSearchParams } from 'next/navigation'
import { PMSCard as Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/performance/ui-bridge'
import { PMSButton as Button } from '@/components/performance/ui-bridge'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Calendar, Target, CheckCircle, AlertCircle, X, Edit, Trash2, Shield, FileText, TrendingUp, Clock, RefreshCw, Award, Download, ExternalLink, Activity, ListChecks } from 'lucide-react'
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
import { colors, gradients, shadows, components, tw } from '@/components/performance/ui-bridge'

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
  const [incompleteAgreements, setIncompleteAgreements] = useState<string[]>([]) // Track IDs of incomplete agreements
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false) // Show dialog for fixing incomplete items
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false) // Show dialog for rejected items
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; title: string; message: string; isError: boolean }>({
    open: false,
    title: '',
    message: '',
    isError: false
  })

  // Derive regularAgreements and adhocContainer from agreements
  const regularAgreements = useMemo(() => 
    agreements.filter(a => !a.isAdhocContainer), 
    [agreements]
  )
  const adhocContainer = useMemo(() => 
    agreements.find(a => a.isAdhocContainer), 
    [agreements]
  )

  const exportToPDF = async () => {
    setExportingPDF(true)
    try {
      // Fetch employee signature
      const employeeSignatureRes = await fetch('/dashboard/performance/api/user/signature')
      const employeeSignatureData = await employeeSignatureRes.json()
      const employeeSignature = employeeSignatureData.signatureUrl

      // Fetch department signatories chain (dynamic — only people in the reporting line)
      let signatoryChain: { role: string; name: string; designation: string; signatureUrl: string | null }[] = []
      try {
        const signatoriesRes = await fetch('/dashboard/performance/api/department-signatories')
        if (signatoriesRes.ok) {
          const signatoriesData = await signatoriesRes.json()
          signatoryChain = signatoriesData.chain || []
          console.log('Department signatories chain:', signatoryChain)
        }
      } catch (error) {
        console.error('Error fetching department signatories:', error)
      }

      // Fallback: if chain is empty, try from agreement data
      if (signatoryChain.length === 0 && agreements[0]?.supervisor) {
        const sup = agreements[0].supervisor
        signatoryChain.push({
          role: 'SUPERVISOR',
          name: sup.name || '',
          designation: sup.jobTitle || sup.position || '',
          signatureUrl: sup.signatureUrl || null
        })
      }

      // Determine if this is a post-rating export (any agreement has a rating)
      const hasRatings = regularAgreements.some(a => a.rating !== null && a.rating !== undefined)
      
      // Fetch ad-hoc tasks if this is a post-rating export
      let adhocTasks: any[] = []
      // Fetch full my-rate data (all 5 components) for the total score
      let myRateData: any = null
      if (hasRatings) {
        try {
          const adhocRes = await fetch('/dashboard/performance/api/adhoc-tasks')
          if (adhocRes.ok) {
            const allAdhocTasks = await adhocRes.json()
            // Filter for tasks assigned to current user with ratings
            adhocTasks = allAdhocTasks.filter((task: any) => 
              task.assignedToId === session?.user?.id && task.rating !== null
            )
          }
        } catch (error) {
          console.error('Error fetching ad-hoc tasks:', error)
        }

        // Fetch the full performance rate breakdown (all 5 components)
        try {
          const rateRes = await fetch('/dashboard/performance/api/performance-agreements/my-rate')
          if (rateRes.ok) {
            myRateData = await rateRes.json()
          }
        } catch (error) {
          console.error('Error fetching my-rate data:', error)
        }
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
        doc.setFillColor(41, 128, 185)
        doc.rect(pageWidth / 2 - 15, 10, 30, 30, 'F')
        doc.setFontSize(12)
        doc.setTextColor(255, 255, 255)
        doc.text('NSA', pageWidth / 2, 28, { align: 'center' })
      }
      
      // Reset text color
      doc.setTextColor(0, 0, 0)
      
      // Title - Employee Name and Surname
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const employeeName = session?.user?.name || 'Employee'
      
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
      
      // Employee name prominently
      doc.text(employeeName, pageWidth / 2, 48, { align: 'center' })
      
      // Period cycle name and date range
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`${periodName}`, pageWidth / 2, 55, { align: 'center' })
      doc.setFontSize(10)
      doc.text(`${startDate} - ${endDate}`, pageWidth / 2, 61, { align: 'center' })
      
      // Calculate totals
      const totalWeight = regularAgreements.reduce((sum, a) => sum + (a.weight || 0), 0)
      
      // Use the full weighted total from all 5 components if available
      const finalRating = myRateData?.finalRating ?? 0
      const finalPercentage = myRateData?.finalPercentage ?? 0
      
      // Total Weight Allocation and Total Score
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Weight Allocation: ${totalWeight}%`, pageWidth / 2, 68, { align: 'center' })
      
      if (hasRatings && myRateData) {
        doc.text(`Overall Performance Score: ${finalRating.toFixed(2)} / 5.0  (${finalPercentage.toFixed(1)}%)`, pageWidth / 2, 74, { align: 'center' })
      }
      
      // Prepare table data - include only regular agreements + ad-hoc container
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
        
        // Build row matching columns
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
        
        return row
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
        
        tableData.push(adhocRow)
      }
      
      // Prepare table header matching screenshot format
      const tableHeader = ['Goal', 'Objective', 'Strategic Initiative', 'Actions', 'Measure', 'Targets', 'Weight', 'Approval Status', 'Deadline', 'Rating', 'Sources of Evidence']
      
      // Define column styles for landscape A4 (~297mm width, 269mm usable with 14mm margins)
      const columnStyles: any = {
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
      const tableStartY = hasRatings ? 80 : 75
      
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
          fillColor: [41, 128, 185],
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
        }
      })
      
      let finalY = (doc as any).lastAutoTable.finalY || 150
      
      // Add detailed ad-hoc tasks breakdown if this is a post-rating export
      if (hasRatings && adhocTasks.length > 0) {
        // Check if we need a new page for the ad-hoc section
        if (finalY + 40 > pageHeight - 20) {
          doc.addPage()
          finalY = 20
        } else {
          finalY += 15
        }
        
        // Ad-hoc tasks section header
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
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
      
      // ============================================
      // OVERALL PERFORMANCE SCORE SUMMARY (All 5 Components)
      // ============================================
      if (hasRatings && myRateData) {
        // Always start on a new page for the score summary
        doc.addPage()
        finalY = 20

        // Section title
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        finalY += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${session?.user?.name || 'N/A'}`, 14, finalY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, finalY, { align: 'right' })
        finalY += 10

        // Build the 5-component summary table
        const comp = myRateData.components
        const weights = myRateData.weights

        const summaryTableData = [
          [
            'Performance Agreements',
            `${weights.performanceAgreement}%`,
            `${comp.performanceAgreement.rating.toFixed(2)} / 5`,
            `${comp.performanceAgreement.weightedScore.toFixed(2)}`,
            `${comp.performanceAgreement.initiativesCount} initiative(s)`
          ],
          [
            'Ad-hoc Tasks',
            `${weights.adhoc}%`,
            `${comp.adhoc.rating.toFixed(2)} / 5`,
            `${comp.adhoc.weightedScore.toFixed(2)}`,
            `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed (${comp.adhoc.completionRate.toFixed(0)}%)`
          ],
          [
            'Projects',
            `${weights.projects}%`,
            `${comp.projects.rating.toFixed(2)} / 5`,
            `${comp.projects.weightedScore.toFixed(2)}`,
            comp.projects.tasksTotal > 0
              ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal} completed (${comp.projects.completionRate.toFixed(0)}%)`
              : 'No project tasks'
          ],
          [
            'Risk Management',
            `${weights.riskManagement}%`,
            `${comp.riskManagement.rating.toFixed(2)} / 5`,
            `${comp.riskManagement.weightedScore.toFixed(2)}`,
            comp.riskManagement.tasksTotal > 0
              ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal} completed (${comp.riskManagement.completionRate.toFixed(0)}%)`
              : 'No risk tasks'
          ],
          [
            '360-Degree Rating',
            `${weights.rating360}%`,
            `${comp.rating360.rating.toFixed(2)} / 5`,
            `${comp.rating360.weightedScore.toFixed(2)}`,
            comp.rating360.hasCompleted ? 'Completed' : 'Not completed'
          ],
        ]

        // Add total row
        summaryTableData.push([
          'OVERALL TOTAL',
          '100%',
          `${myRateData.finalRating.toFixed(2)} / 5`,
          `${myRateData.finalRating.toFixed(2)}`,
          `${myRateData.finalPercentage.toFixed(1)}%`
        ])

        autoTable(doc, {
          startY: finalY,
          head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']],
          body: summaryTableData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'center',
            cellPadding: 3
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle'
          },
          columnStyles: {
            0: { cellWidth: 55, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 35, halign: 'center' },
            4: { cellWidth: 80 }
          },
          margin: { left: 14, right: 14 },
          didParseCell: function(data: any) {
            // Style the total row
            if (data.row.index === summaryTableData.length - 1) {
              data.cell.styles.fillColor = [41, 128, 185]
              data.cell.styles.textColor = [255, 255, 255]
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fontSize = 10
            }
          }
        })

        finalY = (doc as any).lastAutoTable.finalY || finalY + 60

        // Performance level badge text
        finalY += 8
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        const perfLevel = myRateData.finalRating >= 4.5 ? 'Outstanding' :
          myRateData.finalRating >= 4.0 ? 'Excellent' :
          myRateData.finalRating >= 3.5 ? 'Very Good' :
          myRateData.finalRating >= 3.0 ? 'Good' :
          myRateData.finalRating >= 2.5 ? 'Satisfactory' : 'Needs Improvement'
        
        doc.setTextColor(41, 128, 185)
        doc.text(`Performance Level: ${perfLevel}`, pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)

        // Rating scale legend
        finalY += 12
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, finalY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }
      
      // Build dynamic signature cards from chain
      const allApprovedForPDF = regularAgreements.length > 0 && regularAgreements.every(a => a.approvalStatus === 'APPROVED')
      const today = new Date().toLocaleDateString('en-ZA')
      
      // Employee is always first
      const signatureCards: { title: string; name: string; designation: string; signatureUrl: string | null; date: string | null }[] = [
        {
          title: 'EMPLOYEE',
          name: session?.user?.name || '',
          designation: (session?.user as any)?.jobTitle || '',
          signatureUrl: employeeSignature || null,
          date: today
        }
      ]
      
      // Add each person from the reporting chain (supervisor, optional manager, executive)
      for (const entry of signatoryChain) {
        // For SG/DSG, use their actual job title instead of role abbreviation
        const title = (entry.role === 'SG' || entry.role === 'DSG') 
          ? entry.designation.toUpperCase() 
          : entry.role
        
        signatureCards.push({
          title: title,
          name: entry.name,
          designation: entry.designation,
          signatureUrl: entry.signatureUrl || null,
          date: allApprovedForPDF ? today : null
        })
      }
      
      // Always add signature section on a new page for clean layout
      doc.addPage()
      await addSignatureSection(doc, 30, signatureCards)
      
      // Save PDF
      const ratingStatus = hasRatings ? 'Rated' : 'Unrated'
      const fileName = `Performance_Agreement_${ratingStatus}_${session?.user?.name?.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`
      doc.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({ title: 'Failed to generate PDF. Please try again.', variant: 'destructive' })
    } finally {
      setExportingPDF(false)
    }
  }
  
  const addSignatureSection = async (
    doc: jsPDF, 
    startY: number, 
    cards: { title: string; name: string; designation: string; signatureUrl: string | null; date: string | null }[]
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth()
    const cardCount = cards.length
    const gap = 4
    // Use fixed width for neat appearance, especially for executives with only 2 signatures
    const boxWidth = 70  // Fixed width per signature box (70mm)
    const boxHeight = 60
    const totalWidth = (boxWidth * cardCount) + ((cardCount - 1) * gap)
    const startX = (pageWidth - totalWidth) / 2  // Center the signature boxes
    const boxY = startY
    
    for (let i = 0; i < cardCount; i++) {
      const box = cards[i]
      const boxX = startX + (i * (boxWidth + gap))
      
      // Draw box border
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.rect(boxX, boxY, boxWidth, boxHeight)
      
      // Title header with background
      doc.setFillColor(41, 128, 185)
      doc.rect(boxX, boxY, boxWidth, 8, 'F')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(box.title, boxX + boxWidth / 2, boxY + 5.5, { align: 'center' })
      
      // Reset text color
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
      
      // Full Name
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Full Name:', boxX + 3, boxY + 14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.name || '_________________', boxX + 3, boxY + 19)
      
      // Designation
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Designation:', boxX + 3, boxY + 26)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.designation || '_________________', boxX + 3, boxY + 31)
      
      // Date
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Date:', boxX + 3, boxY + 38)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(box.date || '_________________', boxX + 3, boxY + 43)
      
      // Signature: render actual image if available, otherwise draw a line
      if (box.signatureUrl) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = box.signatureUrl
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            setTimeout(reject, 4000)
          })
          const sigWidth = Math.min(boxWidth - 10, 45)
          const sigHeight = 12
          const sigX = boxX + (boxWidth - sigWidth) / 2
          doc.addImage(img, 'PNG', sigX, boxY + 45, sigWidth, sigHeight)
        } catch {
          // Fallback: draw signature line
          doc.setLineWidth(0.3)
          doc.line(boxX + 3, boxY + 52, boxX + boxWidth - 3, boxY + 52)
        }
      } else {
        doc.setLineWidth(0.3)
        doc.line(boxX + 3, boxY + 52, boxX + boxWidth - 3, boxY + 52)
      }
      
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(41, 128, 185)
      doc.text('Signature', boxX + boxWidth / 2, boxY + 59, { align: 'center' })
    }
    
    doc.setTextColor(0, 0, 0)
  }

  const exportSubordinateAgreement = async (userId: string, userName: string) => {
    try {
      // Fetch subordinate's performance agreement data
      const response = await fetch(`/dashboard/performance/api/performance-agreements/export/${userId}`)
      if (!response.ok) {
        toast({ title: 'Failed to fetch subordinate agreement', variant: 'destructive' })
        return
      }

      const { agreements: subAgreements, user, adhocTasks, hasRatings, signatoryChain: subSignatoryChain, scoreSummary } = await response.json()

      // Generate PDF similar to exportToPDF but with subordinate's data
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('PERFORMANCE AGREEMENT', pageWidth / 2, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Employee: ${user.name}`, 14, 35)
      doc.text(`Position: ${user.position || 'N/A'}`, 14, 42)
      doc.text(`Period: ${activePeriod?.name || 'N/A'}`, 14, 49)

      if (hasRatings) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('POST-RATING AGREEMENT', pageWidth / 2, 60, { align: 'center' })
      }

      // Prepare table data
      const regularSubAgreements = subAgreements.filter((a: any) => !a.isAdhocContainer)
      const adhocContainerSub = subAgreements.find((a: any) => a.isAdhocContainer)

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
          fillColor: [41, 128, 185],
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
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY || 150

      // Build dynamic signature cards for subordinate
      const subAllApproved = regularSubAgreements.length > 0 && regularSubAgreements.every((a: any) => a.approvalStatus === 'APPROVED')
      const subToday = new Date().toLocaleDateString('en-ZA')
      const subSignatureCards: { title: string; name: string; designation: string; signatureUrl: string | null; date: string | null }[] = [
        {
          title: 'EMPLOYEE',
          name: user.name || '',
          designation: user.jobTitle || '',
          signatureUrl: user.signatureUrl || null,
          date: subToday
        }
      ]
      for (const entry of (subSignatoryChain || [])) {
        subSignatureCards.push({
          title: entry.role,
          name: entry.name,
          designation: entry.designation,
          signatureUrl: entry.signatureUrl || null,
          date: subAllApproved ? subToday : null
        })
      }

      // Add score summary if available
      if (hasRatings && scoreSummary) {
        doc.addPage()
        let scoreY = 20
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text('OVERALL PERFORMANCE SCORE SUMMARY', pageWidth / 2, scoreY, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        scoreY += 10
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Employee: ${user.name || 'N/A'}`, 14, scoreY)
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 14, scoreY, { align: 'right' })
        scoreY += 10

        const comp = scoreSummary.components
        const wts = scoreSummary.weights
        const summaryRows = [
          ['Performance Agreements', `${wts.performanceAgreement}%`, `${comp.performanceAgreement.rating.toFixed(2)} / 5`, `${comp.performanceAgreement.weightedScore.toFixed(2)}`, `${comp.performanceAgreement.initiativesCount} initiative(s)`],
          ['Ad-hoc Tasks', `${wts.adhoc}%`, `${comp.adhoc.rating.toFixed(2)} / 5`, `${comp.adhoc.weightedScore.toFixed(2)}`, `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed (${comp.adhoc.completionRate.toFixed(0)}%)`],
          ['Projects', `${wts.projects}%`, `${comp.projects.rating.toFixed(2)} / 5`, `${comp.projects.weightedScore.toFixed(2)}`, comp.projects.tasksTotal > 0 ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal}` : 'No project tasks'],
          ['Risk Management', `${wts.riskManagement}%`, `${comp.riskManagement.rating.toFixed(2)} / 5`, `${comp.riskManagement.weightedScore.toFixed(2)}`, comp.riskManagement.tasksTotal > 0 ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal}` : 'No risk tasks'],
          ['360-Degree Rating', `${wts.rating360}%`, `${comp.rating360.rating.toFixed(2)} / 5`, `${comp.rating360.weightedScore.toFixed(2)}`, comp.rating360.hasCompleted ? 'Completed' : 'Not completed'],
          ['OVERALL TOTAL', '100%', `${scoreSummary.finalRating.toFixed(2)} / 5`, `${scoreSummary.finalRating.toFixed(2)}`, `${scoreSummary.finalPercentage.toFixed(1)}%`]
        ]

        autoTable(doc, {
          startY: scoreY,
          head: [['Component', 'Weight', 'Rating', 'Weighted Score', 'Details']],
          body: summaryRows,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 3 },
          bodyStyles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 35, halign: 'center' }, 4: { cellWidth: 80 } },
          margin: { left: 14, right: 14 },
          didParseCell: function(data: any) {
            if (data.row.index === summaryRows.length - 1) {
              data.cell.styles.fillColor = [41, 128, 185]
              data.cell.styles.textColor = [255, 255, 255]
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fontSize = 10
            }
          }
        })

        const scoreFinalY = (doc as any).lastAutoTable.finalY || scoreY + 60
        const perfLevel = scoreSummary.finalRating >= 4.5 ? 'Outstanding' : scoreSummary.finalRating >= 4.0 ? 'Excellent' : scoreSummary.finalRating >= 3.5 ? 'Very Good' : scoreSummary.finalRating >= 3.0 ? 'Good' : scoreSummary.finalRating >= 2.5 ? 'Satisfactory' : 'Needs Improvement'
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(41, 128, 185)
        doc.text(`Performance Level: ${perfLevel}`, pageWidth / 2, scoreFinalY + 8, { align: 'center' })
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text('Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding', pageWidth / 2, scoreFinalY + 18, { align: 'center' })
        doc.setTextColor(0, 0, 0)
      }

      // Add signature section on new page
      doc.addPage()
      await addSignatureSection(doc, 30, subSignatureCards)

      // Save PDF
      const fileName = `Performance_Agreement_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error exporting subordinate agreement:', error)
      toast({ title: 'Failed to export agreement', variant: 'destructive' })
    }
  }

  useEffect(() => {
    const fetchPeriodAndAgreements = async () => {
      try {
        // First check if there's an active performance period
        const periodResponse = await fetch('/dashboard/performance/api/performance-period')
        if (periodResponse.ok) {
          const period = await periodResponse.json()
          setActivePeriod(period)
        }
        setPeriodLoading(false)
        
        // Then fetch agreements
        if (session?.user?.id) {
          fetchAgreements()
        }
      } catch (error) {
        console.error('Error fetching period:', error)
        setPeriodLoading(false)
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchPeriodAndAgreements()
    }
  }, [session])

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
  }, [agreements, regularAgreements, selectedInitiativeId])

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
  }, [agreements, regularAgreements])

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
  }, [searchParams, agreements])

  const fetchAgreements = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements')
      const data = await response.json()
      
      // Check if response is an error
      if (!response.ok || !Array.isArray(data)) {
        console.error('❌ API Error:', data)
        if (data.error) {
          console.error('Error details:', data.details)
        }
        setAgreements([])
        return
      }
      
      console.log('📊 Fetched Agreements:', data)
      console.log('📊 Total count:', data?.length)
      console.log('📊 Regular agreements:', data?.filter((a: any) => !a.isAdhocContainer)?.length)
      console.log('📊 Containers:', data?.filter((a: any) => a.isAdhocContainer)?.length)
      
      // Log approval status breakdown
      const regularData = data?.filter((a: any) => !a.isAdhocContainer)
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
      
      setAgreements(data)
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
    
    // If updating weight, validate that total doesn't exceed 90%
    if (field === 'weight') {
      const numericValue = typeof value === 'number' ? value : parseInt(value) || 0
      
      // Calculate what the total would be with this new weight
      const otherAgreementsWeight = agreements
        .filter(a => !a.isAdhocContainer && a.id !== agreementId)
        .reduce((sum, a) => sum + (a.weight || 0), 0)
      
      const proposedTotal = otherAgreementsWeight + numericValue
      
      // If it would exceed 90%, cap it at the maximum allowed
      if (proposedTotal > 90) {
        const maxAllowed = 90 - otherAgreementsWeight
        value = Math.max(0, maxAllowed) // Ensure it's not negative
        
        // Show brief notification
        const message = maxAllowed > 0 
          ? `Weight capped at ${maxAllowed}% (Total cannot exceed 90%)`
          : 'Cannot add more weight - total is already at 90%'
        
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
          toast({ title: `$1`, variant: "destructive" })
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
        toast({ title: 'Failed to save changes. Please try again.', variant: 'destructive' })
        setSavingStatus(null)
      }
    }, 500) // Wait 500ms after last keystroke
  }

  const calculateTotalWeight = () => {
    return agreements
      .filter(a => !a.isAdhocContainer) // Exclude ad-hoc container
      .reduce((sum, agreement) => sum + (agreement.weight || 0), 0)
  }

  const handleSubmitAllForApproval = async () => {
    // Only validate and submit initiatives that are not yet approved or pending
    // Exclude ad-hoc container from submission
    const itemsToSubmit = agreements.filter(a => 
      !a.isAdhocContainer && (!a.approvalStatus || a.approvalStatus === 'REJECTED')
    )

    if (itemsToSubmit.length === 0) {
      toast({ title: 'All initiatives are already submitted or approved.', variant: 'destructive' })
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

    const totalWeight = calculateTotalWeight()
    if (totalWeight !== 90) {
      toast({ title: `$1`, variant: "destructive" })
      return
    }

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
        toast({ title: `$1`, variant: "destructive" })
        // Refresh data
        fetchAgreements()
      } else {
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (error) {
      console.error('Error submitting:', error)
      toast({ title: 'Failed to submit for approval', variant: 'destructive' })
    }
  }

  const handleUpdate = async () => {
    if (!selectedAgreement) return
    
    // Validation for completion
    if (updateData.status === 'COMPLETED') {
      if (!updateData.evidenceUrl || updateData.rating === 0) {
        toast({ title: 'Evidence and rating are required for completion', variant: 'destructive' })
        return
      }
      
      // Additional evidence required for 4-5 star ratings
      if (updateData.rating >= 4 && (!updateData.evidenceNotes || updateData.evidenceNotes.trim().length < 20)) {
        toast({ title: 'Additional evidence notes (at least 20 characters) are required for ratings of 4 stars or higher', variant: 'destructive' })
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
        toast({ title: 'Updated successfully!' })
        setUpdateDialogOpen(false)
        fetchAgreements()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Get unique goals sorted in ascending order by goal number
  const uniqueGoals = Array.from(
    new Set(
      regularAgreements
        .map(a => a.initiative?.objective?.goal)
        .filter((g): g is NonNullable<typeof g> => g !== null && g !== undefined)
        .map(g => JSON.stringify({ number: g.goalNumber, title: g.title }))
    )
  )
    .map(g => JSON.parse(g))
    .sort((a, b) => {
      // Extract numeric part from goal number (e.g., "1" from "1", "1.1" from "1.1")
      const numA = parseFloat(a.number) || 0
      const numB = parseFloat(b.number) || 0
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

  if (loading || periodLoading) return <div className="p-8">Loading...</div>

  // Check if performance period is set by Human Capital
  if (!activePeriod) {
    return (
      <div className="p-8">
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

  // Check if submission deadline has passed
  const submissionDeadline = new Date(activePeriod.submissionDeadline)
  const today = new Date()
  // Set time to start of day for fair comparison
  today.setHours(0, 0, 0, 0)
  submissionDeadline.setHours(23, 59, 59, 999)
  
  const isSubmissionOpen = today <= submissionDeadline
  const daysUntilDeadline = Math.ceil((submissionDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (!isSubmissionOpen) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Performance Agreement Submission Closed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-800">
              <strong>Submission Deadline:</strong> {new Date(activePeriod.submissionDeadline).toLocaleDateString()}
            </p>
            <p className="text-red-800 font-medium mt-4">
              The performance agreement submission period has ended. The deadline was {new Date(activePeriod.submissionDeadline).toLocaleDateString()}.
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

  // Check if all rejected items are ready for resubmission
  const rejectedItems = regularAgreements.filter(a => a.approvalStatus === 'REJECTED')
  const allRejectedItemsReady = rejectedItems.length > 0 && rejectedItems.every(item => 
    item.customAction && 
    item.customAction.length >= 10 && 
    item.weight && 
    item.weight > 0
  )

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
      <div className="p-8 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight" style={{ color: colors.textDark }}>My Performance Agreement</h1>
        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Strategic initiatives assigned to you</p>
      </div>

      {/* Performance Period Info Banner with Gradient Ambient Effect */}
      <div 
        className="relative overflow-hidden rounded-md"
        style={{ 
          background: 'linear-gradient(135deg, #0a1628 0%, #111d3a 40%, #162044 70%, #1a2550 100%)',
          boxShadow: '0 4px 24px rgba(10, 22, 40, 0.3), 0 0 60px rgba(212, 168, 67, 0.08)'
        }}
      >
        {/* Gold glow ambient effect - positioned at top-right */}
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 opacity-40"
          style={{ 
            background: 'radial-gradient(ellipse, rgba(212,168,67,0.6) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        {/* Additional subtle gold glow at bottom-left */}
        <div 
          className="absolute -bottom-16 -left-16 w-64 h-64 opacity-20"
          style={{ 
            background: 'radial-gradient(circle, rgba(212,168,67,0.5) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }}
        />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(212, 168, 67, 0.2)' }}>
                <Calendar className="w-7 h-7" style={{ color: '#d4a843' }} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white">{activePeriod.name}</h3>
                <p className="text-sm mt-1 text-slate-400">
                  Period: {new Date(activePeriod.startDate).toLocaleDateString()} - {new Date(activePeriod.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Submission Deadline</p>
              <p className="font-bold text-lg mt-1" style={{ color: '#d4a843' }}>{new Date(activePeriod.submissionDeadline).toLocaleDateString()}</p>
              {daysUntilDeadline > 0 && (
                <p className={`text-xs font-semibold mt-1 px-2 py-1 rounded inline-block ${
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
          allApproved 
            ? 'bg-green-50 border-green-500' 
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allApproved ? (
                <>
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h2 className="text-green-900 font-bold text-lg">Agreement Complete ✓</h2>
                    <p className="text-green-700 text-sm">All {regularAgreements.length} initiatives have been approved by your supervisor. You can now track and update progress.</p>
                    <p className="text-green-600 text-xs mt-1 italic">Export includes your signature and your supervisor's signature</p>
                  </div>
                  <Button 
                    onClick={exportToPDF}
                    disabled={exportingPDF}
                    variant="gold"
                  >
                    {exportingPDF ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Approved Performance Agreement
                      </>
                    )}
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
                    onClick={exportToPDF}
                    disabled={exportingPDF || regularAgreements.length === 0}
                    variant="outline"
                    className="font-semibold transition-all hover:shadow-md border-[#d4a843] text-[#d4a843]"
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
            <div className="flex flex-col items-end gap-1">
              <div className="text-2xl font-bold text-gray-900">
                {approvedCount}/{regularAgreements.length}
              </div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
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
                variant="destructive"
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
          {/* Show Submit button if there are items not yet submitted */}
          {notSubmittedCount > 0 && (
            <>
              <Badge variant="outline" className={`text-base px-3 py-1 ${
                calculateTotalWeight() === 60 ? 'border-green-500 text-green-700 bg-green-50' :
                'border-red-500 text-red-700 bg-red-50'
              }`}>
                Total Weight: {calculateTotalWeight()}%  
                {calculateTotalWeight() === 60 ? ' ✓' : ' (Must = 60%)'}
              </Badge>
              <Button 
                onClick={handleSubmitAllForApproval}
                variant="gold"
                className="shadow-lg"
                style={{ 
                  boxShadow: '0 4px 14px rgba(212, 168, 67, 0.3), 0 0 20px rgba(212, 168, 67, 0.15)'
                }}
              >
                Submit for Approval
              </Button>
            </>
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
                      <span className="font-bold text-blue-900 text-left wrap-break-word flex-1">
                        Goal {goal.number}: {goal.title}
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
                                <span className="font-semibold text-green-900 text-left wrap-break-word flex-1">
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
                                  
                                  const isIncomplete = incompleteAgreements.includes(agreement.id)
                                  
                                  return (
                                    <div 
                                      key={agreement.id} 
                                      id={`initiative-${agreement.id}`}
                                      ref={(el) => { itemRefs.current[agreement.id] = el }}
                                      className={`border-b last:border-b-0 transition-all duration-300 ${
                                        highlightedId === agreement.id ? 'border-l-8 border-blue-600 bg-blue-50 shadow-lg ring-2 ring-blue-300' :
                                        isIncomplete ? 'border-l-8 border-red-600 bg-red-50 shadow-lg' :
                                        isRejected ? 'border-l-4 border-red-500' : ''
                                      }`}
                                    >
                                      {isIncomplete && (
                                        <div className="bg-red-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4" />
                                          INCOMPLETE - Please fill in action (min 10 chars) and weight
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
                                            'text-purple-900'
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
                                                agreement.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                agreement.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                agreement.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                              }>
                                                {agreement.approvalStatus === 'PENDING' ? '⏳ Awaiting Supervisor Approval' :
                                                 agreement.approvalStatus === 'APPROVED' ? '✓ Approved by Supervisor' :
                                                 agreement.approvalStatus === 'REJECTED' ? '✗ Rejected - Needs Revision' :
                                                 'Not Submitted'}
                                              </Badge>
                                              
                                              {/* Show rejection comment if rejected */}
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

                                          {/* Action and Weight - Always Editable when not approved */}
                                          <div className="border-l-4 border-purple-400 pl-3 py-2 bg-purple-50 rounded">
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="text-xs font-semibold text-purple-700">YOUR ACTION & WEIGHT:</div>
                                              {savingStatus === agreement.id && (
                                                <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                                              )}
                                            </div>
                                            
                                            {/* Allow editing if not submitted, or if rejected */}
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
                                                        return Math.max(0, 60 - otherWeight)
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
                                                      return Math.max(0, 60 - otherWeight)
                                                    })()}
                                                    className="mt-1 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                  />
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
            <div className="text-sm">
              <Badge variant="outline" className={`text-base px-3 py-1 ${
                calculateTotalWeight() === 60 ? 'border-green-500 text-green-700 bg-green-50' :
                'border-red-500 text-red-700 bg-red-50'
              }`}>
                Total Weight: {calculateTotalWeight()}% {calculateTotalWeight() === 60 ? ' ✓' : ' (Must = 60%)'}
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
                toast({ title: 'Copied to clipboard!', variant: 'destructive' })
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
    </div>
    </>
  )
}
