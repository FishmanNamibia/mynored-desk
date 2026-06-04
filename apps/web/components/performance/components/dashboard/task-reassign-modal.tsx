'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCog } from 'lucide-react'

interface TaskReassignModalProps {
  isOpen: boolean
  onClose: () => void
  task: {
    id: string
    title: string
    responsible: {
      id: string
      name: string
      role: string
    }
  }
  currentUserRole: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  department?: {
    name: string
  }
  division?: {
    name: string
  }
}

export function TaskReassignModal({ isOpen, onClose, task, currentUserRole }: TaskReassignModalProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Determine max role level for delegation (ends at senior level)
  const seniorRoles = ['EXECUTIVE', 'DEPUTY_SG', 'SG', 'ADMIN']
  const canDelegate = !seniorRoles.includes(currentUserRole)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/dashboard/performance/api/users')
      if (res.ok) {
        const data = await res.json()
        // Filter users based on delegation rules
        // Can only delegate to peers or subordinates, not to senior roles
        const filteredUsers = Array.isArray(data) 
          ? data.filter((u: User) => {
              // Don't show current assignee
              if (u.id === task.responsible.id) return false
              
              // If current user is staff/manager, can delegate to staff/manager only
              if (['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT'].includes(currentUserRole)) {
                return ['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT'].includes(u.role)
              }
              
              // Senior roles shouldn't be able to delegate (but just in case)
              return false
            })
          : []
        
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleReassign = async () => {
    if (!selectedUserId) {
      setError('Please select a user to reassign to')
      return
    }

    if (!reason.trim()) {
      setError('Please provide a reason for reassignment')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/dashboard/performance/api/targets/${task.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newResponsibleId: selectedUserId,
          reason,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reassign task')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to reassign task')
    } finally {
      setLoading(false)
    }
  }

  if (!canDelegate) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delegate Task</DialogTitle>
            <DialogDescription>
              Senior level staff (Executive and above) cannot delegate tasks. 
              Tasks at this level must be completed by the assigned person.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reassign Task</DialogTitle>
          <DialogDescription>
            Delegate this task to another team member. Reassignment ends at senior level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignment */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Current Assignment</p>
            <p className="text-lg font-semibold mt-1">{task.title}</p>
            <p className="text-sm text-gray-600 mt-1">
              Assigned to: {task.responsible.name} ({task.responsible.role})
            </p>
          </div>

          {/* New Assignee */}
          <div className="space-y-2">
            <Label htmlFor="newAssignee">Reassign To *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No eligible team members available
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.role}
                      {user.department && ` (${user.department.name})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              You can only delegate to peers or team members at your level
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Reassignment *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're reassigning this task..."
              rows={4}
            />
            <p className="text-xs text-gray-500">
              This will be recorded in the task history
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={loading || users.length === 0}>
            <UserCog className="h-4 w-4 mr-2" />
            {loading ? 'Reassigning...' : 'Reassign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
