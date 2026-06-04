'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface TrendData {
  date: string
  completed: number
}

export function TrendsChart() {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/dashboard/performance/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setTrends(data.trends || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch trends:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Trend (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-48 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  const maxCompleted = Math.max(...trends.map(t => t.completed), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Progress Trend (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple bar chart */}
          <div className="flex items-end justify-between h-48 gap-2">
            {trends.map((trend, index) => {
              const height = (trend.completed / maxCompleted) * 100
              const date = new Date(trend.date)
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
              
              return (
                <div key={trend.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-full">
                    <span className="text-xs font-medium text-gray-700 mb-1">
                      {trend.completed}
                    </span>
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{dayName}</span>
                </div>
              )
            })}
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              Total completed tasks over the last 7 days
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
