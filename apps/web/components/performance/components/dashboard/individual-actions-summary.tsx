'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, CheckCircle2, Clock, AlertCircle, Zap, BookOpen, Shield, Target } from 'lucide-react'
import { gradients, shadows } from '@/app/ui-standards'

interface ActionsSummary {
  performanceAgreement: {
    total: number
    completed: number
    inProgress: number
    pending: number
    actions: any[]
  }
  adhoc: {
    total: number
    completed: number
    inProgress: number
    pending: number
    actions: any[]
  }
  projects: {
    total: number
    completed: number
    inProgress: number
    pending: number
    actions: any[]
  }
  riskManagement: {
    total: number
    completed: number
    inProgress: number
    pending: number
    actions: any[]
  }
  totals: {
    all: number
    completed: number
    inProgress: number
    pending: number
  }
}

export function IndividualActionsSummary() {
  const [summary, setSummary] = useState<ActionsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogData, setDialogData] = useState<{ title: string, actions: any[] }>({ title: '', actions: [] })

  useEffect(() => {
    fetchActionsSummary()
  }, [])

  const fetchActionsSummary = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/dashboard/individual-actions')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Error fetching actions summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No actions data available</p>
        </CardContent>
      </Card>
    )
  }

  const getCompletionRate = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const openDialog = (title: string, filterFn: (action: any) => boolean) => {
    if (!summary) return

    // Combine all actions from all categories
    const allActions = [
      ...summary.performanceAgreement.actions,
      ...summary.adhoc.actions,
      ...summary.projects.actions,
      ...summary.riskManagement.actions
    ]

    // Filter actions based on the provided filter function
    const filteredActions = allActions.filter(filterFn)

    setDialogData({ title, actions: filteredActions })
    setDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
        return 'bg-green-500 text-white'
      case 'pending_approval':
      case 'in_progress':
        return 'bg-blue-500 text-white'
      case 'pending':
      case 'not_started':
        return 'bg-yellow-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader 
          className="rounded-t-md"
          style={{
            background: gradients.navyHeader,
            boxShadow: shadows.header,
          }}
        >
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="w-6 h-6 text-white/80" />
            Total Actions Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              className="text-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openDialog('All Actions', () => true)}
            >
              <div className="text-3xl font-bold text-gray-900">{summary.totals.all}</div>
              <div className="text-sm text-gray-600 mt-1">Total Actions</div>
            </div>
            <div 
              className="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openDialog('Completed Actions', (action) => 
                action.status === 'APPROVED' || action.status === 'COMPLETED'
              )}
            >
              <div className="text-3xl font-bold text-green-600">{summary.totals.completed}</div>
              <div className="text-sm text-gray-600 mt-1">Completed</div>
            </div>
            <div 
              className="text-center p-4 bg-blue-50 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openDialog('In Progress Actions', (action) => 
                action.status === 'PENDING_APPROVAL' || action.status === 'IN_PROGRESS'
              )}
            >
              <div className="text-3xl font-bold text-blue-600">{summary.totals.inProgress}</div>
              <div className="text-sm text-gray-600 mt-1">In Progress</div>
            </div>
            <div 
              className="text-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openDialog('Pending Actions', (action) => 
                action.status === 'PENDING' || action.status === 'NOT_STARTED' || !action.status
              )}
            >
              <div className="text-3xl font-bold text-yellow-600">{summary.totals.pending}</div>
              <div className="text-sm text-gray-600 mt-1">Pending</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-semibold text-gray-900">
                {getCompletionRate(summary.totals.completed, summary.totals.all)}%
              </span>
            </div>
            <Progress 
              value={getCompletionRate(summary.totals.completed, summary.totals.all)} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Component Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Agreement */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              Performance Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{summary.performanceAgreement.total}</span>
                <Badge variant="outline" className="text-xs">
                  {getCompletionRate(summary.performanceAgreement.completed, summary.performanceAgreement.total)}% Complete
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-600">{summary.performanceAgreement.completed}</div>
                  <div className="text-gray-600">Done</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-600">{summary.performanceAgreement.inProgress}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-semibold text-yellow-600">{summary.performanceAgreement.pending}</div>
                  <div className="text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ad-hoc Tasks */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-green-600" />
              Ad-hoc Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{summary.adhoc.total}</span>
                <Badge variant="outline" className="text-xs">
                  {getCompletionRate(summary.adhoc.completed, summary.adhoc.total)}% Complete
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-600">{summary.adhoc.completed}</div>
                  <div className="text-gray-600">Done</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-600">{summary.adhoc.inProgress}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-semibold text-yellow-600">{summary.adhoc.pending}</div>
                  <div className="text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{summary.projects.total}</span>
                <Badge variant="outline" className="text-xs">
                  {getCompletionRate(summary.projects.completed, summary.projects.total)}% Complete
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-600">{summary.projects.completed}</div>
                  <div className="text-gray-600">Done</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-600">{summary.projects.inProgress}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-semibold text-yellow-600">{summary.projects.pending}</div>
                  <div className="text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-orange-600" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{summary.riskManagement.total}</span>
                <Badge variant="outline" className="text-xs">
                  {getCompletionRate(summary.riskManagement.completed, summary.riskManagement.total)}% Complete
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-600">{summary.riskManagement.completed}</div>
                  <div className="text-gray-600">Done</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-600">{summary.riskManagement.inProgress}</div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-semibold text-yellow-600">{summary.riskManagement.pending}</div>
                  <div className="text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for detailed view */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {dialogData.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogData.actions.map((action: any) => (
              <Card key={action.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{action.title}</h4>
                      <div className="flex items-center gap-4 mt-3">
                        <Badge className={getStatusColor(action.status)}>
                          {action.status || 'Not Started'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {dialogData.actions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No actions found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
