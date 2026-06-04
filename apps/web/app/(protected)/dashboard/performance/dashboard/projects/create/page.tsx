'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  X
} from 'lucide-react'

interface WBSTask {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  assignee: string
  status: string
  subtasks: WBSTask[]
}

export default function CreateProjectPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PLANNING',
    priority: 'MEDIUM'
  })

  const [wbsPhases, setWbsPhases] = useState<WBSTask[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [executives, setExecutives] = useState<Array<{ id: string; name: string; email: string; departmentName: string | null }>>([])
  const [loadingExecutives, setLoadingExecutives] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoadingExecutives(true)
    try {
      const response = await fetch('/dashboard/performance/api/users/team')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setExecutives(data.map((u: any) => ({
            id: u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email,
            departmentName: u.departmentName || null,
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingExecutives(false)
    }
  }

  const addPhase = () => {
    const newPhase: WBSTask = {
      id: `phase-${Date.now()}`,
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      assignee: '',
      status: 'NOT_STARTED',
      subtasks: []
    }
    setWbsPhases([...wbsPhases, newPhase])
    setExpandedPhases(new Set([...expandedPhases, newPhase.id]))
  }

  const addTask = (phaseId: string) => {
    const newTask: WBSTask = {
      id: `task-${Date.now()}`,
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      assignee: '',
      status: 'NOT_STARTED',
      subtasks: []
    }
    setWbsPhases(wbsPhases.map(phase => 
      phase.id === phaseId 
        ? { ...phase, subtasks: [...phase.subtasks, newTask] }
        : phase
    ))
  }

  const updatePhase = (phaseId: string, field: keyof WBSTask, value: string) => {
    setWbsPhases(wbsPhases.map(phase =>
      phase.id === phaseId ? { ...phase, [field]: value } : phase
    ))
  }

  const updateTask = (phaseId: string, taskId: string, field: keyof WBSTask, value: string) => {
    setWbsPhases(wbsPhases.map(phase =>
      phase.id === phaseId
        ? {
            ...phase,
            subtasks: phase.subtasks.map(task =>
              task.id === taskId ? { ...task, [field]: value } : task
            )
          }
        : phase
    ))
  }

  const removePhase = (phaseId: string) => {
    setWbsPhases(wbsPhases.filter(phase => phase.id !== phaseId))
  }

  const removeTask = (phaseId: string, taskId: string) => {
    setWbsPhases(wbsPhases.map(phase =>
      phase.id === phaseId
        ? { ...phase, subtasks: phase.subtasks.filter(task => task.id !== taskId) }
        : phase
    ))
  }

  const togglePhaseExpand = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required'
    }

    if (wbsPhases.length === 0) {
      newErrors.submit = 'Please add at least one project phase'
    }

    // Validate that all tasks have assignees
    let hasUnassignedTasks = false
    wbsPhases.forEach(phase => {
      phase.subtasks.forEach(task => {
        if (!task.assignee || task.assignee.trim() === '') {
          hasUnassignedTasks = true
        }
      })
    })

    if (hasUnassignedTasks) {
      newErrors.submit = 'All tasks must have an assigned user'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/dashboard/performance/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          wbsPhases
        })
      })

      if (response.ok) {
        router.push('/dashboard/performance/my-tasks')
      } else {
        const error = await response.json()
        setErrors({ submit: error.error || 'Failed to create project' })
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Create New Project</h1>
          <p className="text-gray-600 mt-1">Set up a new project with work breakdown structure</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/performance/my-tasks')}
        >
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter project title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the project objectives, scope, and deliverables"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="w-full md:w-48">
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

            {/* Work Breakdown Structure */}
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Work Breakdown Structure</h3>
                  <p className="text-sm text-gray-600">Define project phases, tasks, and deliverables</p>
                  {loadingExecutives && (
                    <p className="text-xs text-blue-600 mt-1">Loading users...</p>
                  )}
                  {!loadingExecutives && executives.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">✓ {executives.length} users available for assignment</p>
                  )}
                  {!loadingExecutives && executives.length === 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-red-600">No users loaded</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={fetchUsers}
                        className="h-5 text-xs px-2"
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
                <Button type="button" onClick={addPhase} variant="outline" size="sm">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </div>

              {wbsPhases.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">No phases defined yet</p>
                  <p className="text-sm text-gray-500">Add phases to structure your project work</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wbsPhases.map((phase, phaseIndex) => (
                    <Card key={phase.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePhaseExpand(phase.id)}
                              className="mt-1"
                            >
                              {expandedPhases.has(phase.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Phase {phaseIndex + 1} Name *</Label>
                                <Input
                                  value={phase.name}
                                  onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                                  placeholder="e.g., Planning & Design"
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Start Date</Label>
                                <Input
                                  type="date"
                                  value={phase.startDate}
                                  onChange={(e) => updatePhase(phase.id, 'startDate', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">End Date</Label>
                                <Input
                                  type="date"
                                  value={phase.endDate}
                                  onChange={(e) => updatePhase(phase.id, 'endDate', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePhase(phase.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {expandedPhases.has(phase.id) && (
                            <div className="ml-10 space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Phase Description</Label>
                                <Textarea
                                  value={phase.description}
                                  onChange={(e) => updatePhase(phase.id, 'description', e.target.value)}
                                  placeholder="Describe this phase objectives and deliverables"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">Tasks</Label>
                                  <Button
                                    type="button"
                                    onClick={() => addTask(phase.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                  >
                                    + Add Task
                                  </Button>
                                </div>

                                {phase.subtasks.length === 0 ? (
                                  <p className="text-xs text-gray-500 italic py-2">No tasks added yet</p>
                                ) : (
                                  <div className="space-y-2">
                                    {phase.subtasks.map((task, taskIndex) => (
                                      <div key={task.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs font-semibold text-gray-700">Task {taskIndex + 1}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeTask(phase.id, task.id)}
                                            className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-gray-600">Task Name *</Label>
                                            <Input
                                              value={task.name}
                                              onChange={(e) => updateTask(phase.id, task.id, 'name', e.target.value)}
                                              placeholder="Enter task name"
                                              className="h-9"
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <Label className="text-xs text-gray-600">Start Date</Label>
                                              <Input
                                                type="date"
                                                value={task.startDate}
                                                onChange={(e) => updateTask(phase.id, task.id, 'startDate', e.target.value)}
                                                className="h-9"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs text-gray-600">End Date</Label>
                                              <Input
                                                type="date"
                                                value={task.endDate}
                                                onChange={(e) => updateTask(phase.id, task.id, 'endDate', e.target.value)}
                                                className="h-9"
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-gray-600">Assigned To *</Label>
                                            <Select
                                              value={task.assignee}
                                              onValueChange={(value) => updateTask(phase.id, task.id, 'assignee', value)}
                                            >
                                              <SelectTrigger className="h-9 border-red-300">
                                                <SelectValue placeholder="Type to search or select..." />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-[200px]">
                                                {executives.length === 0 ? (
                                                  <div className="p-2 text-xs text-gray-500 text-center">
                                                    No users found. Loading...
                                                  </div>
                                                ) : (
                                                  <>
                                                    <div className="px-2 py-1.5 text-xs text-gray-500 font-medium sticky top-0 bg-white border-b">
                                                      {executives.length} Users Available
                                                    </div>
                                                    {executives.map(exec => (
                                                      <SelectItem 
                                                        key={exec.id} 
                                                        value={exec.id}
                                                        className="cursor-pointer"
                                                      >
                                                        <div className="flex items-center justify-between w-full gap-2">
                                                          <span className="font-medium truncate">{exec.name}</span>
                                                          <span className="text-xs text-gray-500 truncate">
                                                            {exec.departmentName || 'N/A'}
                                                          </span>
                                                        </div>
                                                      </SelectItem>
                                                    ))}
                                                  </>
                                                )}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/performance/my-tasks')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
