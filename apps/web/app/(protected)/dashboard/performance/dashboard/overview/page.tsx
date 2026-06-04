'use client'

import { toast } from "@/hooks/use-toast";



import { useState, useEffect } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Progress } from '@/components/ui/progress'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Badge } from '@/components/ui/badge'



// Force dynamic rendering

export const dynamic = 'force-dynamic'

import { GoldSpinner } from '@/components/ui/gold-spinner'

import { 

  TrendingUp, 

  Clock, 

  Users, 

  CheckCircle, 

  AlertCircle, 

  Target,

  Award,

  FileText,

  BarChart3,

  Activity,

  Calendar,

  ArrowUp,

  ArrowDown,

  Star,

  FileDown

} from 'lucide-react'

import { PerformanceChartCard } from '@/components/performance/components/dashboard/performance-chart-card'

import { colors, gradients, shadows, components, tw } from '@/app/ui-standards'

// DivisionTeamsCard now integrated inline in the Real-Time Performance Ratings section



interface DashboardStats {

  canSeeAllLevels: boolean

  userRole: string

  personalStats: {

    totalAgreements: number

    approved: number

    pending: number

    complete: number

    incomplete: number

    overdue: number

  }

  totalStaff: number

  submittedAgreements: number

  pendingApprovals: number

  approvedAgreements: number

  averageCompletion: number

  overdueSubmissions: number

  averageRating: number

  userAverageRating: number

  departmentAverageRating: number

  divisionAverageRating: number

  userContext: {

    departmentId?: string

    divisionId?: string

    departmentName?: string

    divisionName?: string

  }

  ratingBreakdown: {

    workplanInitiatives: number

    adhocTasks: number

    projects: number

    riskManagement: number

  }

  departmentStats: Array<{

    name: string

    submitted: number

    total: number

    percentage: number

    approved: number

    pending: number

    notStarted: number

    overdue: number

  }>

  departmentPersonStats?: Record<string, Array<{

    id: string

    name: string

    jobTitle: string

    rating: number

    ratingPct: number

    agreementCount: number

    allApproved: boolean

  }>>

  divisionStats: Array<{

    name: string

    department: string

    submitted: number

    total: number

    percentage: number

    approved: number

    pending: number

    notStarted: number

    overdue: number

  }>

  organizationStats: Array<{

    name: string

    submitted: number

    total: number

    percentage: number

    approved: number

    pending: number

    notStarted: number

    overdue: number

  }>

  divisionMetrics: {

    totalStaff: number

    submittedAgreements: number

    pendingApprovals: number

    approvedAgreements: number

    submissionRate: number

    approvalRate: number

  } | null

  departmentMetrics: {

    totalStaff: number

    submittedAgreements: number

    pendingApprovals: number

    approvedAgreements: number

    submissionRate: number

    approvalRate: number

    staffList?: PersonSummary[]

    completeList?: PersonSummary[]

    incompleteList?: PersonSummary[]

  } | null

  orgPersonMetrics?: {

    totalStaff: number

    completeCount: number

    incompleteCount: number

    staffList: PersonSummary[]

    completeList: PersonSummary[]

    incompleteList: PersonSummary[]

  }

  rankings: {

    organization: Array<{ name: string; completionRate: number; position: string }>

    department: Array<{ name: string; completionRate: number; position: string }>

    division: Array<{ name: string; completionRate: number; position: string }>

  }

  initiatives?: {

    total: number

    completed: number

    inProgress: number

    notStarted: number

    blocked: number

    completionRate: number

  }

}



interface PersonSummary {

  id: string

  name: string

  jobTitle: string

  departmentName: string

  divisionName: string

  agreementCount: number

  allApproved: boolean

}



interface QuarterBreakdown {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  label: string
  total: number
  rated: number
  totalWeight: number
  avgRating: number | null
  weightedScore: number
}

interface PerformanceRateData {

  finalRating: number

  finalPercentage: number

  activeHalf?: 'H1' | 'H2'

  activeHalfLabel?: string

  weights: Record<string, number>

  components: Record<string, { rating: number; weight: number; weightedScore: number }>

  categories?: { id: string; name: string; weight: number }[]

  quarterBreakdown?: QuarterBreakdown[]
  performanceAgreementInitiatives?: Array<{
    id: string
    title: string
    rating: number | null
    weight: number | null
    dueDate: string | Date | null
  }>

}



