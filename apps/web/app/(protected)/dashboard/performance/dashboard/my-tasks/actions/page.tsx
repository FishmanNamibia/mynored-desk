'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ClipboardCheck, Calendar, TrendingUp, AlertCircle, Upload, Eye, Target, Award, CheckCircle2, Clock, Link, Plus, Trash2, FileCheck, X, XCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { EvidencePreviewModal, parseEvidenceUrls } from '@/components/performance/components/dashboard/evidence-preview-modal'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface ActionsPageProps {
  filter?: 'all' | 'rejected' | 'altered' | 'accepted'
  onFilterChange?: (filter: 'all' | 'rejected' | 'altered' | 'accepted') => void
}

interface MyTasksStats {
  rejected: {
    count: number
    details: Array<{
      id: string
      title: string
      comment: string
      supervisor: string
      supervisorTitle: string
      date: string
    }>
  }
  altered: {
    count: number
    details: Array<{
      id: string
      title: string
      comment: string
      supervisor: string
      supervisorTitle: string
      date: string
      rating: number
    }>
  }
  accepted: {
    count: number
    details: Array<{
      id: string
      title: string
      rating: number
      date: string
    }>
  }
}

interface Initiative {
  id: string
  title: string
  number: string
  description?: string
  measure?: string
  action?: string
  target?: string
  reportingPeriods?: string
  quarterDates?: string
  status: string
  approvalStatus?: string
  percentComplete: number
  progressNotes?: string
  evidenceUrl?: string
  evidenceNotes?: string
  rating?: number
  weight?: number
  isPrimaryResponsible: boolean
  isSecondaryResponsible: boolean
  primaryResponsibleId?: string
  secondaryResponsibleId?: string
  objective: {
    id: string
    title: string
    goal: {
      id: string
      title: string
      goalNumber: string
      dueDate?: string
    }
  }
  tasks: any[]
  dueDate?: string
  createdAt: string
  updatedAt: string
}

// Half-star rating component (0.5 increments, 1–5 scale)
function HalfStarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number>(0)
  const display = hover || value
  const labels: Record<number, string> = {
    0.5: '0.5 – Unsatisfactory', 1: '1 – Not done well', 1.5: '1.5 – Poor',
    2: '2 – Below expectations', 2.5: '2.5 – Approaching', 3: '3 – Met expectations',
    3.5: '3.5 – Good', 4: '4 – Above expectations', 4.5: '4.5 – Excellent', 5: '5 – Exceptional',
  }
  return (
    <div className="space-y-1 mt-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="relative w-9 h-9 cursor-pointer">
            {/* Left half */}
            <button
              type="button"
              className="absolute left-0 top-0 w-1/2 h-full z-10"
              onMouseEnter={() => setHover(star - 0.5)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(star - 0.5)}
              aria-label={`${star - 0.5} stars`}
            />
            {/* Right half */}
            <button
              type="button"
              className="absolute right-0 top-0 w-1/2 h-full z-10"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(star)}
              aria-label={`${star} stars`}
            />
            {/* Star visual */}
            <span className="text-3xl select-none pointer-events-none" aria-hidden>
              {display >= star
                ? <span className="text-yellow-400">★</span>
                : display >= star - 0.5
                  ? <span style={{ background: 'linear-gradient(to right, #facc15 50%, #d1d5db 50%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>★</span>
                  : <span className="text-gray-300">★</span>}
            </span>
          </div>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">
          {display > 0 ? `${display}/5 — ${labels[display] || ''}` : 'Select a rating'}
        </span>
      </div>
    </div>
  )
}

