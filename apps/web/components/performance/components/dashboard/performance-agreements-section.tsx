'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText } from 'lucide-react'

interface OrgStats {
  totalUsers: number
  usersWithAgreements: number
  usersWithCompleteAgreements: number
  usersInProgress: number
  usersNotStarted: number
  totalAgreements: number
  totalApproved: number
}

interface DepartmentStats {
  departmentId: string
  departmentName: string
  totalUsers: number
  usersWithAgreements: number
  usersWithCompleteAgreements: number
  usersInProgress: number
  usersNotStarted: number
  totalAgreements: number
  totalApproved: number
  completionRate: number
}

interface DivisionStats {
  divisionId: string
  divisionName: string
  totalUsers: number
  usersWithAgreements: number
  usersWithCompleteAgreements: number
  usersInProgress: number
  usersNotStarted: number
  totalAgreements: number
  totalApproved: number
  completionRate: number
}

interface CompletionStats {
  organization: OrgStats
  departments: DepartmentStats[]
  divisions: DivisionStats[]
}

export function PerformanceAgreementsSection() {
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/performance-agreements/completion-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const orgCompletionRate = stats.organization.usersWithAgreements > 0
    ? (stats.organization.usersWithCompleteAgreements / stats.organization.usersWithAgreements) * 100
    : 0

  const renderOverviewCards = (
    total: number,
    completed: number,
    inProgress: number,
    completionRate: number
  ) => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Total Agreements</p>
              <p className="text-4xl font-bold text-blue-900">{total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Completed</p>
              <p className="text-4xl font-bold text-green-900">{completed}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">In Progress</p>
              <p className="text-4xl font-bold text-yellow-900">{inProgress}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Not Started</p>
              <p className="text-4xl font-bold text-red-900">{total - completed - inProgress}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Completion Rate */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Overall Completion Rate</h3>
            <p className="text-4xl font-bold text-blue-600">{completionRate.toFixed(0)}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            <CardTitle>Performance Overview</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="organization">Overall NSA</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="divisions">Divisions</TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-4">
            {renderOverviewCards(
              stats.organization.usersWithAgreements,
              stats.organization.usersWithCompleteAgreements,
              stats.organization.usersInProgress,
              orgCompletionRate
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            {stats.departments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No department data available</div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {stats.departments.map((dept) => (
                  <div key={dept.departmentId} className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">{dept.departmentName}</h3>
                    {renderOverviewCards(
                      dept.usersWithAgreements,
                      dept.usersWithCompleteAgreements,
                      dept.usersInProgress,
                      dept.completionRate
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Divisions Tab */}
          <TabsContent value="divisions" className="space-y-6">
            {stats.divisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No division data available</div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {stats.divisions.map((div) => (
                  <div key={div.divisionId} className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">{div.divisionName}</h3>
                    {renderOverviewCards(
                      div.usersWithAgreements,
                      div.usersWithCompleteAgreements,
                      div.usersInProgress,
                      div.completionRate
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
