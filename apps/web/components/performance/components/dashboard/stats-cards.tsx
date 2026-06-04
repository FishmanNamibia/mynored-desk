'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Target, CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Calendar, Shield, ExternalLink, FileText } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface Stats {
  totals: {
    goals: number
    objectives: number
    initiatives: number
    targets: number
  }
  statusBreakdown: Record<string, number>
  overdue: number
  completionRate: number
  departmentTasks?: {
    total: number
    completed: number
    completionRate: number
  }
  strategic?: {
    goalCompletionRate: number
    completedGoals: number
    totalGoals: number
  }
  timeline?: {
    tasksDueThisWeek: number
    tasksDueThisMonth: number
  }
  risks?: {
    blockedTasks: number
    criticalTasks: number
  }
  engagement?: {
    activeUsers: number
    totalUsers: number
    engagementRate: number
  }
  initiatives?: {
    total: number
    completed: number
    inProgress: number
    notStarted: number
    blocked: number
    completionRate: number
  }
}

interface TaskDetail {
  id: string
  title: string
  status: string
  dueDate: string
  evidenceUrl?: string | null
  evidenceNotes?: string | null
  responsible: {
    name: string
  }
  initiative: {
    title: string
    objective: {
      title: string
      goal: {
        title: string
      }
    }
  }
}

interface UserActivity {
  id: string
  name: string
  email: string
  role: string
  lastLoginAt: string | null
  department?: {
    id: string
    name: string
  } | null
  division?: {
    id: string
    name: string
    department: {
      id: string
      name: string
    }
  } | null
}

