'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'

interface Goal {
  id: string
  goalNumber: string
  title: string
  objectives?: Objective[]
}

interface Objective {
  id?: string
  number: string
  title: string
}

interface Initiative {
  number: string
  title: string
  measure: string
  action: string
  reportingPeriod: string
  annualTarget: string
  quarterlyTargets: {
    q1: boolean
    q2: boolean
    q3: boolean
    q4: boolean
  }
  primaryResponsibility: string
  secondaryResponsibility?: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface ManageGoalsObjectivesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ManageGoalsObjectives({ open, onOpenChange, onSuccess }: ManageGoalsObjectivesProps) {
  const [submitting, setSubmitting] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [existingObjectives, setExistingObjectives] = useState<any[]>([])
  const [existingInitiatives, setExistingInitiatives] = useState<any[]>([])
  const [executives, setExecutives] = useState<User[]>([])
  
  // Goal creation
  const [goalData, setGoalData] = useState({
    goalNumber: '',
    title: '',
  })

  // Objective creation
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')
  const [objectives, setObjectives] = useState<Objective[]>([
    { number: '', title: '' }
  ])

  // Initiative creation
  const [selectedGoalIdForInitiative, setSelectedGoalIdForInitiative] = useState<string>('')
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('')
  const [initiatives, setInitiatives] = useState<Initiative[]>([
    { 
      number: '', 
      title: '', 
      measure: '', 
      action: '', 
      reportingPeriod: '',
      annualTarget: '',
      quarterlyTargets: { q1: false, q2: false, q3: false, q4: false },
      primaryResponsibility: '', 
      secondaryResponsibility: '' 
    }
  ])

  useEffect(() => {
    if (open) {
      fetchGoals()
      fetchExecutives()
    }
  }, [open])

  const fetchGoals = async () => {
    setLoadingGoals(true)
    try {
      const response = await fetch('/dashboard/performance/api/goals')
      if (response.ok) {
        const data = await response.json()
        setGoals(data)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoadingGoals(false)
    }
  }

  const fetchExecutives = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/executives')
      if (response.ok) {
        const data = await response.json()
        setExecutives(data)
      }
    } catch (error) {
      console.error('Error fetching executives:', error)
    }
  }