export default function ActionsPage({ filter = 'all', onFilterChange }: ActionsPageProps) {
  const { data: session } = useSession()
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [myTasksStats, setMyTasksStats] = useState<MyTasksStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null)
  const [updateData, setUpdateData] = useState({
    status: 'NOT_STARTED',
    percentComplete: 0,
    progressNotes: '',
    evidenceUrl: '',
    evidenceNotes: '',
    rating: 0
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<Initiative | null>(null)
  const [evidenceType, setEvidenceType] = useState<'file' | 'link'>('file')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewEvidence, setPreviewEvidence] = useState<{ url: string | null; notes?: string | null }>({ url: null })
  const [allApproved, setAllApproved] = useState(false)
  const [approvalStats, setApprovalStats] = useState({ total: 0, approved: 0 })
  const [updating, setUpdating] = useState<boolean>(false)
  const [alteredRatingDialogOpen, setAlteredRatingDialogOpen] = useState(false)
  const [selectedAlteredRating, setSelectedAlteredRating] = useState<Initiative | null>(null)
  const [responseComment, setResponseComment] = useState('')

  useEffect(() => {
    fetchInitiatives()
    fetchMyTasksStats()
  }, [])

  const fetchMyTasksStats = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/my-tasks/stats', {
        credentials: 'include'
      })
      if (response.ok) {
        const statsData = await response.json()
        setMyTasksStats(statsData)
        
        // Check if there are any altered ratings that need response
        const alteredRatings = statsData.altered?.details || []
        if (alteredRatings.length > 0) {
          // Find the first altered rating that hasn't been responded to
          const needsResponse = alteredRatings.find((detail: any) => {
            const initiative = initiatives.find(i => i.id === detail.id)
            return initiative && !initiative.progressNotes?.includes('Rating Accepted') && !initiative.progressNotes?.includes('Rating Rejected')
          })
          
          if (needsResponse) {
            const initiative = initiatives.find(i => i.id === needsResponse.id)
            if (initiative) {
              setSelectedAlteredRating(initiative)
              setAlteredRatingDialogOpen(true)
            }
          }
        }
      }
    } catch (error) {
      console.warn('[ACTIONS] Failed to fetch my-tasks stats:', error)
    }
  }

  const handleAlteredRatingResponse = async (action: 'accept' | 'reject') => {
    if (!selectedAlteredRating) return
    
    setUpdating(true)
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/respond-altered-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          agreementId: selectedAlteredRating.id,
          action,
          comment: responseComment.trim()
        })
      })

      if (response.ok) {
        toast({
          title: action === 'accept' ? 'Rating Accepted' : 'Rating Rejected',
          description: action === 'accept' 
            ? 'The rating has been accepted and finalized.' 
            : 'The rating has been rejected. The process will restart.',
        })
        
        setAlteredRatingDialogOpen(false)
        setSelectedAlteredRating(null)
        setResponseComment('')
        fetchInitiatives()
        fetchMyTasksStats()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to process response',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error responding to altered rating:', error)
      toast({
        title: 'Error',
        description: 'Failed to process response',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const fetchInitiatives = async () => {
    try {
      console.log('[ACTIONS PAGE] Fetching initiatives for user:', session?.user?.id, session?.user?.email)

      const response = await fetch('/dashboard/performance/api/performance-agreements')
      console.log('[ACTIONS PAGE] API response status:', response.status)

      if (response.ok) {
        const responseData = await response.json()
        // API returns { agreements: [...], adhocContainer, weights }
        const data = responseData.agreements || responseData
        console.log('[ACTIONS PAGE] Raw API response:', data.length, 'items')
        console.log('[ACTIONS PAGE] Sample items:', data.slice(0, 2).map((item: any) => ({
          id: item.id,
          title: item.title,
          userId: item.userId,
          approvalStatus: item.approvalStatus
        })))

        // Filter to exclude containers only - show all agreements with their approval status
        const filteredData = data.filter((a: any) => !a.isAdhocContainer)
        console.log('[ACTIONS PAGE] Filtered agreements (excluding containers):', filteredData.length)
        console.log('[ACTIONS PAGE] Approval statuses:', filteredData.map((a: any) => ({ title: a.title?.substring(0,30), status: a.approvalStatus })))

        // Check if ALL agreements have been approved by supervisor
        const approvedCount = filteredData.filter((a: any) => a.approvalStatus === 'APPROVED').length
        const totalCount = filteredData.length
        const everyApproved = totalCount > 0 && approvedCount === totalCount
        setAllApproved(everyApproved)
        setApprovalStats({ total: totalCount, approved: approvedCount })
        console.log('[ACTIONS PAGE] Approval check:', { approvedCount, totalCount, everyApproved })

        // Always populate initiatives regardless of approval status so all users see their data
        const agreements = filteredData.map((agreement: any) => ({
          id: agreement.id,
          title: agreement.title,
          number: agreement.initiative?.number || '',
          description: agreement.description,
          measure: agreement.kpi,
          action: agreement.customAction,
          target: agreement.target,
          reportingPeriods: '',
          quarterDates: '',
          status: agreement.status || 'NOT_STARTED',
          approvalStatus: agreement.approvalStatus || 'PENDING',
          percentComplete: agreement.percentComplete || 0,
          progressNotes: agreement.progressNotes || '',
          evidenceUrl: agreement.evidenceUrl,
          evidenceNotes: agreement.evidenceNotes,
          rating: agreement.rating,
          weight: agreement.weight,
          isPrimaryResponsible: true,
          isSecondaryResponsible: false,
          primaryResponsibleId: agreement.userId,
          secondaryResponsibleId: null,
          dueDate: agreement.dueDate,
          objective: agreement.initiative?.objective || { id: '', title: '', goal: { id: '', title: '', goalNumber: '' } },
          tasks: [],
          createdAt: agreement.createdAt,
          updatedAt: agreement.updatedAt
        }))
        console.log('[ACTIONS PAGE] Loaded performance agreements:', agreements.length, 'user-specific items')
        setInitiatives(agreements)
      } else {
        console.error('[ACTIONS PAGE] API call failed:', response.status)
      }
    } catch (error) {
      console.error('[ACTIONS PAGE] Error fetching performance agreements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500 text-white'
      case 'IN_PROGRESS':
        return 'bg-amber-500 text-white'
      default:
        return 'bg-red-500 text-white'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'Not Started'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'COMPLETED':
        return 'Completed'
      default:
        return status
    }
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
  }

  const getApprovalStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'Approved'
      case 'REJECTED':
        return 'Rejected'
      case 'PENDING':
      default:
        return 'Pending Approval'
    }
  }

  const openDetailDialog = (initiative: Initiative) => {
    setSelectedDetail(initiative)
    setDetailDialogOpen(true)
  }

  const getQuarterMonths = (q: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    if (q === 'Q1') return [4,5,6]
    if (q === 'Q2') return [7,8,9]
    if (q === 'Q3') return [10,11,12]
    return [1,2,3]
  }

  // Apply the filter from My Tasks page first
  const filteredByType = filter === 'all' 
    ? initiatives 
    : filter === 'rejected'
    ? initiatives.filter(i => {
        // Already corrected: employee re-rated (rating > 0) and not sitting at REJECTED again
        if (i.rating && i.rating > 0 && i.approvalStatus !== 'REJECTED') return false
        // Check for supervisor rejection feedback in progress notes OR explicit rejection status
        if (i.progressNotes && i.progressNotes.includes('--- Supervisor Feedback')) {
          return true
        }
        return i.approvalStatus === 'REJECTED'
      })
    : filter === 'altered'
    ? initiatives.filter(i => {
        if (!i.progressNotes) return false
        // Look for supervisor rating adjustments that haven't been accepted/rejected yet
        const hasAlteration = i.progressNotes.includes('adjusted your rating') || 
                             i.progressNotes.includes('altered') || 
                             i.progressNotes.includes('changed your rating')
        if (!hasAlteration) return false
        // Exclude those that have already been accepted or rejected by the employee
        const hasEmployeeResponse = i.progressNotes.includes('--- Rating Accepted') || 
                                  i.progressNotes.includes('--- Rating Rejected')
        if (hasEmployeeResponse) return false
        // Also exclude if employee has already re-rated after the alteration
        if (i.rating && i.rating > 0 && i.approvalStatus !== 'REJECTED') return false
        return true
      })
    : filter === 'accepted'
    ? initiatives.filter(i => {
        // Check for explicit rating acceptance OR approved status with rating
        if (i.progressNotes && i.progressNotes.includes('--- Rating Accepted')) {
          return true
        }
        return i.approvalStatus === 'APPROVED' && (i.rating || 0) > 0
      })
    : initiatives

  const filteredInitiatives = statusFilter === 'ALL'
    ? filteredByType
    : statusFilter === 'OVERDUE'
    ? filteredByType.filter(i => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return i.status !== 'COMPLETED' && new Date(i.objective?.goal?.dueDate || '') < today
      })
    : ['Q1','Q2','Q3','Q4'].includes(statusFilter)
    ? filteredByType.filter(i => {
        const d = i.dueDate || i.objective?.goal?.dueDate
        if (!d) return false
        const m = new Date(d).getMonth() + 1
        return getQuarterMonths(statusFilter as 'Q1'|'Q2'|'Q3'|'Q4').includes(m)
      })
    : filteredByType.filter(i => i.status === statusFilter)

  const stats = {
    total: initiatives.length,
    notStarted: initiatives.filter(i => i.status === 'NOT_STARTED').length,
    inProgress: initiatives.filter(i => i.status === 'IN_PROGRESS').length,
    completed: initiatives.filter(i => i.status === 'COMPLETED').length,
    overdue: initiatives.filter(i => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return i.status !== 'COMPLETED' && new Date(i.objective?.goal?.dueDate || '') < today
    }).length,
    q1: initiatives.filter(i => { const d = i.dueDate || i.objective?.goal?.dueDate; if (!d) return false; const m = new Date(d).getMonth()+1; return [4,5,6].includes(m) }).length,
    q2: initiatives.filter(i => { const d = i.dueDate || i.objective?.goal?.dueDate; if (!d) return false; const m = new Date(d).getMonth()+1; return [7,8,9].includes(m) }).length,
    q3: initiatives.filter(i => { const d = i.dueDate || i.objective?.goal?.dueDate; if (!d) return false; const m = new Date(d).getMonth()+1; return [10,11,12].includes(m) }).length,
    q4: initiatives.filter(i => { const d = i.dueDate || i.objective?.goal?.dueDate; if (!d) return false; const m = new Date(d).getMonth()+1; return [1,2,3].includes(m) }).length,
  }

  const openEditDialog = (initiative: Initiative) => {
    setSelectedInitiative(initiative)
    setUpdateData({
      status: initiative.status,
      percentComplete: initiative.percentComplete,
      progressNotes: initiative.progressNotes || '',
      evidenceUrl: initiative.evidenceUrl || '',
      evidenceNotes: initiative.evidenceNotes || '',
      rating: initiative.rating || 0
    })
    // Pre-populate uploaded file URLs from existing evidence
    if (initiative.evidenceUrl) {
      const existingUrls = parseEvidenceUrls(initiative.evidenceUrl)
      const isLink = initiative.evidenceUrl.startsWith('http://') || initiative.evidenceUrl.startsWith('https://')
      if (!isLink) {
        setUploadedFileUrls(existingUrls)
        setEvidenceType('file')
      } else {
        setUploadedFileUrls([])
        setEvidenceType('link')
      }
    } else {
      setUploadedFileUrls([])
      setEvidenceType('file')
    }
    setEditDialogOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? [])
    if (!selectedFiles.length) return
    // Reset input so same file can be re-selected after removal
    e.target.value = ''

    for (const file of selectedFiles) {
      setUploading(true)
      setUploadProgress(0)
      setUploadingFileName(file.name)

      await new Promise<void>((resolve) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'evidence')

        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            const data = JSON.parse(xhr.responseText)
            setUploadedFileUrls(prev => [...prev, data.url])
            toast({ title: `"${file.name}" uploaded successfully!` })
          } else {
            try {
              const err = JSON.parse(xhr.responseText)
              toast({ title: err.error || `Failed to upload "${file.name}"`, variant: 'destructive' })
            } catch {
              toast({ title: `Failed to upload "${file.name}"`, variant: 'destructive' })
            }
          }
          setUploading(false)
          setUploadProgress(0)
          setUploadingFileName('')
          resolve()
        })
        xhr.addEventListener('error', () => {
          toast({ title: `Failed to upload "${file.name}"`, variant: 'destructive' })
          setUploading(false)
          setUploadProgress(0)
          setUploadingFileName('')
          resolve()
        })
        xhr.open('POST', '/dashboard/performance/api/upload')
        xhr.send(formData)
      })
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedInitiative) return

    // Validation: comment required when IN_PROGRESS
    if (updateData.status === 'IN_PROGRESS') {
      if (!updateData.progressNotes || updateData.progressNotes.trim().length < 10) {
        toast({ title: 'Please provide a reason (at least 10 characters) explaining why this activity is not yet complete.', variant: 'destructive' })
        return
      }
    }

    // Validation for completion
    const hasFileEvidence = evidenceType === 'file' && uploadedFileUrls.length > 0
    const hasLinkEvidence = evidenceType === 'link' && !!updateData.evidenceUrl
    if (updateData.status === 'COMPLETED') {
      if ((!hasFileEvidence && !hasLinkEvidence) || updateData.rating === 0) {
        toast({ title: 'Evidence and rating are required for completion', variant: 'destructive' })
        return
      }
      
      // Validate URL format if evidence type is link
      if (evidenceType === 'link') {
        try {
          new URL(updateData.evidenceUrl)
        } catch {
          toast({ title: 'Please provide a valid URL (starting with http:// or https://)', variant: 'destructive' })
          return
        }
      }

      // Comment required when rating is below 3 stars
      if (updateData.rating > 0 && updateData.rating < 3) {
        if (!updateData.progressNotes || updateData.progressNotes.trim().length < 10) {
          toast({ title: 'Please provide a reason (at least 10 characters) explaining why the rating is below 3 stars.', variant: 'destructive' })
          return
        }
      }
      
      // Additional evidence required for 4+ star ratings
      if (updateData.rating >= 4 && (!updateData.evidenceNotes || updateData.evidenceNotes.trim().length < 20)) {
        toast({ title: 'Additional evidence notes (at least 20 characters) are required for ratings of 4 stars or higher', variant: 'destructive' })
        return
      }
    }

    setUpdating(true)
    try {
      const response = await fetch(`/dashboard/performance/api/performance-agreements/${selectedInitiative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: updateData.status,
          percentComplete: updateData.percentComplete,
          progressNotes: updateData.progressNotes,
          evidenceUrl: evidenceType === 'file'
            ? (uploadedFileUrls.length > 0 ? JSON.stringify(uploadedFileUrls) : null)
            : updateData.evidenceUrl,
          evidenceNotes: updateData.evidenceNotes,
          rating: updateData.rating
        }),
      })

      if (response.ok) {
        toast({ title: 'Status updated successfully!' })
        setEditDialogOpen(false)
        fetchInitiatives()
      } else {
        const error = await response.json()
        toast({ title: error.message || 'Failed to update status', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to update status', variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="p-3 sm:p-4 lg:p-6">Loading...</div>
  }

  // If not all agreements are approved, show a blocking message
  if (!allApproved && approvalStats.total > 0) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Workplan Actions</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Track and manage initiatives where you have primary or secondary responsibility</p>
        </div>
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Performance Agreement Not Yet Finalized</h3>
              <p className="text-gray-600 mb-2">
                Your workplan actions will appear here once <strong>all</strong> of your performance agreement initiatives have been approved by your supervisor.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Currently <strong>{approvalStats.approved}</strong> of <strong>{approvalStats.total}</strong> initiatives approved.
              </p>
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-sm px-4 py-1">
                Pending Supervisor Approval
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Workplan Actions</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">Track and manage initiatives where you have primary or secondary responsibility</p>
      </div>

      {/* Stats Cards */}
      <KpiGrid columns={5}>
        <KpiCard
          icon={Target}
          label="Total Actions"
          value={stats.total}
          color="blue"
          onClick={() => setStatusFilter('ALL')}
          className={statusFilter === 'ALL' ? 'ring-2 ring-primary shadow-lg' : ''}
        />
        <KpiCard
          icon={AlertCircle}
          label="Not Started"
          value={stats.notStarted}
          color="red"
          onClick={() => setStatusFilter('NOT_STARTED')}
          className={statusFilter === 'NOT_STARTED' ? 'ring-2 ring-red-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={TrendingUp}
          label="In Progress"
          value={stats.inProgress}
          color="amber"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={statusFilter === 'IN_PROGRESS' ? 'ring-2 ring-amber-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          color="green"
          onClick={() => setStatusFilter('COMPLETED')}
          className={statusFilter === 'COMPLETED' ? 'ring-2 ring-green-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={Clock}
          label="Overdue"
          value={stats.overdue}
          color="purple"
          onClick={() => setStatusFilter('OVERDUE')}
          className={statusFilter === 'OVERDUE' ? 'ring-2 ring-purple-500 shadow-lg' : ''}
        />
      </KpiGrid>

      {/* Quarter Filter Cards — Financial Year (Apr 1 – Mar 31) */}
      <KpiGrid columns={4}>
        <KpiCard
          icon={Calendar}
          label="Q1  Apr – Jun"
          value={stats.q1}
          color="purple"
          onClick={() => setStatusFilter('Q1')}
          className={statusFilter === 'Q1' ? 'ring-2 ring-purple-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={Calendar}
          label="Q2  Jul – Sep"
          value={stats.q2}
          color="indigo"
          onClick={() => setStatusFilter('Q2')}
          className={statusFilter === 'Q2' ? 'ring-2 ring-indigo-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={Calendar}
          label="Q3  Oct – Dec"
          value={stats.q3}
          color="teal"
          onClick={() => setStatusFilter('Q3')}
          className={statusFilter === 'Q3' ? 'ring-2 ring-teal-500 shadow-lg' : ''}
        />
        <KpiCard
          icon={Calendar}
          label="Q4  Jan – Mar"
          value={stats.q4}
          color="pink"
          onClick={() => setStatusFilter('Q4')}
          className={statusFilter === 'Q4' ? 'ring-2 ring-pink-500 shadow-lg' : ''}
        />
      </KpiGrid>

      {/* Supervisor Actions Stats Cards */}
      {myTasksStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
          {/* Rejected Actions Card */}
          <Card 
            className={`border-red-200 bg-red-50/50 cursor-pointer transition-all hover:shadow-md ${
              filter === 'rejected' ? 'ring-2 ring-red-400 bg-red-100' : ''
            }`}
            onClick={() => {
              onFilterChange?.(filter === 'rejected' ? 'all' : 'rejected')
            }}
          >
            <CardContent className="p-3 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-1 text-red-600" />
              <div className="text-2xl font-bold text-red-700">{myTasksStats.rejected.count}</div>
              <div className="text-xs text-red-600 font-medium">Rejected Actions</div>
              {myTasksStats.rejected.count === 0 && (
                <div className="text-xs text-red-500 mt-1">No rejected actions</div>
              )}
            </CardContent>
          </Card>

          {/* Altered Actions Card */}
          <Card 
            className={`border-orange-200 bg-orange-50/50 cursor-pointer transition-all hover:shadow-md ${
              filter === 'altered' ? 'ring-2 ring-orange-400 bg-orange-100' : ''
            }`}
            onClick={() => {
              onFilterChange?.(filter === 'altered' ? 'all' : 'altered')
            }}
          >
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-orange-600" />
              <div className="text-2xl font-bold text-orange-700">{myTasksStats.altered.count}</div>
              <div className="text-xs text-orange-600 font-medium">Altered Ratings</div>
              {myTasksStats.altered.count === 0 && (
                <div className="text-xs text-orange-500 mt-1">No altered ratings</div>
              )}
            </CardContent>
          </Card>

          {/* Accepted Ratings Card */}
          <Card 
            className={`border-green-200 bg-green-50/50 cursor-pointer transition-all hover:shadow-md ${
              filter === 'accepted' ? 'ring-2 ring-green-400 bg-green-100' : ''
            }`}
            onClick={() => {
              onFilterChange?.(filter === 'accepted' ? 'all' : 'accepted')
            }}
          >
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold text-green-700">{myTasksStats.accepted.count}</div>
              <div className="text-xs text-green-600 font-medium">Accepted Ratings</div>
              {myTasksStats.accepted.count === 0 && (
                <div className="text-xs text-green-500 mt-1">No accepted ratings</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Filter Indicator */}
      {filter !== 'all' && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
          <span className="text-sm text-gray-600">
            Showing: <span className="font-medium capitalize">{filter}</span> actions
          </span>
          <button
            onClick={() => {
              onFilterChange?.('all')
            }}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      {filteredInitiatives.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {filter !== 'all' 
                  ? `No ${filter} actions found`
                  : statusFilter === 'ALL' 
                  ? 'No workplan initiatives assigned to you' 
                  : `No ${getStatusLabel(statusFilter).toLowerCase()} initiatives`}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {filter !== 'all'
                  ? 'Try clearing the filter to see all actions'
                  : statusFilter === 'ALL'
                  ? 'Initiatives where you have primary or secondary responsibility will appear here'
                  : 'Try selecting a different filter'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInitiatives.map((initiative) => {
            const isRatingRejected = initiative.status === 'COMPLETED' && initiative.approvalStatus === 'APPROVED' && (initiative.rating === 0 || initiative.rating === null)
            const isRatingAccepted = initiative.approvalStatus === 'APPROVED' && (initiative.rating || 0) > 0 && !!(initiative.progressNotes?.includes('--- Rating Accepted ('))
            const acceptedMatch = initiative.progressNotes?.match(/--- Rating Accepted \(([^)]+)\) ---/)
            const acceptedBy = acceptedMatch?.[1] || ''
            const supervisorFeedbackMatch = initiative.progressNotes?.match(/--- Supervisor Feedback \(([^)]+)\) ---\n([\s\S]*?)(?=\n\n---|$)/)
            const supervisorFeedbackAuthor = supervisorFeedbackMatch?.[1] || ''
            const supervisorFeedbackText = supervisorFeedbackMatch?.[2]?.trim() || ''
            return (
            <Card 
                key={initiative.id} 
                className={`cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                  isRatingRejected ? 'border-2 border-orange-400 bg-orange-50' :
                  isRatingAccepted ? 'border-2 border-green-400 bg-green-50' : ''
                }`}
                onClick={() => openDetailDialog(initiative)}
              >
                {isRatingRejected && (
                  <div className="bg-orange-500 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 rounded-t-lg">
                    <AlertCircle className="w-4 h-4" />
                    RATING REJECTED — Please review feedback and re-rate this action
                  </div>
                )}
                {isRatingAccepted && (
                  <div className="bg-green-600 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 rounded-t-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    RATING ACCEPTED — Your self-rating has been confirmed by your supervisor
                  </div>
                )}
                <CardContent className="pt-6 space-y-4">
                  {/* Status Badges */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(initiative.status)}>
                        {getStatusLabel(initiative.status)}
                      </Badge>
                      {isRatingRejected ? (
                        <Badge className="bg-orange-200 text-orange-900 border border-orange-400 animate-pulse">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          ★ Rating Rejected
                        </Badge>
                      ) : isRatingAccepted ? (
                        <Badge className="bg-green-200 text-green-900 border border-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          ✓ Rating Accepted
                        </Badge>
                      ) : (
                        <Badge className={`border ${getApprovalStatusColor(initiative.approvalStatus || 'PENDING')}`}>
                          <FileCheck className="w-3 h-3 mr-1" />
                          {getApprovalStatusLabel(initiative.approvalStatus || 'PENDING')}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {initiative.isPrimaryResponsible ? 'Primary' : 'Secondary'}
                    </Badge>
                  </div>

                  {/* Supervisor Accepted confirmation */}
                  {isRatingAccepted && (
                    <div className="bg-green-100 border border-green-300 p-3 rounded text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
                      <div>
                        <div className="font-semibold text-green-800">Rating Accepted</div>
                        {acceptedBy && <div className="text-xs text-green-700">{acceptedBy}</div>}
                      </div>
                    </div>
                  )}

                  {/* Supervisor Feedback on Rejected Rating */}
                  {isRatingRejected && supervisorFeedbackText && (
                    <div className="bg-orange-100 border border-orange-300 p-3 rounded text-sm">
                      <div className="font-semibold text-orange-800 mb-1">
                        Supervisor Feedback{supervisorFeedbackAuthor ? ` — ${supervisorFeedbackAuthor}` : ''}:
                      </div>
                      <div className="text-orange-900 line-clamp-3">{supervisorFeedbackText}</div>
                    </div>
                  )}

                  {/* Initiative Number & Title */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Initiative {initiative.number}</p>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                      {initiative.title}
                    </h3>
                    {initiative.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{initiative.description}</p>
                    )}
                  </div>

                  {/* Goal & Objective */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Goal:</strong> {initiative.objective.goal.goalNumber} - {initiative.objective.goal.title}</p>
                    <p><strong>Objective:</strong> {initiative.objective.title}</p>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-semibold">{initiative.percentComplete}%</span>
                    </div>
                    <Progress value={initiative.percentComplete} className="h-2" />
                  </div>

                  {/* Weight + Due Date row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {initiative.weight !== undefined && initiative.weight !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1">
                        <span className="font-bold">⚖</span>
                        <span>Weight: <strong>{initiative.weight}%</strong></span>
                      </div>
                    )}
                    {(initiative.dueDate || initiative.objective?.goal?.dueDate) && (
                      <div className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border ${
                        initiative.status !== 'COMPLETED' && new Date(initiative.dueDate || initiative.objective?.goal?.dueDate || '') < new Date()
                          ? 'text-red-700 bg-red-50 border-red-200'
                          : 'text-gray-600 bg-gray-50 border-gray-200'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>Due: <strong>{new Date(initiative.dueDate || initiative.objective?.goal?.dueDate || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Tasks Count & Actions */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{initiative.tasks?.length || 0} tasks</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast({ title: 'Add task functionality coming soon', variant: 'destructive' })
                        }}
                        title="Add Task"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast({ title: 'Remove task functionality coming soon', variant: 'destructive' })
                        }}
                        title="Remove Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* View Details */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      openDetailDialog(initiative)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDetail?.title}</DialogTitle>
            <DialogDescription>
              Initiative Details
            </DialogDescription>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-sm font-semibold">Status</Label>
                <div className="mt-1">
                  <Badge className={getStatusColor(selectedDetail.status)}>
                    {getStatusLabel(selectedDetail.status)}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {selectedDetail.description && (
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedDetail.description}</p>
                </div>
              )}

              {/* Progress */}
              <div>
                <Label className="text-sm font-semibold">Progress</Label>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Completion</span>
                    <span className="text-sm font-semibold">{selectedDetail.percentComplete}%</span>
                  </div>
                  <Progress value={selectedDetail.percentComplete} className="h-2" />
                </div>
              </div>

              {/* Initiative Details */}
              <div className="space-y-4">
                {/* Goal & Objective */}
                <div>
                  <Label className="text-sm font-semibold">Goal</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDetail.objective.goal.goalNumber} - {selectedDetail.objective.goal.title}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Objective</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedDetail.objective.title}</p>
                </div>
                
                {/* Responsibility */}
                <div>
                  <Label className="text-sm font-semibold">Your Responsibility</Label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {selectedDetail.isPrimaryResponsible ? 'Primary Responsible' : 'Secondary Responsible'}
                    </Badge>
                  </div>
                </div>

                {/* Initiative Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedDetail.measure && (
                    <div>
                      <Label className="text-sm font-semibold">Measure</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedDetail.measure}</p>
                    </div>
                  )}
                  {selectedDetail.target && (
                    <div>
                      <Label className="text-sm font-semibold">Target</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedDetail.target}</p>
                    </div>
                  )}
                  {selectedDetail.action && (
                    <div className="col-span-2">
                      <Label className="text-sm font-semibold">Action</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedDetail.action}</p>
                    </div>
                  )}
                  {selectedDetail.reportingPeriods && (
                    <div>
                      <Label className="text-sm font-semibold">Reporting Periods</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedDetail.reportingPeriods}</p>
                    </div>
                  )}
                  {selectedDetail.quarterDates && (
                    <div>
                      <Label className="text-sm font-semibold">Quarter Dates</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedDetail.quarterDates}</p>
                    </div>
                  )}
                </div>

                {/* Tasks */}
                {selectedDetail.tasks && selectedDetail.tasks.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Sub-Tasks ({selectedDetail.tasks.length})</Label>
                    <div className="mt-2 space-y-2">
                      {selectedDetail.tasks.slice(0, 5).map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                          <span className="text-gray-700">{task.title}</span>
                        </div>
                      ))}
                      {selectedDetail.tasks.length > 5 && (
                        <p className="text-xs text-gray-500">... and {selectedDetail.tasks.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence */}
              {selectedDetail.evidenceUrl && (
                <div>
                  <Label className="text-sm font-semibold">Evidence</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPreviewEvidence({ url: selectedDetail.evidenceUrl ?? null, notes: selectedDetail.evidenceNotes })
                        setPreviewOpen(true)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Preview Evidence
                      {parseEvidenceUrls(selectedDetail.evidenceUrl).length > 1 && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({parseEvidenceUrls(selectedDetail.evidenceUrl).length} files)
                        </span>
                      )}
                    </Button>
                  </div>
                  {selectedDetail.evidenceNotes && (
                    <p className="text-sm text-gray-600 mt-2">{selectedDetail.evidenceNotes}</p>
                  )}
                </div>
              )}

              {/* Due Date in detail view */}
              {(selectedDetail.dueDate || selectedDetail.objective?.goal?.dueDate) && (
                <div>
                  <Label className="text-sm font-semibold">Due Date</Label>
                  <div className={`flex items-center gap-1.5 mt-1 text-sm rounded-md px-2 py-1 w-fit border ${
                    selectedDetail.status !== 'COMPLETED' && new Date(selectedDetail.dueDate || selectedDetail.objective?.goal?.dueDate || '') < new Date()
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : 'text-gray-600 bg-gray-50 border-gray-200'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(selectedDetail.dueDate || selectedDetail.objective?.goal?.dueDate || '').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {selectedDetail.status !== 'COMPLETED' && new Date(selectedDetail.dueDate || selectedDetail.objective?.goal?.dueDate || '') < new Date() && (
                      <span className="font-semibold">(Overdue)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Weight & Rating in detail view */}
              <div className="grid grid-cols-2 gap-4">
                {selectedDetail.weight !== undefined && selectedDetail.weight !== null && (
                  <div>
                    <Label className="text-sm font-semibold">Weight</Label>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1 w-fit">
                      <span>⚖</span> <strong>{selectedDetail.weight}%</strong>
                    </div>
                  </div>
                )}
                {selectedDetail.rating ? (
                  <div>
                    <Label className="text-sm font-semibold">Your Rating</Label>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-2xl select-none">
                          {selectedDetail.rating! >= star
                            ? <span className="text-yellow-400">★</span>
                            : selectedDetail.rating! >= star - 0.5
                              ? <span style={{ background: 'linear-gradient(to right, #facc15 50%, #d1d5db 50%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>★</span>
                              : <span className="text-gray-300">★</span>}
                        </span>
                      ))}
                      <span className="ml-1 text-sm text-gray-600">({selectedDetail.rating}/5)</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setDetailDialogOpen(false)
              if (selectedDetail) openEditDialog(selectedDetail)
            }}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change the status of: {selectedInitiative?.title}
            </DialogDescription>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedInitiative?.weight !== undefined && selectedInitiative?.weight !== null && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1">
                  <span>⚖</span> Weight: <strong>{selectedInitiative.weight}%</strong>
                </div>
              )}
              {(selectedInitiative?.dueDate || selectedInitiative?.objective?.goal?.dueDate) && (
                <div className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border ${
                  selectedInitiative?.status !== 'COMPLETED' && new Date(selectedInitiative?.dueDate || selectedInitiative?.objective?.goal?.dueDate || '') < new Date()
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-gray-600 bg-gray-50 border-gray-200'
                }`}>
                  <Calendar className="w-3 h-3" />
                  <span>Due: <strong>{new Date(selectedInitiative?.dueDate || selectedInitiative?.objective?.goal?.dueDate || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={updateData.status} 
                onValueChange={(v) => {
                  const newData = {...updateData, status: v}
                  // Automatically set progress based on status
                  if (v === 'NOT_STARTED') {
                    newData.percentComplete = 0
                    newData.rating = 0
                  } else if (v === 'IN_PROGRESS') {
                    newData.percentComplete = 10
                    newData.rating = 0
                  } else if (v === 'COMPLETED') {
                    newData.percentComplete = 100
                  }
                  setUpdateData(newData)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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

            {/* Mandatory reason when IN_PROGRESS */}
            {updateData.status === 'IN_PROGRESS' && (
              <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
                <Label className="text-amber-800 font-semibold">Reason for Incomplete Status *</Label>
                <p className="text-xs text-amber-700 mb-2">
                  This activity is still in progress. Please explain why it is not yet complete (minimum 10 characters).
                </p>
                <Textarea
                  value={updateData.progressNotes}
                  onChange={(e) => setUpdateData({...updateData, progressNotes: e.target.value})}
                  placeholder="e.g. Pending stakeholder input, delayed due to resource constraints..."
                  className="mt-1 border-amber-300 focus:border-amber-500"
                  rows={3}
                />
                <p className={`text-xs mt-1 ${updateData.progressNotes.trim().length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                  {updateData.progressNotes.trim().length} / 10 minimum characters
                </p>
              </div>
            )}

            {updateData.status === 'COMPLETED' && (
              <>
                <div>
                  <Label>Evidence *</Label>
                  <Tabs value={evidenceType} onValueChange={(v) => setEvidenceType(v as 'file' | 'link')} className="mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="link">
                        <Link className="w-4 h-4 mr-2" />
                        Provide Link
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="file" className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="evidence-upload"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.eml,.msg"
                          multiple
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploading}
                          onClick={() => document.getElementById('evidence-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? `Uploading "${uploadingFileName}"...` : 'Add Files'}
                        </Button>
                      </div>

                      {uploading && (
                        <div className="space-y-1">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-gray-500 text-center">
                            Uploading "{uploadingFileName}" — {uploadProgress}%
                          </p>
                        </div>
                      )}

                      {uploadedFileUrls.length > 0 && (
                        <div className="space-y-1.5">
                          {uploadedFileUrls.map((url, i) => {
                            const name = url.split('/').pop()?.split('?')[0] ?? url
                            return (
                              <div key={i} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                                <span className="text-green-700 flex-1 truncate">✓ {decodeURIComponent(name)}</span>
                                <button
                                  type="button"
                                  onClick={() => setUploadedFileUrls(prev => prev.filter((_, idx) => idx !== i))}
                                  className="text-red-400 hover:text-red-600 shrink-0"
                                  aria-label="Remove file"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        Accepted: PDF, Word, Excel, PowerPoint (.ppt/.pptx), Email (.eml/.msg), Images (max 1 GB each). Multiple files allowed.
                      </p>
                    </TabsContent>
                    <TabsContent value="link" className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/evidence"
                        value={updateData.evidenceUrl}
                        onChange={(e) => setUpdateData({...updateData, evidenceUrl: e.target.value})}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Provide a link to your evidence (Google Drive, OneDrive, etc.)
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div>
                  <Label>Rating *</Label>
                  <HalfStarRating value={updateData.rating} onChange={(v) => setUpdateData({...updateData, rating: v})} />
                  {updateData.rating > 0 && updateData.rating < 3 && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Below 3 stars — comment required below</p>
                  )}
                </div>

                {/* Mandatory comment when rating is below 3 stars */}
                {updateData.rating > 0 && updateData.rating < 3 && (
                  <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
                    <Label className="text-amber-800 font-semibold">Reason for Low Rating *</Label>
                    <p className="text-xs text-amber-700 mb-2">
                      A rating below 3 stars indicates incomplete work. Please explain why (minimum 10 characters).
                    </p>
                    <Textarea
                      value={updateData.progressNotes}
                      onChange={(e) => setUpdateData({...updateData, progressNotes: e.target.value})}
                      placeholder="e.g. Activity partially completed due to resource constraints..."
                      className="mt-1 border-amber-300 focus:border-amber-500"
                      rows={3}
                    />
                    <p className={`text-xs mt-1 ${updateData.progressNotes.trim().length < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {updateData.progressNotes.trim().length} / 10 minimum characters
                    </p>
                  </div>
                )}

                {/* Additional Evidence Required for 4+ Stars */}
                {updateData.rating >= 4 && (
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                    <Label className="text-orange-700 font-semibold">
                      Additional Evidence Notes * (Required for 4+ star ratings)
                    </Label>
                    <p className="text-xs text-orange-600 mb-2">
                      Please provide detailed evidence and justification for this rating (minimum 20 characters)
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence preview modal */}
      <EvidencePreviewModal
        evidenceUrl={previewEvidence.url}
        evidenceNotes={previewEvidence.notes}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Evidence Preview"
      />

      {/* Altered Rating Response Dialog */}
      <Dialog open={alteredRatingDialogOpen} onOpenChange={setAlteredRatingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Rating Adjustment - Your Action Required
            </DialogTitle>
            <DialogDescription>
              Your supervisor has adjusted the rating for this action. Please review and either accept or reject the new rating.
            </DialogDescription>
          </DialogHeader>

          {selectedAlteredRating && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{selectedAlteredRating.title}</h4>
                
                {/* Extract supervisor's altered rating comment */}
                {(() => {
                  const lines = selectedAlteredRating.progressNotes?.split('\n') || []
                  const alteredLine = lines.find(line => 
                    line.includes('adjusted your rating') || 
                    line.includes('altered') || 
                    line.includes('changed your rating')
                  )
                  return alteredLine ? (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded mt-2">
                      <p className="text-sm text-orange-800">
                        <strong>Supervisor's Comment:</strong> {alteredLine}
                      </p>
                    </div>
                  ) : null
                })()}
              </div>

              <div className="space-y-3">
                <Label htmlFor="response-comment">Your Response Comment {selectedAlteredRating.rating && selectedAlteredRating.rating > 0 ? '(Required when rejecting)' : ''}</Label>
                <Textarea
                  id="response-comment"
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder={
                    selectedAlteredRating.rating && selectedAlteredRating.rating > 0
                      ? "Provide your reason for rejecting this rating adjustment..."
                      : "Add any comments (optional)..."
                  }
                  rows={4}
                />
                {selectedAlteredRating.rating && selectedAlteredRating.rating > 0 && (
                  <p className="text-xs text-gray-500">
                    A comment is required when rejecting the rating adjustment.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleAlteredRatingResponse('accept')}
                  disabled={updating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Rating
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => handleAlteredRatingResponse('reject')}
                  disabled={updating || (!responseComment.trim() && Boolean(selectedAlteredRating.rating && selectedAlteredRating.rating > 0))}
                  variant="destructive"
                  className="flex-1"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Rating
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 pt-2 border-t">
                <p><strong>Accept:</strong> The adjusted rating becomes final and is saved to the system.</p>
                <p><strong>Reject:</strong> The rating process restarts and your supervisor will need to provide a new rating.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
