'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ClipboardCheck, Calendar, TrendingUp, AlertCircle, Upload, Eye, Target, Award, CheckCircle2, Clock, Link, Plus, Trash2, FileCheck } from 'lucide-react'
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
  createdAt: string
  updatedAt: string
}

export default function ActionsPage() {
  const { data: session } = useSession()
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
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
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<Initiative | null>(null)
  const [evidenceType, setEvidenceType] = useState<'file' | 'link'>('file')

  useEffect(() => {
    fetchInitiatives()
  }, [])

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
          progressNotes: '',
          evidenceUrl: agreement.evidenceUrl,
          evidenceNotes: agreement.evidenceNotes,
          rating: agreement.rating,
          isPrimaryResponsible: true,
          isSecondaryResponsible: false,
          primaryResponsibleId: agreement.userId,
          secondaryResponsibleId: null,
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

  const filteredInitiatives = statusFilter === 'ALL' 
    ? initiatives 
    : statusFilter === 'OVERDUE'
    ? initiatives.filter(i => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return i.status !== 'COMPLETED' && new Date(i.objective?.goal?.dueDate || '') < today
      })
    : initiatives.filter(i => i.status === statusFilter)

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
    // Determine evidence type based on existing URL
    if (initiative.evidenceUrl) {
      const isLink = initiative.evidenceUrl.startsWith('http://') || initiative.evidenceUrl.startsWith('https://')
      setEvidenceType(isLink ? 'link' : 'file')
    } else {
      setEvidenceType('file')
    }
    setEditDialogOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'evidence')

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const data = JSON.parse(xhr.responseText)
          setUpdateData({ ...updateData, evidenceUrl: data.url })
          toast({ title: 'File uploaded successfully!' })
        } else {
          const error = JSON.parse(xhr.responseText)
          toast({ title: error.error || 'Failed to upload file', variant: 'destructive' })
        }
        setUploading(false)
        setUploadProgress(0)
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('Error uploading file')
        toast({ title: 'Failed to upload file', variant: 'destructive' })
        setUploading(false)
        setUploadProgress(0)
      })

      // Send request
      xhr.open('POST', '/dashboard/performance/api/upload')
      xhr.send(formData)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({ title: 'Failed to upload file', variant: 'destructive' })
      setUploading(false)
      setUploadProgress(0)
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
    if (updateData.status === 'COMPLETED') {
      if (!updateData.evidenceUrl || updateData.rating === 0) {
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
          evidenceUrl: updateData.evidenceUrl,
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
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Workplan Actions</h1>
        <p className="text-gray-500 mt-1">Track and manage initiatives where you have primary or secondary responsibility</p>
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

      {filteredInitiatives.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {statusFilter === 'ALL' 
                  ? 'No workplan initiatives assigned to you' 
                  : `No ${getStatusLabel(statusFilter).toLowerCase()} initiatives`}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {statusFilter === 'ALL'
                  ? 'Initiatives where you have primary or secondary responsibility will appear here'
                  : 'Try selecting a different filter'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInitiatives.map((initiative) => {
            return (
              <Card 
                key={initiative.id} 
                className="cursor-pointer transition-all hover:shadow-xl hover:scale-105"
                onClick={() => openDetailDialog(initiative)}
              >
                <CardContent className="pt-6 space-y-4">
                  {/* Status Badges */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(initiative.status)}>
                        {getStatusLabel(initiative.status)}
                      </Badge>
                      <Badge className={`border ${getApprovalStatusColor(initiative.approvalStatus || 'PENDING')}`}>
                        <FileCheck className="w-3 h-3 mr-1" />
                        {getApprovalStatusLabel(initiative.approvalStatus || 'PENDING')}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {initiative.isPrimaryResponsible ? 'Primary' : 'Secondary'}
                    </Badge>
                  </div>

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
                          // TODO: Open add task dialog
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
                          // TODO: Open remove task dialog
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
                  <a
                    href={selectedDetail.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1 mt-1"
                  >
                    {selectedDetail.evidenceUrl.startsWith('http://') || selectedDetail.evidenceUrl.startsWith('https://') ? (
                      <>
                        <Link className="w-4 h-4" />
                        View Evidence Link
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        View Evidence File
                      </>
                    )}
                  </a>
                  {selectedDetail.evidenceNotes && (
                    <p className="text-sm text-gray-600 mt-2">{selectedDetail.evidenceNotes}</p>
                  )}
                </div>
              )}

              {/* Progress Notes / Incomplete Reason */}
              {selectedDetail.progressNotes && (
                <div>
                  <Label className="text-sm font-semibold">Reason for Incomplete Status</Label>
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-gray-800">{selectedDetail.progressNotes}</p>
                  </div>
                </div>
              )}

              {/* Rating */}
              {selectedDetail.rating && (
                <div>
                  <Label className="text-sm font-semibold">Rating</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-2xl ${
                        star <= selectedDetail.rating! ? 'text-yellow-500' : 'text-gray-300'
                      }`}>
                        ★
                      </span>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">({selectedDetail.rating}/5)</span>
                  </div>
                </div>
              )}
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
                  } else if (v === 'IN_PROGRESS') {
                    newData.percentComplete = 10
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
                <Label className="text-amber-800 font-semibold">
                  Reason for Incomplete Status *
                </Label>
                <p className="text-xs text-amber-700 mb-2">
                  This activity is still in progress. Please explain why it is not yet complete and what actions are being taken (minimum 10 characters).
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
                    <TabsContent value="file" className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="evidence-upload"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                        <label htmlFor="evidence-upload">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={(e) => {
                              e.preventDefault()
                              document.getElementById('evidence-upload')?.click()
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
                          </Button>
                        </label>
                      </div>
                      {uploading && (
                        <div className="space-y-1">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-gray-500 text-center">
                            {uploadProgress}% uploaded
                          </p>
                        </div>
                      )}
                      {updateData.evidenceUrl && evidenceType === 'file' && !uploading && (
                        <div className="text-sm text-green-600">
                          ✓ Evidence file uploaded
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Accepted formats: PDF, Word, Excel, Images
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
                  <div className="flex gap-2 mt-2">
                    {[1,2,3,4,5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUpdateData({...updateData, rating: star})}
                        className={`text-3xl ${star <= updateData.rating ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {updateData.rating > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {updateData.rating}/5 · {updateData.rating >= 3 ? 'Satisfactory or above' : 'Below satisfactory — comment required'}
                    </p>
                  )}
                </div>

                {/* Mandatory comment when rating is below 3 stars */}
                {updateData.rating > 0 && updateData.rating < 3 && (
                  <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
                    <Label className="text-amber-800 font-semibold">
                      Reason for Low Rating *
                    </Label>
                    <p className="text-xs text-amber-700 mb-2">
                      A rating below 3 stars indicates incomplete work. Please explain why (minimum 10 characters).
                    </p>
                    <Textarea
                      value={updateData.progressNotes}
                      onChange={(e) => setUpdateData({...updateData, progressNotes: e.target.value})}
                      placeholder="e.g. Activity partially completed due to resource constraints, pending final sign-off..."
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
    </div>
  )
}
