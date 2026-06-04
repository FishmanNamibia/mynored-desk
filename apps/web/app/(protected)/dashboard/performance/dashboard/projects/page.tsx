'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog'
import {
  FolderPlus,
  Search,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Target,
  TrendingUp,
  X,
  User,
  Trash2,
  Edit2,
  Save,
  Star,
  Upload,
  Link as LinkIcon
} from 'lucide-react'

interface ProjectTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  percentComplete: number
  phaseName: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  assignedTo: { id: string; firstName: string | null; lastName: string | null; email: string; name?: string } | null
  rating: number | null
  evidenceUrl: string | null
  evidenceNotes: string | null
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  priority: string
  percentComplete: number
  plannedStartDate: string | null
  plannedEndDate: string | null
  budget: number | null
  currency: string
  createdById: string
  owner: {
    id: string
    name: string
    email: string
  }
  department: {
    id: string
    name: string
  } | null
  teamMembers: Array<{
    user: {
      id: string
      name: string
      email: string
    }
  }>
  tasks?: ProjectTask[]
  _count: {
    tasks: number
    risks: number
    issues: number
    documents: number
  }
  createdAt: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [taskEditOpen, setTaskEditOpen] = useState(false)
  const [taskUpdateData, setTaskUpdateData] = useState({ status: '', percentComplete: 0, evidenceUrl: '', rating: 0, evidenceNotes: '' })
  const [evidenceType, setEvidenceType] = useState<'url' | 'file'>('url')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  useEffect(() => {
    loadProjects()
  }, [searchTerm, statusFilter, priorityFilter, currentPage])

  const loadProjects = async () => {
    setLoading(true)
    try {
      // Check if this component is being used in My Tasks context
      const isMyTasksContext = window.location.pathname.includes('/my-tasks')
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(priorityFilter !== 'ALL' && { priority: priorityFilter }),
        ...(isMyTasksContext && { memberOnly: 'true' })
      })

      const response = await fetch(`/dashboard/performance/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
        if (data.currentUserId) setCurrentUserId(data.currentUserId)
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'bg-gray-100 text-gray-800'
      case 'ACTIVE': return 'bg-blue-100 text-blue-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate average rating from completed tasks
  const calculateProjectRating = (tasks: ProjectTask[] | undefined) => {
    if (!tasks || tasks.length === 0) return null
    const ratedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.rating && t.rating > 0)
    if (ratedTasks.length === 0) return null
    const sum = ratedTasks.reduce((acc, t) => acc + (t.rating || 0), 0)
    return Math.round((sum / ratedTasks.length) * 10) / 10 // Round to 1 decimal
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800'
      case 'MEDIUM': return 'bg-blue-100 text-blue-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNING': return <Clock className="w-4 h-4" />
      case 'ACTIVE': return <TrendingUp className="w-4 h-4" />
      case 'ON_HOLD': return <AlertTriangle className="w-4 h-4" />
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />
      case 'CANCELLED': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/dashboard/performance/api/projects/${projectId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDetailsOpen(false)
        setSelectedProject(null)
        loadProjects()
      } else {
        const data = await response.json()
        toast({ title: data.error || 'Failed to delete project', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({ title: 'Failed to delete project', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <GoldSpinner size="md" message="Loading projects..." />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Projects</h1>
          <p className="text-gray-600 mt-1">Manage and track project progress across the organization</p>
        </div>
        <Link href="/dashboard/performance/dashboard/projects/create">
          <Button className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            Create Project
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('ALL')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <FolderPlus className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('ACTIVE')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-blue-600">
                  {projects.filter(p => p.status === 'ACTIVE').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('COMPLETED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.status === 'COMPLETED').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('ON_HOLD')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Hold</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {projects.filter(p => p.status === 'ON_HOLD').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PLANNING">Planning</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FolderPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first project.'}
              </p>
              <Link href="/dashboard/performance/dashboard/projects/create">
                <Button>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight mb-2">{project.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusIcon(project.status)}
                        <span className="ml-1">{project.status.replace('_', ' ')}</span>
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {project.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">{project.percentComplete}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.percentComplete}%` }}
                    ></div>
                  </div>
                </div>

                {/* Overall Rating */}
                {(() => {
                  const avgRating = calculateProjectRating(project.tasks)
                  if (!avgRating) return null
                  return (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-sm text-gray-600">Overall Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.floor(avgRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : star - 0.5 <= avgRating
                                ? 'fill-yellow-200 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Key Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{(() => {
                      const ids = new Set<string>()
                      project.teamMembers?.forEach((tm: any) => ids.add(tm.user?.id || tm.userId))
                      project.tasks?.forEach((t: any) => { if (t.assignedToId || t.assignedTo?.id) ids.add(t.assignedToId || t.assignedTo?.id) })
                      if (project.owner?.id) ids.add(project.owner.id)
                      return ids.size
                    })()} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span>{project._count.tasks} tasks</span>
                  </div>
                </div>

                {/* Dates */}
                {(project.plannedStartDate || project.plannedEndDate) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {project.plannedStartDate && new Date(project.plannedStartDate).toLocaleDateString()}
                      {project.plannedStartDate && project.plannedEndDate && ' - '}
                      {project.plannedEndDate && new Date(project.plannedEndDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Budget */}
                {project.budget && (
                  <div className="text-sm font-semibold text-green-600">
                    Budget: {project.currency} {project.budget.toLocaleString()}
                  </div>
                )}

                {/* Owner */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {(project.owner?.name || project.owner?.email || '?').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{project.owner?.name || project.owner?.email || 'Unknown'}</span>
                </div>

                {/* Action */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedProject(project)
                      setDetailsOpen(true)
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Project Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedProject?.title}</DialogTitle>
            <DialogDescription>
              Created on {selectedProject?.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : '—'}
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(selectedProject.status)}>
                  {getStatusIcon(selectedProject.status)}
                  <span className="ml-1">{selectedProject.status.replace('_', ' ')}</span>
                </Badge>
                <Badge className={getPriorityColor(selectedProject.priority)}>
                  {selectedProject.priority}
                </Badge>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{selectedProject.description}</p>
                </div>
              )}

              <Separator />

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-gray-700">Overall Progress</span>
                  <span className="font-bold">{selectedProject.percentComplete}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${selectedProject.percentComplete}%` }}
                  />
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Owner</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {(selectedProject.owner?.name || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedProject.owner?.name || selectedProject.owner?.email || 'Unknown'}</span>
                  </div>
                </div>
                {selectedProject.department && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Department</h4>
                    <span className="text-sm">{selectedProject.department.name}</span>
                  </div>
                )}
                {selectedProject.plannedStartDate && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</h4>
                    <span className="text-sm">{new Date(selectedProject.plannedStartDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedProject.plannedEndDate && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">End Date</h4>
                    <span className="text-sm">{new Date(selectedProject.plannedEndDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedProject.budget && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Budget</h4>
                    <span className="text-sm font-semibold text-green-600">
                      {selectedProject.currency} {selectedProject.budget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Team Members */}
              {selectedProject.teamMembers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Members ({selectedProject.teamMembers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.teamMembers.map((tm, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[10px]">
                            {(tm.user?.name || tm.user?.email || '?').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{tm.user?.name || tm.user?.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks / WBS Phases */}
              {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tasks ({selectedProject.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedProject.tasks.map((task: ProjectTask) => {
                      const isAssigned = task.assignedTo?.id === currentUserId
                      const isOwnerOrCreator = selectedProject.owner.id === currentUserId || selectedProject.createdById === currentUserId
                      const canEdit = isOwnerOrCreator || isAssigned
                      
                      return (
                        <div key={task.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                                {task.phaseName && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.phaseName}
                                  </Badge>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      setEditingTask(task)
                                      setTaskUpdateData({
                                        status: task.status,
                                        percentComplete: task.percentComplete,
                                        evidenceUrl: task.evidenceUrl || '',
                                        rating: task.rating || 0,
                                        evidenceNotes: task.evidenceNotes || ''
                                      })
                                      setTaskEditOpen(true)
                                    }}
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {task.assignedTo && (
                                <div className="flex items-center gap-1 mt-1">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {task.assignedTo.name || `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim() || task.assignedTo.email}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2 shrink-0">
                              {task.rating && task.rating > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= task.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                              )}
                              <Badge className={getStatusColor(task.status)} variant="outline">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs font-semibold">{task.percentComplete}%</span>
                            </div>
                          </div>

                          {/* Evidence */}
                          {task.evidenceUrl && (() => {
                            const url = task.evidenceUrl
                            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)
                            const isFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|csv)(\?|$)/i.test(url)
                            const isUpload = url.startsWith('/uploads/') || url.startsWith('/evidence/')

                            if (isImage || (isUpload && !isFile)) {
                              return (
                                <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                      <LinkIcon className="w-3 h-3" />
                                      Evidence Attachment
                                    </div>
                                    <div className="flex gap-2">
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      >
                                        Preview
                                      </a>
                                      <a
                                        href={url}
                                        download
                                        className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                                      >
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                  <img
                                    src={url}
                                    alt="Evidence"
                                    className="max-h-40 w-full object-contain p-2"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  />
                                </div>
                              )
                            }

                            return (
                              <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500 font-medium mb-0.5">Evidence</p>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                    title={url}
                                  >
                                    {url.length > 60 ? url.substring(0, 60) + '…' : url}
                                  </a>
                                </div>
                                {isFile && (
                                  <a
                                    href={url}
                                    download
                                    className="text-xs text-green-600 hover:text-green-800 font-medium shrink-0"
                                  >
                                    Download
                                  </a>
                                )}
                              </div>
                            )
                          })()}

                          {/* Evidence Notes */}
                          {task.evidenceNotes && (
                            <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                              <p className="text-xs text-amber-700 font-medium mb-0.5">Notes</p>
                              <p className="text-xs text-gray-700">{task.evidenceNotes}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center bg-blue-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-blue-700">{selectedProject._count.tasks}</p>
                  <p className="text-xs text-blue-600">Tasks</p>
                </div>
                <div className="text-center bg-orange-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-orange-700">{selectedProject._count.risks}</p>
                  <p className="text-xs text-orange-600">Risks</p>
                </div>
                <div className="text-center bg-red-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-red-700">{selectedProject._count.issues}</p>
                  <p className="text-xs text-red-600">Issues</p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-700">{selectedProject._count.documents}</p>
                  <p className="text-xs text-green-600">Documents</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {selectedProject && currentUserId && (selectedProject.createdById === currentUserId || selectedProject.owner.id === currentUserId) && (
                <>
                  <Button
                    variant="default"
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setEditDialogOpen(true);
                      setDetailsOpen(false);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting ? 'Deleting...' : 'Delete Project'}
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Update Dialog */}
      <Dialog open={taskEditOpen} onOpenChange={setTaskEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Task Progress</DialogTitle>
            <DialogDescription>
              {editingTask?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={taskUpdateData.status}
                onValueChange={(value) => {
                  let newProgress = taskUpdateData.percentComplete;
                  if (value === 'IN_PROGRESS') newProgress = 10;
                  else if (value === 'COMPLETED') newProgress = 100;
                  else if (value === 'NOT_STARTED') newProgress = 0;
                  
                  setTaskUpdateData({ ...taskUpdateData, status: value, percentComplete: newProgress });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Progress: {taskUpdateData.percentComplete}%
              </label>
              <Input
                type="range"
                min="0"
                max="100"
                step="5"
                value={taskUpdateData.percentComplete}
                onChange={(e) => setTaskUpdateData({ ...taskUpdateData, percentComplete: parseInt(e.target.value) })}
                className="w-full"
                disabled={taskUpdateData.status === 'NOT_STARTED' || taskUpdateData.status === 'COMPLETED'}
              />
              {taskUpdateData.status === 'NOT_STARTED' && (
                <p className="text-xs text-amber-600 mt-1">Change status from "Not Started" to update progress</p>
              )}
              {taskUpdateData.status === 'COMPLETED' && (
                <p className="text-xs text-green-600 mt-1">Completed tasks are automatically set to 100%</p>
              )}
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${taskUpdateData.percentComplete}%` }}
              />
            </div>

            {/* Completion Section - Only show when marking as complete */}
            {taskUpdateData.status === 'COMPLETED' && (
              <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <h3 className="font-semibold text-lg">Task Completion Details</h3>

                {/* Self Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Rate Your Work *</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setTaskUpdateData({ ...taskUpdateData, rating: star })}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= taskUpdateData.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {taskUpdateData.rating === 0 && 'Select a rating'}
                      {taskUpdateData.rating === 1 && '1 - Not done well'}
                      {taskUpdateData.rating === 2 && '2 - Below expectations'}
                      {taskUpdateData.rating === 3 && '3 - Met expectations'}
                      {taskUpdateData.rating === 4 && '4 - Above expectations'}
                      {taskUpdateData.rating === 5 && '5 - Exceptional work'}
                    </span>
                  </div>
                </div>

                {/* Evidence Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Evidence Type *</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setEvidenceType('url')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                        evidenceType === 'url'
                          ? 'border-blue-500 bg-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <LinkIcon className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium text-sm">URL/Link</p>
                      <p className="text-xs text-gray-500">Link to online evidence</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEvidenceType('file')}
                      className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                        evidenceType === 'file'
                          ? 'border-blue-500 bg-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Upload className="h-6 w-6 mx-auto mb-2" />
                      <p className="font-medium text-sm">Upload File</p>
                      <p className="text-xs text-gray-500">PDF, DOC, XLS, etc.</p>
                    </button>
                  </div>
                </div>

                {/* Evidence URL */}
                {evidenceType === 'url' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Evidence URL *</label>
                    <Input
                      type="url"
                      placeholder="https://example.com/evidence"
                      value={taskUpdateData.evidenceUrl}
                      onChange={(e) => setTaskUpdateData({ ...taskUpdateData, evidenceUrl: e.target.value })}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Provide a link to your evidence (Google Drive, SharePoint, etc.)
                    </p>
                  </div>
                )}

                {/* Evidence File Upload */}
                {evidenceType === 'file' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Upload Evidence File *</label>
                    <Input
                      type="file"
                      onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Accepted: PDF, Word, Excel, PowerPoint, Images (Max 10MB)
                    </p>
                    {evidenceFile && (
                      <p className="text-sm text-green-600">
                        Selected: {evidenceFile.name} ({(evidenceFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                )}

                {/* Evidence Notes / Rating Explanation */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium block ${taskUpdateData.rating >= 4 ? 'text-orange-700' : ''}`}>
                    {taskUpdateData.rating >= 4 
                      ? 'Additional Evidence Notes * (Required for 4-5 star ratings)'
                      : 'Evidence Notes'}
                  </label>
                  {taskUpdateData.rating >= 4 && (
                    <p className="text-xs text-orange-600">
                      Please provide detailed evidence and justification for this high rating (minimum 20 characters)
                    </p>
                  )}
                  <Textarea 
                    value={taskUpdateData.evidenceNotes} 
                    onChange={(e) => setTaskUpdateData({...taskUpdateData, evidenceNotes: e.target.value})}
                    placeholder="Add any additional notes about the evidence..."
                    rows={3}
                  />
                </div>
              </div>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskEditOpen(false)} disabled={updatingTask}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingTask) return
                
                // Validation for completed tasks
                if (taskUpdateData.status === 'COMPLETED') {
                  if (taskUpdateData.rating === 0) {
                    toast({ title: 'Task rating is required when marking task as completed', variant: 'destructive' })
                    return
                  }
                  if (evidenceType === 'url' && !taskUpdateData.evidenceUrl) {
                    toast({ title: 'Evidence URL is required when marking task as completed', variant: 'destructive' })
                    return
                  }
                  if (evidenceType === 'file' && !evidenceFile) {
                    toast({ title: 'Please upload an evidence file before marking task as completed', variant: 'destructive' })
                    return
                  }
                  if (taskUpdateData.rating >= 4 && (!taskUpdateData.evidenceNotes || taskUpdateData.evidenceNotes.trim().length < 20)) {
                    toast({ title: 'Please provide detailed evidence and justification for ratings 4+ (minimum 20 characters)', variant: 'destructive' })
                    return
                  }
                }
                
                setUpdatingTask(true)
                console.log('[Task Update] Starting save, taskUpdateData:', taskUpdateData)
                console.log('[Task Update] evidenceType:', evidenceType, 'evidenceFile:', evidenceFile?.name)
                try {
                  let uploadedEvidenceUrl = taskUpdateData.evidenceUrl

                  // Upload file if file evidence type selected
                  if (taskUpdateData.status === 'COMPLETED' && evidenceType === 'file' && evidenceFile) {
                    const formData = new FormData()
                    formData.append('file', evidenceFile)
                    formData.append('taskId', editingTask.id)

                    const uploadRes = await fetch('/dashboard/performance/api/upload/evidence', {
                      method: 'POST',
                      body: formData,
                    })

                    if (!uploadRes.ok) {
                      throw new Error('Failed to upload evidence file')
                    }

                    const uploadData = await uploadRes.json()
                    uploadedEvidenceUrl = uploadData.url
                  }

                  const payload = {
                    ...taskUpdateData,
                    evidenceUrl: uploadedEvidenceUrl
                  }
                  console.log('[Task Update] Sending PATCH request with payload:', payload)
                  const response = await fetch(`/dashboard/performance/api/projects/tasks/${editingTask.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  })
                  console.log('[Task Update] Response status:', response.status, 'ok:', response.ok)

                  if (response.ok) {
                    console.log('[Task Update] Save successful')
                    setTaskEditOpen(false)
                    setEditingTask(null)
                    setEvidenceFile(null)
                    setEvidenceType('url')
                    // Reload project details
                    if (selectedProject) {
                      const projectResponse = await fetch(`/dashboard/performance/api/projects/${selectedProject.id}`)
                      if (projectResponse.ok) {
                        const updatedProject = await projectResponse.json()
                        setSelectedProject(updatedProject)
                        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p))
                      }
                    }
                    loadProjects()
                  } else {
                    const error = await response.json()
                    console.error('[Task Update] Save failed:', error)
                    toast({ title: `$1`, variant: "destructive" })
                  }
                } catch (err: any) {
                  console.error('[Task Update] Exception:', err)
                  toast({ title: err.message || 'Failed to update task', variant: 'destructive' })
                } finally {
                  console.log('[Task Update] Finished, updatingTask set to false')
                  setUpdatingTask(false)
                }
              }}
              disabled={updatingTask}
            >
              <Save className="w-4 h-4 mr-2" />
              {updatingTask ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={editingProject}
        onProjectUpdated={() => {
          loadProjects()
          setEditingProject(null)
        }}
      />
    </div>
  )
}
