'use client'

import { toast } from "@/hooks/use-toast";

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

interface Objective {
  title: string
}

interface CreateGoalSimpleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateGoalSimple({ open, onOpenChange, onSuccess }: CreateGoalSimpleProps) {
  const [submitting, setSubmitting] = useState(false)
  
  // Goal data
  const [goalData, setGoalData] = useState({
    goalNumber: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  })

  // Objectives
  const [objectives, setObjectives] = useState<Objective[]>([
    { title: '' }
  ])

  const addObjective = () => {
    setObjectives([...objectives, { title: '' }])
  }

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  const updateObjective = (index: number, field: keyof Objective, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index][field] = value
    setObjectives(newObjectives)
  }

  const handleSubmit = async () => {
    // Validation
    if (!goalData.goalNumber || !goalData.title) {
      toast({ title: 'Please fill in goal number and title', variant: 'destructive' })
      return
    }

    // Check if at least one objective has a title
    const validObjectives = objectives.filter(obj => obj.title.trim() !== '')
    if (validObjectives.length === 0) {
      toast({ title: 'Please add at least one objective', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      // Create goal
      const currentYear = new Date().getFullYear()
      const goalPayload = {
        ...goalData,
        startDate: goalData.startDate || `${currentYear}-01-01`,
        endDate: goalData.endDate || `${currentYear}-12-31`,
      }
      
      const goalResponse = await fetch('/dashboard/performance/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalPayload),
      })

      if (!goalResponse.ok) {
        throw new Error('Failed to create goal')
      }
      const goal = await goalResponse.json()

      // Create objectives
      for (const objective of validObjectives) {
        await fetch('/dashboard/performance/api/objectives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: objective.title,
            description: '',
            goalId: goal.id,
          }),
        })
      }

      toast({ title: 'Goal and objectives created successfully!' })
      
      // Reset form
      setGoalData({
        goalNumber: '',
        title: '',
        description: '',
        startDate: '',
        endDate: '',
      })
      setObjectives([{ title: '' }])
      
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating goal:', error)
      toast({ title: 'Failed to create goal. Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Goal with Objectives</DialogTitle>
          <DialogDescription>
            Create a strategic goal and add multiple objectives on this page
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Goal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Goal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Goal Number *</Label>
                  <Input
                    value={goalData.goalNumber}
                    onChange={(e) => setGoalData({ ...goalData, goalNumber: e.target.value })}
                    placeholder="e.g., G1"
                  />
                </div>
                <div>
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

          {/* Objectives */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Strategic Objectives</CardTitle>
                <Button size="sm" onClick={addObjective} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Objective
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {objectives.map((objective, index) => (
                <Card key={index} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <Label>Objective {index + 1} Title *</Label>
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
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Goal & Objectives'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
