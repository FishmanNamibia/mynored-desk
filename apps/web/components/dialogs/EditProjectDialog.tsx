'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  FolderPlus,
  AlertCircle,
  Loader2,
  ChevronDown,
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

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onProjectUpdated?: () => void
}

export function EditProjectDialog({ open, onOpenChange, project, onProjectUpdated }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && project) {
      loadProjectData()
      fetchUsers()
    }
  }, [open, project])

  const loadProjectData = async () => {
    if (!project) return
    
    setLoading(true)
    try {
      const response = await fetch(`/dashboard/performance/api/projects/${project.id}`)
      if (response.ok) {
        const data = await response.json()
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
    if (!project) return

    setSaving(true)
    setErrors({})

    try {
      const newErrors: Record<string, string> = {}
      if (!formData.title.trim()) newErrors.title = 'Project title is required'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        setSaving(false)
        return
      }

      // Update project
      const response = await fetch(`/dashboard/performance/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      // Update tasks
      const existingTaskIds = project.tasks.map(t => t.id)
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
          await fetch(`/dashboard/performance/api/projects/${project.id}/tasks`, {
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

      onProjectUpdated?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating project:', error)
      setErrors({ submit: 'Failed to update project. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FolderPlus className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Edit Project</DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading project...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="font-semibold">Basic Information</h3>
              
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
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
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
                  <Label>Priority</Label>
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
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.plannedStartDate}
                    onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.plannedEndDate}
                    onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Phases & Tasks */}
            <div className="space-y-3">
              <h3 className="font-semibold">Phases & Tasks</h3>

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

              <div className="max-h-96 overflow-y-auto space-y-3">
                {/* Phases with their tasks */}
                {phases.map((phaseName) => {
                  const phaseTasks = tasks.map((t, idx) => ({ ...t, _index: idx })).filter(t => t.phaseName === phaseName)
                  return (
                    <div key={phaseName} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                          <h4 className="font-medium text-blue-700">{phaseName}</h4>
                          <span className="text-xs text-gray-500">({phaseTasks.length} tasks)</span>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => addTask(phaseName)} size="sm" variant="outline">
                            <Plus className="w-3 h-3 mr-1" />
                            Add Task
                          </Button>
                          <Button type="button" onClick={() => removePhase(phaseName)} size="sm" variant="ghost" className="text-red-600">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {phaseTasks.map((task) => (
                        <Card key={task.id} className="p-2">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Input
                                placeholder="Task title"
                                value={task.title}
                                onChange={(e) => updateTask(task._index, 'title', e.target.value)}
                                className="flex-1 h-8"
                              />
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(task._index)} className="text-red-600">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <Select
                                value={task.assignedToId || 'unassigned'}
                                onValueChange={(value) => updateTask(task._index, 'assignedToId', value === 'unassigned' ? null : value)}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input type="date" className="h-7 text-xs" value={task.plannedStartDate || ''} onChange={(e) => updateTask(task._index, 'plannedStartDate', e.target.value)} />
                              <Input type="date" className="h-7 text-xs" value={task.plannedEndDate || ''} onChange={(e) => updateTask(task._index, 'plannedEndDate', e.target.value)} />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )
                })}

                {/* Unphased tasks */}
                {(() => {
                  const unphasedTasks = tasks.map((t, idx) => ({ ...t, _index: idx })).filter(t => !t.phaseName)
                  if (unphasedTasks.length === 0 && phases.length > 0) return null
                  return (
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-600">Unphased Tasks</h4>
                          <span className="text-xs text-gray-500">({unphasedTasks.length} tasks)</span>
                        </div>
                        <Button type="button" onClick={() => addTask()} size="sm" variant="outline">
                          <Plus className="w-3 h-3 mr-1" />
                          Add Task
                        </Button>
                      </div>

                      {unphasedTasks.map((task) => (
                        <Card key={task.id} className="p-2">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Input
                                placeholder="Task title"
                                value={task.title}
                                onChange={(e) => updateTask(task._index, 'title', e.target.value)}
                                className="flex-1 h-8"
                              />
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(task._index)} className="text-red-600">
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <Select
                                value={task.assignedToId || 'unassigned'}
                                onValueChange={(value) => updateTask(task._index, 'assignedToId', value === 'unassigned' ? null : value)}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input type="date" className="h-7 text-xs" value={task.plannedStartDate || ''} onChange={(e) => updateTask(task._index, 'plannedStartDate', e.target.value)} />
                              <Input type="date" className="h-7 text-xs" value={task.plannedEndDate || ''} onChange={(e) => updateTask(task._index, 'plannedEndDate', e.target.value)} />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
        )}
      </DialogContent>
    </Dialog>
  )
}
