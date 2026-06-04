'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Clock, ListTodo, Zap } from 'lucide-react'
import { gradients, shadows } from '@/app/ui-standards'

interface AdhocTasksStats {
  assignedToMe: number
  completed: number
  createdByMe: number
  pending: number
}

export function AdhocTasksStats() {
  const [stats, setStats] = useState<AdhocTasksStats>({
    assignedToMe: 0,
    completed: 0,
    createdByMe: 0,
    pending: 0
  })
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'assigned' | 'completed' | 'created' | 'pending'>('assigned')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/adhoc-tasks')
      if (response.ok) {
        const fetchedTasks = await response.json()
        setTasks(fetchedTasks)
        
        // Calculate stats from the tasks
        const myTasks = fetchedTasks.filter((t: any) => t.assignedToId === fetchedTasks[0]?.assignedToId)
        const createdTasks = fetchedTasks.filter((t: any) => t.createdById === fetchedTasks[0]?.createdById)
        
        const calculatedStats = {
          assignedToMe: myTasks.length,
          completed: myTasks.filter((t: any) => t.status === 'COMPLETED').length,
          createdByMe: createdTasks.filter((t: any) => t.assignedToId !== t.createdById).length,
          pending: myTasks.filter((t: any) => t.status === 'NOT_STARTED').length
        }
        setStats(calculatedStats)
      }
    } catch (error) {
      console.error('Error fetching adhoc tasks stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (type: 'assigned' | 'completed' | 'created' | 'pending') => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const getDialogData = () => {
    const myTasks = tasks.filter(t => t.assignedToId === tasks[0]?.assignedToId)
    const createdTasks = tasks.filter(t => t.createdById === tasks[0]?.createdById && t.assignedToId !== t.createdById)
    
    switch (dialogType) {
      case 'assigned':
        return { title: 'Tasks Assigned to Me', items: myTasks }
      case 'completed':
        return { title: 'Completed Tasks', items: myTasks.filter(t => t.status === 'COMPLETED') }
      case 'created':
        return { title: 'Tasks Created by Me', items: createdTasks }
      case 'pending':
        return { title: 'Pending Tasks', items: myTasks.filter(t => t.status === 'NOT_STARTED') }
      default:
        return { title: '', items: [] }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <p className="text-gray-500">Loading ad-hoc tasks data...</p>
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
          <Zap className="w-6 h-6 text-white/80" />
          Tasks Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => openDialog('assigned')}
            className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <ListTodo className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-indigo-900">{stats.assignedToMe}</div>
            <p className="text-sm text-indigo-700 font-medium mt-1">Assigned to Me</p>
          </button>
          
          <button
            onClick={() => openDialog('completed')}
            className="text-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">{stats.completed}</div>
            <p className="text-sm text-green-700 font-medium mt-1">Completed</p>
          </button>
          
          <button
            onClick={() => openDialog('created')}
            className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{stats.createdByMe}</div>
            <p className="text-sm text-blue-700 font-medium mt-1">Created by Me</p>
          </button>
          
          <button
            onClick={() => openDialog('pending')}
            className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex justify-center mb-2">
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-900">{stats.pending}</div>
            <p className="text-sm text-orange-700 font-medium mt-1">Pending</p>
          </button>
        </div>

        {stats.assignedToMe > 0 && (
          <div className="mt-4 pt-4 border-t text-center">
            <div className="text-sm text-gray-600">
              Completion Rate: <span className="font-bold text-green-700">
                {((stats.completed / stats.assignedToMe) * 100).toFixed(1)}%
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
            {getDialogData().items.map((task: any) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <Badge className={
                          task.status === 'COMPLETED' ? 'bg-green-500 text-white' :
                          task.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                          'bg-red-500 text-white'
                        }>
                          {task.status === 'NOT_STARTED' ? 'Not Started' :
                           task.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'}
                        </Badge>
                        <Badge variant="outline" className={
                          task.priority === 'HIGH' ? 'border-red-500 text-red-700' :
                          task.priority === 'MEDIUM' ? 'border-orange-500 text-orange-700' :
                          'border-gray-500 text-gray-700'
                        }>
                          {task.priority}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Progress value={task.percentComplete || 0} className="w-20" />
                          <span className="text-xs">{task.percentComplete || 0}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {task.createdBy && (
                          <span>Created by: {task.createdBy.name}</span>
                        )}
                        {task.assignedTo && (
                          <span>Assigned to: {task.assignedTo.name}</span>
                        )}
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {getDialogData().items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
