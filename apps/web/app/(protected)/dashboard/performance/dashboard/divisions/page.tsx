'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Users } from 'lucide-react'

interface Division {
  id: string
  name: string
  description?: string
  departments: Department[]
}

interface Department {
  id: string
  name: string
  description?: string
  users: any[]
}

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
  })

  const fetchDivisions = () => {
    fetch('/dashboard/performance/api/divisions')
      .then(res => res.json())
      .then(data => {
        setDivisions(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch divisions:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDivisions()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/dashboard/performance/api/divisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setOpen(false)
        setFormData({
          name: '',
          description: '',
        })
        fetchDivisions()
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (err) {
      console.error('Failed to create division:', err)
      toast({ title: 'Failed to create division', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (division: Division) => {
    setEditingDivision(division)
    setEditFormData({
      name: division.name,
      description: division.description || '',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDivision) return
    setSubmitting(true)

    try {
      const response = await fetch(`/dashboard/performance/api/divisions/${editingDivision.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      if (response.ok) {
        setEditOpen(false)
        setEditingDivision(null)
        fetchDivisions()
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (err) {
      console.error('Failed to update division:', err)
      toast({ title: 'Failed to update division', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Divisions & Departments</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Organizational structure and team management
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="h-4 w-4 mr-2" />
              New Division
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Division</DialogTitle>
              <DialogDescription>
                Add a new organizational division.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Division Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Technology Division"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe the division..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Division'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {divisions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No divisions created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisions.map(division => (
            <Card key={division.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {division.name}
                    </CardTitle>
                    {division.description && (
                      <p className="text-sm text-gray-600 mt-2">{division.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(division)}>
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Departments</span>
                    <span className="font-semibold">{division.departments.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Staff</span>
                    <span className="font-semibold">
                      {division.departments.reduce((sum, dept) => sum + dept.users.length, 0)}
                    </span>
                  </div>
                  
                  {division.departments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-semibold text-gray-500 mb-2">DEPARTMENTS</p>
                      <div className="space-y-2">
                        {division.departments.map(dept => (
                          <div
                            key={dept.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm">{dept.name}</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="h-3 w-3" />
                              {dept.users.length}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Division Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Update division information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Division Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the division..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Division'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
