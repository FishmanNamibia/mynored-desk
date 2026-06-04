'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from "@/hooks/use-toast"
import { GraduationCap, Plus, Trash2, AlertCircle } from 'lucide-react'

interface TrainingNeed {
  id?: string
  title: string
  description: string
  preferredTimeline?: string
}

export default function TrainingNeedsPage() {
  const [trainingNeeds, setTrainingNeeds] = useState<TrainingNeed[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTrainingNeeds()
  }, [])

  const fetchTrainingNeeds = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/training-needs', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setTrainingNeeds(data)
      }
    } catch (error) {
      console.error('Failed to fetch training needs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load training needs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addTrainingNeed = () => {
    if (trainingNeeds.length >= 3) {
      toast({
        title: 'Maximum Reached',
        description: 'You can specify up to 3 training needs only',
        variant: 'destructive'
      })
      return
    }
    setTrainingNeeds([...trainingNeeds, {
      title: '',
      description: '',
      preferredTimeline: ''
    }])
  }

  const removeTrainingNeed = (index: number) => {
    setTrainingNeeds(trainingNeeds.filter((_, i) => i !== index))
  }

  const updateTrainingNeed = (index: number, field: keyof TrainingNeed, value: any) => {
    const updated = [...trainingNeeds]
    updated[index] = { ...updated[index], [field]: value }
    setTrainingNeeds(updated)
  }

  const saveTrainingNeeds = async () => {
    // Validate
    for (let i = 0; i < trainingNeeds.length; i++) {
      const need = trainingNeeds[i]
      if (!need.title.trim()) {
        toast({
          title: 'Validation Error',
          description: `Training ${i + 1}: Title is required`,
          variant: 'destructive'
        })
        return
      }
      if (!need.description.trim()) {
        toast({
          title: 'Validation Error',
          description: `Training ${i + 1}: Description is required`,
          variant: 'destructive'
        })
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch('/dashboard/performance/api/training-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trainingNeeds })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Training needs saved successfully'
        })
        await fetchTrainingNeeds()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to save training needs',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to save training needs:', error)
      toast({
        title: 'Error',
        description: 'Failed to save training needs',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border rounded-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            Training Needs Assessment
          </h1>
          <p className="text-gray-600 mt-1">
            Specify up to 3 training needs to enhance your work performance and address emerging trends
          </p>
        </div>
        <Button
          onClick={addTrainingNeed}
          disabled={trainingNeeds.length >= 3}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Training Need
        </Button>
      </div>

      {trainingNeeds.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Training Needs Specified</h3>
              <p className="text-gray-600 mb-4">
                Add training needs to help the organization plan your professional development
              </p>
              <Button onClick={addTrainingNeed} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Training Need
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trainingNeeds.map((need, index) => (
            <Card key={index} className="border-2 border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Training Need {index + 1}</CardTitle>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTrainingNeed(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Training Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={need.title}
                    onChange={(e) => updateTrainingNeed(index, 'title', e.target.value)}
                    placeholder="e.g., Advanced Data Analysis Techniques"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={need.description}
                    onChange={(e) => updateTrainingNeed(index, 'description', e.target.value)}
                    placeholder="Describe the training need and how it will help you improve your work performance..."
                    rows={3}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Timeline
                  </label>
                  <Input
                    value={need.preferredTimeline || ''}
                    onChange={(e) => updateTrainingNeed(index, 'preferredTimeline', e.target.value)}
                    placeholder="e.g., Q2 2024, Within 3 months"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {trainingNeeds.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={saveTrainingNeeds}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {saving ? 'Saving...' : 'Save Training Needs'}
          </Button>
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Why Training Needs Matter</p>
              <p className="text-blue-700">
                Your training needs help the organization plan professional development opportunities that align with both your career goals and emerging industry trends. 
                This information will be considered in the annual training planning process and included in your performance report.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
