'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Save, AlertCircle, CheckCircle2, Clock, ClipboardCheck, FileText, Shield, History, ChevronDown, ChevronUp, Bell } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import 'react-day-picker/dist/style.css'

interface PerformancePeriod {
  id: string
  name: string
  submissionDeadline: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
}

export default function PerformancePeriodPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [period, setPeriod] = useState<PerformancePeriod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    submissionDeadline: '',
    startDate: '',
    endDate: ''
  })
  const [periodRange, setPeriodRange] = useState<DateRange | undefined>()
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [historicalPeriods, setHistoricalPeriods] = useState<PerformancePeriod[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [agreementRange, setAgreementRange] = useState<DateRange | undefined>()
  const [reviewRange, setReviewRange] = useState<DateRange | undefined>()
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderStats, setReminderStats] = useState<any>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  useEffect(() => {
    fetchActivePeriod()
  }, [])

  useEffect(() => {
    if (session?.user) {
      checkManageAccess()
    }
  }, [session])

  useEffect(() => {
    // Fetch historical periods for all users once access check is complete
    if (!checkingAccess) {
      fetchHistoricalPeriods()
    }
  }, [checkingAccess])

  // Sync agreement range with form data
  useEffect(() => {
    if (formData.submissionDeadline) {
      const deadline = new Date(formData.submissionDeadline)
      // Create a 2-week range ending on the deadline for agreement creation
      const start = new Date(deadline)
      start.setDate(start.getDate() - 13) // 14 days before deadline
      setAgreementRange({
        from: start,
        to: deadline
      })
    }
  }, [formData.submissionDeadline])

  // Sync review range with form data
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      setReviewRange({
        from: new Date(formData.startDate),
        to: new Date(formData.endDate)
      })
    }
  }, [formData.startDate, formData.endDate])

  // Auto-generate period name from date range
  useEffect(() => {
    if (periodRange?.from && periodRange?.to) {
      const startYear = periodRange.from.getFullYear()
      const endYear = periodRange.to.getFullYear()
      const generatedName = startYear === endYear 
        ? `${startYear} Performance Period`
        : `${startYear}/${endYear} Performance Period`
      setFormData(prev => ({ ...prev, name: generatedName }))
    }
  }, [periodRange])

  const checkManageAccess = async () => {
    if (!session?.user) {
      console.log('[Access Check] No session user')
      setCheckingAccess(false)
      return
    }

    const userRole = session.user.role
    const userJobTitle = session.user.jobTitle
    console.log('[Access Check] User role:', userRole)
    console.log('[Access Check] User jobTitle:', userJobTitle)
    console.log('[Access Check] Department ID:', session.user.departmentId)

    // Check if user has admin role
    if (userRole === 'ADMIN') {
      console.log('[Access Check] Admin access granted')
      setCanManage(true)
      setCheckingAccess(false)
      return
    }

    // Check if user has Human Capital Executive role (direct match)
    if (userRole === 'HUMAN_CAPITAL_EXECUTIVE' || userRole === 'HC_EXECUTIVE') {
      console.log('[Access Check] Human Capital Executive role - access granted')
      setCanManage(true)
      setCheckingAccess(false)
      return
    }

    // Explicit AD job titles that are always allowed to manage performance cycles
    const ALLOWED_JOB_TITLES = [
      'human capital executive',
      'od specialist',
      'strategy coordination',
    ]
    const jobTitleLower = (userJobTitle || '').toLowerCase()
    if (ALLOWED_JOB_TITLES.some(t => jobTitleLower.includes(t))) {
      console.log('[Access Check] Allowed job title matched - access granted:', userJobTitle)
      setCanManage(true)
      setCheckingAccess(false)
      return
    }

    // Check if user has executive role (handles various formats)
    const hasExecutiveRole = userRole === 'EXECUTIVE' || 
                            (userRole && userRole.toLowerCase().includes('executive'))
    
    // Also check jobTitle for executive positions (fallback for Human Capital executives)
    const hasExecutiveJobTitle = userJobTitle && (
      userJobTitle.toLowerCase().includes('executive') ||
      userJobTitle.toLowerCase().includes('admin') ||
      userJobTitle.toLowerCase().includes('human capital')
    )

    console.log('[Access Check] hasExecutiveRole:', hasExecutiveRole)
    console.log('[Access Check] hasExecutiveJobTitle:', hasExecutiveJobTitle)

    // For generic EXECUTIVE role or executive job title, check if they're in Human Capital department
    if ((hasExecutiveRole || hasExecutiveJobTitle) && session.user.departmentId) {
      try {
        console.log('[Access Check] Checking department for EXECUTIVE...')
        const response = await fetch(`/dashboard/performance/api/departments/${session.user.departmentId}`)
        if (response.ok) {
          const department = await response.json()
          console.log('[Access Check] Department data:', department)
          const deptName = department.name.toLowerCase()
          console.log('[Access Check] Department name (lowercase):', deptName)
          const isHC = deptName.includes('human capital') ||
                      deptName.includes('human resources') ||
                      deptName.includes('hr')
          console.log('[Access Check] Is Human Capital department?', isHC)
          setCanManage(isHC)
        } else {
          console.log('[Access Check] Failed to fetch department, status:', response.status)
          setCanManage(false)
        }
      } catch (error) {
        console.error('[Access Check] Error checking department:', error)
        setCanManage(false)
      }
    } else if (hasExecutiveJobTitle) {
      // If they have executive/Human Capital job title but no department ID, still allow access
      console.log('[Access Check] Executive/Human Capital job title without department check - allowing access')
      setCanManage(true)
    } else {
      console.log('[Access Check] Not EXECUTIVE role/title or no departmentId')
      setCanManage(false)
    }

    setCheckingAccess(false)
  }

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
        setIsCreatingNew(false) // Reset create new mode when fetching existing period
      }
    } catch (error) {
      console.error('Error fetching period:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoricalPeriods = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/dashboard/performance/api/performance-period?includeHistory=true')
      if (response.ok) {
        const data = await response.json()
        // Filter out the active period to show only historical ones
        const historical = data.filter((p: PerformancePeriod) => !p.isActive)
        setHistoricalPeriods(historical)
      }
    } catch (error) {
      console.error('Error fetching historical periods:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const formatDateForInput = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    // Use local date formatting to avoid timezone shifts
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getSelectedDates = () => {
    const dates: Date[] = []
    
    // Add current period dates if exists
    if (period) {
      // Agreement creation period - 2 weeks leading to deadline
      const deadline = new Date(period.submissionDeadline)
      const agreementStart = new Date(deadline)
      agreementStart.setDate(agreementStart.getDate() - 13)
      
      const currentDate = new Date(agreementStart)
      while (currentDate <= deadline) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Review period dates
      const startDate = new Date(period.startDate)
      const endDate = new Date(period.endDate)
      
      const reviewDate = new Date(startDate)
      while (reviewDate <= endDate) {
        dates.push(new Date(reviewDate))
        reviewDate.setDate(reviewDate.getDate() + 1)
      }
    }
    
    // Add historical period dates
    historicalPeriods.forEach(histPeriod => {
      // Historical agreement creation period
      const deadline = new Date(histPeriod.submissionDeadline)
      const agreementStart = new Date(deadline)
      agreementStart.setDate(agreementStart.getDate() - 13)
      
      const currentDate = new Date(agreementStart)
      while (currentDate <= deadline) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Historical review period dates
      const startDate = new Date(histPeriod.startDate)
      const endDate = new Date(histPeriod.endDate)
      
      const reviewDate = new Date(startDate)
      while (reviewDate <= endDate) {
        dates.push(new Date(reviewDate))
        reviewDate.setDate(reviewDate.getDate() + 1)
      }
    })
    
    return dates
  }

  const getModifiers = () => {
    const modifiers: any = {
      agreement: [],
      review: [],
      today: [new Date()]
    }
    
    // Add current period modifiers
    if (period) {
      // Agreement creation period - 2 weeks leading to deadline
      const deadline = new Date(period.submissionDeadline)
      const agreementStart = new Date(deadline)
      agreementStart.setDate(agreementStart.getDate() - 13) // 14 days total including deadline
      
      const currentDate = new Date(agreementStart)
      while (currentDate <= deadline) {
        modifiers.agreement.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Review period dates
      const startDate = new Date(period.startDate)
      const endDate = new Date(period.endDate)
      
      const reviewDate = new Date(startDate)
      while (reviewDate <= endDate) {
        modifiers.review.push(new Date(reviewDate))
        reviewDate.setDate(reviewDate.getDate() + 1)
      }
    }
    
    // Add historical period modifiers
    historicalPeriods.forEach(histPeriod => {
      // Historical agreement creation period
      const deadline = new Date(histPeriod.submissionDeadline)
      const agreementStart = new Date(deadline)
      agreementStart.setDate(agreementStart.getDate() - 13)
      
      const currentDate = new Date(agreementStart)
      while (currentDate <= deadline) {
        modifiers.agreement.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Historical review period dates
      const startDate = new Date(histPeriod.startDate)
      const endDate = new Date(histPeriod.endDate)
      
      const reviewDate = new Date(startDate)
      while (reviewDate <= endDate) {
        modifiers.review.push(new Date(reviewDate))
        reviewDate.setDate(reviewDate.getDate() + 1)
      }
    })
    
    return modifiers
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    // Frontend validation - check all required fields
    if (!formData.name || !formData.submissionDeadline || !formData.startDate || !formData.endDate) {
      setErrorMessage('Please fill in all required fields in both tabs: Agreement Cycle (submission deadline) and Review Cycle (start and end dates)')
      setSaving(false)
      return
    }

    try {
      const url = '/dashboard/performance/api/performance-period'
      const method = (period && !isCreatingNew) ? 'PATCH' : 'POST'
      const body = (period && !isCreatingNew)
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
        const actionMessage = isCreatingNew 
          ? 'New performance cycle period created successfully!'
          : period 
          ? 'Performance period updated successfully!' 
          : 'Performance period created successfully!'
        setSuccessMessage(actionMessage)
        toast({
          title: '✅ Success',
          description: actionMessage,
          variant: 'default',
        })
        setTimeout(() => setSuccessMessage(''), 5000)
        setIsCreatingNew(false)
        fetchActivePeriod()
      } else {
        const error = await response.json()
        const errorMsg = error.error || 'Failed to save performance period'
        setErrorMessage(errorMsg)
        toast({
          title: '❌ Error',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving period:', error)
      const errorMsg = 'An error occurred while saving. Please try again.'
      setErrorMessage(errorMsg)
      toast({
        title: '❌ Error',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAgreementRangeSelect = (range: DateRange | undefined) => {
    setAgreementRange(range)
    if (range?.to) {
      // Set the deadline to the end date of the selected range
      setFormData(prev => ({
        ...prev,
        submissionDeadline: formatDateForInput(range.to!)
      }))
    }
  }

  const handleReviewRangeSelect = (range: DateRange | undefined) => {
    setReviewRange(range)
    if (range?.from && range?.to) {
      setFormData(prev => ({
        ...prev,
        startDate: formatDateForInput(range.from!),
        endDate: formatDateForInput(range.to!)
      }))
    }
  }

  const isDeadlinePassed = period && new Date(period.submissionDeadline) < new Date()
  const daysUntilDeadline = period 
    ? Math.ceil((new Date(period.submissionDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const handleSendReminders = async () => {
    if (!confirm('Send deadline reminder notifications to all users who haven\'t submitted their performance agreements?')) {
      return
    }

    setSendingReminders(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const response = await fetch('/dashboard/performance/api/notifications/performance-reminders', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Successfully sent ${data.notificationsSent} reminder notification${data.notificationsSent === 1 ? '' : 's'}!`)
        setReminderStats(data)
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        setErrorMessage(data.error || 'Failed to send reminders')
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
      setErrorMessage('An error occurred while sending reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  if (loading || checkingAccess) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // View-only mode for non-authorized users
  if (!canManage) {
    return (
      <div className="w-full px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Cycle Information</h1>
          <p className="text-gray-600 mt-2">
            View current performance agreement and review cycle details
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Note:</strong> Only the <strong>Human Capital Executive</strong> and <strong>System Administrators</strong> can modify performance periods and deadlines. These settings are managed centrally to ensure consistency across the organization.
          </AlertDescription>
        </Alert>

        {/* Calendar View */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Performance Calendar
              </CardTitle>
              <CardDescription>
                Overview of performance agreement deadlines and review periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Component */}
                <div className="flex-1 overflow-x-auto">
                  <DayPicker
                    mode="multiple"
                    selected={getSelectedDates()}
                    modifiers={getModifiers()}
                    modifiersStyles={{
                      agreement: { 
                        backgroundColor: '#DBEAFE', 
                        color: '#1E40AF',
                        fontWeight: 'bold',
                        border: '2px solid #93C5FD'
                      },
                      review: { 
                        backgroundColor: '#D1FAE5', 
                        color: '#065F46',
                        fontWeight: 'bold',
                        border: '2px solid #6EE7B7'
                      },
                      today: { 
                        backgroundColor: '#FEF3C7',
                        fontWeight: 'bold',
                        border: '2px solid #FCD34D'
                      }
                    }}
                    className="rounded-md border p-3"
                    showOutsideDays
                  />
                </div>

                {/* Legend */}
                <div className="lg:w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Calendar Legend</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
                          <span className="text-sm">Performance Agreement Creation Period</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-300"></div>
                          <span className="text-sm">Performance Review Period</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300"></div>
                          <span className="text-sm">Today</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Period Details */}
                    {period && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-sm mb-3">Current Period: {period.name}</h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Performance Agreement</p>
                              <p className="text-xs text-gray-600">Deadline: {formatDateForDisplay(period.submissionDeadline)}</p>
                              {isDeadlinePassed ? (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold mt-1 inline-block">
                                  Expired
                                </span>
                              ) : (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold mt-1 inline-block">
                                  {daysUntilDeadline} days left
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                              <ClipboardCheck className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Performance Review</p>
                              <p className="text-xs text-gray-600">
                                {formatDateForDisplay(period.startDate)} - {formatDateForDisplay(period.endDate)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Work execution and supervisor evaluation period
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Periods - Available to all users */}
        {historicalPeriods.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historical Performance Cycles
                  </CardTitle>
                  <CardDescription>
                    Past performance agreement and review cycles
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show ({historicalPeriods.length})
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {showHistory && (
              <CardContent>
                <div className="space-y-3">
                  {historicalPeriods.map((histPeriod) => (
                    <Card key={histPeriod.id} className="border-gray-200 bg-gray-50">
                      <CardContent className="pt-4 pb-4">
                        <div className="mb-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{histPeriod.name}</h4>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              Archived
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Archived on {new Date(histPeriod.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">Submission Deadline</p>
                            <p className="text-sm text-gray-900">{formatDateForDisplay(histPeriod.submissionDeadline)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">Review Start</p>
                            <p className="text-sm text-gray-900">{formatDateForDisplay(histPeriod.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">Review End</p>
                            <p className="text-sm text-gray-900">{formatDateForDisplay(histPeriod.endDate)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Cycle Management</h1>
        <p className="text-gray-600 mt-2">
          Manage deadlines for Performance Agreement Cycle and Performance Review Cycle
        </p>
      </div>

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


      {/* Create New Cycle Button - Only for HC Executives */}
      {canManage && (
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Performance Cycle Management</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage performance agreement cycles for the organization</p>
          </div>
          <Button
            onClick={() => {
              // Clear form to create new period
              setFormData({
                name: '',
                submissionDeadline: '',
                startDate: '',
                endDate: ''
              })
              setPeriodRange(undefined)
              setAgreementRange(undefined)
              setReviewRange(undefined)
              setSuccessMessage('')
              setErrorMessage('')
              setIsCreatingNew(true)
            }}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6 py-2"
          >
            <Calendar className="h-5 w-5" />
            Create New Performance Cycle Period
          </Button>
        </div>
      )}

      {/* No Active Period Alert */}
      {!period && !loading && canManage && (
        <Alert className="mb-6 bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>No Active Performance Period</strong> - Create a new performance cycle period to enable performance management across the organization.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Period Status */}
      {period && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Active Performance Period
              </CardTitle>
              {!isDeadlinePassed && daysUntilDeadline <= 14 && (
                <Button
                  onClick={handleSendReminders}
                  disabled={sendingReminders}
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white hover:bg-blue-100"
                >
                  <Bell className="h-4 w-4" />
                  {sendingReminders ? 'Sending...' : 'Send Reminders'}
                </Button>
              )}
            </div>
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
            
            {reminderStats && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <Bell className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Reminders sent successfully!</strong> {reminderStats.notificationsSent} user{reminderStats.notificationsSent === 1 ? '' : 's'} will be notified about the upcoming deadline.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isCreatingNew ? 'Create New Performance Cycle Period' : period ? 'Update Performance Cycles' : 'Set Performance Cycles'}
          </CardTitle>
          <CardDescription>
            {isCreatingNew 
              ? 'Define a new performance agreement and review cycle. This will deactivate the current active period.'
              : period 
              ? 'Modify the performance agreement and review cycle dates. Changes will affect all users immediately.'
              : 'Configure the complete performance management cycle in one step.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Performance Period */}
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Period</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Define the overall timeframe for this performance cycle</p>
              
              <div className="mt-2 border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <style jsx global>{`
                    .rdp-day_selected {
                      background-color: #2563eb !important;
                      color: white !important;
                      font-weight: bold;
                    }
                    .rdp-day_selected:hover {
                      background-color: #1d4ed8 !important;
                    }
                    .rdp-day_range_start,
                    .rdp-day_range_end {
                      background-color: #1e40af !important;
                      color: white !important;
                    }
                    .rdp-day_range_middle {
                      background-color: #dbeafe !important;
                      color: #1e40af !important;
                    }
                  `}</style>
                  <DayPicker
                    mode="range"
                    selected={periodRange}
                    onSelect={setPeriodRange}
                    numberOfMonths={1}
                    className="rounded-md"
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-900">Select Period Duration</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Choose the start and end dates for this performance period. The period name will be generated automatically.
                    </p>
                  </div>
                  {periodRange?.from && periodRange?.to && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-sm">
                          <strong>Start:</strong> {formatDateForDisplay(periodRange.from.toISOString())}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-700"></div>
                        <span className="text-sm">
                          <strong>End:</strong> {formatDateForDisplay(periodRange.to.toISOString())}
                        </span>
                      </div>
                      <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                        <p className="text-xs text-purple-600 font-semibold mb-1">Generated Period Name:</p>
                        <p className="text-sm text-purple-900 font-medium">{formData.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                The period name is automatically generated from the selected dates (e.g., "2025 Performance Period" or "2025/2026 Performance Period")
              </p>

              {/* Hidden input to maintain form data */}
              <input type="hidden" name="periodName" value={formData.name} />
            </div>

            {/* Step 2: Agreement Creation & Approval Period */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                <h3 className="text-lg font-semibold text-gray-900">Agreement Creation & Approval Period</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Set the deadline for staff to create and submit their performance agreements for supervisor approval</p>
              
              <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <DayPicker
                      mode="range"
                      selected={agreementRange}
                      onSelect={handleAgreementRangeSelect}
                      numberOfMonths={1}
                      className="rounded-md"
                      disabled={!canManage}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">Selected Period</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Choose a 2-4 week period when staff can create and submit their performance agreements
                      </p>
                    </div>
                    {agreementRange?.from && agreementRange?.to && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm">
                            <strong>Start:</strong> {formatDateForDisplay(agreementRange.from.toISOString())}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-700"></div>
                          <span className="text-sm">
                            <strong>Deadline:</strong> {formatDateForDisplay(agreementRange.to.toISOString())}
                          </span>
                        </div>
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                          Staff have {Math.ceil((agreementRange.to.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days to create and submit agreements
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submission Deadline */}
              <div className="mt-4">
                <Label htmlFor="submissionDeadline" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Submission Deadline *
                </Label>
                <Input
                  id="submissionDeadline"
                  name="submissionDeadline"
                  type="date"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                  required
                  disabled={!canManage}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Last date for staff to submit their performance agreements for approval
                </p>
              </div>
            </div>

            {/* Step 3: Performance Review Cycle */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Review Cycle</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Define when staff execute their approved agreements and supervisors conduct performance reviews</p>
              
              <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <DayPicker
                      mode="range"
                      selected={reviewRange}
                      onSelect={handleReviewRangeSelect}
                      numberOfMonths={1}
                      className="rounded-md"
                      disabled={!canManage}
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-900">Selected Period</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Choose the period when staff work on agreements and supervisors conduct reviews
                      </p>
                    </div>
                    {reviewRange?.from && reviewRange?.to && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm">
                            <strong>Work Start:</strong> {formatDateForDisplay(reviewRange.from.toISOString())}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-700"></div>
                          <span className="text-sm">
                            <strong>Review Deadline:</strong> {formatDateForDisplay(reviewRange.to.toISOString())}
                          </span>
                        </div>
                        <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
                          Review period: {Math.ceil((reviewRange.to.getTime() - reviewRange.from.getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Review Period Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Review Period Start *
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    disabled={!canManage}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    When staff begin working on approved agreements
                  </p>
                </div>

                <div>
                  <Label htmlFor="endDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Review Period End *
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    disabled={!canManage}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    When supervisors must complete all ratings
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Complete Performance Cycle Timeline:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li><strong>Step 1:</strong> Define the overall performance period timeframe</li>
                  <li><strong>Step 2:</strong> Staff create and submit agreements by the deadline</li>
                  <li><strong>Step 2:</strong> Supervisors review and approve submitted agreements</li>
                  <li><strong>Step 3:</strong> Staff execute approved agreements during the work period</li>
                  <li><strong>Step 3:</strong> Staff upload evidence of completed work</li>
                  <li><strong>Step 3:</strong> Supervisors evaluate performance and assign ratings</li>
                  <li><strong>Final:</strong> Export rated agreements as PDFs for records</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {isCreatingNew && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Cancel create new mode and restore existing period form
                    setIsCreatingNew(false)
                    if (period) {
                      setFormData({
                        name: period.name,
                        submissionDeadline: formatDateForInput(period.submissionDeadline),
                        startDate: formatDateForInput(period.startDate),
                        endDate: formatDateForInput(period.endDate)
                      })
                    }
                    setSuccessMessage('')
                    setErrorMessage('')
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={fetchActivePeriod}
                disabled={saving || !canManage}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={saving || !canManage}
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
                    {isCreatingNew ? 'Create New Performance Cycle Period' : period ? 'Update Performance Cycles' : 'Set Performance Cycles'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Historical Periods Section - Only for HC Executive and Admin */}
      {canManage && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historical Performance Cycles
                </CardTitle>
                <CardDescription>
                  View past performance agreement and review cycles
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide History
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show History ({historicalPeriods.length})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          
          {showHistory && (
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Loading historical periods...</p>
                </div>
              ) : historicalPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No Historical Periods</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Previous performance cycles will appear here once you create a new active period
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historicalPeriods.map((histPeriod) => (
                    <Card key={histPeriod.id} className="border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-gray-900">
                              {histPeriod.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                Archived
                              </span>
                              {histPeriod.createdBy && (
                                <span className="text-xs text-gray-500">
                                  Created by {histPeriod.createdBy.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(histPeriod.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">
                              Agreement Submission Deadline
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDateForDisplay(histPeriod.submissionDeadline)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">
                              Review Period Start
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDateForDisplay(histPeriod.startDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 font-semibold mb-1">
                              Review Period End
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDateForDisplay(histPeriod.endDate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
