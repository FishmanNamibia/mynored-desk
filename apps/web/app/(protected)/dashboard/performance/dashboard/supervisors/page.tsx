'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserPlus, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
  department?: {
    id: string
    name: string
  }
  supervisor?: {
    id: string
    name: string
    email: string
  }
  subordinates?: {
    id: string
    name: string
    email: string
  }[]
}

export default function SupervisorsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = async () => {
    try {
      const response = await fetch('/dashboard/performance/api/users')
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to fetch users:', error)
        toast({ title: `$1`, variant: "destructive" })
        setUsers([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setUsers(data)
      } else {
        console.error('Users data is not an array:', data)
        toast({ title: 'Invalid data received from server', variant: 'destructive' })
        setUsers([])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      toast({ title: 'Failed to fetch users', variant: 'destructive' })
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAssignSupervisor = async () => {
    if (!selectedUserId || !selectedSupervisorId) return
    setSubmitting(true)

    try {
      const response = await fetch(`/dashboard/performance/api/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supervisorId: selectedSupervisorId,
        }),
      })

      if (response.ok) {
        setDialogOpen(false)
        setSelectedUserId('')
        setSelectedSupervisorId('')
        fetchUsers()
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (err) {
      console.error('Failed to assign supervisor:', err)
      toast({ title: 'Failed to assign supervisor', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveSupervisor = async (userId: string) => {
    if (!confirm('Remove supervisor assignment?')) return

    try {
      const response = await fetch(`/dashboard/performance/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supervisorId: null,
        }),
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (err) {
      console.error('Failed to remove supervisor:', err)
      toast({ title: 'Failed to remove supervisor', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Get potential supervisors (exclude the selected user and their subordinates)
  const getPotentialSupervisors = (userId: string) => {
    const user = users.find(u => u.id === userId)
    const subordinateIds = user?.subordinates?.map(s => s.id) || []
    return users.filter(u => 
      u.id !== userId && 
      !subordinateIds.includes(u.id) &&
      (u.role === 'ADMIN' || u.role === 'MANAGER')
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Supervisor Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Assign supervisors to staff members for approval workflows
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Supervisor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Supervisor</DialogTitle>
              <DialogDescription>
                Select a staff member and their supervisor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">Staff Member</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role}) - {user.department?.name || 'No dept'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUserId && (
                <div className="space-y-2">
                  <Label htmlFor="supervisor">Supervisor</Label>
                  <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPotentialSupervisors(selectedUserId).map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role}) - {user.department?.name || 'No dept'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignSupervisor} 
                disabled={submitting || !selectedUserId || !selectedSupervisorId}
              >
                {submitting ? 'Assigning...' : 'Assign Supervisor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Users with Supervisors */}
        <Card>
          <CardHeader>
            <CardTitle>Staff with Supervisors</CardTitle>
          </CardHeader>
          <CardContent>
            {users.filter(u => u.supervisor).length === 0 ? (
              <p className="text-gray-500 text-sm">No supervisor assignments yet</p>
            ) : (
              <div className="space-y-3">
                {users.filter(u => u.supervisor).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supervisor: {user.supervisor?.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSupervisor(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users without Supervisors */}
        <Card>
          <CardHeader>
            <CardTitle>Staff without Supervisors</CardTitle>
          </CardHeader>
          <CardContent>
            {users.filter(u => !u.supervisor && u.role !== 'ADMIN').length === 0 ? (
              <p className="text-gray-500 text-sm">All staff have supervisors assigned</p>
            ) : (
              <div className="space-y-3">
                {users.filter(u => !u.supervisor && u.role !== 'ADMIN').map(user => (
                  <div key={user.id} className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {user.role} - {user.department?.name || 'No department'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supervisor Hierarchy View */}
      <Card>
        <CardHeader>
          <CardTitle>Supervisor Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.filter(u => u.subordinates && u.subordinates.length > 0).map(supervisor => (
              <div key={supervisor.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">{supervisor.name}</p>
                    <p className="text-sm text-gray-600">{supervisor.role} - {supervisor.email}</p>
                  </div>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Supervises:</p>
                  {supervisor.subordinates?.map(subordinate => (
                    <div key={subordinate.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">{subordinate.name}</p>
                        <p className="text-xs text-gray-500">{subordinate.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