  const fetchObjectives = async (goalId: string) => {
    if (!goalId) {
      setExistingObjectives([])
      return
    }
    
    try {
      const goal = goals.find(g => g.id === goalId)
      if (goal) {
        const response = await fetch('/dashboard/performance/api/goals')
        if (response.ok) {
          const allGoals = await response.json()
          const selectedGoal = allGoals.find((g: any) => g.id === goalId)
          if (selectedGoal?.objectives) {
            setExistingObjectives(selectedGoal.objectives)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching objectives:', error)
    }
  }

  useEffect(() => {
    if (selectedGoalId) {
      fetchObjectives(selectedGoalId)
    } else {
      setExistingObjectives([])
    }
  }, [selectedGoalId])

  const fetchInitiatives = async (objectiveId: string) => {
    if (!objectiveId) {
      setExistingInitiatives([])
      return
    }
    
    try {
      const response = await fetch('/dashboard/performance/api/goals')
      if (response.ok) {
        const allGoals = await response.json()
        for (const goal of allGoals) {
          for (const objective of goal.objectives || []) {
            if (objective.id === objectiveId) {
              setExistingInitiatives(objective.initiatives || [])
              return
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error)
    }
  }

  useEffect(() => {
    if (selectedObjectiveId) {
      fetchInitiatives(selectedObjectiveId)
    } else {
      setExistingInitiatives([])
    }
  }, [selectedObjectiveId])

  const addObjective = () => {
    setObjectives([...objectives, { number: '', title: '' }])
  }

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  const updateObjective = (index: number, field: keyof Objective, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index][field] = value
    setObjectives(newObjectives)
  }

  const addInitiative = () => {
    setInitiatives([...initiatives, { 
      number: '', 
      title: '', 
      measure: '', 
      action: '', 
      reportingPeriod: '',
      annualTarget: '',
      quarterlyTargets: { q1: false, q2: false, q3: false, q4: false },
      primaryResponsibility: '', 
      secondaryResponsibility: '' 
    }])
  }

  const removeInitiative = (index: number) => {
    setInitiatives(initiatives.filter((_, i) => i !== index))
  }

  const updateInitiative = (index: number, field: keyof Initiative, value: any) => {
    const newInitiatives = [...initiatives]
    newInitiatives[index][field] = value
    setInitiatives(newInitiatives)
  }

  const updateQuarterlyTarget = (index: number, quarter: 'q1' | 'q2' | 'q3' | 'q4', checked: boolean) => {
    const newInitiatives = [...initiatives]
    newInitiatives[index].quarterlyTargets[quarter] = checked
    setInitiatives(newInitiatives)
  }

  const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
    if (!confirm(`Are you sure you want to delete the goal "${goalTitle}"? This will also delete all associated objectives and initiatives.`)) {
      return
    }

    try {
      const response = await fetch(`/dashboard/performance/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: 'Goal deleted successfully!' })
        fetchGoals()
        onSuccess()
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast({ title: 'Failed to delete goal', variant: 'destructive' })
    }
  }

  const handleDeleteObjective = async (objectiveId: string, objectiveTitle: string) => {
    if (!confirm(`Delete objective "${objectiveTitle}" and all initiatives?`)) return

    try {
      const response = await fetch(`/dashboard/performance/api/objectives/${objectiveId}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Objective deleted!' })
        fetchGoals()
        if (selectedGoalId) fetchObjectives(selectedGoalId)
        onSuccess()
      } else {
        toast({ title: 'Failed to delete objective', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Failed to delete objective', variant: 'destructive' })
    }
  }

  const handleCreateGoal = async () => {
    if (!goalData.goalNumber || !goalData.title) {
      toast({ title: 'Please fill in goal number and title', variant: 'destructive' })
      return
    }

    // Check for duplicate goal number
    const existingGoal = goals.find(g => g.goalNumber === goalData.goalNumber)
    if (existingGoal) {
      toast({ title: `$1`, variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const currentYear = new Date().getFullYear()
      const goalPayload = {
        ...goalData,
        description: '',
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
      }
      
      const response = await fetch('/dashboard/performance/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalPayload),
      })

      if (!response.ok) {
        throw new Error('Failed to create goal')
      }

      toast({ title: 'Goal created successfully!' })
      setGoalData({ goalNumber: '', title: '' })
      fetchGoals()
      onSuccess()
    } catch (error) {
      console.error('Error creating goal:', error)
      toast({ title: 'Failed to create goal', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddObjectives = async () => {
    if (!selectedGoalId) {
      toast({ title: 'Please select a goal', variant: 'destructive' })
      return
    }

    const validObjectives = objectives.filter(obj => obj.number.trim() !== '' && obj.title.trim() !== '')
    if (validObjectives.length === 0) {
      toast({ title: 'Please add at least one objective with both number and title', variant: 'destructive' })
      return
    }

    // Check for duplicate objective numbers
    const existingNumbers = existingObjectives.map(obj => obj.title.split('.')[0])
    for (const objective of validObjectives) {
      if (existingNumbers.includes(objective.number)) {
        toast({ title: `$1`, variant: "destructive" })
        return
      }
    }

    setSubmitting(true)
    try {
      for (const objective of validObjectives) {
        await fetch('/dashboard/performance/api/objectives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${objective.number}. ${objective.title}`,
            description: '',
            goalId: selectedGoalId,
          }),
        })
      }

      toast({ title: 'Objectives added successfully!' })
      setSelectedGoalId('')
      setObjectives([{ number: '', title: '' }])
      setExistingObjectives([])
      onSuccess()
    } catch (error) {
      console.error('Error adding objectives:', error)
      toast({ title: 'Failed to add objectives', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddInitiatives = async () => {
    if (!selectedObjectiveId) {
      toast({ title: 'Please select an objective', variant: 'destructive' })
      return
    }

    const validInitiatives = initiatives.filter(
      init => init.number.trim() !== '' && 
              init.title.trim() !== '' && 
              init.measure.trim() !== '' &&
              init.action.trim() !== '' &&
              init.reportingPeriod.trim() !== '' &&
              init.annualTarget.trim() !== '' &&
              init.primaryResponsibility.trim() !== ''
    )
    if (validInitiatives.length === 0) {
      toast({ title: 'Please fill in all required fields: number, title, measure, action, reporting period, annual target, and primary responsible', variant: 'destructive' })
      return
    }

    // Check for duplicate initiative numbers
    const existingNumbers = existingInitiatives.map(init => init.number)
    for (const initiative of validInitiatives) {
      if (existingNumbers.includes(initiative.number)) {
        toast({ title: `$1`, variant: "destructive" })
        return
      }
    }

    setSubmitting(true)
    try {
      for (const initiative of validInitiatives) {
        await fetch('/dashboard/performance/api/initiatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: initiative.number,
            title: initiative.title,
            description: initiative.measure,
            measure: initiative.measure,
            action: initiative.action,
            objectiveId: selectedObjectiveId,
            reportingPeriods: [initiative.reportingPeriod],
            quarterDates: initiative.quarterlyTargets,
            target: initiative.annualTarget,
            primaryResponsibility: initiative.primaryResponsibility,
            secondaryResponsibility: initiative.secondaryResponsibility || '',
          }),
        })
      }

      toast({ title: 'Initiatives added successfully!' })
      setSelectedGoalIdForInitiative('')
      setSelectedObjectiveId('')
      setInitiatives([{ 
        number: '', 
        title: '', 
        measure: '', 
        action: '', 
        reportingPeriod: '',
        annualTarget: '',
        quarterlyTargets: { q1: false, q2: false, q3: false, q4: false },
        primaryResponsibility: '', 
        secondaryResponsibility: '' 
      }])
      setExistingInitiatives([])
      onSuccess()
    } catch (error) {
      console.error('Error adding initiatives:', error)
      toast({ title: 'Failed to add initiatives', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Goals, Objectives & Initiatives</DialogTitle>
          <DialogDescription>
            Create goals, add objectives to goals, and add initiatives to objectives
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="add-initiatives">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create-goal">Create Goal</TabsTrigger>
            <TabsTrigger value="add-objectives">Add Objectives</TabsTrigger>
            <TabsTrigger value="add-initiatives">Add Initiatives</TabsTrigger>
          </TabsList>

          {/* Create Goal Tab */}
          <TabsContent value="create-goal" className="space-y-4">
            {/* Existing Goals */}
            {goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Existing Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {goals
                      .sort((a, b) => {
                        const numA = parseInt(a.goalNumber) || 0
                        const numB = parseInt(b.goalNumber) || 0
                        return numA - numB
                      })
                      .map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{goal.goalNumber}</span>
                            <span className="text-gray-600">-</span>
                            <span className="text-sm">{goal.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id, goal.title)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Goal Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">New Goal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Goal Number *</Label>
                    <Input
                      value={goalData.goalNumber}
                      onChange={(e) => setGoalData({ ...goalData, goalNumber: e.target.value })}
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Goal Title *</Label>
                    <Input
                      value={goalData.title}
                      onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                      placeholder="Enter goal title"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGoal} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Goal'}
              </Button>
            </div>
          </TabsContent>

          {/* Add Objectives Tab */}
          <TabsContent value="add-objectives" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Goal *</Label>
                  <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal to add objectives to" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals
                        .sort((a, b) => {
                          const numA = parseInt(a.goalNumber) || 0
                          const numB = parseInt(b.goalNumber) || 0
                          return numA - numB
                        })
                        .map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.goalNumber} - {goal.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedGoalId && (
              <>
                {/* Existing Objectives */}
                {existingObjectives.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Existing Objectives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {existingObjectives
                          .sort((a, b) => {
                            const numA = parseInt(a.title.split('.')[0]) || 0
                            const numB = parseInt(b.title.split('.')[0]) || 0
                            return numA - numB
                          })
                          .map((obj) => (
                            <div key={obj.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                              <span className="text-sm">{obj.title}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteObjective(obj.id, obj.title)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* New Objectives Form */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Add New Objectives</CardTitle>
                      <Button size="sm" onClick={addObjective} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Objective
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {objectives.map((objective, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-24">
                          <Label>Number *</Label>
                          <Input
                            value={objective.number}
                            onChange={(e) => updateObjective(index, 'number', e.target.value)}
                            placeholder="e.g., 1"
                          />
                        </div>
                        <div className="flex-1">
                          <Label>Objective Title *</Label>
                          <Input
                            value={objective.title}
                            onChange={(e) => updateObjective(index, 'title', e.target.value)}
                            placeholder="Enter objective title"
                          />
                        </div>
                        {objectives.length > 1 && (
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => removeObjective(index)}
                            className="mt-6"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddObjectives} 
                disabled={submitting || !selectedGoalId}
              >
                {submitting ? 'Adding...' : 'Add Objectives'}
              </Button>
            </div>
          </TabsContent>

          {/* Add Initiatives Tab */}
          <TabsContent value="add-initiatives" className="space-y-4">
            {/* Goal Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Goal and Objective</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Goal *</Label>
                  <Select 
                    value={selectedGoalIdForInitiative} 
                    onValueChange={(value) => {
                      setSelectedGoalIdForInitiative(value)
                      setSelectedObjectiveId('')
                      setExistingInitiatives([])
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals
                        .sort((a, b) => {
                          const numA = parseInt(a.goalNumber) || 0
                          const numB = parseInt(b.goalNumber) || 0
                          return numA - numB
                        })
                        .map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.goalNumber} - {goal.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedGoalIdForInitiative && (
                  <div>
                    <Label>Objective *</Label>
                    <Select value={selectedObjectiveId} onValueChange={setSelectedObjectiveId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an objective" />
                      </SelectTrigger>
                      <SelectContent>
                        {goals
                          .find(g => g.id === selectedGoalIdForInitiative)
                          ?.objectives?.sort((a: Objective, b: Objective) => {
                            const numA = parseInt(a.title.split('.')[0]) || 0
                            const numB = parseInt(b.title.split('.')[0]) || 0
                            return numA - numB
                          })
                          .map((objective: any) => (
                            <SelectItem key={objective.id} value={objective.id}>
                              {objective.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedObjectiveId && (
              <>
                {/* Existing Initiatives */}
                {existingInitiatives.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Existing Initiatives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {existingInitiatives
                          .sort((a, b) => {
                            const numA = parseInt(a.number) || 0
                            const numB = parseInt(b.number) || 0
                            return numA - numB
                          })
                          .map((init) => (
                            <div key={init.id} className="p-2 bg-gray-50 rounded">
                              <div className="text-sm font-semibold">{init.number}. {init.title}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Measure: {init.measure || 'N/A'} • Action: {init.action || 'N/A'}
                              </div>
                              {(init.primaryResponsibility || init.secondaryResponsibility) && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Primary: {executives.find(e => e.id === init.primaryResponsibility)?.name || 'N/A'}
                                  {init.secondaryResponsibility && ` • Secondary: ${executives.find(e => e.id === init.secondaryResponsibility)?.name || 'N/A'}`}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* New Initiatives Form */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Add New Initiatives</CardTitle>
                      <Button size="sm" onClick={addInitiative} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Initiative
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {initiatives.map((initiative, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="w-24">
                              <Label>Number *</Label>
                              <Input
                                value={initiative.number}
                                onChange={(e) => updateInitiative(index, 'number', e.target.value)}
                                placeholder="e.g., 1"
                              />
                            </div>
                            <div className="flex-1">
                              <Label>Initiative Title *</Label>
                              <Input
                                value={initiative.title}
                                onChange={(e) => updateInitiative(index, 'title', e.target.value)}
                                placeholder="Enter initiative title"
                              />
                            </div>
                            {initiatives.length > 1 && (
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => removeInitiative(index)}
                                className="mt-6"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div>
                            <Label>Measure *</Label>
                            <Input
                              value={initiative.measure}
                              onChange={(e) => updateInitiative(index, 'measure', e.target.value)}
                              placeholder="Enter measure"
                            />
                          </div>
                          <div>
                            <Label>Action *</Label>
                            <Input
                              value={initiative.action}
                              onChange={(e) => updateInitiative(index, 'action', e.target.value)}
                              placeholder="Enter action"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Reporting Period *</Label>
                              <Select 
                                value={initiative.reportingPeriod} 
                                onValueChange={(value) => updateInitiative(index, 'reportingPeriod', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reporting period" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Annual">Annual</SelectItem>
                                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Annual Target *</Label>
                              <Input
                                value={initiative.annualTarget}
                                onChange={(e) => updateInitiative(index, 'annualTarget', e.target.value)}
                                placeholder="Enter annual target"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Quarterly Targets</Label>
                            <div className="flex gap-2 mt-2">
                              {[
                                { key: 'q1' as const, label: 'Quarter 1', dates: 'Mar-Jun' },
                                { key: 'q2' as const, label: 'Quarter 2', dates: 'Jul-Sep' },
                                { key: 'q3' as const, label: 'Quarter 3', dates: 'Oct-Dec' },
                                { key: 'q4' as const, label: 'Quarter 4', dates: 'Jan-Mar' },
                              ].map((quarter) => (
                                <label
                                  key={quarter.key}
                                  className={`flex-1 flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                    initiative.quarterlyTargets[quarter.key]
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={initiative.quarterlyTargets[quarter.key]}
                                    onChange={(e) => updateQuarterlyTarget(index, quarter.key, e.target.checked)}
                                    className="mb-1"
                                  />
                                  <span className="text-sm font-medium">{quarter.label}</span>
                                  <span className="text-xs text-gray-500">{quarter.dates}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Primary Responsible *</Label>
                              <Select 
                                value={initiative.primaryResponsibility} 
                                onValueChange={(value) => {
                                  updateInitiative(index, 'primaryResponsibility', value)
                                  // Clear secondary if it matches the new primary
                                  if (initiative.secondaryResponsibility === value) {
                                    updateInitiative(index, 'secondaryResponsibility', '')
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select primary responsible" />
                                </SelectTrigger>
                                <SelectContent>
                                  {executives.length === 0 && <div className="px-2 py-1 text-sm text-gray-500">No executives found</div>}
                                  {executives.map((exec) => (
                                    <SelectItem key={exec.id} value={exec.id}>
                                      {exec.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Secondary Responsible (Optional)</Label>
                              <Select 
                                value={initiative.secondaryResponsibility || 'none'} 
                                onValueChange={(value) => updateInitiative(index, 'secondaryResponsibility', value === 'none' ? '' : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select secondary responsible (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {executives
                                    .filter(exec => exec.id !== initiative.primaryResponsibility)
                                    .map((exec) => (
                                      <SelectItem key={exec.id} value={exec.id}>
                                        {exec.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddInitiatives} 
                disabled={submitting || !selectedObjectiveId}
              >
                {submitting ? 'Adding...' : 'Add Initiatives'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
