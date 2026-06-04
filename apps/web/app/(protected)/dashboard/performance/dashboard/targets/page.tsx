'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { formatDate, canEditTarget } from '@/lib/pms/utils'
import { Edit, Download, Filter, CheckCircle2, Clock, AlertCircle, ListTodo, Users, FileText, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Target {
  id: string
  title: string
  description?: string
  status: string
  percentComplete: number
  dueDate: string
  completedAt?: string
  evidenceUrl?: string | null
  evidenceNotes?: string | null
  initiative: {
    title: string
    objective: {
      title: string
      goal: {
        title: string
      }
    }
  }
  responsible: {
    name: string
    email: string
  }
}

interface Action {
  id: string
  title: string
  number: string
  description?: string
  measure?: string
  action?: string
  target?: string
  reportingPeriods?: string[]
  quarterDates?: Record<string, string>
  isPrimaryResponsible: boolean
  isSecondaryResponsible: boolean
  primaryResponsibleId?: string
  secondaryResponsibleId?: string
  status?: string
  percentComplete?: number
  progressNotes?: string
  evidenceUrl?: string
  evidenceNotes?: string
  rating?: number
  objective: {
    id: string
    title: string
    goal: {
      id: string
      title: string
      goalNumber: string
    }
  }
  tasks: any[]
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-orange-100 text-orange-800',
}

export default function TargetsPage() {
  const { data: session } = useSession()
  const [targets, setTargets] = useState<Target[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [filteredTargets, setFilteredTargets] = useState<Target[]>([])
  const [subordinateTargets, setSubordinateTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [subordinatesLoading, setSubordinatesLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [sortBy, setSortBy] = useState('dueDate')
  
  // Actions filtering
  const [actionStatusFilter, setActionStatusFilter] = useState('ALL')
  
  // Cascade dialog state
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, email: string}>>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [cascading, setCascading] = useState(false)

  // Status update dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [actionToUpdate, setActionToUpdate] = useState<Action | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [newProgress, setNewProgress] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    
    // Fetch actions from performance agreements
    fetch('/dashboard/performance/api/performance-agreements')
      .then(res => res.json())
      .then(data => {
        console.log('[MY ACTIONS] Fetched data:', data)
        if (Array.isArray(data)) {
          // Filter out containers and map to action format
          const agreements = data.filter((a: any) => !a.isAdhocContainer).map((agreement: any) => ({
            id: agreement.id,
            title: agreement.title,
            number: agreement.initiative?.number || '',
            description: agreement.initiative?.description,
            measure: agreement.initiative?.measure,
            action: agreement.initiative?.action,
            target: agreement.initiative?.target,
            reportingPeriods: agreement.reportingPeriods || [],
            quarterDates: agreement.quarterDates || {},
            isPrimaryResponsible: agreement.isPrimaryResponsible || false,
            isSecondaryResponsible: agreement.isSecondaryResponsible || false,
            primaryResponsibleId: agreement.primaryResponsibleId,
            secondaryResponsibleId: agreement.secondaryResponsibleId,
            status: agreement.status || 'NOT_STARTED',
            percentComplete: agreement.percentComplete || 0,
            progressNotes: agreement.progressNotes || '',
            evidenceUrl: agreement.evidenceUrl || '',
            evidenceNotes: agreement.evidenceNotes || '',
            rating: agreement.rating || 0,
            objective: agreement.initiative?.objective || { id: '', title: '', goal: { id: '', title: '', goalNumber: '' } },
            tasks: agreement.tasks || [],
            createdAt: agreement.createdAt || new Date().toISOString(),
            updatedAt: agreement.updatedAt || new Date().toISOString()
          }))
          console.log('[MY ACTIONS] Loaded', agreements.length, 'performance agreements')
          setActions(agreements)
        }
      })
      .catch(err => {
        console.error('Failed to fetch actions:', err)
        setActions([])
      })
    
    // Fetch my tasks
    fetch('/dashboard/performance/api/targets')
      .then(res => res.json())
      .then(data => {
        // Filter to only show tasks assigned to logged-in user
        const myTasks = Array.isArray(data) ? data.filter((t: Target) => 
          t.responsible.email === session.user.email
        ) : []
        setTargets(myTasks)
        setFilteredTargets(myTasks)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch targets:', err)
        setTargets([])
        setFilteredTargets([])
        setLoading(false)
      })

    // Fetch subordinate tasks
    fetch('/dashboard/performance/api/targets/subordinates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubordinateTargets(data)
        } else {
          setSubordinateTargets([])
        }
        setSubordinatesLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch subordinate targets:', err)
        setSubordinateTargets([])
        setSubordinatesLoading(false)
      })
  }, [session])

  // Fetch team members for cascading
  useEffect(() => {
    if (!session?.user?.id) return
    
    fetch('/dashboard/performance/api/users/team')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeamMembers(data)
        }
      })
      .catch(err => console.error('Failed to fetch team members:', err))
  }, [session])

  // Open cascade dialog
  const handleCascadeClick = (action: Action) => {
    setSelectedAction(action)
    setTaskDescription(action.action || action.title)
    setCascadeDialogOpen(true)
  }

  // Open status update dialog
  const handleUpdateStatusClick = (action: Action) => {
    setActionToUpdate(action)
    setNewStatus(action.status || 'NOT_STARTED')
    setNewProgress(action.percentComplete || 0)
    setProgressNotes(action.progressNotes || '')
    setEvidenceUrl('')
    setEvidenceNotes('')
    setRating(0)
    setStatusDialogOpen(true)
  }

  // Submit status update
  const handleStatusUpdate = async () => {
    if (!actionToUpdate) return
    
    // Validate required fields for COMPLETED status
    if (newStatus === 'COMPLETED') {
      if (!evidenceUrl) {
        toast({ title: 'Evidence URL is required when marking as completed', variant: 'destructive' })
        return
      }
      if (rating === 0) {
        toast({ title: 'Please rate your completion (1-5 stars)', variant: 'destructive' })
        return
      }
    }
    
    setUpdating(true)
    try {
      const response = await fetch(`/dashboard/performance/api/initiatives/${actionToUpdate.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          percentComplete: newStatus === 'COMPLETED' ? 100 : newProgress,
          progressNotes,
          evidenceUrl: newStatus === 'COMPLETED' ? evidenceUrl : undefined,
          evidenceNotes: newStatus === 'COMPLETED' ? evidenceNotes : undefined,
          rating: newStatus === 'COMPLETED' ? rating : undefined
        })
      })

      if (response.ok) {
        toast({ title: 'Status updated successfully!' })
        setStatusDialogOpen(false)
        setActionToUpdate(null)
        // Refresh actions
        const actionsRes = await fetch('/dashboard/performance/api/performance-agreements')
        const actionsData = await actionsRes.json()
        if (Array.isArray(actionsData)) {
          const agreements = actionsData.filter((a: any) => !a.isAdhocContainer).map((agreement: any) => ({
            id: agreement.id,
            title: agreement.title,
            number: agreement.initiative?.number || '',
            description: agreement.description,
            measure: agreement.kpi,
            action: agreement.customAction,
            target: agreement.target,
            status: agreement.status,
            percentComplete: agreement.percentComplete || 0,
            objective: agreement.initiative?.objective || { id: '', title: '', goal: { id: '', title: '', goalNumber: '' } },
            reportingPeriods: agreement.reportingPeriods || [],
            quarterDates: agreement.quarterDates || {},
            isPrimaryResponsible: agreement.isPrimaryResponsible || false,
            isSecondaryResponsible: agreement.isSecondaryResponsible || false,
            primaryResponsibleId: agreement.primaryResponsibleId,
            secondaryResponsibleId: agreement.secondaryResponsibleId,
            progressNotes: agreement.progressNotes || '',
            evidenceUrl: agreement.evidenceUrl || '',
            evidenceNotes: agreement.evidenceNotes || '',
            rating: agreement.rating || 0,
            tasks: agreement.tasks || [],
            createdAt: agreement.createdAt || new Date().toISOString(),
            updatedAt: agreement.updatedAt || new Date().toISOString()
          }))
          setActions(agreements)
        }
      } else {
        toast({ title: 'Failed to update status', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error updating status', variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  // Submit cascade task
  const handleCascadeSubmit = async () => {
    if (!selectedAction || !selectedMember) return
    
    setCascading(true)
    try {
      const response = await fetch('/dashboard/performance/api/targets/cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: selectedAction.id,
          responsibleId: selectedMember,
          title: taskDescription,
          description: `Cascaded from: ${selectedAction.title}`,
          dueDate: selectedAction.quarterDates?.Q4 || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
      })

      if (response.ok) {
        toast({ title: 'Task cascaded successfully!' })
        setCascadeDialogOpen(false)
        setSelectedAction(null)
        setSelectedMember('')
        setTaskDescription('')
        // Refresh actions to update cascaded tasks count
        const actionsRes = await fetch('/dashboard/performance/api/performance-agreements')
        const actionsData = await actionsRes.json()
        if (Array.isArray(actionsData)) {
          const agreements = actionsData.filter((a: any) => !a.isAdhocContainer).map((agreement: any) => ({
            id: agreement.id,
            title: agreement.title,
            number: agreement.initiative?.number || '',
            description: agreement.description,
            measure: agreement.kpi,
            action: agreement.customAction,
            target: agreement.target,
            status: agreement.status,
            percentComplete: agreement.percentComplete || 0,
            objective: agreement.initiative?.objective || { id: '', title: '', goal: { id: '', title: '', goalNumber: '' } },
            reportingPeriods: agreement.reportingPeriods || [],
            quarterDates: agreement.quarterDates || {},
            isPrimaryResponsible: agreement.isPrimaryResponsible || false,
            isSecondaryResponsible: agreement.isSecondaryResponsible || false,
            primaryResponsibleId: agreement.primaryResponsibleId,
            secondaryResponsibleId: agreement.secondaryResponsibleId,
            progressNotes: agreement.progressNotes || '',
            evidenceUrl: agreement.evidenceUrl || '',
            evidenceNotes: agreement.evidenceNotes || '',
            rating: agreement.rating || 0,
            tasks: agreement.tasks || [],
            createdAt: agreement.createdAt || new Date().toISOString(),
            updatedAt: agreement.updatedAt || new Date().toISOString()
          }))
          setActions(agreements)
        }
      } else {
        toast({ title: 'Failed to cascade task', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error cascading task:', error)
      toast({ title: 'Error cascading task', variant: 'destructive' })
    } finally {
      setCascading(false)
    }
  }

  // Filter and sort effect
  useEffect(() => {
    let filtered = [...targets]

    // Apply overdue filter
    if (showOverdueOnly) {
      filtered = filtered.filter(t => {
        const isOverdue = new Date(t.dueDate) < new Date()
        return isOverdue && t.status !== 'COMPLETED'
      })
    }

    // Apply status filter
    if (statusFilter !== 'ALL' && !showOverdueOnly) {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status)
      } else if (sortBy === 'progress') {
        return b.percentComplete - a.percentComplete
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

    setFilteredTargets(filtered)
  }, [targets, statusFilter, sortBy, showOverdueOnly])

  // Filter and sort actions
  const filteredActions = actions
    .filter(action => {
      if (actionStatusFilter !== 'ALL' && action.status !== actionStatusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '')
      if (sortBy === 'progress') return (b.percentComplete || 0) - (a.percentComplete || 0)
      return 0
    })

  // Get unique goals for filter dropdown
  const uniqueGoals = Array.from(new Set(actions.map(a => a.objective.goal.id)))
    .map(id => actions.find(a => a.objective.goal.id === id)!)
    .map(a => ({ id: a.objective.goal.id, number: a.objective.goal.goalNumber, title: a.objective.goal.title }))

  // Calculate stats
  const uniqueGoalSet = new Set(actions.map(a => a.objective.goal.id))
  const stats = {
    totalActions: actions.length, // Total actions from implementation plans
    totalGoals: uniqueGoalSet.size, // Unique goals
    completed: targets.filter(t => t.status === 'COMPLETED').length,
    inProgress: targets.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: targets.filter(t => {
      const isOverdue = new Date(t.dueDate) < new Date()
      return isOverdue && t.status !== 'COMPLETED'
    }).length,
    completionRate: targets.length > 0 
      ? Math.round((targets.filter(t => t.status === 'COMPLETED').length / targets.length) * 100)
      : 0
  }

  const handleExport = () => {
    window.location.href = '/dashboard/performance/api/reports/export?type=targets'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">My Action List</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Actions from implementation plans where you are Primary or Secondary Responsibility
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="my-tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-tasks">
            My Tasks ({targets.length})
          </TabsTrigger>
          <TabsTrigger value="subordinates-tasks">
            <Users className="h-4 w-4 mr-2" />
            Subordinates' Tasks ({subordinateTargets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="space-y-6">

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${
            statusFilter === 'ALL' && !showOverdueOnly ? 'ring-2 ring-blue-500 shadow-lg' : ''
          }`}
          onClick={() => {
            setStatusFilter('ALL')
            setShowOverdueOnly(false)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Actions</p>
                <p className="text-2xl font-bold">{stats.totalActions}</p>
                <p className="text-xs text-gray-500 mt-1">From {stats.totalGoals} {stats.totalGoals === 1 ? 'Goal' : 'Goals'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${
            statusFilter === 'COMPLETED' && !showOverdueOnly ? 'ring-2 ring-green-500 shadow-lg' : ''
          }`}
          onClick={() => {
            setStatusFilter('COMPLETED')
            setShowOverdueOnly(false)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${
            statusFilter === 'IN_PROGRESS' && !showOverdueOnly ? 'ring-2 ring-blue-500 shadow-lg' : ''
          }`}
          onClick={() => {
            setStatusFilter('IN_PROGRESS')
            setShowOverdueOnly(false)
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-lg transition-all ${
            showOverdueOnly ? 'ring-2 ring-red-500 shadow-lg' : ''
          }`}
          onClick={() => {
            setShowOverdueOnly(true)
            setStatusFilter('ALL')
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all"
          onClick={() => {
            setStatusFilter('ALL')
            setShowOverdueOnly(false)
          }}
        >
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
              <Progress value={stats.completionRate} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {actions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No actions found in implementation plans</p>
            <p className="text-sm mt-1">Actions will appear here when you are assigned as Primary or Secondary Responsibility in initiatives</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No actions available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Actions from Implementation Plans */}
          <div>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <Select value={actionStatusFilter} onValueChange={setActionStatusFilter}>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table View */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-primary/5 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredActions.map(action => (
                        <tr key={action.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">{action.number}</Badge>
                                {action.isPrimaryResponsible && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Primary</Badge>
                                )}
                                {action.isSecondaryResponsible && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-700 text-xs">Secondary</Badge>
                                )}
                              </div>
                              <div className="font-medium text-sm">{action.title}</div>
                              {action.action && <div className="text-xs text-gray-600">{action.action}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={
                              action.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                              action.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                              action.status === 'BLOCKED' ? 'bg-red-700 text-white' :
                              'bg-red-500 text-white'
                            }>
                              {action.status || 'Not Started'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={action.percentComplete || 0} className="w-20" />
                              <span className="text-xs text-gray-600">{action.percentComplete || 0}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {action.tasks.length} {action.tasks.length === 1 ? 'task' : 'tasks'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleUpdateStatusClick(action)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCascadeClick(action)}
                              >
                                <Users className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredActions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No actions match your filters</p>
                            <p className="text-sm mt-1">Try adjusting your search or filters</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cascaded Tasks */}
          {filteredTargets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Cascaded Tasks to Team</h2>
              <div className="grid gap-6">
                {filteredTargets.map(target => {
                  const canEdit = canEditTarget(target.dueDate, session?.user.role || '')
                  const isOverdue = new Date(target.dueDate) < new Date() && target.status !== 'COMPLETED'
                  
                  return (
                    <Card key={target.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{target.title}</CardTitle>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <p>Goal: {target.initiative.objective.goal.title}</p>
                              <p>Objective: {target.initiative.objective.title}</p>
                              <p>Initiative: {target.initiative.title}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[target.status]}>
                              {target.status.replace('_', ' ')}
                            </Badge>
                            {target.status === 'COMPLETED' && target.evidenceUrl && (
                              <a
                                href={target.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                title="View Evidence"
                              >
                                <FileText className="h-4 w-4" />
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {isOverdue && (
                              <Badge className="bg-red-100 text-red-800">
                                OVERDUE
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {target.description && (
                          <p className="text-sm text-gray-600">{target.description}</p>
                        )}
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Due Date:</span>
                            <p className="font-medium">{formatDate(target.dueDate)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Assigned To:</span>
                            <p className="font-medium">{target.responsible.name}</p>
                          </div>
                          {target.completedAt && (
                            <div>
                              <span className="text-gray-500">Completed:</span>
                              <p className="font-medium">{formatDate(target.completedAt)}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{target.percentComplete}%</span>
                          </div>
                          <Progress value={target.percentComplete} />
                        </div>

                        <div className="flex justify-end">
                          <Link href={`/dashboard/targets/${target.id}`}>
                            <Button variant={canEdit ? 'default' : 'outline'}>
                              <Edit className="h-4 w-4 mr-2" />
                              {canEdit ? 'Update' : 'View Details'}
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
        </TabsContent>

        <TabsContent value="subordinates-tasks" className="space-y-6">

        {subordinatesLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subordinate Stats */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Tasks</p>
                      <p className="text-2xl font-bold">{subordinateTargets.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-2xl font-bold">
                        {subordinateTargets.filter(t => t.status === 'COMPLETED').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold">
                        {subordinateTargets.filter(t => t.status === 'IN_PROGRESS').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold">
                        {subordinateTargets.filter(t => {
                          const isOverdue = new Date(t.dueDate) < new Date()
                          return isOverdue && t.status !== 'COMPLETED'
                        }).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold">
                      {subordinateTargets.length > 0 
                        ? Math.round((subordinateTargets.filter(t => t.status === 'COMPLETED').length / subordinateTargets.length) * 100)
                        : 0}%
                    </p>
                    <Progress 
                      value={subordinateTargets.length > 0 
                        ? Math.round((subordinateTargets.filter(t => t.status === 'COMPLETED').length / subordinateTargets.length) * 100)
                        : 0} 
                      className="mt-2" 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subordinate Tasks List */}
            {subordinateTargets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">No subordinates assigned</p>
                  <p className="text-sm mt-1">Tasks assigned to your direct reports will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {subordinateTargets.map(target => {
                const isOverdue = new Date(target.dueDate) < new Date() && target.status !== 'COMPLETED'
                
                return (
                  <Card key={target.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{target.title}</CardTitle>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <p>Goal: {target.initiative.objective.goal.title}</p>
                            <p>Objective: {target.initiative.objective.title}</p>
                            <p>Initiative: {target.initiative.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[target.status]}>
                            {target.status.replace('_', ' ')}
                          </Badge>
                          {target.status === 'COMPLETED' && target.evidenceUrl && (
                            <a
                              href={target.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                              title="View Evidence"
                            >
                              <FileText className="h-4 w-4" />
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {isOverdue && (
                            <Badge className="bg-red-100 text-red-800">
                              OVERDUE
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {target.description && (
                        <p className="text-sm text-gray-600">{target.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <p className="font-medium">
                            {formatDate(target.dueDate)}
                            {isOverdue && (
                              <span className="block text-xs text-red-600 font-medium mt-1">
                                {Math.floor((new Date().getTime() - new Date(target.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Assigned To:</span>
                          <p className="font-medium flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                              {target.responsible.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            {target.responsible.name}
                          </p>
                        </div>
                        {target.completedAt && (
                          <div>
                            <span className="text-gray-500">Completed:</span>
                            <p className="font-medium">{formatDate(target.completedAt)}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{target.percentComplete}%</span>
                        </div>
                        <Progress value={target.percentComplete} />
                      </div>

                      <div className="flex justify-end">
                        <Link href={`/dashboard/targets/${target.id}`}>
                          <Button variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            )}
          </div>
        )}
        </TabsContent>
      </Tabs>

      {/* Cascade Dialog */}
      <Dialog open={cascadeDialogOpen} onOpenChange={setCascadeDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Cascade Task to Team Member</DialogTitle>
            <DialogDescription>
              Assign this action to a team member. The task will be linked to the initiative.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAction && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">From Initiative</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{selectedAction.number}: {selectedAction.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedAction.objective.goal.goalNumber} - {selectedAction.objective.goal.title}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-member">Assign To *</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger id="team-member">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Task Description *</Label>
                <Textarea
                  id="task-description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe the task..."
                  rows={4}
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This will create a task for the selected team member. 
                  When they complete it, you'll need to approve it before the initiative is marked as complete.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCascadeDialogOpen(false)}
              disabled={cascading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCascadeSubmit}
              disabled={cascading || !selectedMember || !taskDescription}
            >
              {cascading ? 'Cascading...' : 'Cascade Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Update Action Status</DialogTitle>
            <DialogDescription>
              Update the progress and status of this action. Changes will be reflected in your action list.
            </DialogDescription>
          </DialogHeader>
          
          {actionToUpdate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Action</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{actionToUpdate.number}: {actionToUpdate.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {actionToUpdate.objective.goal.goalNumber} - {actionToUpdate.objective.goal.title}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="progress">Progress</Label>
                  <span className="text-sm font-medium text-blue-600">{newProgress}%</span>
                </div>
                <Slider
                  id="progress"
                  value={[newProgress]}
                  onValueChange={(value) => setNewProgress(value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Progress Notes</Label>
                <Textarea
                  id="notes"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Add any notes about your progress..."
                  rows={4}
                />
              </div>

              {/* Evidence and Rating - Only show when status is COMPLETED */}
              {newStatus === 'COMPLETED' && (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900">Completion Requirements</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="evidence-url" className="text-green-900">
                      Evidence URL * <span className="text-xs text-green-700">(Required for completion)</span>
                    </Label>
                    <Input
                      id="evidence-url"
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://drive.google.com/... or https://..."
                      className="border-green-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence-notes" className="text-green-900">Evidence Notes</Label>
                    <Textarea
                      id="evidence-notes"
                      value={evidenceNotes}
                      onChange={(e) => setEvidenceNotes(e.target.value)}
                      placeholder="Describe the evidence provided..."
                      rows={2}
                      className="border-green-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-green-900">
                      Self-Rating * <span className="text-xs text-green-700">(How well did you complete this?)</span>
                    </Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`text-3xl transition-colors ${
                            star <= rating ? 'text-yellow-500' : 'text-gray-300'
                          } hover:text-yellow-400`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-green-700 self-center">
                        {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Not rated'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> {newStatus === 'COMPLETED' 
                    ? 'Evidence and rating are required to mark as completed. This will go to your supervisor for approval.' 
                    : 'Updating the status will track your progress on this action. Cascaded tasks are tracked separately.'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setStatusDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={updating || !newStatus}
            >
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
