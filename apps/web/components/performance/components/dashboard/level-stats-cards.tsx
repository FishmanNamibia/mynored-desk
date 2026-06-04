'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Target, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Calendar, Shield, FileText } from 'lucide-react'

interface Stats {
  totals?: {
    targets: number
  }
  statusBreakdown?: Record<string, number>
  overdue?: number
  completionRate?: number
  timeline?: {
    tasksDueThisWeek: number
    tasksDueThisMonth: number
  }
  risks?: {
    blockedTasks: number
  }
}

interface LevelStatsCardsProps {
  level: 'organization' | 'department' | 'division'
  levelId?: string
  levelName?: string
}

export function LevelStatsCards({ level, levelId, levelName }: LevelStatsCardsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogData, setDialogData] = useState<{ title: string, items: any[] }>({ title: '', items: [] })

  useEffect(() => {
    const params = new URLSearchParams()
    if (level !== 'organization' && levelId) {
      params.append('level', level)
      params.append('levelId', levelId)
    }
    
    // Fetch stats
    fetch(`/dashboard/performance/api/dashboard/level-stats?${params.toString()}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch stats')
        }
        return res.json()
      })
      .then(data => {
        if (data.error) {
          console.error('API error:', data.error)
          setStats(null)
        } else {
          setStats(data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err)
        setStats(null)
        setLoading(false)
      })
    
    // Fetch all tasks for detailed view - level-aware
    const levelTasksParams = new URLSearchParams()
    if (level !== 'organization' && levelId) {
      levelTasksParams.append('level', level)
      levelTasksParams.append('levelId', levelId)
    } else if (level === 'organization') {
      levelTasksParams.append('level', 'organization')
    }

    fetch(`/dashboard/performance/api/dashboard/level-tasks?${levelTasksParams.toString()}`)
      .then(res => res.json())
      .then(data => setTargets(data))
      .catch(err => console.error('Failed to fetch level tasks:', err))
  }, [level, levelId])

  const openDialog = (title: string, filterFn: (target: any) => boolean) => {
    const filteredItems = targets.filter(filterFn)
    setDialogData({ title, items: filteredItems })
    setDialogOpen(true)
  }

  const isOverdue = (target: any) => {
    if (!target.dueDate) return false
    return new Date(target.dueDate) < new Date() && target.status !== 'COMPLETED'
  }

  const isDueThisWeek = (target: any) => {
    if (!target.dueDate) return false
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const dueDate = new Date(target.dueDate)
    return dueDate >= now && dueDate <= weekFromNow
  }

  const isDueThisMonth = (target: any) => {
    if (!target.dueDate) return false
    const now = new Date()
    const dueDate = new Date(target.dueDate)
    return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
  }

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">No data available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const levelLabel = level === 'organization' ? 'Organization' : (levelName || level)

  const statusBreakdown = stats.statusBreakdown || {}
  
  const cards = [
    {
      title: 'Completion Rate',
      value: `${stats.completionRate || 0}%`,
      subtitle: `${statusBreakdown.COMPLETED || 0} of ${stats.totals?.targets || 0} completed`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      onClick: () => openDialog('All Tasks', () => true)
    },
    {
      title: 'Completed',
      value: statusBreakdown.COMPLETED || 0,
      subtitle: undefined,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      onClick: () => openDialog('Completed Tasks', (t) => t.status === 'COMPLETED')
    },
    {
      title: 'In Progress',
      value: statusBreakdown.IN_PROGRESS || 0,
      subtitle: stats.timeline ? `${stats.timeline.tasksDueThisWeek} due this week` : undefined,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      onClick: () => openDialog('In Progress Tasks', (t) => t.status === 'IN_PROGRESS')
    },
    {
      title: 'Overdue',
      value: stats.overdue || 0,
      subtitle: stats.risks ? `${stats.risks.blockedTasks} blocked` : undefined,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      onClick: () => openDialog('Overdue Tasks', (t) => isOverdue(t))
    },
  ]

  const secondaryCards = [
    {
      title: 'Total Tasks',
      value: stats.totals?.targets || 0,
      subtitle: undefined,
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      onClick: () => openDialog('All Tasks', () => true)
    },
    {
      title: 'Not Started',
      value: statusBreakdown.NOT_STARTED || 0,
      subtitle: undefined,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      onClick: () => openDialog('Not Started Tasks', (t) => t.status === 'NOT_STARTED')
    },
    {
      title: 'Due This Month',
      value: stats.timeline?.tasksDueThisMonth || 0,
      subtitle: `${stats.timeline?.tasksDueThisWeek || 0} this week`,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      onClick: () => openDialog('Due This Month', (t) => isDueThisMonth(t))
    },
    {
      title: 'Blocked',
      value: stats.risks?.blockedTasks || 0,
      subtitle: `Requires attention`,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      onClick: () => openDialog('Blocked Tasks', (t) => t.status === 'BLOCKED')
    },
  ]

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card 
              key={card.title} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {secondaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card 
              key={card.title}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog for detailed view */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogData.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogData.items.map((target: any) => (
              <Card key={target.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{target.title}</h4>
                      {target.description && (
                        <p className="text-sm text-gray-600 mt-1">{target.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <Badge className={
                          target.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                          target.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                          target.status === 'BLOCKED' ? 'bg-red-700 text-white' :
                          'bg-red-500 text-white'
                        }>
                          {target.status || 'Not Started'}
                        </Badge>
                        <Badge variant="outline" className={
                          target.priority === 'CRITICAL' ? 'border-red-600 text-red-700' :
                          target.priority === 'HIGH' ? 'border-orange-500 text-orange-700' :
                          target.priority === 'MEDIUM' ? 'border-yellow-500 text-yellow-700' :
                          'border-gray-500 text-gray-700'
                        }>
                          {target.priority || 'Low'}
                        </Badge>
                        {target.percentComplete !== undefined && (
                          <div className="flex items-center gap-2">
                            <Progress value={target.percentComplete} className="w-24" />
                            <span className="text-xs">{target.percentComplete}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        {target.responsible && (
                          <span>Responsible: {target.responsible.name}</span>
                        )}
                        {target.dueDate && (
                          <span className={isOverdue(target) ? 'text-red-600 font-semibold' : ''}>
                            Due: {new Date(target.dueDate).toLocaleDateString()}
                            {isOverdue(target) && ' (Overdue)'}
                          </span>
                        )}
                        {target.initiative && (
                          <span>Initiative: {target.initiative.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {dialogData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
