'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Save, AlertCircle, CheckCircle2, Clock, ClipboardCheck, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PerformancePeriod {
  id: string
  name: string
  submissionDeadline: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export default function PerformancePeriodPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [period, setPeriod] = useState<PerformancePeriod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    submissionDeadline: '',
    startDate: '',
    endDate: ''
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchActivePeriod()
  }, [])

  const fetchActivePeriod = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-period')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setPeriod(data)
          setFormData({
            name: data.name,
            submissionDeadline: formatDateForInput(data.submissionDeadline),
            startDate: formatDateForInput(data.startDate),
            endDate: formatDateForInput(data.endDate)
          })
        }
      }
    } catch (error) {
      console.error('Error fetching period:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const url = '/dashboard/performance/api/performance-period'
      const method = period ? 'PATCH' : 'POST'
      const body = period 
        ? { id: period.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        setPeriod(data)
        setSuccessMessage(period ? 'Performance period updated successfully!' : 'Performance period created successfully!')
        setTimeout(() => setSuccessMessage(''), 5000)
        fetchActivePeriod()
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Failed to save performance period')
      }
    } catch (error) {
      console.error('Error saving period:', error)
      setErrorMessage('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const isDeadlinePassed = period && new Date(period.submissionDeadline) < new Date()
  const daysUntilDeadline = period 
    ? Math.ceil((new Date(period.submissionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Period Management</h1>
        <p className="text-gray-600 mt-2">
          Set deadlines for performance agreement submission and review periods
        </p>
      </div>

      {/* Current Period Status */}
      {period && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Active Performance Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Period Name</p>
                <p className="text-lg font-medium">{period.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Submission Deadline</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-medium">
                    {formatDateForDisplay(period.submissionDeadline)}
                  </p>
                  {isDeadlinePassed ? (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Passed
                    </span>
                  ) : daysUntilDeadline <= 7 ? (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {daysUntilDeadline} days left
                    </span>
                  ) : (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {daysUntilDeadline} days left
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Review Period Start</p>
                <p className="text-lg font-medium">{formatDateForDisplay(period.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Review Period End</p>
                <p className="text-lg font-medium">{formatDateForDisplay(period.endDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {period ? 'Update Performance Period' : 'Create Performance Period'}
          </CardTitle>
          <CardDescription>
            {period 
              ? 'Modify deadlines for the current performance period. Changes will affect all users immediately.'
              : 'Set up a new performance period with submission and review deadlines.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Period Name */}
            <div>
              <Label htmlFor="name">Period Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 2025/2026 Performance Agreement Period"
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                A descriptive name for this performance period
              </p>
            </div>

            {/* Submission Deadline */}
            <div>
              <Label htmlFor="submissionDeadline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Submission Deadline *
              </Label>
              <Input
                id="submissionDeadline"
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Last date for staff to submit their performance agreements for approval
              </p>
            </div>

            {/* Review Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Review Period Start *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  When the performance period begins
                </p>
              </div>

              <div>
                <Label htmlFor="endDate">Review Period End *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  When the performance period ends
                </p>
              </div>
            </div>

            {/* Info Box */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> The submission deadline should be set before the review period starts. 
                Staff must submit and get approval for their performance agreements by the submission deadline. 
                The actual work and progress tracking happens during the review period (start to end date).
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={fetchActivePeriod}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {period ? 'Update Period' : 'Create Period'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-6 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong className="text-blue-600">1. Submission Deadline:</strong>
            <p className="text-gray-700">
              Staff must customize their actions, assign weights, and submit their performance agreements 
              to their supervisors before this date.
            </p>
          </div>
          <div>
            <strong className="text-green-600">2. Review Period:</strong>
            <p className="text-gray-700">
              The actual performance period during which staff work on their approved agreements 
              and supervisors track progress.
            </p>
          </div>
          <div>
            <strong className="text-purple-600">3. Automatic Notifications:</strong>
            <p className="text-gray-700">
              Staff will receive reminders as the submission deadline approaches. Late submissions 
              may require special approval.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
