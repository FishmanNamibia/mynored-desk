'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, FolderPlus, ListPlus, Briefcase, Trash2, Edit2, Target, AlertCircle, TrendingUp, CheckCircle2, Clock, ChevronDown } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'

interface CustomColumn {
  name: string
  type: 'text' | 'number' | 'date'
}

interface IndependentPlan {
  id: string
  title: string
  description?: string
  status: string
  startDate: string
  endDate?: string
  customColumns?: CustomColumn[]
  tasks: IndependentPlanTask[]
}

interface IndependentPlanTask {
  id: string
  title: string
  description?: string
  planId: string
  status: string
  percentComplete: number
  priority?: string
  dueDate?: string
  evidenceUrl?: string
  evidenceNotes?: string
  rating?: number
  customFieldValues?: Record<string, any>
}

export default function IndependentPlansPage() {
  const { data: session } = useSession()
  const [plans, setPlans] = useState<IndependentPlan[]>([])
  const [departments, setDepartments] = useState<Array<{id: string, name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [updateTaskDialogOpen, setUpdateTaskDialogOpen] = useState(false)
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false)
  const [viewTaskDialogOpen, setViewTaskDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<IndependentPlan | null>(null)
  const [selectedTask, setSelectedTask] = useState<IndependentPlanTask | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  
  const [planFormData, setPlanFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    departmentId: ''
  })
  
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date'>('text')
  
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    startDate: '',
    endDate: ''
  })
  
  const [taskCustomFields, setTaskCustomFields] = useState<Record<string, any>>({})
  
  // Edit task form state
  const [editTaskFormData, setEditTaskFormData] = useState({
    description: '',
    startDate: '',
    endDate: '',
    objective: '',
    initiative: '',
    kpi: '',
    dueDate: ''
  })
  
  const [updateTaskData, setUpdateTaskData] = useState({
    status: 'NOT_STARTED',
    percentComplete: 0,
    evidenceUrl: '',
    evidenceNotes: '',
    rating: 0
  })

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch('/dashboard/performance/api/independent-plans')
      const data = await response.json()
      setPlans(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/dashboard/performance/api/departments')
      const data = await response.json()
      setDepartments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
      setDepartments([])
    }
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      fetchPlans()
      fetchDepartments()
    }
  }, [session?.user?.id, fetchPlans, fetchDepartments])

  const handleCreatePlan = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/independent-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planFormData,
          customColumns: customColumns.length > 0 ? customColumns : null
        })
      })
      
      if (response.ok) {
        toast({ title: 'Plan created!' })
        setPlanDialogOpen(false)
        setPlanFormData({ title: '', description: '', startDate: '', endDate: '', departmentId: '' })
        setCustomColumns([])
        fetchPlans()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }
  
  const addCustomColumn = () => {
    if (newColumnName.trim()) {
      setCustomColumns([...customColumns, { name: newColumnName.trim(), type: newColumnType }])
      setNewColumnName('')
      setNewColumnType('text')
    }
  }
  
  const removeCustomColumn = (index: number) => {
    setCustomColumns(customColumns.filter((_, i) => i !== index))
  }
  
  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? All tasks will also be deleted.')) {
      return
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/independent-plans/${planId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({ title: 'Plan deleted successfully!' })
        fetchPlans()
      } else {
        toast({ title: 'Failed to delete plan', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to delete plan', variant: 'destructive' })
    }
  }
  
  const openEditPlanDialog = (plan: IndependentPlan) => {
    setSelectedPlan(plan)
    setPlanFormData({
      title: plan.title,
      description: plan.description || '',
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
      endDate: plan.endDate ? new Date(plan.endDate).toISOString().split('T')[0] : '',
      departmentId: (plan as any).departmentId || ''
    })
    setCustomColumns((plan.customColumns as CustomColumn[]) || [])
    setEditPlanDialogOpen(true)
  }
  
  const handleUpdatePlan = async () => {
    if (!selectedPlan) return
    
    try {
      const response = await fetch(`/dashboard/performance/api/independent-plans/${selectedPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planFormData,
          customColumns: customColumns.length > 0 ? customColumns : null
        })
      })
      
      if (response.ok) {
        toast({ title: 'Plan updated successfully!' })
        setEditPlanDialogOpen(false)
        setPlanFormData({ title: '', description: '', startDate: '', endDate: '', departmentId: '' })
        setCustomColumns([])
        setSelectedPlan(null)
        fetchPlans()
      } else {
        toast({ title: 'Failed to update plan', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to update plan', variant: 'destructive' })
    }
  }

  const handleCreateTask = async () => {
    if (!selectedPlan) return
    
    // Auto-generate title from first custom field value or use default
    let autoTitle = 'New Task'
    if (selectedPlan.customColumns && selectedPlan.customColumns.length > 0) {
      const firstColumn = selectedPlan.customColumns[0]
      const firstValue = taskCustomFields[firstColumn.name]
      if (firstValue) {
        autoTitle = String(firstValue)
      }
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/independent-plans/${selectedPlan.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: autoTitle,
          description: taskFormData.description,
          priority: taskFormData.priority,
          startDate: taskFormData.startDate,
          endDate: taskFormData.endDate,
          customFieldValues: Object.keys(taskCustomFields).length > 0 ? taskCustomFields : null
        })
      })
      
      if (response.ok) {
        toast({ title: 'Task created!' })
        setTaskDialogOpen(false)
        setTaskFormData({ title: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '' })
        setTaskCustomFields({})
        fetchPlans()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return
    
    // Validation for completion
    if (updateTaskData.status === 'COMPLETED') {
      if (!updateTaskData.evidenceUrl || updateTaskData.rating === 0) {
        toast({ title: 'Evidence URL and rating are required for completion', variant: 'destructive' })
        return
      }
      
      // Additional evidence required for 4-5 star ratings
      if (updateTaskData.rating >= 4 && (!updateTaskData.evidenceNotes || updateTaskData.evidenceNotes.trim().length < 20)) {
        toast({ title: 'Additional evidence notes (at least 20 characters) are required for ratings of 4 or 5 stars', variant: 'destructive' })
        return
      }
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/independent-plans/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateTaskData)
      })
      
      if (response.ok) {
        toast({ title: 'Task updated!' })
        setUpdateTaskDialogOpen(false)
        fetchPlans()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/independent-plans/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({ title: 'Task deleted successfully!' })
        fetchPlans()
      } else {
        toast({ title: 'Failed to delete task', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to delete task', variant: 'destructive' })
    }
  }

  const openEditTaskDialog = (task: IndependentPlanTask) => {
    setSelectedTask(task)
    setEditTaskFormData({
      description: task.description || '',
      startDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      endDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      objective: task.customFieldValues?.['Objective'] || '',
      initiative: task.customFieldValues?.['Initiative'] || '',
      kpi: task.customFieldValues?.['KPI'] || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
    })
    // Load existing custom field values
    setTaskCustomFields(task.customFieldValues || {})
    setEditTaskDialogOpen(true)
  }

  const handleEditTask = async () => {
    if (!selectedTask) return
    
    try {
      // Prepare custom field values with the form data
      const updatedCustomFields = {
        ...taskCustomFields,
        Objective: editTaskFormData.objective,
        Initiative: editTaskFormData.initiative,
        KPI: editTaskFormData.kpi
      }
      
      const response = await fetch(`/dashboard/performance/api/independent-plans/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editTaskFormData.description,
          dueDate: editTaskFormData.dueDate,
          customFieldValues: updatedCustomFields
        })
      })
      
      if (response.ok) {
        toast({ title: 'Task updated successfully!' })
        setEditTaskDialogOpen(false)
        setTaskCustomFields({})
        fetchPlans()
      } else {
        toast({ title: 'Failed to update task', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to update task', variant: 'destructive' })
    }
  }

  const openViewTaskDialog = (task: IndependentPlanTask) => {
    setSelectedTask(task)
    setViewTaskDialogOpen(true)
  }

  // Calculate stats - memoized for performance
  const stats = useMemo(() => {
    const allTasks = Array.isArray(plans) ? plans.flatMap(plan => plan.tasks || []) : []
    const now = new Date()
    
    return {
      total: allTasks.length,
      notStarted: allTasks.filter(t => t.status === 'NOT_STARTED').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      overdue: allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED').length
    }
  }, [plans])

  // Filter plans - memoized for performance
  const filteredPlans = useMemo(() => {
    if (!Array.isArray(plans)) return []
    
    if (statusFilter === 'ALL') return plans
    
    const now = new Date()
    return plans.map(plan => ({
      ...plan,
      tasks: statusFilter === 'OVERDUE'
        ? (plan.tasks || []).filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED')
        : (plan.tasks || []).filter(t => t.status === statusFilter)
    })).filter(plan => plan.tasks.length > 0)
  }, [plans, statusFilter])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPlanDialogOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Project Plan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPlanDialogOpen(true)}>
              <Briefcase className="h-4 w-4 mr-2" />
              Other Plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <KpiGrid columns={5}>
        <KpiCard
          icon={Target}
          label="Total Tasks"
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

      {/* Plans List */}
      <div className="space-y-4">
        {filteredPlans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-gray-500" />
                  <div>
                    <CardTitle>{plan.title}</CardTitle>
                    {plan.description && (
                      <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{plan.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openEditPlanDialog(plan)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => {
                    setSelectedPlan(plan)
                    // Initialize custom fields based on plan's custom columns
                    const initialFields: Record<string, any> = {}
                    if (plan.customColumns) {
                      (plan.customColumns as CustomColumn[]).forEach(col => {
                        initialFields[col.name] = ''
                      })
                    }
                    setTaskCustomFields(initialFields)
                    setTaskFormData({ title: '', description: '', priority: 'MEDIUM', startDate: '', endDate: '' })
                    setTaskDialogOpen(true)
                  }}>
                    <ListPlus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plan.tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold w-24">Activity #</th>
                        <th className="text-left p-3 font-semibold">Description</th>
                        <th className="text-left p-3 font-semibold w-32">Start Date</th>
                        <th className="text-left p-3 font-semibold w-32">End Date</th>
                        <th className="text-left p-3 font-semibold w-36">Status</th>
                        <th className="text-left p-3 font-semibold w-48">Responsible Dept</th>
                        {/* Render custom column headers */}
                        {plan.customColumns && (plan.customColumns as CustomColumn[]).map((col, idx) => (
                          <th key={idx} className="text-left p-3 font-semibold w-40">{col.name}</th>
                        ))}
                        <th className="text-left p-3 font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.tasks.map((task, index) => (
                        <tr key={task.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <span className="text-sm font-mono text-gray-600">
                              {String(index + 1).padStart(3, '0')}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => openViewTaskDialog(task)}
                              className="text-sm block w-full text-left hover:text-blue-600 hover:underline cursor-pointer"
                              title="Click to view full details"
                            >
                              {task.description || task.title || '-'}
                            </button>
                          </td>
                          <td className="p-3">
                            <span className="text-sm">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm">
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                              task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                              'bg-red-500 text-white'
                            }>
                              {task.status === 'NOT_STARTED' ? 'Not Started' : 
                               task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-sm truncate block">
                              {(plan as any).department?.name || '-'}
                            </span>
                          </td>
                          {/* Render custom column values */}
                          {plan.customColumns && (plan.customColumns as CustomColumn[]).map((col, idx) => (
                            <td key={idx} className="p-3">
                              <span className="text-sm">
                                {task.customFieldValues?.[col.name] || '-'}
                              </span>
                            </td>
                          ))}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openEditTaskDialog(task)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={planFormData.title} onChange={(e) => setPlanFormData({...planFormData, title: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={planFormData.description} onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={planFormData.startDate} onChange={(e) => setPlanFormData({...planFormData, startDate: e.target.value})} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={planFormData.endDate} onChange={(e) => setPlanFormData({...planFormData, endDate: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Responsible Department *</Label>
              <Select value={planFormData.departmentId} onValueChange={(v) => setPlanFormData({...planFormData, departmentId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Columns Section */}
            <div className="border-t pt-4">
              <Label className="text-lg font-semibold">Custom Columns (Optional)</Label>
              <p className="text-sm text-gray-500 mb-3">Add custom fields for all tasks in this plan</p>
              
              {customColumns.length > 0 && (
                <div className="space-y-2 mb-3">
                  {customColumns.map((col, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 font-medium">{col.name}</span>
                      <Badge variant="outline">{col.type}</Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeCustomColumn(index)}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Column name (e.g., Budget, Location)" 
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomColumn()}
                />
                <Select value={newColumnType} onValueChange={(v: any) => setNewColumnType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addCustomColumn} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={planFormData.title} onChange={(e) => setPlanFormData({...planFormData, title: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={planFormData.description} onChange={(e) => setPlanFormData({...planFormData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={planFormData.startDate} onChange={(e) => setPlanFormData({...planFormData, startDate: e.target.value})} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={planFormData.endDate} onChange={(e) => setPlanFormData({...planFormData, endDate: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Responsible Department *</Label>
              <Select value={planFormData.departmentId} onValueChange={(v) => setPlanFormData({...planFormData, departmentId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Columns Section */}
            <div className="border-t pt-4">
              <Label className="text-lg font-semibold">Custom Columns (Optional)</Label>
              <p className="text-sm text-gray-500 mb-3">Add custom fields for all tasks in this plan</p>
              <p className="text-xs text-amber-600 mb-3">⚠️ Note: Editing columns will not affect existing task values</p>
              
              {customColumns.length > 0 && (
                <div className="space-y-2 mb-3">
                  {customColumns.map((col, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 font-medium">{col.name}</span>
                      <Badge variant="outline">{col.type}</Badge>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeCustomColumn(index)}
                        className="h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Column name (e.g., Budget, Location)" 
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomColumn()}
                />
                <Select value={newColumnType} onValueChange={(v: any) => setNewColumnType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addCustomColumn} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePlan}>Update Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Activity to {selectedPlan?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Enter activity description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={taskFormData.startDate}
                  onChange={(e) => setTaskFormData({...taskFormData, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={taskFormData.endDate}
                  onChange={(e) => setTaskFormData({...taskFormData, endDate: e.target.value})}
                />
              </div>
            </div>
            
            {/* Render dynamic custom fields */}
            {selectedPlan?.customColumns && (selectedPlan.customColumns as CustomColumn[]).map((col, idx) => (
              <div key={idx}>
                <Label>{col.name}</Label>
                <Input 
                  type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                  placeholder={`Enter ${col.name.toLowerCase()}`}
                  value={taskCustomFields[col.name] || ''}
                  onChange={(e) => setTaskCustomFields({...taskCustomFields, [col.name]: e.target.value})}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Task Dialog */}
      <Dialog open={updateTaskDialogOpen} onOpenChange={setUpdateTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={updateTaskData.status} 
                onValueChange={(v) => {
                  const newData = {...updateTaskData, status: v}
                  // Automatically set progress based on status
                  if (v === 'NOT_STARTED') {
                    newData.percentComplete = 0
                  } else if (v === 'IN_PROGRESS') {
                    newData.percentComplete = 10
                  } else if (v === 'COMPLETED') {
                    newData.percentComplete = 100
                  }
                  setUpdateTaskData(newData)
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
                Progress: {updateTaskData.percentComplete}%
              </p>
            </div>
            {updateTaskData.status === 'COMPLETED' && (
              <>
                <div>
                  <Label>Evidence URL *</Label>
                  <Input 
                    placeholder="Enter evidence URL"
                    value={updateTaskData.evidenceUrl} 
                    onChange={(e) => setUpdateTaskData({...updateTaskData, evidenceUrl: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Rating (1-5) *</Label>
                  <div className="flex gap-3 mt-2">
                    {[1,2,3,4,5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setUpdateTaskData({...updateTaskData, rating: num})}
                        className={`w-12 h-12 rounded-lg border-2 font-semibold text-lg transition-all ${
                          updateTaskData.rating === num 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-110' 
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select a rating from 1 (lowest) to 5 (highest)</p>
                </div>
                
                {/* Additional Evidence Required for 4-5 Ratings */}
                {updateTaskData.rating >= 4 && (
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                    <Label className="text-orange-700 font-semibold">
                      Additional Evidence Notes * (Required for 4-5 ratings)
                    </Label>
                    <p className="text-xs text-orange-600 mb-2">
                      Please provide detailed evidence and justification for this high rating (minimum 20 characters)
                    </p>
                    <Textarea 
                      value={updateTaskData.evidenceNotes} 
                      onChange={(e) => setUpdateTaskData({...updateTaskData, evidenceNotes: e.target.value})}
                      placeholder="Provide detailed evidence and justification for your rating..."
                      className="mt-1 bg-white"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Characters: {updateTaskData.evidenceNotes.length} / 20 minimum
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTask}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Objective</Label>
              <Input 
                placeholder="Enter objective"
                value={editTaskFormData.objective}
                onChange={(e) => setEditTaskFormData({...editTaskFormData, objective: e.target.value})}
              />
            </div>
            <div>
              <Label>Initiative</Label>
              <Input 
                placeholder="Enter initiative"
                value={editTaskFormData.initiative}
                onChange={(e) => setEditTaskFormData({...editTaskFormData, initiative: e.target.value})}
              />
            </div>
            <div>
              <Label>KPI</Label>
              <Input 
                placeholder="Enter KPI"
                value={editTaskFormData.kpi}
                onChange={(e) => setEditTaskFormData({...editTaskFormData, kpi: e.target.value})}
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={editTaskFormData.dueDate}
                onChange={(e) => setEditTaskFormData({...editTaskFormData, dueDate: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTask}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Details Dialog */}
      <Dialog open={viewTaskDialogOpen} onOpenChange={setViewTaskDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-semibold">Objective</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{selectedTask?.customFieldValues?.['Objective'] || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-semibold">Initiative</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{selectedTask?.customFieldValues?.['Initiative'] || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-semibold">KPI</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{selectedTask?.customFieldValues?.['KPI'] || 'Not specified'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-semibold">Due Date</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">
                    {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Status</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <Badge className={
                    selectedTask?.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                    selectedTask?.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                    'bg-red-500 text-white'
                  }>
                    {selectedTask?.status === 'NOT_STARTED' ? 'Not Started' : 
                     selectedTask?.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 font-semibold">Progress</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <Progress value={selectedTask?.percentComplete || 0} className="flex-1" />
                  <span className="text-sm font-medium">{selectedTask?.percentComplete || 0}%</span>
                </div>
              </div>
            </div>
            {selectedTask?.evidenceUrl && (
              <div>
                <Label className="text-gray-700 font-semibold">Evidence URL</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <a href={selectedTask.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                    {selectedTask.evidenceUrl}
                  </a>
                </div>
              </div>
            )}
            {selectedTask?.evidenceNotes && (
              <div>
                <Label className="text-gray-700 font-semibold">Evidence Notes</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.evidenceNotes}</p>
                </div>
              </div>
            )}
            {selectedTask?.rating && (
              <div>
                <Label className="text-gray-700 font-semibold">Rating</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= selectedTask.rating! ? 'text-yellow-500' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setViewTaskDialogOpen(false)
                    if (selectedTask) {
                      openEditTaskDialog(selectedTask)
                    }
                  }}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (selectedTask) {
                      setViewTaskDialogOpen(false)
                      handleDeleteTask(selectedTask.id)
                    }
                  }}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
              </div>
              <Button onClick={() => setViewTaskDialogOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
