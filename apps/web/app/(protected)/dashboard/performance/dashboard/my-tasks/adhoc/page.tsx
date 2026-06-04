'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, RefreshCw, Zap, User, Edit2, Trash2, Target, AlertCircle, TrendingUp, CheckCircle2, Clock } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card'

interface AdhocTask {
  id: string
  title: string
  description?: string
  priority: string
  dueDate?: string
  assignedToId: string
  assignedTo: { name: string }
  createdById: string
  createdBy: { name: string }
  status: string
  percentComplete: number
  evidenceUrl?: string
  rating?: number
  approvalStatus?: string
}

export default function AdhocTasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<AdhocTask[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [userSearch, setUserSearch] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [editUserSearch, setEditUserSearch] = useState('')
  const [editUserDropdownOpen, setEditUserDropdownOpen] = useState(false)
  const createDropdownRef = useRef<HTMLDivElement>(null)
  const editDropdownRef = useRef<HTMLDivElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AdhocTask | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedToId: ''
  })
  
  const [updateData, setUpdateData] = useState({
    status: 'NOT_STARTED',
    percentComplete: 0,
    evidenceUrl: '',
    rating: 0
  })

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assignedToId: ''
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks()
      fetchUsers()
    }
  }, [session])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/adhoc-tasks')
      const data = await response.json()
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks)
        if (data.currentUserId) setCurrentUserId(data.currentUserId)
      } else if (Array.isArray(data)) {
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (search?: string) => {
    try {
      const params = new URLSearchParams()
      params.set('scope', 'department')
      if (search) params.set('search', search)
      const response = await fetch(`/dashboard/performance/api/users/team?${params.toString()}`)
      const data = await response.json()
      if (Array.isArray(data)) setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userSearch || editUserSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, editUserSearch])

  // Click-outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target as Node)) {
        setEditUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreate = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/adhoc-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast({ title: 'Task created!' })
        setDialogOpen(false)
        setFormData({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' })
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTask) return
    
    try {
      const response = await fetch(`/dashboard/performance/api/adhoc-tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        toast({ title: 'Task updated!' })
        setUpdateDialogOpen(false)
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = async () => {
    if (!selectedTask) return
    
    try {
      const response = await fetch(`/dashboard/performance/api/adhoc-tasks/${selectedTask.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      
      if (response.ok) {
        toast({ title: 'Task updated successfully!' })
        setEditDialogOpen(false)
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to update task', variant: 'destructive' })
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      const response = await fetch(`/dashboard/performance/api/adhoc-tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({ title: 'Task deleted successfully!' })
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to delete task', variant: 'destructive' })
    }
  }

  const openViewDialog = (task: AdhocTask) => {
    setSelectedTask(task)
    setViewDialogOpen(true)
  }

  const openEditDialog = (task: AdhocTask) => {
    setSelectedTask(task)
    setEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedToId: task.assignedToId
    })
    setEditDialogOpen(true)
  }

  const userId = currentUserId || session?.user?.id || ''
  const myTasks = tasks.filter(t => t.assignedToId === userId)
  // Exclude tasks from createdTasks if they're already in myTasks (no duplicates)
  const createdTasks = tasks.filter(t => 
    t.createdById === userId && t.assignedToId !== userId
  )

  // Calculate stats across ALL tasks (assigned to me + created by me)
  const allMyTasks = tasks
  const stats = {
    total: allMyTasks.length,
    notStarted: allMyTasks.filter(t => t.status === 'NOT_STARTED').length,
    inProgress: allMyTasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: allMyTasks.filter(t => t.status === 'COMPLETED').length,
    overdue: allMyTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length
  }

  // Filter tasks based on selected status
  const filteredMyTasks = statusFilter === 'ALL' 
    ? myTasks 
    : statusFilter === 'OVERDUE'
    ? myTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED')
    : myTasks.filter(t => t.status === statusFilter)
  const filteredCreatedTasks = statusFilter === 'ALL'
    ? createdTasks
    : statusFilter === 'OVERDUE'
    ? createdTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED')
    : createdTasks.filter(t => t.status === statusFilter)

  if (loading) return <div className="p-3 sm:p-4 lg:p-6">Loading...</div>

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Tasks</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Quick tasks and requests</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
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

      {/* My Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tasks Assigned to Me</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMyTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => openViewDialog(task)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        <div className="font-medium hover:underline">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-600 truncate max-w-md">{task.description}</div>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{task.createdBy.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        task.priority === 'HIGH' ? 'border-red-500 text-red-700' :
                        task.priority === 'MEDIUM' ? 'border-orange-500 text-orange-700' :
                        'border-gray-500 text-gray-700'
                      }>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedTask(task)
                          setUpdateData({
                            status: task.status,
                            percentComplete: task.percentComplete,
                            evidenceUrl: task.evidenceUrl || '',
                            rating: task.rating || 0
                          })
                          setUpdateDialogOpen(true)
                        }}
                        className="inline-flex hover:scale-105 transition-transform"
                      >
                        <Badge className={
                          task.status === 'COMPLETED' ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                          task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white cursor-pointer hover:bg-amber-600' :
                          'bg-red-500 text-white cursor-pointer hover:bg-red-600'
                        }>
                          {task.status === 'NOT_STARTED' ? 'Not Started' :
                           task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={task.percentComplete} className="w-20" />
                        <span className="text-xs">{task.percentComplete}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMyTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {statusFilter === 'ALL' ? 'No tasks assigned to you' : `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Created Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tasks I Created</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary/5 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approval</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCreatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => openViewDialog(task)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        <div className="font-medium hover:underline">{task.title}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{task.assignedTo?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                        task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                        'bg-red-500 text-white'
                      }>
                        {task.status === 'NOT_STARTED' ? 'Not Started' :
                         task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={task.percentComplete} className="w-20" />
                        <span className="text-xs">{task.percentComplete}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{task.approvalStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => openEditDialog(task)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this task?')) {
                              handleDelete(task.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCreatedTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {statusFilter === 'ALL' ? 'No tasks created by you' : `No ${statusFilter.toLowerCase().replace('_', ' ')} tasks`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Ad-hoc Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="relative" ref={createDropdownRef}>
              <Label>Assign To</Label>
              <div className="relative">
                <Input
                  placeholder="Search by name, email, department..."
                  value={userSearch || selectedUserName}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setSelectedUserName('')
                    setFormData({...formData, assignedToId: ''})
                    setUserDropdownOpen(true)
                  }}
                  onFocus={() => setUserDropdownOpen(true)}
                />
                {formData.assignedToId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setFormData({...formData, assignedToId: ''})
                      setSelectedUserName('')
                      setUserSearch('')
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {userDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 ${!formData.assignedToId ? 'bg-blue-50 font-medium' : ''}`}
                    onClick={() => {
                      setFormData({...formData, assignedToId: ''})
                      setSelectedUserName('Assign to Myself')
                      setUserSearch('')
                      setUserDropdownOpen(false)
                    }}
                  >
                    <User className="h-4 w-4 text-blue-500" />
                    Assign to Myself
                  </button>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${formData.assignedToId === u.id ? 'bg-blue-50 font-medium' : ''}`}
                      onClick={() => {
                        setFormData({...formData, assignedToId: u.id})
                        setSelectedUserName(u.name)
                        setUserSearch('')
                        setUserDropdownOpen(false)
                      }}
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}{u.departmentName ? ` • ${u.departmentName}` : ''}{u.jobTitle ? ` • ${u.jobTitle}` : ''}</div>
                    </button>
                  ))}
                  {users.length === 0 && userSearch && (
                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
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
                  <Input 
                    value={updateData.evidenceUrl} 
                    onChange={(e) => setUpdateData({...updateData, evidenceUrl: e.target.value})} 
                    placeholder="Provide evidence URL"
                  />
                </div>
                <div>
                  <Label>Rating (1-5 Scale) *</Label>
                  <div className="flex gap-2 mt-2">
                    {[1,2,3,4,5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setUpdateData({...updateData, rating: num})}
                        className={`w-12 h-12 border-2 rounded-md font-bold transition-all ${
                          num <= updateData.rating 
                            ? 'bg-blue-500 text-white border-blue-600' 
                            : 'bg-white text-gray-400 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Current rating: {updateData.rating || 'Not rated'}
                  </p>
                </div>
                {updateData.rating >= 4 && (
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                    <Label className="text-orange-700 font-semibold">
                      Additional Evidence Required * (Rating 4-5)
                    </Label>
                    <p className="text-xs text-orange-600 mb-2">
                      High ratings require detailed justification (minimum 20 characters)
                    </p>
                    <Textarea 
                      value={updateData.evidenceUrl} 
                      onChange={(e) => setUpdateData({...updateData, evidenceUrl: e.target.value})}
                      placeholder="Provide detailed evidence and justification for this high rating..."
                      className="mt-1 bg-white"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Characters: {updateData.evidenceUrl.length} / 20 minimum
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={
                updateData.status === 'COMPLETED' && 
                (!updateData.evidenceUrl || 
                 !updateData.rating || 
                 (updateData.rating >= 4 && updateData.evidenceUrl.length < 20))
              }
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Task Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-semibold">Title</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{selectedTask?.title}</p>
              </div>
            </div>
            {selectedTask?.description && (
              <div>
                <Label className="text-gray-700 font-semibold">Description</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-semibold">Priority</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <Badge variant="outline" className={
                    selectedTask?.priority === 'HIGH' ? 'border-red-500 text-red-700' :
                    selectedTask?.priority === 'MEDIUM' ? 'border-orange-500 text-orange-700' :
                    'border-gray-500 text-gray-700'
                  }>
                    {selectedTask?.priority}
                  </Badge>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-semibold">Assigned To</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{selectedTask?.assignedTo.name}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-700 font-semibold">Created By</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{selectedTask?.createdBy.name}</p>
                </div>
              </div>
            </div>
            {selectedTask?.dueDate && (
              <div>
                <Label className="text-gray-700 font-semibold">Due Date</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            )}
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
            {selectedTask?.rating && selectedTask.rating > 0 && (
              <div>
                <Label className="text-gray-700 font-semibold">Rating (1-5 Scale)</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div
                        key={num}
                        className={`w-10 h-10 border-2 rounded-md font-bold flex items-center justify-center ${
                          num <= selectedTask.rating! 
                            ? 'bg-blue-500 text-white border-blue-600' 
                            : 'bg-white text-gray-300 border-gray-300'
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Rating: {selectedTask.rating}/5</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="flex gap-2">
                {selectedTask?.assignedToId === userId && selectedTask?.status !== 'COMPLETED' && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (selectedTask) {
                        setViewDialogOpen(false)
                        setUpdateData({
                          status: selectedTask.status,
                          percentComplete: selectedTask.percentComplete,
                          evidenceUrl: selectedTask.evidenceUrl || '',
                          rating: selectedTask.rating || 0
                        })
                        setUpdateDialogOpen(true)
                      }
                    }}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                )}
                {selectedTask?.createdById === userId && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setViewDialogOpen(false)
                        if (selectedTask) {
                          openEditDialog(selectedTask)
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
                          setViewDialogOpen(false)
                          handleDelete(selectedTask.id)
                        }
                      }}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </Button>
                  </>
                )}
              </div>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} />
            </div>
            <div className="relative" ref={editDropdownRef}>
              <Label>Assign To</Label>
              <div className="relative">
                <Input
                  placeholder="Search by name, email, department..."
                  value={editUserSearch || (users.find(u => u.id === editData.assignedToId)?.name || '')}
                  onChange={(e) => {
                    setEditUserSearch(e.target.value)
                    setEditData({...editData, assignedToId: ''})
                    setEditUserDropdownOpen(true)
                  }}
                  onFocus={() => setEditUserDropdownOpen(true)}
                />
                {editData.assignedToId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setEditData({...editData, assignedToId: ''})
                      setEditUserSearch('')
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {editUserDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${editData.assignedToId === u.id ? 'bg-blue-50 font-medium' : ''}`}
                      onClick={() => {
                        setEditData({...editData, assignedToId: u.id})
                        setEditUserSearch('')
                        setEditUserDropdownOpen(false)
                      }}
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}{u.departmentName ? ` • ${u.departmentName}` : ''}{u.jobTitle ? ` • ${u.jobTitle}` : ''}</div>
                    </button>
                  ))}
                  {users.length === 0 && editUserSearch && (
                    <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={editData.priority} onValueChange={(v) => setEditData({...editData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={editData.dueDate} onChange={(e) => setEditData({...editData, dueDate: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
