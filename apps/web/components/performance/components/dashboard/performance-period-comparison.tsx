'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Calendar, Target, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { gradients, shadows } from '@/app/ui-standards'
import { GoldSpinner } from '@/components/ui/gold-spinner'

interface PeriodStats {
  period: string
  totalAgreements: number
  completed: number
  inProgress: number
  pending: number
  completionRate: number
  averageRating: number | null
}

export function PerformancePeriodComparison() {
  const [periods, setPeriods] = useState<string[]>([])
  const [selectedPeriod1, setSelectedPeriod1] = useState<string>('')
  const [selectedPeriod2, setSelectedPeriod2] = useState<string>('')
  const [period1Stats, setPeriod1Stats] = useState<PeriodStats | null>(null)
  const [period2Stats, setPeriod2Stats] = useState<PeriodStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAvailablePeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriod1) {
      fetchPeriodStats(selectedPeriod1, 1)
    }
  }, [selectedPeriod1])

  useEffect(() => {
    if (selectedPeriod2) {
      fetchPeriodStats(selectedPeriod2, 2)
    }
  }, [selectedPeriod2])

  const fetchAvailablePeriods = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-periods/available')
      if (response.ok) {
        const data = await response.json()
        setPeriods(data.periods || [])
        
        // Auto-select the two most recent periods if available
        if (data.periods && data.periods.length >= 2) {
          setSelectedPeriod1(data.periods[0])
          setSelectedPeriod2(data.periods[1])
        } else if (data.periods && data.periods.length === 1) {
          setSelectedPeriod1(data.periods[0])
        }
      }
    } catch (error) {
      console.error('Error fetching periods:', error)
    }
  }

  const fetchPeriodStats = async (period: string, periodNumber: 1 | 2) => {
    setLoading(true)
    try {
      const response = await fetch(`/dashboard/performance/api/performance-periods/stats?period=${encodeURIComponent(period)}`)
      if (response.ok) {
        const stats = await response.json()
        if (periodNumber === 1) {
          setPeriod1Stats(stats)
        } else {
          setPeriod2Stats(stats)
        }
      }
    } catch (error) {
      console.error('Error fetching period stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDifference = (value1: number, value2: number) => {
    if (!value2) return 0
    return ((value1 - value2) / value2) * 100
  }

  const getTrendIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (diff: number) => {
    if (diff > 0) return 'text-green-600'
    if (diff < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const StatCard = ({ 
    title, 
    value1, 
    value2, 
    icon: Icon,
    suffix = '',
    higherIsBetter = true
  }: { 
    title: string
    value1: number
    value2: number
    icon: any
    suffix?: string
    higherIsBetter?: boolean
  }) => {
    const diff = calculateDifference(value1, value2)
    const adjustedDiff = higherIsBetter ? diff : -diff

    return (
      <div className="p-4 border rounded-lg bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-5 w-5 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{selectedPeriod1}</p>
            <p className="text-2xl font-bold text-gray-900">{value1}{suffix}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{selectedPeriod2}</p>
            <p className="text-2xl font-bold text-gray-900">{value2}{suffix}</p>
          </div>
        </div>

        {value2 > 0 && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(adjustedDiff)}`}>
            {getTrendIcon(adjustedDiff)}
            <span className="font-semibold">
              {Math.abs(diff).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">
              {diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'no change'}
            </span>
          </div>
        )}
      </div>
    )
  }

  if (periods.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No performance periods available for comparison</p>
          <p className="text-sm text-gray-400 mt-2">Performance data will appear here once multiple periods are completed</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader 
        className="rounded-t-md"
        style={{
          background: gradients.navyHeader,
          boxShadow: shadows.header,
        }}
      >
        <CardTitle className="flex items-center gap-2 text-white">
          <Target className="h-5 w-5 text-white/80" />
          Performance Period Comparison
        </CardTitle>
        <p className="text-sm text-white/70 mt-1">
          Compare performance metrics across different periods to track progress over time
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Period 1</label>
            <Select value={selectedPeriod1} onValueChange={setSelectedPeriod1}>
              <SelectTrigger>
                <SelectValue placeholder="Select first period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period} value={period} disabled={period === selectedPeriod2}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Period 2</label>
            <Select value={selectedPeriod2} onValueChange={setSelectedPeriod2}>
              <SelectTrigger>
                <SelectValue placeholder="Select second period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period} value={period} disabled={period === selectedPeriod1}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Stats */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <GoldSpinner size="md" message="Loading comparison data..." />
          </div>
        ) : period1Stats && period2Stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Total Agreements"
                value1={period1Stats.totalAgreements}
                value2={period2Stats.totalAgreements}
                icon={Target}
              />
              
              <StatCard
                title="Completion Rate"
                value1={period1Stats.completionRate}
                value2={period2Stats.completionRate}
                icon={CheckCircle2}
                suffix="%"
              />
              
              <StatCard
                title="Completed"
                value1={period1Stats.completed}
                value2={period2Stats.completed}
                icon={CheckCircle2}
              />
              
              <StatCard
                title="In Progress"
                value1={period1Stats.inProgress}
                value2={period2Stats.inProgress}
                icon={Clock}
                higherIsBetter={false}
              />
            </div>

            {/* Average Rating Comparison */}
            {(period1Stats.averageRating !== null || period2Stats.averageRating !== null) && (
              <div className="p-4 border rounded-lg bg-linear-to-r from-blue-50 to-indigo-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Average Performance Rating
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{selectedPeriod1}</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {period1Stats.averageRating?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{selectedPeriod2}</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {period2Stats.averageRating?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>
                {period1Stats.averageRating && period2Stats.averageRating && (
                  <div className="mt-3">
                    <Badge variant={period1Stats.averageRating > period2Stats.averageRating ? 'default' : 'secondary'}>
                      {period1Stats.averageRating > period2Stats.averageRating 
                        ? `${((period1Stats.averageRating - period2Stats.averageRating) / period2Stats.averageRating * 100).toFixed(1)}% improvement`
                        : period1Stats.averageRating < period2Stats.averageRating
                          ? `${((period2Stats.averageRating - period1Stats.averageRating) / period2Stats.averageRating * 100).toFixed(1)}% decline`
                          : 'No change'
                      }
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Select two periods to compare</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
