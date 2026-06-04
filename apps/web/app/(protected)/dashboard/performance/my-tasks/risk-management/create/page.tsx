'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

export default function CreateRiskTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    riskCategory: '',
    riskDescription: '',
    cause: '',
    impact: '',
    likelihood: 'POSSIBLE',
    impactLevel: 'MODERATE',
    mitigations: '',
    furtherActions: '',
    dueDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.riskCategory || !formData.riskDescription) {
      setError('Risk Category and Risk Description are required')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/dashboard/performance/api/risk-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        router.push('/dashboard/performance/my-tasks/risk-management')
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to create risk task')
      }
    } catch (err) {
      console.error('Error creating risk task:', err)
      setError('Error creating risk task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Risk Management
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Create New Risk Task</h1>
        <p className="text-muted-foreground mt-2">
          Add a new risk task with detailed information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="riskCategory">
                  Risk Category <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="riskCategory"
                  value={formData.riskCategory}
                  onChange={(e) => setFormData({ ...formData, riskCategory: e.target.value })}
                  placeholder="e.g., Operational, Financial, Strategic"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskDescription">
                Risk Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="riskDescription"
                value={formData.riskDescription}
                onChange={(e) => setFormData({ ...formData, riskDescription: e.target.value })}
                placeholder="Describe the risk in detail..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cause">Cause</Label>
              <Textarea
                id="cause"
                value={formData.cause}
                onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                placeholder="What causes this risk?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impact">Impact</Label>
              <Textarea
                id="impact"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                placeholder="What is the potential impact?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="likelihood">Likelihood</Label>
                <Select
                  value={formData.likelihood}
                  onValueChange={(value) => setFormData({ ...formData, likelihood: value })}
                >
                  <SelectTrigger id="likelihood">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNLIKELY">Unlikely</SelectItem>
                    <SelectItem value="POSSIBLE">Possible</SelectItem>
                    <SelectItem value="PROBABLE">Probable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impactLevel">Impact Level</Label>
                <Select
                  value={formData.impactLevel}
                  onValueChange={(value) => setFormData({ ...formData, impactLevel: value })}
                >
                  <SelectTrigger id="impactLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINOR">Minor</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="SIGNIFICANT">Significant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mitigations">Mitigations</Label>
              <Textarea
                id="mitigations"
                value={formData.mitigations}
                onChange={(e) => setFormData({ ...formData, mitigations: e.target.value })}
                placeholder="What measures can mitigate this risk?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="furtherActions">Further Actions</Label>
              <Textarea
                id="furtherActions"
                value={formData.furtherActions}
                onChange={(e) => setFormData({ ...formData, furtherActions: e.target.value })}
                placeholder="What additional actions are needed?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Risk Task
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
