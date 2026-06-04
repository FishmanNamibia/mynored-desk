'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/pms/utils'
import { Clock, FileText, ExternalLink } from 'lucide-react'

interface Target {
  id: string
  title: string
  status: string
  percentComplete: number
  dueDate: string
  evidenceUrl?: string | null
  evidenceNotes?: string | null
  responsible: {
    name: string
  }
}

interface RecentTargetsProps {
  userId?: string
  userRole?: string
}

const statusColors: Record<string, string> = {
  NOT_STARTED: 'bg-red-500 text-white',
  IN_PROGRESS: 'bg-amber-500 text-white',
  COMPLETED: 'bg-green-500 text-white',
  OVERDUE: 'bg-red-700 text-white',
  BLOCKED: 'bg-red-700 text-white',
}

export function RecentTargets({ userId, userRole }: RecentTargetsProps) {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = userRole === 'STAFF' 
      ? `/dashboard/performance/api/targets?responsibleId=${userId}`
      : '/dashboard/performance/api/targets'
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTargets(data.slice(0, 5))
        } else {
          console.error('Invalid data format:', data)
          setTargets([])
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch targets:', err)
        setTargets([])
        setLoading(false)
      })
  }, [userId, userRole])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <CardTitle>
            {userRole === 'STAFF' ? 'My Recent Targets' : 'Recent Targets'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : targets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No targets assigned yet
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map(target => (
              <div key={target.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{target.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {formatDate(target.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[target.status]}>
                      {target.status.replace('_', ' ')}
                    </Badge>
                    {target.status === 'COMPLETED' && target.evidenceUrl && (
                      <a
                        href={target.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        title="View Evidence"
                      >
                        <FileText className="h-4 w-4" />
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>{target.percentComplete}%</span>
                  </div>
                  <Progress value={target.percentComplete} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
