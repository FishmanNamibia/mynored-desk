'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, TrendingUp } from 'lucide-react'
import { gradients, shadows, colors } from '@/app/ui-standards'

interface LeaderboardEntry {
  user?: {
    id: string
    name: string
    email: string
  }
  division?: {
    id: string
    name: string
  }
  totalCompleted: number
  onTimeCompleted: number
  lateCompleted: number
}

export function LeaderboardSection() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [type, setType] = useState<'staff' | 'division'>('staff')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/dashboard/performance/api/dashboard/leaderboard?period=${period}&type=${type}`)
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch leaderboard:', err)
        setLoading(false)
      })
  }, [period, type])

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader 
        className="rounded-t-md"
        style={{
          background: gradients.navyHeader,
          boxShadow: shadows.header,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: colors.gold }} />
            <CardTitle className="text-white">Top Performers</CardTitle>
          </div>
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'staff' | 'division')}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="staff">Staff</option>
              <option value="division">Division</option>
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No data available for this period
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${index === 1 ? 'bg-gray-200 text-gray-700' : ''}
                    ${index === 2 ? 'bg-orange-100 text-orange-700' : ''}
                    ${index > 2 ? 'bg-gray-100 text-gray-600' : ''}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {type === 'staff' ? entry.user?.name : entry.division?.name}
                    </p>
                    {type === 'staff' && (
                      <p className="text-xs text-gray-500">{entry.user?.email}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-green-600">
                      {entry.onTimeCompleted}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {entry.totalCompleted} total
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