export default function DashboardOverviewPage() {

  const [period, setPeriod] = useState<any>(null)

  const [stats, setStats] = useState<DashboardStats | null>(null)

  const [metricLevel, setMetricLevel] = useState<'department' | 'organization'>('organization')

  const [departmentStaffPage, setDepartmentStaffPage] = useState(1)

  const [orgStaffPage, setOrgStaffPage] = useState(1)

  const [popupOpen, setPopupOpen] = useState(false)

  const [popupTitle, setPopupTitle] = useState('')

  const [popupPeople, setPopupPeople] = useState<PersonSummary[]>([])

  const [deptPopupOpen, setDeptPopupOpen] = useState(false)

  const [deptPopupTitle, setDeptPopupTitle] = useState('')

  const [deptPopupPeople, setDeptPopupPeople] = useState<Array<{ id: string; name: string; jobTitle: string; rating: number; ratingPct: number; agreementCount: number; allApproved: boolean }>>([])

  const [rateData, setRateData] = useState<PerformanceRateData | null>(null)
  const [quarterModal, setQuarterModal] = useState<{ open: boolean; quarter: QuarterBreakdown | null }>({
    open: false, quarter: null
  })

  const [loading, setLoading] = useState(true)

  const [agreementTimeLeft, setAgreementTimeLeft] = useState<{

    days: number

    hours: number

    minutes: number

    seconds: number

  } | null>(null)

  const [reviewTimeLeft, setReviewTimeLeft] = useState<{

    days: number

    hours: number

    minutes: number

    seconds: number

  } | null>(null)

  const [exportingPDF, setExportingPDF] = useState(false)
  const [org360, setOrg360] = useState<{
    competencies: { competency: string; averageScore: number | null; responseCount: number; ratingLevel: string; trend: 'up' | 'stable' | 'down' | 'none'; distribution: { rating: number; count: number }[] }[]
    orgAverage: number | null
    orgRatingLevel: string
    orgTrend: 'up' | 'stable' | 'down' | 'none'
    totalRatings: number
    completedRatings: number
    inProgressRatings: number
    ratedEmployees: number
    ratedUserList: { name: string; email: string; jobTitle: string; userStatus: string; selfRating: number | null; supervisorRating: number | null; rating360Status: string }[]
    totalResponses: number
    totalStaff: number
    completionRate: number
  } | null>(null)

  const [divisions, setDivisions] = useState<Array<{

    divisionName: string

    departmentName: string | null

    manager: { id: string; name: string; jobTitle: string | null } | null

    employeeCount: number

    reportsToExecutive: boolean

    averageScore: number | null

    ratedCount: number

  }>>([])



  useEffect(() => {

    const fetchData = async () => {

      try {

        // Fetch performance period

        const periodRes = await fetch('/dashboard/performance/api/performance-period')

        if (periodRes.ok) {

          const periodData = await periodRes.json()

          setPeriod(periodData)

        }



        // Fetch dashboard stats (server handles auth via getAuthenticatedUser)

        const statsRes = await fetch('/dashboard/performance/api/dashboard/stats')

        if (statsRes.ok) {

          const statsData = await statsRes.json()

          setStats(statsData)

        }



        // Fetch performance rate data

        const rateRes = await fetch('/dashboard/performance/api/performance-agreements/my-rate')

        if (rateRes.ok) {

          const rateResult = await rateRes.json()

          setRateData(rateResult)

        }



        // Fetch divisions data

        const divisionsRes = await fetch('/dashboard/performance/api/divisions/by-manager')

        if (divisionsRes.ok) {

          const divisionsData = await divisionsRes.json()

          setDivisions(divisionsData.divisions || [])

        }

        // Fetch org-level 360 breakdown
        const org360Res = await fetch('/dashboard/performance/api/360-rating/org-breakdown')
        if (org360Res.ok) {
          const org360Data = await org360Res.json()
          setOrg360(org360Data)
        }

      } catch (error) {

        console.error('Failed to fetch dashboard data:', error)

      } finally {

        setLoading(false)

      }

    }



    fetchData()

  }, [])



  // Agreement Creation Countdown (to submissionDeadline)

  useEffect(() => {

    if (!period?.submissionDeadline) return



    const calculateTimeLeft = () => {

      const deadline = new Date(period.submissionDeadline)

      const now = new Date()

      const difference = deadline.getTime() - now.getTime()



      if (difference <= 0) {

        setAgreementTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })

        return

      }



      const days = Math.floor(difference / (1000 * 60 * 60 * 24))

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

      const seconds = Math.floor((difference % (1000 * 60)) / 1000)



      setAgreementTimeLeft({ days, hours, minutes, seconds })

    }



    calculateTimeLeft()

    const interval = setInterval(calculateTimeLeft, 1000)



    return () => clearInterval(interval)

  }, [period])



  // Review Period Countdown (to endDate - due date)

  useEffect(() => {

    if (!period?.endDate) return



    const calculateTimeLeft = () => {

      const endDate = new Date(period.endDate)

      const now = new Date()

      const difference = endDate.getTime() - now.getTime()



      if (difference <= 0) {

        setReviewTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })

        return

      }



      const days = Math.floor(difference / (1000 * 60 * 60 * 24))

      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

      const seconds = Math.floor((difference % (1000 * 60)) / 1000)



      setReviewTimeLeft({ days, hours, minutes, seconds })

    }



    calculateTimeLeft()

    const interval = setInterval(calculateTimeLeft, 1000)



    return () => clearInterval(interval)

  }, [period])



  const isAgreementExpired = agreementTimeLeft && agreementTimeLeft.days === 0 && agreementTimeLeft.hours === 0 && agreementTimeLeft.minutes === 0 && agreementTimeLeft.seconds === 0

  const isReviewExpired = reviewTimeLeft && reviewTimeLeft.days === 0 && reviewTimeLeft.hours === 0 && reviewTimeLeft.minutes === 0 && reviewTimeLeft.seconds === 0



  const AgreementCountdown = () => {

    if (!period || !agreementTimeLeft) return null



    if (isAgreementExpired) {

      return (

        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 rounded-full border border-red-300">

          <Clock className="w-3.5 h-3.5 text-red-600" />

          <span className="text-xs font-bold text-red-700">Submission Ended</span>

        </div>

      )

    }



    return (

      <div className="flex items-center gap-2 px-3 py-1 bg-linear-to-r from-green-100 to-emerald-100 rounded-full border border-green-300">

        <Clock className="w-3.5 h-3.5 text-green-600 animate-pulse" />

        <div className="flex items-center gap-1.5">

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-green-900">{agreementTimeLeft.days}</span>

            <span className="text-[9px] text-green-600 font-medium">days</span>

          </div>

          <span className="text-green-700 font-bold">:</span>

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-green-900">{String(agreementTimeLeft.hours).padStart(2, '0')}</span>

            <span className="text-[9px] text-green-600 font-medium">hrs</span>

          </div>

          <span className="text-green-700 font-bold">:</span>

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-green-900">{String(agreementTimeLeft.minutes).padStart(2, '0')}</span>

            <span className="text-[9px] text-green-600 font-medium">min</span>

          </div>

        </div>

      </div>

    )

  }



  const ReviewCountdown = () => {

    if (!period || !reviewTimeLeft) return null



    if (isReviewExpired) {

      return (

        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 rounded-full border border-red-300">

          <Clock className="w-3.5 h-3.5 text-red-600" />

          <span className="text-xs font-bold text-red-700">Period Ended</span>

        </div>

      )

    }



    return (

      <div className="flex items-center gap-2 px-3 py-1 bg-linear-to-r from-blue-100 to-purple-100 rounded-full border border-blue-300">

        <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />

        <div className="flex items-center gap-1.5">

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-blue-900">{reviewTimeLeft.days}</span>

            <span className="text-[9px] text-blue-600 font-medium">days</span>

          </div>

          <span className="text-blue-700 font-bold">:</span>

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-blue-900">{String(reviewTimeLeft.hours).padStart(2, '0')}</span>

            <span className="text-[9px] text-blue-600 font-medium">hrs</span>

          </div>

          <span className="text-blue-700 font-bold">:</span>

          <div className="flex flex-col items-center">

            <span className="text-sm font-bold text-blue-900">{String(reviewTimeLeft.minutes).padStart(2, '0')}</span>

            <span className="text-[9px] text-blue-600 font-medium">min</span>

          </div>

        </div>

      </div>

    )

  }



  if (loading) {

    return (

      <div className="p-3 sm:p-4 lg:p-6 flex items-center justify-center min-h-screen">

        <GoldSpinner size="lg" message="Loading dashboard..." />

      </div>

    )

  }



  const submissionRate = stats ? Math.round((stats.submittedAgreements / stats.totalStaff) * 100) : 0

  const approvalRate = stats && stats.submittedAgreements > 0 ? Math.round((stats.approvedAgreements / stats.submittedAgreements) * 100) : 0



  // Handle Dashboard PDF Export
  const handleExportDashboard = async () => {
    try {
      setExportingPDF(true)
      const apiUrl = `/dashboard/performance/api/dashboard/export-pdf?t=${Date.now()}`
      console.log('[CLIENT] Fetching dashboard PDF from:', apiUrl)
      const response = await fetch(apiUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      console.log('[CLIENT] Response status:', response.status, 'headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const error = await response.json()
        toast({ title: error.error || 'Failed to export dashboard PDF', variant: 'destructive' })
        return
      }

      const blob = await response.blob()
      console.log('[CLIENT] Blob size:', blob.size, 'type:', blob.type)
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting dashboard:', error)
      toast({ title: 'Failed to export dashboard PDF', variant: 'destructive' })
    } finally {
      setExportingPDF(false)
    }
  }

  // Helper function to get metric values based on selected level

  const getMetricValue = (metric: string): number => {

    if (!stats) return 0



    // Show stats based on selected level (org-wide for all users)

    switch (metricLevel) {

      case 'department':

        if (!stats.departmentMetrics) return 0

        switch (metric) {

          case 'totalStaff':

            return stats.departmentMetrics.totalStaff

          case 'approvedAgreements':

            return stats.departmentMetrics.approvedAgreements

          case 'incomplete':

            return stats.departmentMetrics.pendingApprovals

          case 'overdue':

            // Calculate from departmentStats

            const deptData = stats.departmentStats?.find(d => d.name === stats.userContext?.departmentName)

            return deptData?.overdue || 0

          default:

            return 0

        }

      case 'organization':

      default:

        switch (metric) {

          case 'totalStaff':

            return stats.orgPersonMetrics?.totalStaff || stats.totalStaff || 0

          case 'approvedAgreements':

            return stats.orgPersonMetrics?.completeCount || 0

          case 'incomplete':

            return stats.orgPersonMetrics?.incompleteCount || 0

          case 'overdue':

            return stats.organizationStats?.[0]?.overdue || 0

          default:

            return 0

        }

    }

  }



  // Compact Metric Card Component

  const openPopup = (title: string, people: PersonSummary[]) => {

    setPopupTitle(title)

    setPopupPeople(people)

    setPopupOpen(true)

  }



  const getPopupPeople = (metric: string): PersonSummary[] => {

    if (!stats) return []

    if (metricLevel === 'department' && stats.departmentMetrics) {

      if (metric === 'totalStaff') return stats.departmentMetrics.staffList || []

      if (metric === 'approvedAgreements') return stats.departmentMetrics.completeList || []

      if (metric === 'incomplete') return stats.departmentMetrics.incompleteList || []

    }

    if (metricLevel === 'organization' && stats.orgPersonMetrics) {

      if (metric === 'totalStaff') return stats.orgPersonMetrics.staffList || []

      if (metric === 'approvedAgreements') return stats.orgPersonMetrics.completeList || []

      if (metric === 'incomplete') return stats.orgPersonMetrics.incompleteList || []

    }

    return []

  }



  const MetricCard = ({

    icon,

    title,

    value,

    subtitle,

    color,

    compact = false,

    metricKey

  }: {

    icon: React.ReactNode

    title: string

    value: number | string

    subtitle: string

    color: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red'

    compact?: boolean

    metricKey?: string

  }) => {

    const colorClasses = {

      blue: 'text-blue-600 bg-blue-50 border-blue-200',

      green: 'text-green-600 bg-green-50 border-green-200',

      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',

      purple: 'text-purple-600 bg-purple-50 border-purple-200',

      orange: 'text-orange-600 bg-orange-50 border-orange-200',

      red: 'text-red-600 bg-red-50 border-red-200'

    }



    const isClickable = !!stats && !!metricKey && ['totalStaff', 'approvedAgreements', 'incomplete'].includes(metricKey)



    return (

      <div

        className={`p-3 rounded-lg border ${colorClasses[color]} ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}

        onClick={isClickable ? () => openPopup(title, getPopupPeople(metricKey!)) : undefined}

      >

        <div className="flex items-center gap-2 mb-1">

          <div className="shrink-0">

            {icon}

          </div>

        </div>

        <div>

          <p className="text-xl font-bold text-foreground">{value}</p>

          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>

          <p className="text-[10px] text-muted-foreground">{subtitle}{isClickable ? ' · click to view' : ''}</p>

        </div>

      </div>

    )

  }



  return (

    <>

    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">

      {/* Header with Countdown Timers */}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

        <div>

          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Management Dashboard</h1>

          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Real-time overview of organizational performance metrics</p>

        </div>



        {/* Countdown Timers on the Right */}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {period && (

            <div className="flex flex-col sm:flex-row gap-2">

            <Card className="text-white border-0" style={{ background: gradients.navyHeader, boxShadow: shadows.header }}>

              <CardContent className="p-3">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Clock className="w-6 h-6 text-white/70" />

                    <div>

                      <p className="text-white/70 text-[10px] font-medium">Agreement Submission</p>

                      <p className="text-white text-xs font-bold">Deadline</p>

                    </div>

                  </div>

                  <AgreementCountdown />

                </div>

              </CardContent>

            </Card>



            <Card className="text-white border-0" style={{ background: gradients.navyHeader, boxShadow: shadows.header }}>

              <CardContent className="p-3">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Calendar className="w-6 h-6 text-white/70" />

                    <div>

                      <p className="text-white/70 text-[10px] font-medium">Review Period</p>

                      <p className="text-white text-xs font-bold">Due In</p>

                    </div>

                  </div>

                  <ReviewCountdown />

                </div>

              </CardContent>

            </Card>

          </div>

          )}

        </div>

      </div>



      {/* Multi-Level Performance Ratings - Compact */}

      <Card className="mb-4 text-white border-0 shadow-md" style={{ background: gradients.navyToGold }}>

        <CardContent className="p-3">

          <div className="flex items-center justify-between mb-3">

            <div className="flex items-center gap-2">

              <Award className="w-5 h-5 text-white" />

              <h3 className="text-sm font-bold text-white">Real-Time Performance Ratings</h3>

            </div>

            <div className="flex items-center gap-1">

              <span className="relative flex h-2 w-2">

                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>

                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>

              </span>

              <p className="text-[10px] text-red-400 font-medium">Live across all levels</p>

            </div>

          </div>



          {/* Organizational Level Ratings */}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">

            {/* Individual Rating */}

            <div className="bg-white/20 backdrop-blur-sm rounded-md p-2 border border-white/30">

              <div className="flex items-center gap-1 mb-1">

                <Star className="w-3 h-3 text-yellow-300" />

                <p className="text-[10px] font-semibold text-white uppercase">My Rating</p>

              </div>

              <div className="flex items-baseline gap-0.5">

                <p className="text-2xl font-bold text-white">{rateData?.finalRating.toFixed(1) || stats?.userAverageRating || 0}</p>

                <p className="text-xs text-purple-100">/5</p>

              </div>

              {rateData?.activeHalf && (
                <p className="text-[9px] text-yellow-200 mt-0.5">{rateData.activeHalf} · {rateData.activeHalfLabel}</p>
              )}

            </div>



            {/* Department Rating */}

            <div className="bg-white/20 backdrop-blur-sm rounded-md p-2 border border-white/30">

              <div className="flex items-center gap-1 mb-1">

                <BarChart3 className="w-3 h-3 text-green-300" />

                <p className="text-[10px] font-semibold text-white uppercase">Department</p>

              </div>

              <div className="flex items-baseline gap-0.5">

                <p className="text-2xl font-bold text-white">{(stats?.departmentAverageRating || 0).toFixed(1)}</p>

                <p className="text-xs text-purple-100">/5</p>

              </div>

            </div>



            {/* Organization Rating */}

            <div className="bg-white/20 backdrop-blur-sm rounded-md p-2 border border-white/30">

              <div className="flex items-center gap-1 mb-1">

                <TrendingUp className="w-3 h-3 text-orange-300" />

                <p className="text-[10px] font-semibold text-white uppercase">Organization</p>

              </div>

              <div className="flex items-baseline gap-0.5">

                <p className="text-2xl font-bold text-white">{(stats?.averageRating || 0).toFixed(1)}</p>

                <p className="text-xs text-purple-100">/5</p>

              </div>

            </div>

          </div>



          {/* Division Teams Section - Between ratings and components */}

          {divisions.length > 0 && (

            <div className="border-t border-white/20 pt-3 mb-3">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">

                {divisions.slice(0, 6).map((division) => (

                  <div

                    key={division.divisionName}

                    onClick={() => window.location.href = `/dashboard/performance/dashboard/divisions/${encodeURIComponent(division.divisionName)}`}

                    className="bg-white/10 rounded-md p-2.5 hover:bg-white/20 transition-all cursor-pointer"

                  >

                    <p className="text-[10px] font-semibold text-white truncate mb-1.5">

                      {division.divisionName === 'No Division Assigned' ? 'My Team' : division.divisionName}

                    </p>

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-1.5">

                        <Users className="w-3.5 h-3.5 text-blue-300" />

                        <span className="text-lg font-bold text-white">{division.employeeCount}</span>

                        <span className="text-[9px] text-blue-200">employees</span>

                      </div>

                      <div className="flex items-center gap-1">

                        <Star className="w-3 h-3 text-yellow-400" />

                        <span className="text-sm font-bold text-yellow-300">

                          {division.averageScore !== null ? division.averageScore.toFixed(1) : '-'}

                        </span>

                        <span className="text-[8px] text-yellow-200">/5</span>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

              {divisions.length > 6 && (

                <p className="text-[10px] text-blue-200 text-center mt-2">

                  +{divisions.length - 6} more divisions

                </p>

              )}

            </div>

          )}



          {/* Component Breakdown - dynamically rendered from weight allocation categories */}

          {rateData && (() => {

            // Map category IDs to component keys and short labels

            const categoryMap: Record<string, { componentKey: string; label: string }> = {

              perf: { componentKey: 'performanceAgreement', label: 'Perf. Agr.' },

              adhoc: { componentKey: 'adhoc', label: 'Ad-hoc' },

              risk: { componentKey: 'riskManagement', label: 'Risk' },

              project: { componentKey: 'projects', label: 'Projects' },

              audit: { componentKey: 'audit', label: 'Audit' },

            }



            // Use categories from API if available, otherwise fall back to components keys

            const items = rateData.categories

              ? rateData.categories.map(cat => {

                  const mapped = categoryMap[cat.id]

                  const componentKey = mapped?.componentKey || cat.id

                  const comp = rateData.components[componentKey]

                  return {

                    key: cat.id,

                    label: mapped?.label || cat.name,

                    rating: comp?.rating ?? 0,

                    weight: cat.weight,

                  }

                })

              : Object.entries(rateData.components).map(([key, comp]) => ({

                  key,

                  label: key === 'performanceAgreement' ? 'Perf. Agr.' : key === 'riskManagement' ? 'Risk' : key.charAt(0).toUpperCase() + key.slice(1),

                  rating: comp.rating,

                  weight: comp.weight,

                }))



            // Only show items with weight > 0

            const visibleItems = items.filter(i => i.weight > 0)

            if (visibleItems.length === 0) return null



            return (

              <div className="border-t border-white/20 pt-3">

                <p className="text-[10px] font-semibold text-white uppercase mb-2">My Rating Components</p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">

                  {visibleItems.map(item => (

                    <div key={item.key} className="bg-white/10 rounded p-1.5 text-center">

                      <p className="text-lg font-bold text-white">{item.rating.toFixed(1)}</p>

                      <p className="text-[8px] text-purple-100">{item.label}</p>

                      <p className="text-[9px] font-semibold text-yellow-300">{item.weight}%</p>

                    </div>

                  ))}

                </div>

              </div>

            )

          })()}



        </CardContent>

      </Card>



      {/* Performance Agreements Section */}

      <div>

        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 flex-wrap">

          <FileText className="w-5 h-5 shrink-0" style={{ color: colors.navyLightest }} />

          <span>Performance Agreements (Goal Setting &amp; Commitments)</span>

        </h2>

      </div>



      {/* Key Metrics - 2x2 Grid with Graph */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left Side: Compact Metric Cards with Tabs */}

        <div className="lg:col-span-1">

          <Card className="h-fit">

            <CardHeader className="pb-3">

              <CardTitle className="text-sm font-medium">

                {'Key Metrics'}

              </CardTitle>

            </CardHeader>

            <CardContent className="pt-0 space-y-4">

              {/* Only show level tabs for HC/Admin users */}

              {(

                <Tabs value={metricLevel} onValueChange={(value) => setMetricLevel(value as 'department' | 'organization')} className="w-full mb-1">

                  <TabsList className="grid w-full grid-cols-2 h-9">

                    <TabsTrigger value="department" className="text-xs px-2">Dept</TabsTrigger>

                    <TabsTrigger value="organization" className="text-xs px-2">Org</TabsTrigger>

                  </TabsList>

                </Tabs>

              )}

              <div className="grid grid-cols-2 gap-2">

                <MetricCard

                  icon={<Users className="w-6 h-6" />}

                  title="Total Staff"

                  value={getMetricValue('totalStaff')}

                  subtitle="Active"

                  color="blue"

                  compact

                  metricKey="totalStaff"

                />

                <MetricCard

                  icon={<CheckCircle className="w-6 h-6" />}

                  title="Complete"

                  value={getMetricValue('approvedAgreements')}

                  subtitle="All Approved"

                  color="green"

                  compact

                  metricKey="approvedAgreements"

                />

                <MetricCard

                  icon={<CheckCircle className="w-6 h-6" />}

                  title="Incomplete"

                  value={getMetricValue('incomplete')}

                  subtitle="Pending"

                  color="orange"

                  compact

                  metricKey="incomplete"

                />

                <MetricCard

                  icon={<Clock className="w-6 h-6" />}

                  title="Overdue"

                  value={getMetricValue('overdue')}

                  subtitle="Late"

                  color="purple"

                  compact

                />

              </div>

            </CardContent>

          </Card>

        </div>



        {/* Right Side: Interactive Performance Charts */}

        <div className="lg:col-span-2">

          <PerformanceChartCard stats={stats} submissionRate={submissionRate} approvalRate={approvalRate} metricLevel={metricLevel} canExport={stats?.canSeeAllLevels || false} />

        </div>

      </div>

      {/* Quarterly Ratings Breakdown */}
      {rateData?.quarterBreakdown && rateData.quarterBreakdown.some(q => q.total > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Quarterly Ratings Breakdown</h3>
              <span className="text-xs text-gray-400 ml-auto">Financial Year — Q1 starts 1 April</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {rateData.quarterBreakdown.map((q, i) => {
                const colors4 = [
                  { bg: 'bg-purple-50', border: 'border-purple-200', label: 'text-purple-700', val: 'text-purple-900', sub: 'text-purple-500', bar: 'bg-purple-400' },
                  { bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'text-indigo-700', val: 'text-indigo-900', sub: 'text-indigo-500', bar: 'bg-indigo-400' },
                  { bg: 'bg-teal-50', border: 'border-teal-200', label: 'text-teal-700', val: 'text-teal-900', sub: 'text-teal-500', bar: 'bg-teal-400' },
                  { bg: 'bg-rose-50', border: 'border-rose-200', label: 'text-rose-700', val: 'text-rose-900', sub: 'text-rose-500', bar: 'bg-rose-400' },
                ][i]
                const pct = q.total > 0 ? Math.round((q.rated / q.total) * 100) : 0
                return (
                  <div
                    key={q.quarter}
                    className={`${colors4.bg} border ${colors4.border} rounded-lg p-3 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all`}
                    onClick={() => setQuarterModal({ open: true, quarter: q })}
                    title={`Click to view all actions in ${q.quarter}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase ${colors4.label}`}>{q.quarter}</span>
                      <span className={`text-[10px] ${colors4.sub}`}>{q.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-2xl font-bold ${colors4.val}`}>
                        {q.avgRating !== null ? q.avgRating.toFixed(1) : '—'}
                      </span>
                      {q.avgRating !== null && <span className={`text-xs ${colors4.sub}`}>/5</span>}
                    </div>
                    <p className={`text-[10px] ${colors4.sub} mb-2`}>{q.rated}/{q.total} rated · {q.totalWeight}% weight</p>
                    <div className="w-full bg-white/60 rounded-full h-1.5">
                      <div className={`${colors4.bar} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className={`text-[10px] ${colors4.sub} mt-1 text-right`}>{pct}% rated</p>
                  </div>
                )
              })}
            </div>

            {/* Bi-Annual Summary */}
            {(() => {
              const initiatives = rateData?.performanceAgreementInitiatives || []
              // Active half determination (mirror of API logic)
              const _nowM = new Date().getUTCMonth() + 1
              const _h2Months = [10, 11, 12, 1, 2, 3]
              const _isH1Win = _h2Months.includes(_nowM)
              const _activeHalf = rateData?.activeHalf || (_isH1Win ? 'H1' : 'H2')

              const halves = [
                { label: 'H1', name: 'First Half', range: 'Apr – Sep', months: [4,5,6,7,8,9],
                  colors: { bg: 'bg-orange-50', border: 'border-orange-200', label: 'text-orange-700', val: 'text-orange-900', sub: 'text-orange-500', bar: 'bg-orange-400' } },
                { label: 'H2', name: 'Second Half', range: 'Oct – Mar', months: [10,11,12,1,2,3],
                  colors: { bg: 'bg-cyan-50', border: 'border-cyan-200', label: 'text-cyan-700', val: 'text-cyan-900', sub: 'text-cyan-500', bar: 'bg-cyan-400' } }
              ].map(h => {
                const inH = initiatives.filter(a => {
                  if (!a.dueDate) return false
                  const d = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
                  return h.months.includes(d.getUTCMonth() + 1)
                })
                const rated = inH.filter(a => a.rating != null && (a.rating as number) > 0)
                const totalWeight = inH.reduce((s, a) => s + (a.weight || 0), 0)
                const ratingSum = rated.reduce((s, a) => s + ((a.rating as number) || 0), 0)
                const avgRating = inH.length > 0 && rated.length > 0 ? ratingSum / inH.length : null
                const pct = inH.length > 0 ? Math.round((rated.length / inH.length) * 100) : 0
                const isActive = h.label === _activeHalf
                return { ...h, total: inH.length, rated: rated.length, totalWeight, avgRating, pct, isActive }
              })
              if (!halves.some(h => h.total > 0)) return null
              return (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bi-Annual Summary</h3>
                    <span className="text-xs text-gray-400 ml-auto">Financial Year — starting 1 April</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {halves.map(h => (
                      <div key={h.label} className={`${h.colors.bg} border-2 ${h.isActive ? h.colors.border + ' ring-1 ring-offset-1 ring-green-400' : 'border-gray-200 opacity-75'} rounded-lg p-3 relative`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold uppercase ${h.colors.label}`}>{h.label}</span>
                            <span className={`text-[10px] ml-1 ${h.colors.sub}`}>{h.name}</span>
                            {h.isActive && <span className="ml-1 text-[8px] bg-green-500 text-white px-1 py-0.5 rounded font-bold">ACTIVE</span>}
                            {!h.isActive && <span className="ml-1 text-[8px] bg-gray-400 text-white px-1 py-0.5 rounded font-bold">PENDING</span>}
                          </div>
                          <span className={`text-[10px] ${h.colors.sub}`}>{h.range}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className={`text-2xl font-bold ${h.isActive ? h.colors.val : 'text-gray-400'}`}>
                            {h.isActive ? (h.avgRating !== null ? h.avgRating.toFixed(1) : '—') : '—'}
                          </span>
                          {h.isActive && h.avgRating !== null && <span className={`text-xs ${h.colors.sub}`}>/5</span>}
                        </div>
                        {h.isActive ? (
                          <>
                            <p className={`text-[10px] ${h.colors.sub} mb-2`}>{h.rated}/{h.total} rated · {h.totalWeight}% weight</p>
                            <div className="w-full bg-white/60 rounded-full h-1.5">
                              <div className={`${h.colors.bar} h-1.5 rounded-full transition-all`} style={{ width: `${h.pct}%` }} />
                            </div>
                            <p className={`text-[10px] ${h.colors.sub} mt-1 text-right`}>{h.pct}% rated</p>
                          </>
                        ) : (
                          <p className="text-[10px] text-gray-400 mt-1">Rating period not yet open</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Quarter detail modal */}
      {quarterModal.quarter && (() => {
        const q = quarterModal.quarter
        const months = q.quarter === 'Q1' ? [4,5,6] : q.quarter === 'Q2' ? [7,8,9] : q.quarter === 'Q3' ? [10,11,12] : [1,2,3]
        const actions = (rateData?.performanceAgreementInitiatives || []).filter(a => {
          if (!a.dueDate) return false
          const d = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
          return months.includes(d.getUTCMonth() + 1)
        })
        const colIdx = ['Q1','Q2','Q3','Q4'].indexOf(q.quarter)
        const headerColors = [
          'bg-purple-600', 'bg-indigo-600', 'bg-teal-600', 'bg-rose-600'
        ][colIdx] ?? 'bg-gray-600'
        return (
          <Dialog open={quarterModal.open} onOpenChange={open => setQuarterModal(prev => ({ ...prev, open }))}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto p-0">
              <DialogHeader className={`${headerColors} text-white px-5 py-4 rounded-t-lg`}>
                <DialogTitle className="text-white font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {q.quarter} ({q.label}) — Actions Summary
                </DialogTitle>
                <p className="text-white/80 text-xs mt-1">
                  {q.rated}/{q.total} rated · {q.totalWeight}% total weight ·{' '}
                  {q.avgRating !== null ? `Avg ${q.avgRating.toFixed(1)}/5` : 'No ratings yet'}
                </p>
              </DialogHeader>
              <div className="p-4">
                {actions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No actions due in this quarter.</p>
                ) : (
                  <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 uppercase tracking-wide text-[10px]">
                        <th className="text-left px-2 py-2 border-b border-gray-200 w-[55%]">Action</th>
                        <th className="text-center px-2 py-2 border-b border-gray-200">Due Date</th>
                        <th className="text-center px-2 py-2 border-b border-gray-200">Weight</th>
                        <th className="text-center px-2 py-2 border-b border-gray-200">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((a, idx) => {
                        const dueDateStr = a.dueDate
                          ? new Date(a.dueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                          : '—'
                        const isRated = a.rating != null && a.rating > 0
                        return (
                          <tr key={a.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-2 border-b border-gray-100 text-gray-800 leading-tight">{a.title}</td>
                            <td className="px-2 py-2 border-b border-gray-100 text-gray-500 text-center whitespace-nowrap">{dueDateStr}</td>
                            <td className="px-2 py-2 border-b border-gray-100 text-gray-500 text-center">{a.weight ?? '—'}%</td>
                            <td className="px-2 py-2 border-b border-gray-100 text-center">
                              {isRated ? (
                                <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 font-bold rounded px-1.5 py-0.5">
                                  {(a.rating as number).toFixed(1)}<span className="text-green-500 font-normal">/5</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Not rated</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}



      {/* Department Performance */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card>

          <CardHeader className="pb-3">

            <CardTitle className="text-base flex items-center gap-2">

              <BarChart3 className="w-4 h-4" style={{ color: colors.navyLightest }} />

              Top 5 Departments

            </CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-2">

              {stats?.departmentStats?.slice(0, 5).map((dept: any, index: number) => (

                <div

                  key={index}

                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"

                  onClick={() => {

                    const people = stats?.departmentPersonStats?.[dept.name] || []

                    setDeptPopupTitle(dept.name)

                    setDeptPopupPeople(people)

                    setDeptPopupOpen(true)

                  }}

                >

                  <div className="flex items-center gap-2 flex-1 min-w-0">

                    <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: colors.navyLightest }}>

                      {index + 1}

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-medium text-foreground truncate">{dept.name}</p>

                      <p className="text-xs text-muted-foreground">{dept.total} employees</p>

                    </div>

                  </div>

                  <div className="flex items-center gap-2 shrink-0">

                    <div className="w-16 bg-gray-200 rounded-full h-1.5">

                      <div

                        className="h-1.5 rounded-full transition-all"

                        style={{ width: `${dept.percentage}%`, backgroundColor: colors.navyLightest }}

                      />

                    </div>

                    <span className="text-sm font-bold w-10 text-right" style={{ color: colors.navyLightest }}>

                      {dept.percentage}%

                    </span>

                  </div>

                </div>

              )) || (

                <p className="text-gray-500 text-center py-4 text-sm">No data</p>

              )}

            </div>

          </CardContent>

        </Card>



        {/* 360 Degree Org Analysis */}

        <Card>

          <CardHeader className="pb-2">

            <CardTitle className="text-base flex items-center gap-2">

              <Star className="w-4 h-4" style={{ color: colors.navyLightest }} />

              360° Degree Analysis

            </CardTitle>

          </CardHeader>

          <CardContent className="pt-0">

            {org360 ? (
              <div className="space-y-3">

                {/* Overall org score banner */}
                <div className="rounded-lg p-3 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5d8f 100%)' }}>
                  <div className="text-2xl font-bold text-white">
                    {org360.orgAverage !== null ? `${org360.orgAverage.toFixed(2)} / 5` : 'No Data'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#c9a84c' }}>
                    {org360.orgRatingLevel}
                    {org360.orgTrend === 'up' && ' ↑'}
                    {org360.orgTrend === 'stable' && ' →'}
                    {org360.orgTrend === 'down' && ' ↓'}
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {org360.completionRate}% staff participation · {org360.ratedEmployees ?? org360.completedRatings}/{org360.totalStaff} employees
                  </div>
                </div>

                {/* Completion progress */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Org Completion Rate</span>
                    <span>{org360.completedRatings} fully done · {org360.inProgressRatings} in progress</span>
                  </div>
                  <Progress value={org360.completionRate} className="h-2" />
                </div>

                {/* Per-competency breakdown */}
                {org360.competencies.length === 0 ? (
                  <div className="text-center py-4">
                    <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No 360 ratings recorded yet</p>
                    <p className="text-xs text-gray-300 mt-1">Analysis will appear as employees complete their ratings</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    <div className="flex justify-between text-xs font-medium text-gray-500 pb-1 border-b">
                      <span>Institutional Value / Competency</span>
                      <span>Score</span>
                    </div>
                    {org360.competencies.map((c, idx) => {
                      const pct = c.averageScore !== null ? (c.averageScore / 5) * 100 : 0
                      const barColor = c.trend === 'up' ? '#16a34a' : c.trend === 'stable' ? '#d97706' : '#dc2626'
                      const trendIcon = c.trend === 'up' ? '↑' : c.trend === 'stable' ? '→' : c.trend === 'down' ? '↓' : ''
                      const isTop = idx === 0
                      const isBottom = idx === org360.competencies.length - 1 && org360.competencies.length > 1
                      return (
                        <div key={c.competency} className={`space-y-1 p-1.5 rounded ${isTop ? 'bg-green-50' : isBottom ? 'bg-red-50' : ''}`}>
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              {isTop && <span className="text-green-600 text-xs font-bold shrink-0">★</span>}
                              {isBottom && <span className="text-red-400 text-xs shrink-0">▼</span>}
                              <span className="text-xs text-gray-700 truncate" title={c.competency}>{c.competency}</span>
                            </div>
                            <div className="text-xs font-bold shrink-0 flex items-center gap-0.5" style={{ color: barColor }}>
                              {c.averageScore !== null ? c.averageScore.toFixed(2) : 'N/A'}
                              <span className="text-xs">{trendIcon}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{c.ratingLevel}</span>
                          </div>
                          <div className="text-xs text-gray-400">{c.responseCount} response{c.responseCount !== 1 ? 's' : ''}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="pt-1 text-xs text-gray-400 text-center border-t">
                  {org360.totalResponses} total responses across {org360.competencies.length} competencies
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Loading 360° analysis...</p>
              </div>
            )}

          </CardContent>

        </Card>

      </div>



      {/* Staff Rankings - Department and Organisation */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Staff Rankings - Department */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Award className="w-5 h-5" style={{ color: colors.gold }} />

              Staff Rankings - Department

            </CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {(() => {

                const ITEMS_PER_PAGE = 6

                const allPerformers = stats?.rankings?.department?.map(p => ({

                  name: p.name,

                  completionRate: p.completionRate,

                  position: p.position

                })) || []



                const totalPages = Math.ceil(allPerformers.length / ITEMS_PER_PAGE)

                const currentPage = Math.min(departmentStaffPage, totalPages || 1)

                const startIdx = (currentPage - 1) * ITEMS_PER_PAGE

                const pagePerformers = allPerformers.slice(startIdx, startIdx + ITEMS_PER_PAGE)



                return allPerformers.length > 0 ? (

                  <>

                    {pagePerformers.map((performer, index) => (

                      <div key={startIdx + index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">

                        <div className="flex items-center gap-3">

                          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: colors.navyLightest }}>

                            {startIdx + index + 1}

                          </div>

                          <div>

                            <p className="font-medium text-foreground">{performer.name}</p>

                            <p className="text-xs text-muted-foreground">{performer.position || 'Staff Member'}</p>

                          </div>

                        </div>

                        <div className="text-right">

                          <p className="text-lg font-bold" style={{ color: colors.navyLightest }}>{performer.completionRate}%</p>

                        </div>

                      </div>

                    ))}

                    {totalPages > 1 && (

                      <div className="flex items-center justify-between pt-3 border-t">

                        <p className="text-xs text-gray-500">

                          Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, allPerformers.length)} of {allPerformers.length}

                        </p>

                        <div className="flex items-center gap-1">

                          <button

                            onClick={() => setDepartmentStaffPage(p => Math.max(1, p - 1))}

                            disabled={currentPage <= 1}

                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"

                          >

                            Prev

                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (

                            <button

                              key={page}

                              onClick={() => setDepartmentStaffPage(page)}

                              className={`px-2 py-1 text-xs rounded border ${page === currentPage ? 'text-white' : 'bg-white hover:bg-gray-50'}`}

                              style={page === currentPage ? { backgroundColor: colors.navyLightest, borderColor: colors.navyLightest } : {}}

                            >

                              {page}

                            </button>

                          ))}

                          <button

                            onClick={() => setDepartmentStaffPage(p => Math.min(totalPages, p + 1))}

                            disabled={currentPage >= totalPages}

                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"

                          >

                            Next

                          </button>

                        </div>

                      </div>

                    )}

                  </>

                ) : (

                  <p className="text-gray-500 text-center py-8">No department ranking data available</p>

                )

              })()}

            </div>

          </CardContent>

        </Card>



        {/* Staff Rankings - Organisation */}

        <Card>

          <CardHeader>

            <CardTitle className="flex items-center gap-2">

              <Award className="w-5 h-5" style={{ color: colors.gold }} />

              Staff Rankings - Organisation

            </CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {(() => {

                const ITEMS_PER_PAGE = 6

                const allPerformers = stats?.rankings?.organization?.map(p => ({

                  name: p.name,

                  completionRate: p.completionRate,

                  position: p.position

                })) || []



                const totalPages = Math.ceil(allPerformers.length / ITEMS_PER_PAGE)

                const currentPage = Math.min(orgStaffPage, totalPages || 1)

                const startIdx = (currentPage - 1) * ITEMS_PER_PAGE

                const pagePerformers = allPerformers.slice(startIdx, startIdx + ITEMS_PER_PAGE)



                return allPerformers.length > 0 ? (

                  <>

                    {pagePerformers.map((performer, index) => (

                      <div key={startIdx + index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">

                        <div className="flex items-center gap-3">

                          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: colors.navyLightest }}>

                            {startIdx + index + 1}

                          </div>

                          <div>

                            <p className="font-medium text-foreground">{performer.name}</p>

                            <p className="text-xs text-muted-foreground">{performer.position || 'Staff Member'}</p>

                          </div>

                        </div>

                        <div className="text-right">

                          <p className="text-lg font-bold" style={{ color: colors.navyLightest }}>{performer.completionRate}%</p>

                        </div>

                      </div>

                    ))}

                    {totalPages > 1 && (

                      <div className="flex items-center justify-between pt-3 border-t">

                        <p className="text-xs text-gray-500">

                          Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, allPerformers.length)} of {allPerformers.length}

                        </p>

                        <div className="flex items-center gap-1">

                          <button

                            onClick={() => setOrgStaffPage(p => Math.max(1, p - 1))}

                            disabled={currentPage <= 1}

                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"

                          >

                            Prev

                          </button>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (

                            <button

                              key={page}

                              onClick={() => setOrgStaffPage(page)}

                              className={`px-2 py-1 text-xs rounded border ${page === currentPage ? 'text-white' : 'bg-white hover:bg-gray-50'}`}

                              style={page === currentPage ? { backgroundColor: colors.navyLightest, borderColor: colors.navyLightest } : {}}

                            >

                              {page}

                            </button>

                          ))}

                          <button

                            onClick={() => setOrgStaffPage(p => Math.min(totalPages, p + 1))}

                            disabled={currentPage >= totalPages}

                            className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"

                          >

                            Next

                          </button>

                        </div>

                      </div>

                    )}

                  </>

                ) : (

                  <p className="text-gray-500 text-center py-8">No organisation ranking data available</p>

                )

              })()}

            </div>

          </CardContent>

        </Card>

      </div>

    </div>

    {/* People Popup Dialog */}

    <Dialog open={popupOpen} onOpenChange={setPopupOpen}>

      <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle className="flex items-start gap-2 pr-8 text-base leading-snug">

            <Users className="w-5 h-5 shrink-0 mt-0.5" />

            <div className="min-w-0">
              <div className="truncate">{popupTitle}</div>
              <div className="text-sm font-normal text-muted-foreground">{popupPeople.length} {popupPeople.length === 1 ? 'person' : 'people'}</div>
            </div>

          </DialogTitle>

        </DialogHeader>

        <div className="space-y-2 mt-2">

          {popupPeople.length === 0 ? (

            <p className="text-sm text-muted-foreground text-center py-6">No records found.</p>

          ) : (

            popupPeople.map((person) => (

              <div key={person.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">

                <div className="flex-1 min-w-0">

                  <p className="text-sm font-medium text-foreground truncate">{person.name}</p>

                  {person.jobTitle && (

                    <p className="text-xs text-muted-foreground truncate">{person.jobTitle}</p>

                  )}

                  {person.departmentName && (

                    <p className="text-[10px] text-muted-foreground truncate">{person.departmentName}{person.divisionName ? ` · ${person.divisionName}` : ''}</p>

                  )}

                </div>

                <div className="ml-3 shrink-0">

                  {person.agreementCount === 0 ? (

                    <Badge variant="outline" className="text-[10px] text-gray-500">No agreements</Badge>

                  ) : person.allApproved ? (

                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Complete</Badge>

                  ) : (

                    <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">Pending</Badge>

                  )}

                </div>

              </div>

            ))

          )}

        </div>

      </DialogContent>

    </Dialog>

    {/* Department Individual Scores Popup */}

    <Dialog open={deptPopupOpen} onOpenChange={setDeptPopupOpen}>

      <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle className="flex items-start gap-2 pr-8 text-base leading-snug">

            <BarChart3 className="w-5 h-5 shrink-0 mt-0.5" />

            <div className="min-w-0">
              <div className="truncate">{deptPopupTitle}</div>
              <div className="text-sm font-normal text-muted-foreground">Individual Scores</div>
            </div>

          </DialogTitle>

        </DialogHeader>

        <div className="space-y-2 mt-2">

          {deptPopupPeople.length === 0 ? (

            <p className="text-sm text-muted-foreground text-center py-6">No individual data available.</p>

          ) : (

            deptPopupPeople.map((person, idx) => (

              <div key={person.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">

                <div className="flex items-center gap-3 flex-1 min-w-0">

                  <div className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0" style={{ backgroundColor: colors.navyLightest }}>

                    {idx + 1}

                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-medium text-foreground truncate">{person.name}</p>

                    {person.jobTitle && (

                      <p className="text-xs text-muted-foreground truncate">{person.jobTitle}</p>

                    )}

                  </div>

                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">

                  <div className="text-right">

                    <p className="text-sm font-bold" style={{ color: colors.navyLightest }}>{person.ratingPct}%</p>

                    <p className="text-[10px] text-muted-foreground">{person.rating}/5 rating</p>

                  </div>

                  {person.agreementCount === 0 ? (

                    <Badge variant="outline" className="text-[10px] text-gray-500">No agreements</Badge>

                  ) : person.allApproved ? (

                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Complete</Badge>

                  ) : (

                    <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">Pending</Badge>

                  )}

                </div>

              </div>

            ))

          )}

        </div>

      </DialogContent>

    </Dialog>

    </>

  )

}

