'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, TrendingUp, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { gradients, shadows } from '@/app/ui-standards'

interface CategoryItem {
  id: string
  name: string
  weight: number
  rating: number
  componentKey: string
}

interface PerformanceRateData {
  finalRating: number
  finalPercentage: number
  weights: {
    performanceAgreement: number
    adhoc: number
    projects: number
    riskManagement: number
    rating360: number
    [key: string]: number
  }
  components: {
    [key: string]: {
      rating: number
      weight: number
      weightedScore: number
      [key: string]: any
    }
  }
  categories?: CategoryItem[]
  performanceAgreementInitiatives: Array<{
    id: string
    title: string
    rating: number
    weight: number
  }>
}

export function MyPerformanceRateCard() {
  const [data, setData] = useState<PerformanceRateData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformanceRate()
  }, [])

  const fetchPerformanceRate = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/my-rate')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching performance rate:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="pt-6 flex items-center justify-center h-48">
          <p className="text-gray-500">Loading performance data...</p>
        </CardContent>
      </Card>
    )
  }

  // Determine color scheme based on performance rate
  const getPerformanceColor = (rate: number) => {
    if (rate >= 4.0) return 'green'
    if (rate >= 3.0) return 'blue'
    if (rate >= 2.0) return 'yellow'
    return 'red'
  }

  const color = getPerformanceColor(data?.finalRating || 0)
  const percentage = data?.finalPercentage || 0

  const colorClasses = {
    green: {
      gradient: 'from-green-50 to-emerald-100',
      text: 'text-green-900',
      icon: 'text-green-600',
      border: 'border-green-300',
      badge: 'bg-green-100 text-green-800'
    },
    blue: {
      gradient: 'from-blue-50 to-indigo-100',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      border: 'border-blue-300',
      badge: 'bg-blue-100 text-blue-800'
    },
    yellow: {
      gradient: 'from-yellow-50 to-amber-100',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      border: 'border-yellow-300',
      badge: 'bg-yellow-100 text-yellow-800'
    },
    red: {
      gradient: 'from-red-50 to-rose-100',
      text: 'text-red-900',
      icon: 'text-red-600',
      border: 'border-red-300',
      badge: 'bg-red-100 text-red-800'
    }
  }

  const classes = colorClasses[color]

  if (!data) {
    return (
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-linear-to-br from-gray-50 to-gray-100">
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <Award className="w-6 h-6" />
            My Rate To Date
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-600">No performance data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Overall Performance Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader 
          className="rounded-t-md"
          style={{
            background: gradients.navyToGold,
            boxShadow: shadows.banner,
          }}
        >
          <CardTitle className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-white/80" />
            My Rate To Date
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
        {/* Main Performance Score */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(data.finalRating)
                    ? `fill-yellow-400 text-yellow-400`
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
          <div className={`text-4xl font-bold ${classes.text} mb-1`}>
            {data.finalRating.toFixed(2)}
          </div>
          <p className="text-xs text-gray-600 font-medium">Weighted Average (out of 5.0)</p>
        </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Performance Progress</span>
              <span>{percentage.toFixed(0)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Performance Level Badge */}
          <div className="text-center pt-1">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${classes.badge}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                {data.finalRating >= 4.5 ? 'Outstanding' :
                  data.finalRating >= 4.0 ? 'Excellent' :
                    data.finalRating >= 3.5 ? 'Very Good' :
                      data.finalRating >= 3.0 ? 'Good' :
                        data.finalRating >= 2.5 ? 'Satisfactory' :
                          'Needs Improvement'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components Breakdown Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader 
          className="py-3 rounded-t-md"
          style={{
            background: gradients.navyHeader,
            boxShadow: shadows.header,
          }}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <TrendingUp className="w-4 h-4 text-white/80" />
              Components
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/60">Total:</span>
              <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                100%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
        {/* Dynamic Component Metrics - renders all categories with weight > 0% */}
        <div className="grid grid-cols-3 gap-2">
          {(data.categories && data.categories.length > 0 ? data.categories : [
            { id: 'perf', name: 'Perf. Agr.', weight: data.weights.performanceAgreement, rating: data.components.performanceAgreement?.rating || 0, componentKey: 'performanceAgreement' },
            { id: 'adhoc', name: 'Adhoc', weight: data.weights.adhoc, rating: data.components.adhoc?.rating || 0, componentKey: 'adhoc' },
            { id: 'project', name: 'Projects', weight: data.weights.projects, rating: data.components.projects?.rating || 0, componentKey: 'projects' },
            { id: 'risk', name: 'Risk', weight: data.weights.riskManagement, rating: data.components.riskManagement?.rating || 0, componentKey: 'riskManagement' },
            { id: 'audit', name: 'Audit', weight: 0, rating: 0, componentKey: 'audit' },
          ].filter(c => c.weight > 0)).map((cat) => {
            const shortName = cat.name.length > 12 ? cat.name.split(' ').map(w => w[0]?.toUpperCase()).join('.') : cat.name
            return (
              <div key={cat.id} className="flex flex-col items-center space-y-1 p-2 bg-gray-50 rounded-lg">
                <div className={`text-xl font-bold ${classes.text}`}>
                  {cat.rating.toFixed(1)}
                </div>
                <p className="text-[10px] text-gray-600 leading-tight text-center" title={cat.name}>
                  {shortName}
                </p>
                <div className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">
                  {cat.weight}%
                </div>
              </div>
            )
          })}
        </div>
        </CardContent>
      </Card>
    </div>
  )
}
