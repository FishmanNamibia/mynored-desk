'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TaskApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    description?: string
    staffRating: number
    evidenceUrl?: string
    evidenceNotes?: string
    responsible: {
      name: string
      email: string
    }
  }
}

export function TaskApprovalModal({ isOpen, onClose, task }: TaskApprovalModalProps) {
  const router = useRouter()
  const [supervisorRating, setSupervisorRating] = useState(0)
  const [rejectionReason, setRejectionReason] = useState('')
  const [newStatus, setNewStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS'>('IN_PROGRESS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApprove = async () => {
    if (supervisorRating === 0) {
      setError('Please provide your rating before approving')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/dashboard/performance/api/targets/${task.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          supervisorRating,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve task')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to approve task')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/dashboard/performance/api/targets/${task.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason,
          newStatus,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject task')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to reject task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Task Completion</DialogTitle>
          <DialogDescription>
            Review and approve or reject the task completion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed by:</p>
              <p className="font-medium">{task.responsible.name}</p>
              <p className="text-sm text-gray-500">{task.responsible.email}</p>
            </div>
          </div>

          {/* Staff Self-Rating */}
          <div className="space-y-2">
            <Label>Staff Self-Rating</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= task.staffRating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {task.staffRating === 1 && '(Not done well)'}
                {task.staffRating === 2 && '(Below expectations)'}
                {task.staffRating === 3 && '(Met expectations)'}
                {task.staffRating === 4 && '(Above expectations)'}
                {task.staffRating === 5 && '(Exceptional work)'}
              </span>
            </div>
          </div>

          {/* Evidence */}
          <div className="space-y-2">
            <Label>Evidence Submitted</Label>
            {task.evidenceUrl && (
              <div className="p-3 border rounded-lg">
                <a
                  href={task.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Evidence
                </a>
              </div>
            )}
            {task.evidenceNotes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Evidence Notes:</p>
                <p className="text-sm text-gray-600 mt-1">{task.evidenceNotes}</p>
              </div>
            )}
          </div>

          {/* Supervisor Rating */}
          <div className="space-y-2 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <Label>Your Supervisor Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSupervisorRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= supervisorRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {supervisorRating === 0 && 'Select your rating'}
                {supervisorRating === 1 && '1 - Not done well'}
                {supervisorRating === 2 && '2 - Below expectations'}
                {supervisorRating === 3 && '3 - Met expectations'}
                {supervisorRating === 4 && '4 - Above expectations'}
                {supervisorRating === 5 && '5 - Exceptional work'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Rate the quality and completeness of the work
            </p>
          </div>

          {/* Rejection Section */}
          <div className="space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50">
            <h3 className="font-semibold text-lg text-red-900">Rejection Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="newStatus">Set Task Status To</Label>
              <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Choose the status the task should return to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a clear reason for rejection..."
                rows={3}
              />
              <p className="text-xs text-gray-600">
                This will be sent to the staff member
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
