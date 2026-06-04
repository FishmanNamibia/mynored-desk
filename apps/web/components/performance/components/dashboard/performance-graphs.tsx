'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Building2, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { gradients, shadows } from '@/app/ui-standards'

interface PerformanceData {
  overallNSA: {
    totalTasks: number
    completedTasks: number
    completionRate: number
    overdueTasks: number
    inProgressTasks: number
    notStartedTasks: number
    blockedTasks: number
  }
  departments: Array<{
    name: string
    totalTasks: number
    completedTasks: number
    completionRate: number
    overdueTasks: number
  }>
  divisions: Array<{
    name: string
    department: string
    totalTasks: number
    completedTasks: number
    completionRate: number
    overdueTasks: number
  }>
}

export function PerformanceGraphs() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/dashboard/performance/api/dashboard/stats')
      .then(res => res.json())
      .then(stats => {
        setData({
          overallNSA: stats.overallNSA,
          departments: stats.departments || [],
          divisions: stats.divisions || [],
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch performance data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const maxRate = Math.max(
    ...data.departments.map(d => d.completionRate),
    ...data.divisions.map(d => d.completionRate),
    100
  )

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
          <BarChart3 className="h-5 w-5 text-white/80" />
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overall">Overall NSA</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="divisions">Divisions</TabsTrigger>
          </TabsList>

          {/* Overall NSA Tab */}
          <TabsContent value="overall" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-600">{data.overallNSA.totalTasks}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{data.overallNSA.completedTasks}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{data.overallNSA.inProgressTasks}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{data.overallNSA.overdueTasks}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Overall Completion Rate</h3>
                <span className="text-3xl font-bold text-primary">{data.overallNSA.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className="bg-primary h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all"
                  style={{ width: `${data.overallNSA.completionRate}%` }}
                >
                  {data.overallNSA.completionRate}%
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="space-y-3">
              {data.departments.slice(0, 10).map((dept, index) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{dept.name}</span>
                      {dept.overdueTasks > 0 && (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {dept.overdueTasks} overdue
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold">{dept.completionRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full flex items-center px-2 text-xs font-medium text-white transition-all ${
                          dept.completionRate >= 75 ? 'bg-green-500' :
                          dept.completionRate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(dept.completionRate / maxRate) * 100}%` }}
                      >
                        {dept.completedTasks}/{dept.totalTasks}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Divisions Tab */}
          <TabsContent value="divisions" className="space-y-4">
            {/* Division Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.divisions.reduce((sum, d) => sum + d.totalTasks, 0)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.divisions.reduce((sum, d) => sum + d.completedTasks, 0)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Avg. Completion</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {data.divisions.length > 0 
                    ? Math.round(data.divisions.reduce((sum, d) => sum + d.completionRate, 0) / data.divisions.length)
                    : 0}%
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {data.divisions.reduce((sum, d) => sum + d.overdueTasks, 0)}
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.divisions.filter(d => d.totalTasks > 0).slice(0, 15).map((div) => (
                <div key={div.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{div.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">{div.department}</p>
                    </div>
                    <span className="text-sm font-bold">{div.completionRate}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full flex items-center px-2 text-xs font-medium text-white transition-all ${
                          div.completionRate >= 75 ? 'bg-green-500' :
                          div.completionRate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(div.completionRate / maxRate) * 100}%` }}
                      >
                        {div.completedTasks}/{div.totalTasks}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
