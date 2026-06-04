'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MessageSquare, 
  Users, 
  ThumbsUp, 
  ThumbsDown, 
  Clock, 
  TrendingUp,
  BarChart3,
  User,
  Calendar,
  Shield,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface Stats {
  overview: {
    totalQuestions: number
    uniqueUsers: number
    helpfulResponses: number
    unhelpfulResponses: number
    satisfactionRate: number | null
    avgResponseTime: number
  }
  categoryBreakdown: Record<string, number>
  roleBreakdown: Record<string, number>
  dailyUsage: Record<string, number>
  topUsers: Array<{
    user: {
      name: string
      email: string
      role: string
      department?: { name: string }
      division?: { name: string }
    }
    count: number
  }>
  commonQuestions: Array<{
    sample: string
    count: number
  }>
  recentLogs: Array<{
    id: string
    question: string
    answer?: string
    category?: string
    wasHelpful?: boolean
    responseTime?: number
    createdAt: string
    user: {
      name: string
      email: string
      role: string
    }
  }>
}

export default function HelpAssistantStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchStats()
  }, [timeRange])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/dashboard/performance/api/help-assistant/stats?days=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to fetch stats:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error'
        })
        
        // Set error message based on status
        if (response.status === 403) {
          setError('access_denied')
        } else {
          setError('fetch_failed')
        }
        setStats(null)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('network_error')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!loading && !stats) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {error === 'access_denied' ? (
                <>
                  <Shield className="w-16 h-16 text-red-500 mb-4" />
                  <h3 className="text-xl font-semibold text-red-900 mb-2">
                    Access Restricted
                  </h3>
                  <p className="text-red-700 max-w-md">
                    This page is restricted to administrators only. You need ADMIN role to view Help Assistant statistics.
                  </p>
                  <p className="text-red-600 text-sm mt-4">
                    If you believe you should have access, please contact your system administrator.
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                  <h3 className="text-xl font-semibold text-red-900 mb-2">
                    Failed to Load Statistics
                  </h3>
                  <p className="text-red-700 max-w-md">
                    {error === 'network_error' 
                      ? 'A network error occurred while fetching statistics. Please check your connection and try again.'
                      : 'Unable to load Help Assistant statistics. Please try again later.'}
                  </p>
                  <button
                    onClick={fetchStats}
                    className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Help Assistant Statistics</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Analytics and usage insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Questions
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{stats?.overview.totalQuestions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              From {stats?.overview.uniqueUsers || 0} unique users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Satisfaction Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {stats?.overview.satisfactionRate !== null 
                ? `${stats?.overview.satisfactionRate}%` 
                : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.overview.helpfulResponses || 0} helpful, {stats?.overview.unhelpfulResponses || 0} not helpful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Response Time
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {stats?.overview.avgResponseTime && stats.overview.avgResponseTime > 0 
                ? `${(stats.overview.avgResponseTime / 1000).toFixed(1)}s`
                : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{stats?.overview.uniqueUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Unique users asking questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="questions">Common Questions</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Question Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.categoryBreakdown || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{category}</span>
                          <span className="text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / (stats?.overview.totalQuestions || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Usage by Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.roleBreakdown || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => (
                      <div key={role} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{role.replace('_', ' ')}</span>
                          <span className="text-gray-600">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${(count / (stats?.overview.totalQuestions || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Usage Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Usage Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats?.dailyUsage || {})
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 14)
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-24">
                        {format(new Date(date), 'MMM dd')}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-green-600 h-6 rounded-full flex items-center px-2 text-xs text-white font-medium"
                          style={{
                            width: `${Math.min((count / Math.max(...Object.values(stats?.dailyUsage || {}), 1)) * 100, 100)}%`,
                            minWidth: count > 0 ? '30px' : '0',
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats?.topUsers || []).map((item, index) => (
                  <div
                    key={item.user.email}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.user.name}</p>
                        <p className="text-sm text-gray-500">{item.user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.user.role.replace('_', ' ')}</Badge>
                          {item.user.department && (
                            <span className="text-xs text-gray-500">
                              {item.user.department.name}
                            </span>
                          )}
                          {item.user.division && (
                            <span className="text-xs text-gray-500">
                              {item.user.division.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{item.count}</p>
                      <p className="text-xs text-gray-500">questions</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Most Common Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(stats?.commonQuestions || []).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{item.sample}</p>
                    </div>
                    <Badge>{item.count}x</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats?.recentLogs || []).map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{log.user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.user.role.replace('_', ' ')}
                          </Badge>
                          {log.category && (
                            <Badge variant="secondary" className="text-xs">
                              {log.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Q:</span> {log.question}
                        </p>
                        {log.answer && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">A:</span> {log.answer.substring(0, 200)}
                            {log.answer.length > 200 && '...'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                        </span>
                        {log.wasHelpful !== null && log.wasHelpful !== undefined && (
                          <div className="flex items-center gap-1">
                            {log.wasHelpful ? (
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                        )}
                        {log.responseTime && (
                          <span className="text-xs text-gray-500">
                            {(log.responseTime / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
