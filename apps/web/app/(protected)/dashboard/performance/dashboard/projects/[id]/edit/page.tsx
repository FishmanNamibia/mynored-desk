'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FolderPlus,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Save
} from 'lucide-react'

interface ProjectTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  assignedToId: string | null
  phaseName: string | null
}

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  tasks: ProjectTask[]
  teamMembers: Array<{ userId: string }>
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PLANNING',
    priority: 'MEDIUM',
    plannedStartDate: '',
    plannedEndDate: ''
  })
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [phases, setPhases] = useState<string[]>([])
  const [newPhaseName, setNewPhaseName] = useState('')
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchUsers()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/dashboard/performance/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
        setFormData({
          title: data.title || '',
          description: data.description || '',
          status: data.status || 'PLANNING',
          priority: data.priority || 'MEDIUM',
          plannedStartDate: data.plannedStartDate ? data.plannedStartDate.split('T')[0] : '',
          plannedEndDate: data.plannedEndDate ? data.plannedEndDate.split('T')[0] : ''
        })
        // Convert ISO date strings to YYYY-MM-DD for date inputs
        const parsedTasks = (data.tasks || []).map((t: any) => ({
          ...t,
          plannedStartDate: t.plannedStartDate ? t.plannedStartDate.split('T')[0] : null,
          plannedEndDate: t.plannedEndDate ? t.plannedEndDate.split('T')[0] : null
        }))
        setTasks(parsedTasks)
        // Extract unique phase names from existing tasks
        const existingPhases = [...new Set(parsedTasks.map((t: any) => t.phaseName).filter(Boolean))] as string[]
        setPhases(existingPhases)
        setTeamMemberIds(data.teamMembers?.map((tm: any) => tm.userId) || [])
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/users/team')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setUsers(data.map((u: any) => ({
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const addPhase = () => {
    const name = newPhaseName.trim()
    if (!name || phases.includes(name)) return
    setPhases([...phases, name])
    setNewPhaseName('')
  }

  const removePhase = (phaseName: string) => {
    setPhases(phases.filter(p => p !== phaseName))
    // Remove all tasks in this phase
    setTasks(tasks.filter(t => t.phaseName !== phaseName))
  }

  const addTask = (phaseName?: string) => {
    const newTask: ProjectTask = {
      id: `new-${Date.now()}`,
      title: '',
      description: '',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      plannedStartDate: null,
      plannedEndDate: null,
      assignedToId: null,
      phaseName: phaseName || null
    }
    setTasks([...tasks, newTask])
  }

  const updateTask = (index: number, field: keyof ProjectTask, value: any) => {
    const updatedTasks = [...tasks]
    updatedTasks[index] = { ...updatedTasks[index], [field]: value }
    setTasks(updatedTasks)
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})

    try {
      // Validate
      const newErrors: Record<string, string> = {}
      if (!formData.title.trim()) newErrors.title = 'Project title is required'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setSaving(false)
        return
      }

      // Update project
      const response = await fetch(`/dashboard/performance/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teamMemberIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      // Update tasks (delete removed, update existing, create new)
      const existingTaskIds = project?.tasks.map(t => t.id) || []
      const currentTaskIds = tasks.filter(t => !t.id.startsWith('new-')).map(t => t.id)
      
      // Delete removed tasks
      for (const taskId of existingTaskIds) {
        if (!currentTaskIds.includes(taskId)) {
          await fetch(`/dashboard/performance/api/projects/tasks/${taskId}`, {
            method: 'DELETE'
          })
        }
      }

      // Update or create tasks
      for (const task of tasks) {
        if (task.id.startsWith('new-')) {
          // Create new task
          await fetch(`/dashboard/performance/api/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              plannedStartDate: task.plannedStartDate,
              plannedEndDate: task.plannedEndDate,
              assignedToId: task.assignedToId,
              phaseName: task.phaseName
            })
          })
        } else {
          // Update existing task
          await fetch(`/dashboard/performance/api/projects/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              plannedStartDate: task.plannedStartDate,
              plannedEndDate: task.plannedEndDate,
              assignedToId: task.assignedToId,
              phaseName: task.phaseName
            })
          })
        }
      }

      router.push('/dashboard/performance/dashboard/projects')
    } catch (error) {
      console.error('Error updating project:', error)
      setErrors({ submit: 'Failed to update project. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FolderPlus className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Edit Project</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Phases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Phases & Tasks</h3>
              </div>

              {/* Add New Phase */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-sm">Add New Phase</Label>
                  <Input
                    placeholder="e.g. Planning, Development, Testing..."
                    value={newPhaseName}
                    onChange={(e) => setNewPhaseName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhase() } }}
                  />
                </div>
                <Button type="button" onClick={addPhase} size="sm" disabled={!newPhaseName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </div>

              {/* Phases with their tasks */}
              {phases.map((phaseName) => {
                const phaseTasks = tasks.map((t, idx) => ({ ...t, _index: idx })).filter(t => t.phaseName === phaseName)
                return (
                  <div key={phaseName} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-blue-700">{phaseName}</h4>
                        <span className="text-xs text-gray-500">({phaseTasks.length} tasks)</span>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => addTask(phaseName)} size="sm" variant="outline">
                          <Plus className="w-3 h-3 mr-1" />
                          Add Task
                        </Button>
                        <Button type="button" onClick={() => removePhase(phaseName)} size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {phaseTasks.length === 0 ? (
                      <p className="text-sm text-gray-400 italic pl-6">No tasks in this phase yet.</p>
                    ) : (
                      <div className="space-y-2 pl-2">
                        {phaseTasks.map((task) => (
                          <Card key={task.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <Input
                                  placeholder="Task title"
                                  value={task.title}
                                  onChange={(e) => updateTask(task._index, 'title', e.target.value)}
                                  className="flex-1"
                                />
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(task._index)} className="text-red-600 hover:text-red-700">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Task description"
                                value={task.description || ''}
                                onChange={(e) => updateTask(task._index, 'description', e.target.value)}
                                rows={2}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Assigned To</Label>
                                  <Select
                                    value={task.assignedToId || 'unassigned'}
                                    onValueChange={(value) => updateTask(task._index, 'assignedToId', value === 'unassigned' ? null : value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Start Date</Label>
                                  <Input type="date" className="h-8 text-xs" value={task.plannedStartDate || ''} onChange={(e) => updateTask(task._index, 'plannedStartDate', e.target.value)} />
                                </div>
                                <div>
                                  <Label className="text-xs">End Date</Label>
                                  <Input type="date" className="h-8 text-xs" value={task.plannedEndDate || ''} onChange={(e) => updateTask(task._index, 'plannedEndDate', e.target.value)} />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Status</Label>
                                  <Select value={task.status} onValueChange={(value) => updateTask(task._index, 'status', value)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Priority</Label>
                                  <Select value={task.priority} onValueChange={(value) => updateTask(task._index, 'priority', value)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="LOW">Low</SelectItem>
                                      <SelectItem value="MEDIUM">Medium</SelectItem>
                                      <SelectItem value="HIGH">High</SelectItem>
                                      <SelectItem value="CRITICAL">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end">
                                  <span className="text-xs text-gray-400 pb-2">Phase: {phaseName}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Unphased tasks */}
              {(() => {
                const unphasedTasks = tasks.map((t, idx) => ({ ...t, _index: idx })).filter(t => !t.phaseName)
                if (unphasedTasks.length === 0 && phases.length > 0) return null
                return (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                        <h4 className="font-semibold text-gray-600">Unphased Tasks</h4>
                        <span className="text-xs text-gray-500">({unphasedTasks.length} tasks)</span>
                      </div>
                      <Button type="button" onClick={() => addTask()} size="sm" variant="outline">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Task
                      </Button>
                    </div>

                    {unphasedTasks.length === 0 ? (
                      <p className="text-sm text-gray-400 italic pl-6">No unphased tasks.</p>
                    ) : (
                      <div className="space-y-2 pl-2">
                        {unphasedTasks.map((task) => (
                          <Card key={task.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <Input
                                  placeholder="Task title"
                                  value={task.title}
                                  onChange={(e) => updateTask(task._index, 'title', e.target.value)}
                                  className="flex-1"
                                />
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(task._index)} className="text-red-600 hover:text-red-700">
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <Textarea
                                placeholder="Task description"
                                value={task.description || ''}
                                onChange={(e) => updateTask(task._index, 'description', e.target.value)}
                                rows={2}
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Assigned To</Label>
                                  <Select
                                    value={task.assignedToId || 'unassigned'}
                                    onValueChange={(value) => updateTask(task._index, 'assignedToId', value === 'unassigned' ? null : value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                      {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Start Date</Label>
                                  <Input type="date" className="h-8 text-xs" value={task.plannedStartDate || ''} onChange={(e) => updateTask(task._index, 'plannedStartDate', e.target.value)} />
                                </div>
                                <div>
                                  <Label className="text-xs">End Date</Label>
                                  <Input type="date" className="h-8 text-xs" value={task.plannedEndDate || ''} onChange={(e) => updateTask(task._index, 'plannedEndDate', e.target.value)} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Status</Label>
                                  <Select value={task.status} onValueChange={(value) => updateTask(task._index, 'status', value)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                      <SelectItem value="COMPLETED">Completed</SelectItem>
                                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Priority</Label>
                                  <Select value={task.priority} onValueChange={(value) => updateTask(task._index, 'priority', value)}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="LOW">Low</SelectItem>
                                      <SelectItem value="MEDIUM">Medium</SelectItem>
                                      <SelectItem value="HIGH">High</SelectItem>
                                      <SelectItem value="CRITICAL">Critical</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/performance/dashboard/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
