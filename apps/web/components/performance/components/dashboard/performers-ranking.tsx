'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Award, Building2, Users, Globe } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { gradients, shadows, colors } from '@/app/ui-standards'

interface Performer {
  name: string
  role: string
  totalTasks: number
  completedTasks: number
  completionRate: number
}

interface Rankings {
  organization: Performer[]
  department: Performer[]
  division: Performer[]
}

export function PerformersRanking() {
  const [rankings, setRankings] = useState<Rankings>({
    organization: [],
    department: [],
    division: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/dashboard/performance/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || { organization: [], department: [], division: [] })
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch performers:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Performance Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPerformersList = (performers: Performer[], emptyMessage: string) => {
    if (!performers || performers.length === 0) {
      return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>
    }

    return performers.map((performer, index) => (
      <div
        key={`${performer.name}-${index}`}
        className="flex items-center gap-3 p-3 rounded-lg bg-linear-to-r from-green-50 to-transparent border border-green-200"
      >
        <div className="shrink-0">
          {index === 0 && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.gold }}>
              <Trophy className="h-5 w-5 text-white" />
            </div>
          )}
          {index === 1 && (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
          )}
          {index === 2 && (
            <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
          )}
          {index > 2 && (
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{performer.name}</p>
          <p className="text-xs text-gray-500">{performer.role}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-green-600">{performer.completionRate}%</p>
          <p className="text-xs text-gray-500">
            {performer.completedTasks}/{performer.totalTasks} tasks
          </p>
        </div>
      </div>
    ))
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
          <Trophy className="h-5 w-5 text-white/80" />
          Performance Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="department" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department
            </TabsTrigger>
            <TabsTrigger value="division" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Division
            </TabsTrigger>
          </TabsList>

          {/* Organization Rankings Tab */}
          <TabsContent value="organization" className="space-y-3">
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Top 10 performers across the entire organization
              </p>
            </div>
            {renderPerformersList(rankings.organization, 'No organization-wide data available')}
          </TabsContent>

          {/* Department Rankings Tab */}
          <TabsContent value="department" className="space-y-3">
            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-xs text-purple-800 flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Top 10 performers in your department
              </p>
            </div>
            {renderPerformersList(rankings.department, 'No department data available')}
          </TabsContent>

          {/* Division Rankings Tab */}
          <TabsContent value="division" className="space-y-3">
            <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
              <p className="text-xs text-teal-800 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Top 10 performers in your division
              </p>
            </div>
            {renderPerformersList(rankings.division, 'No division data available or you are not assigned to a division')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