export function StatsCards() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('')
  const [dialogType, setDialogType] = useState<'tasks' | 'users'>('tasks')
  const [dialogTasks, setDialogTasks] = useState<TaskDetail[]>([])
  const [dialogUsers, setDialogUsers] = useState<UserActivity[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  useEffect(() => {
    fetch('/dashboard/performance/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err)
        setLoading(false)
      })
  }, [])

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

  if (!stats) return null

  const handleCardClick = async (filter: string, title: string) => {
    // Check if this is the Active Users card
    if (title === 'Active Users') {
      setDialogType('users')
      setDialogTitle('User Login Activity')
      setDialogOpen(true)
      setLoadingTasks(true)
      
      try {
        const response = await fetch('/dashboard/performance/api/dashboard/users-activity')
        const users = await response.json()
        setDialogUsers(users)
      } catch (error) {
        console.error('Failed to fetch users:', error)
        setDialogUsers([])
      } finally {
        setLoadingTasks(false)
      }
    } else {
      // Handle task dialogs
      setDialogType('tasks')
      setDialogTitle(title)
      setDialogOpen(true)
      setLoadingTasks(true)
      
      try {
        const response = await fetch(`/dashboard/performance/api/dashboard/tasks?filter=${filter}`)
        const tasks = await response.json()
        setDialogTasks(tasks)
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
        setDialogTasks([])
      } finally {
        setLoadingTasks(false)
      }
    }
  }

  const handleTaskClick = (taskId: string) => {
    setDialogOpen(false)
    router.push(`/dashboard/targets?taskId=${taskId}`)
  }

  const categorizeUsersByLoginRecency = (users: UserActivity[]) => {
    const now = new Date()
    const categories = {
      today: [] as UserActivity[],
      yesterday: [] as UserActivity[],
      last7Days: [] as UserActivity[],
      last30Days: [] as UserActivity[],
      older: [] as UserActivity[],
      neverLoggedIn: [] as UserActivity[],
    }

    users.forEach(user => {
      if (!user.lastLoginAt) {
        categories.neverLoggedIn.push(user)
      } else {
        const daysDiff = differenceInDays(now, new Date(user.lastLoginAt))
        
        if (daysDiff === 0) {
          categories.today.push(user)
        } else if (daysDiff === 1) {
          categories.yesterday.push(user)
        } else if (daysDiff <= 7) {
          categories.last7Days.push(user)
        } else if (daysDiff <= 30) {
          categories.last30Days.push(user)
        } else {
          categories.older.push(user)
        }
      }
    })

    return categories
  }

  const cards = [
    {
      title: 'Completion Rate',
      value: `${stats.departmentTasks?.completionRate ?? stats.completionRate}%`,
      subtitle: stats.departmentTasks 
        ? `${stats.departmentTasks.completed} of ${stats.departmentTasks.total} in your department`
        : `${stats.statusBreakdown.COMPLETED || 0} of ${stats.totals.targets} completed`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      filter: 'all',
    },
    {
      title: 'Completed',
      value: stats.statusBreakdown.COMPLETED || 0,
      subtitle: stats.strategic ? `${stats.strategic.completedGoals}/${stats.strategic.totalGoals} goals` : '',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      filter: 'completed',
    },
    {
      title: 'In Progress',
      value: stats.statusBreakdown.IN_PROGRESS || 0,
      subtitle: stats.timeline ? `${stats.timeline.tasksDueThisWeek} due this week` : '',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      filter: 'in_progress',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      subtitle: stats.risks ? `${stats.risks.blockedTasks} blocked` : '',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      filter: 'overdue',
    },
  ]

  const secondaryCards = [
    {
      title: 'My Actions',
      value: stats.initiatives ? stats.initiatives.total : 0,
      subtitle: stats.initiatives ? `${stats.initiatives.completionRate}% complete` : 'No actions assigned',
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      filter: '',
      onClick: () => router.push('/dashboard/targets'),
    },
    {
      title: 'Goal Progress',
      value: stats.strategic ? `${stats.strategic.goalCompletionRate}%` : '0%',
      subtitle: `${stats.strategic?.completedGoals || 0} of ${stats.strategic?.totalGoals || 0} completed`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      filter: 'all',
    },
    {
      title: 'Active Users',
      value: stats.engagement?.activeUsers || 0,
      subtitle: `${stats.engagement?.engagementRate || 0}% logged in (7 days)`,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      filter: 'all',
    },
    {
      title: 'Due This Month',
      value: stats.timeline?.tasksDueThisMonth || 0,
      subtitle: `${stats.timeline?.tasksDueThisWeek || 0} this week`,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      filter: 'due_month',
    },
    {
      title: 'Risk Level',
      value: stats.risks?.criticalTasks || 0,
      subtitle: `${stats.risks?.blockedTasks || 0} blocked tasks`,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      filter: 'blocked',
    },
  ]

  return (
    <>
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card 
              key={card.title} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick(card.filter, card.title)}
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
        {secondaryCards.map((card: any) => {
          const Icon = card.icon
          return (
            <Card 
              key={card.title}
              className={(card.filter || card.onClick) ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}
              onClick={() => card.onClick ? card.onClick() : (card.filter && handleCardClick(card.filter, card.title))}
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
    </div>

    {/* Dialog for Tasks or Users */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogType === 'users' 
              ? 'View last login activity for users in your department. Note: Login times are tracked from when this feature was enabled.'
              : 'Click on any task to view details'
            }
          </DialogDescription>
        </DialogHeader>
        
        {loadingTasks ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : dialogType === 'users' ? (
          // User Activity View
          dialogUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No users found</div>
          ) : (() => {
            const categories = categorizeUsersByLoginRecency(dialogUsers)
            const renderUserCard = (user: UserActivity) => (
              <div
                key={user.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{user.name}</h4>
                      <Badge variant="outline">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {user.department && (
                        <span>Department: {user.department.name}</span>
                      )}
                      {user.division && (
                        <span>Division: {user.division.name}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      {user.lastLoginAt ? (
                        <span className="text-sm text-green-600">
                          Last login: {format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      ) : (
                        <span className="text-sm text-red-600">Never logged in</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )

            return (
              <div className="space-y-6">
                {categories.today.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      Logged in Today ({categories.today.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.today.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {categories.yesterday.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      Logged in Yesterday ({categories.yesterday.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.yesterday.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {categories.last7Days.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                      Last 7 Days ({categories.last7Days.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.last7Days.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {categories.last30Days.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                      Last 30 Days ({categories.last30Days.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.last30Days.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {categories.older.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                      More than 30 Days Ago ({categories.older.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.older.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {categories.neverLoggedIn.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      Never Logged In ({categories.neverLoggedIn.length})
                    </h3>
                    <div className="space-y-2">
                      {categories.neverLoggedIn.map(renderUserCard)}
                    </div>
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          // Task View
          dialogTasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No tasks found</div>
          ) : (
            <div className="space-y-2">
              {dialogTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <Badge variant={
                          task.status === 'COMPLETED' ? 'default' :
                          task.status === 'IN_PROGRESS' ? 'secondary' :
                          task.status === 'OVERDUE' ? 'destructive' : 'outline'
                        }>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.status === 'COMPLETED' && task.evidenceUrl && (
                          <a
                            href={task.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 rounded-md transition-colors border border-blue-200"
                            title="View Evidence"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Evidence</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {task.initiative.objective.goal.title} → {task.initiative.objective.title} → {task.initiative.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Assigned to: {task.responsible.name}</span>
                        <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
