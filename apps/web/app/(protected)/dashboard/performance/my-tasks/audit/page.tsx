'use client'

import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ComprehensiveAuditForm } from '@/components/audit/comprehensive-audit-form'
import {
  Plus,
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Search,
  User
} from 'lucide-react'

interface AuditTask {
  id: string
  title: string
  description: string | null
  priority: string
  dueDate: string | null
  status: string
  percentComplete: number
  evidenceUrl: string | null
  evidenceNotes: string | null
  rating: number | null
  progressNotes: string | null
  completedAt: string | null
  createdAt: string
  assignedTo: { id: string; name: string; email: string } | null
  createdBy: { id: string; name: string; email: string } | null
}

interface TeamUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

export default function AuditTasksPage() {
  const [tasks, setTasks] = useState<AuditTask[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [users, setUsers] = useState<TeamUser[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' })
  const [creating, setCreating] = useState(false)

  // View dialog
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AuditTask | null>(null)

  // Update progress dialog
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateData, setUpdateData] = useState({ status: '', percentComplete: 0, evidenceNotes: '', rating: 0 })

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '', priority: '', dueDate: '', assignedToId: '' })

  // Filter
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    fetchTasks()
    fetchUsers()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { fetchUsers(userSearch) }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/audit-tasks')
      const data = await response.json()
      if (data.tasks && Array.isArray(data.tasks)) {
        setTasks(data.tasks)
        if (data.currentUserId) setCurrentUserId(data.currentUserId)
      }
    } catch (error) {
      console.error('Failed to fetch audit tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (search?: string) => {
    try {
      const searchParam = search ? `search=${encodeURIComponent(search)}` : ''
      const scopeParam = 'scope=organization'
      const query = searchParam ? `?${scopeParam}&${searchParam}` : `?${scopeParam}`
      const response = await fetch(`/dashboard/performance/api/users/team${query}`)
      const data = await response.json()
      if (Array.isArray(data)) setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleCreate = async (data: any) => {
    if (!data.title?.trim()) return
    setCreating(true)
    try {
      const response = await fetch('/dashboard/performance/api/audit-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (response.ok) {
        setCreateOpen(false)
        setFormData({ title: '', description: '', priority: 'MEDIUM', dueDate: '', assignedToId: '' })
        fetchTasks()
      } else {
        const err = await response.json()
        toast({ title: err.error || 'Failed to create task', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Failed to create task', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTask) return
    try {
      const response = await fetch(`/dashboard/performance/api/audit-tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      if (response.ok) {
        setUpdateOpen(false)
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEdit = async () => {
    if (!selectedTask) return
    try {
      const response = await fetch(`/dashboard/performance/api/audit-tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      if (response.ok) {
        setEditOpen(false)
        fetchTasks()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this audit task?')) return
    try {
      const response = await fetch(`/dashboard/performance/api/audit-tasks/${taskId}`, { method: 'DELETE' })
      if (response.ok) fetchTasks()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-700'
      case 'MEDIUM': return 'bg-blue-100 text-blue-700'
      case 'HIGH': return 'bg-orange-100 text-orange-700'
      case 'CRITICAL': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredTasks = filter === 'ALL' ? tasks : tasks.filter(t => t.status === filter)

  const myTasks = filteredTasks.filter(t => t.assignedTo?.id === currentUserId)
  const delegatedTasks = filteredTasks.filter(t => t.createdBy?.id === currentUserId && t.assignedTo?.id !== currentUserId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Audit Tasks</h1>
          <p className="text-gray-500 mt-1">Track and manage your audit tasks and findings</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Audit Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <CheckSquare className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
              </div>
              <CheckSquare className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Filter:</span>
        {['ALL', 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Audit Tasks ({myTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myTasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No audit tasks assigned to you yet.</p>
          ) : (
            <div className="space-y-3">
              {myTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{task.title}</span>
                      <Badge className={getPriorityColor(task.priority)} variant="outline">{task.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Badge className={getStatusColor(task.status)}>{task.status.replace(/_/g, ' ')}</Badge>
                      <span>{task.percentComplete}%</span>
                      {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-red-500 font-semibold' : ''}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.createdBy && task.createdBy.id !== currentUserId && (
                        <span>From: {task.createdBy.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTask(task); setViewOpen(true) }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedTask(task)
                      setUpdateData({ status: task.status, percentComplete: task.percentComplete, evidenceNotes: task.evidenceNotes || '', rating: task.rating || 0 })
                      setUpdateOpen(true)
                    }}>
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegated Tasks */}
      {delegatedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tasks I Delegated ({delegatedTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {delegatedTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{task.title}</span>
                      <Badge className={getPriorityColor(task.priority)} variant="outline">{task.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Badge className={getStatusColor(task.status)}>{task.status.replace(/_/g, ' ')}</Badge>
                      <span>{task.percentComplete}%</span>
                      {task.assignedTo && <span>Assigned to: {task.assignedTo.name}</span>}
                      {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTask(task); setViewOpen(true) }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedTask(task)
                      setEditData({ title: task.title, description: task.description || '', priority: task.priority, dueDate: task.dueDate ? task.dueDate.substring(0, 10) : '', assignedToId: task.assignedTo?.id || '' })
                      setEditOpen(true)
                    }}>
                      <Edit className="w-4 h-4 text-gray-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Comprehensive Audit Task</DialogTitle>
            <DialogDescription>Create a detailed audit task with business objectives, scope, observations, and conclusions.</DialogDescription>
          </DialogHeader>
          <ComprehensiveAuditForm
            users={users}
            onUserSearch={setUserSearch}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={creating}
          />
        </DialogContent>
      </Dialog>

      {/* ===== VIEW DIALOG ===== */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>Created {selectedTask?.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : ''}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getStatusColor(selectedTask.status)}>{selectedTask.status.replace(/_/g, ' ')}</Badge>
                <Badge className={getPriorityColor(selectedTask.priority)}>{selectedTask.priority}</Badge>
              </div>
              {selectedTask.description && <p className="text-sm text-gray-600">{selectedTask.description}</p>}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Progress:</span> <span className="font-semibold">{selectedTask.percentComplete}%</span></div>
                {selectedTask.dueDate && <div><span className="text-gray-500">Due:</span> {new Date(selectedTask.dueDate).toLocaleDateString()}</div>}
                {selectedTask.assignedTo && <div><span className="text-gray-500">Assigned to:</span> {selectedTask.assignedTo.name}</div>}
                {selectedTask.createdBy && <div><span className="text-gray-500">Created by:</span> {selectedTask.createdBy.name}</div>}
                {selectedTask.rating && <div><span className="text-gray-500">Rating:</span> {selectedTask.rating}/5</div>}
              </div>
              {selectedTask.evidenceNotes && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Evidence Notes</span>
                  <p className="text-sm mt-1">{selectedTask.evidenceNotes}</p>
                </div>
              )}
              {selectedTask.progressNotes && (
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Progress Notes</span>
                  <p className="text-sm mt-1">{selectedTask.progressNotes}</p>
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${selectedTask.percentComplete}%` }} />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedTask && (selectedTask.assignedTo?.id === currentUserId) && (
              <Button variant="default" onClick={() => {
                setUpdateData({ status: selectedTask.status, percentComplete: selectedTask.percentComplete, evidenceNotes: selectedTask.evidenceNotes || '', rating: selectedTask.rating || 0 })
                setViewOpen(false)
                setUpdateOpen(true)
              }}>
                Update Progress
              </Button>
            )}
            {selectedTask && (selectedTask.createdBy?.id === currentUserId) && (
              <>
                <Button variant="outline" onClick={() => {
                  setEditData({ title: selectedTask.title, description: selectedTask.description || '', priority: selectedTask.priority, dueDate: selectedTask.dueDate ? selectedTask.dueDate.substring(0, 10) : '', assignedToId: selectedTask.assignedTo?.id || '' })
                  setViewOpen(false)
                  setEditOpen(true)
                }}>
                  Edit Task
                </Button>
                <Button variant="destructive" onClick={() => { setViewOpen(false); handleDelete(selectedTask.id) }}>
                  Delete
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== UPDATE PROGRESS DIALOG ===== */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>{selectedTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={updateData.status} onValueChange={v => setUpdateData({ ...updateData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Progress: {updateData.percentComplete}%</Label>
              <Slider value={[updateData.percentComplete]} onValueChange={v => setUpdateData({ ...updateData, percentComplete: v[0] })} max={100} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Evidence / Notes</Label>
              <Textarea value={updateData.evidenceNotes} onChange={e => setUpdateData({ ...updateData, evidenceNotes: e.target.value })} placeholder="Describe evidence or progress notes..." rows={3} />
            </div>
            <div>
              <Label>Self Rating (1-5)</Label>
              <Select value={String(updateData.rating || '')} onValueChange={v => setUpdateData({ ...updateData, rating: parseInt(v) })}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(r => (
                    <SelectItem key={r} value={String(r)}>{r} — {['Poor', 'Below Average', 'Average', 'Good', 'Excellent'][r - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Audit Task</DialogTitle>
            <DialogDescription>Modify task details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={editData.priority} onValueChange={v => setEditData({ ...editData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={editData.dueDate} onChange={e => setEditData({ ...editData, dueDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
