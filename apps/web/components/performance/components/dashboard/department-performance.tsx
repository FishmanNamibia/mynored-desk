'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface DepartmentStats {
  name: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  overdueTasks: number
}

export function DepartmentPerformance() {
  const [departments, setDepartments] = useState<DepartmentStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/dashboard/performance/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setDepartments(data.departments || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch department stats:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Department Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departments.slice(0, 5).map((dept, index) => (
            <div key={dept.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {index + 1}. {dept.name}
                  </span>
                  {dept.overdueTasks > 0 && (
                    <span className="text-xs text-red-600">
                      ({dept.overdueTasks} overdue)
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {dept.completionRate}%
                </span>
              </div>
              <Progress value={dept.completionRate} className="h-2" />
              <p className="text-xs text-gray-500">
                {dept.completedTasks} of {dept.totalTasks} tasks completed
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
