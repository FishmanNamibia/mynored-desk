'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Briefcase, CheckCircle2, ListChecks, FolderOpen } from 'lucide-react'
import { gradients, shadows } from '@/app/ui-standards'

interface IndependentPlansStats {
  totalPlans: number
  activePlans: number
  totalTasks: number
  completedTasks: number
}

export function IndependentPlansStats() {
  const [stats, setStats] = useState<IndependentPlansStats>({
    totalPlans: 0,
    activePlans: 0,
    totalTasks: 0,
    completedTasks: 0
  })
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'plans' | 'tasks' | 'active' | 'completed'>('plans')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/independent-plans')
      if (response.ok) {
        const fetchedPlans = await response.json()
        setPlans(fetchedPlans)
        const calculatedStats = {
          totalPlans: fetchedPlans.length,
          activePlans: fetchedPlans.filter((p: any) => p.status === 'ACTIVE').length,
          totalTasks: fetchedPlans.reduce((sum: number, p: any) => sum + (p.tasks?.length || 0), 0),
          completedTasks: fetchedPlans.reduce((sum: number, p: any) => 
            sum + (p.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0), 0)
        }
        setStats(calculatedStats)
      }
    } catch (error) {
      console.error('Error fetching independent plans stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (type: 'plans' | 'tasks' | 'active' | 'completed') => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const getDialogData = () => {
    switch (dialogType) {
      case 'plans':
        return { title: 'All Plans', items: plans }
      case 'active':
        return { title: 'Active Plans', items: plans.filter(p => p.status === 'ACTIVE') }
      case 'tasks':
        return { title: 'All Tasks', items: plans.flatMap(p => (p.tasks || []).map((t: any) => ({ ...t, planTitle: p.title }))) }
      case 'completed':
        return { title: 'Completed Tasks', items: plans.flatMap(p => (p.tasks || []).filter((t: any) => t.status === 'COMPLETED').map((t: any) => ({ ...t, planTitle: p.title }))) }
      default:
        return { title: '', items: [] }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <p className="text-gray-500">Loading independent plans data...</p>
        </CardContent>
      </Card>
    )
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
          <Briefcase className="w-6 h-6 text-white/80" />
          Other Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => openDialog('plans')}
            className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <FolderOpen className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{stats.totalPlans}</div>
            <p className="text-sm text-blue-700 font-medium mt-1">Total Plans</p>
          </button>
          
          <button
            onClick={() => openDialog('active')}
            className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">{stats.activePlans}</div>
            <p className="text-sm text-green-700 font-medium mt-1">Active Plans</p>
          </button>
          
          <button
            onClick={() => openDialog('tasks')}
            className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <ListChecks className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-indigo-900">{stats.totalTasks}</div>
            <p className="text-sm text-indigo-700 font-medium mt-1">Total Tasks</p>
          </button>
          
          <button
            onClick={() => openDialog('completed')}
            className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-900">{stats.completedTasks}</div>
            <p className="text-sm text-purple-700 font-medium mt-1">Completed Tasks</p>
          </button>
        </div>

        {stats.totalTasks > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <div className="text-sm text-gray-600">
              Completion Rate: <span className="font-bold text-purple-700">
                {((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialog for detailed view */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogData().title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogType === 'plans' || dialogType === 'active' ? (
              getDialogData().items.map((plan: any) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{plan.title}</h4>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <Badge className={plan.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}>
                            {plan.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {plan.tasks?.length || 0} tasks
                          </span>
                          {plan.startDate && (
                            <span className="text-sm text-gray-600">
                              Start: {new Date(plan.startDate).toLocaleDateString()}
                            </span>
                          )}
                          {plan.endDate && (
                            <span className="text-sm text-gray-600">
                              End: {new Date(plan.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              getDialogData().items.map((task: any) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{task.title || task.customFieldValues?.['Objective']}</h4>
                        <p className="text-xs text-gray-500 mt-1">Plan: {task.planTitle}</p>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge className={
                            task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                            task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          }>
                            {task.status === 'NOT_STARTED' ? 'Not Started' :
                             task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Progress value={task.percentComplete || 0} className="w-20" />
                            <span className="text-xs">{task.percentComplete || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {getDialogData().items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
