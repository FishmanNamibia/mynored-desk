'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/performance/components/ui/multi-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Building2, UserPlus, Edit, Trash2, Shield, Building, User as UserIcon, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSession } from '@/lib/pms-auth-adapter'
import { ProfilePictureUpload } from '@/components/performance/components/profile-picture-upload'
import { formatRoleDisplay } from '@/lib/pms/role-formatter'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: string
  name: string
  email: string
  role: string
  position: string
  profilePicture?: string | null
  isApproved: boolean
  createdAt: string
  lastLoginAt?: string | null
  jobTitle?: string | null
  department?: {
    id: string
    name: string
  }
  division?: {
    id: string
    name: string
    department: {
      id: string
      name: string
    }
  }
  supervisor?: {
    id: string
    name: string
  }
}

interface Department {
  id: string
  name: string
  description?: string
  divisions: Division[]
}

interface Division {
  id: string
  name: string
  description?: string
  departmentId: string
  department?: {
    name: string
  }
}

interface CustomRole {
  id: string
  name: string
  displayName: string
  description?: string
  level: number
  canSupervise: boolean
  permissions?: any
  isActive: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export default function UserManagementPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  
  // User dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    position: '',
    profilePicture: null as string | null,
    departmentId: 'none',  // Primary department (backwards compatibility)
    departmentIds: [] as string[],  // Multiple departments
    divisionId: 'none',    // For Staff/Managers
    supervisorId: 'none'
  })

  // Department dialog states
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: ''
  })

  // Division dialog states
  const [divDialogOpen, setDivDialogOpen] = useState(false)
  const [editingDiv, setEditingDiv] = useState<Division | null>(null)
  const [divForm, setDivForm] = useState({
    name: '',
    description: '',
    departmentId: ''
  })

  // Role dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [roleForm, setRoleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    level: 5,
    canSupervise: false,
    isActive: true
  })

  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null)
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('users')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (session?.user) {
      checkManageAccess()
    }
  }, [session])

  // Auto-adjust supervisor when role changes
  useEffect(() => {
    if (userForm.role === 'BOARD_CHAIRPERSON') {
      // Board Chairperson has no supervisor (top of hierarchy)
      setUserForm(prev => ({ ...prev, supervisorId: 'none' }))
    }
  }, [userForm.role])

  const checkManageAccess = async () => {
    if (!session?.user) {
      setCheckingAccess(false)
      return
    }

    const userEmail = (session.user.email || '').toLowerCase()
    const userJobTitle = session.user.jobTitle || ''

    // Allowed by explicit email (Absalom Fanuel)
    const ALLOWED_EMAILS = ['afanuel@nsa.org.na']
    if (ALLOWED_EMAILS.includes(userEmail)) {
      setCanManage(true)
      setCheckingAccess(false)
      return
    }

    // Allowed by HC Executive job title (covers LMareka and any future HC Executive)
    const jobTitleLower = userJobTitle.toLowerCase()
    const isHCExecutive = jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')
    if (isHCExecutive) {
      setCanManage(true)
      setCheckingAccess(false)
      return
    }

    setCanManage(false)
    setCheckingAccess(false)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, deptsRes, divsRes, rolesRes] = await Promise.all([
        fetch('/dashboard/performance/api/users'),
        fetch('/dashboard/performance/api/departments'),
        fetch('/dashboard/performance/api/divisions'),
        fetch('/dashboard/performance/api/roles')
      ])
      
      // Helper function to safely parse JSON response with proper error handling
      const safeJsonParse = async (response: Response, resourceName: string) => {
        if (!response.ok) {
          // Handle specific error codes gracefully
          if (response.status === 403) {
            console.warn(`Access denied to ${resourceName}. You may not have permission to view this resource.`)
            return []
          }
          if (response.status === 401) {
            console.warn(`Authentication required for ${resourceName}. Please log in again.`)
            return []
          }
          if (response.status === 404) {
            console.warn(`${resourceName} not found.`)
            return []
          }
          // Log other errors but don't crash
          console.error(`Failed to fetch ${resourceName}: ${response.status} ${response.statusText}`)
          return []
        }
        
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`${resourceName} response is not JSON, returning empty array`)
          return []
        }
        
        try {
          return await response.json()
        } catch (parseError) {
          console.error(`Failed to parse JSON for ${resourceName}:`, parseError)
          return []
        }
      }
      
      const usersData = await safeJsonParse(usersRes, 'users')
      const deptsData = await safeJsonParse(deptsRes, 'departments')
      const divsData = await safeJsonParse(divsRes, 'divisions')
      const rolesData = await safeJsonParse(rolesRes, 'roles')
      
      // Handle API response format: { users: [...] } or { error: "..." }
      setUsers(Array.isArray(usersData?.users) ? usersData.users : Array.isArray(usersData) ? usersData : [])
      setDepartments(Array.isArray(deptsData) ? deptsData : [])
      setDivisions(Array.isArray(divsData) ? divsData : [])
      setCustomRoles(Array.isArray(rolesData?.roles) ? rolesData.roles : [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      // Ensure we don't leave the UI in a broken state
      setUsers([])
      setDepartments([])
      setDivisions([])
      setCustomRoles([])
    } finally {
      setLoading(false)
    }
  }

  // User Management Functions
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    const userDepts = (user as any).userDepartments || []
    const primaryDeptId = user.department?.id
    
    // Filter out the primary department from additional departments
    const additionalDeptIds = userDepts
      .map((ud: any) => ud.department.id)
      .filter((id: string) => id !== primaryDeptId)
    
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position || user.jobTitle || '',
      profilePicture: user.profilePicture || null,
      departmentId: primaryDeptId || 'none',
      departmentIds: additionalDeptIds,
      divisionId: user.division?.id || 'none',
      supervisorId: user.supervisor?.id || 'none'
    })
    setUserDialogOpen(true)
  }

  const handleSaveUser = async () => {
    try {
      // Validate supervisor hierarchy
      if (userForm.role === 'DEPUTY_SG' && (userForm.supervisorId === 'none' || !userForm.supervisorId)) {
        toast({ title: 'Deputy SG must be supervised by SG', variant: 'destructive' })
        return
      }
      
      if (userForm.role === 'EXECUTIVE' && (userForm.supervisorId === 'none' || !userForm.supervisorId)) {
        toast({ title: 'Executives must be supervised by either SG or Deputy SG', variant: 'destructive' })
        return
      }
      
      if (userForm.role === 'BOARD_CHAIRPERSON' && userForm.supervisorId && userForm.supervisorId !== 'none') {
        toast({ title: 'Board Chairperson cannot have a supervisor', variant: 'destructive' })
        return
      }
      
      if (userForm.role === 'SG' && userForm.supervisorId && userForm.supervisorId !== 'none') {
        // SG must be supervised by Board Chairperson
        const supervisor = users.find(u => u.id === userForm.supervisorId)
        if (supervisor?.role !== 'BOARD_CHAIRPERSON') {
          toast({ title: 'Statistician General must be supervised by Board Chairperson', variant: 'destructive' })
          return
        }
      }
      
      if (!editingUser) {
        toast({ title: 'No user selected for editing', variant: 'destructive' })
        return
      }
      
      const url = `/dashboard/performance/api/users/${editingUser.id}`
      const method = 'PATCH'
      
      // Validate position title
      if (!userForm.position || userForm.position.trim() === '') {
        toast({ title: 'Position title is required', variant: 'destructive' })
        return
      }
      
      // Validate primary department for executives, SG, and Deputy SG
      if ((userForm.role === 'EXECUTIVE' || userForm.role === 'SG' || userForm.role === 'DEPUTY_SG') && 
          (!userForm.departmentId || userForm.departmentId === 'none')) {
        toast({ title: 'Primary department is required for this role', variant: 'destructive' })
        return
      }
      
      const body: any = {
        role: userForm.role,
        position: userForm.position,
        profilePicture: userForm.profilePicture,
        departmentId: userForm.departmentId === 'none' ? null : userForm.departmentId,
        departmentIds: userForm.departmentIds,
        divisionId: userForm.divisionId === 'none' ? null : userForm.divisionId,
        supervisorId: userForm.supervisorId === 'none' ? null : userForm.supervisorId
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setUserDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to save user', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save user:', error)
      toast({ title: 'Failed to save user', variant: 'destructive' })
    }
  }

  // Department Management Functions
  const handleCreateDept = () => {
    setEditingDept(null)
    setDeptForm({ name: '', description: '' })
    setDeptDialogOpen(true)
  }

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept)
    setDeptForm({
      name: dept.name,
      description: dept.description || ''
    })
    setDeptDialogOpen(true)
  }

  const handleSaveDept = async () => {
    try {
      const url = editingDept ? `/dashboard/performance/api/departments/${editingDept.id}` : '/dashboard/performance/api/departments'
      const method = editingDept ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm)
      })

      if (response.ok) {
        setDeptDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to save department', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save department:', error)
      toast({ title: 'Failed to save department', variant: 'destructive' })
    }
  }

  // Division Management Functions
  const handleCreateDiv = () => {
    setEditingDiv(null)
    setDivForm({ name: '', description: '', departmentId: '' })
    setDivDialogOpen(true)
  }

  const handleEditDiv = (div: Division) => {
    setEditingDiv(div)
    setDivForm({
      name: div.name,
      description: div.description || '',
      departmentId: div.departmentId
    })
    setDivDialogOpen(true)
  }

  const handleSaveDiv = async () => {
    try {
      const url = editingDiv ? `/dashboard/performance/api/divisions/${editingDiv.id}` : '/dashboard/performance/api/divisions'
      const method = editingDiv ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(divForm)
      })

      if (response.ok) {
        setDivDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to save division', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save division:', error)
      toast({ title: 'Failed to save division', variant: 'destructive' })
    }
  }

  // Role Management Functions
  const handleCreateRole = () => {
    setEditingRole(null)
    setRoleForm({
      name: '',
      displayName: '',
      description: '',
      level: 5,
      canSupervise: false,
      isActive: true
    })
    setRoleDialogOpen(true)
  }

  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role)
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || '',
      level: role.level,
      canSupervise: role.canSupervise,
      isActive: role.isActive
    })
    setRoleDialogOpen(true)
  }

  const handleSaveRole = async () => {
    try {
      const url = editingRole ? `/dashboard/performance/api/roles/${editingRole.id}` : '/dashboard/performance/api/roles'
      const method = editingRole ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm)
      })

      if (response.ok) {
        setRoleDialogOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to save role', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save role:', error)
      toast({ title: 'Failed to save role', variant: 'destructive' })
    }
  }

  // Delete Function
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const urls: Record<string, string> = {
        user: `/dashboard/performance/api/users/${deleteTarget.id}`,
        department: `/dashboard/performance/api/departments/${deleteTarget.id}`,
        division: `/dashboard/performance/api/divisions/${deleteTarget.id}`,
        role: `/dashboard/performance/api/roles/${deleteTarget.id}`
      }

      const response = await fetch(urls[deleteTarget.type], {
        method: 'DELETE'
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        fetchData()
      } else {
        const error = await response.json()
        toast({ title: error.error || 'Failed to delete', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  // Statistics
  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    sg: users.filter(u => u.role === 'SG').length,
    deputySG: users.filter(u => u.role === 'DEPUTY_SG').length,
    executives: users.filter(u => u.role === 'EXECUTIVE').length,
    managers: users.filter(u => u.role === 'MANAGER').length,
    staff: users.filter(u => u.role === 'STAFF').length,
    adminAssistants: users.filter(u => u.role === 'ADMINISTRATIVE_ASSISTANT').length,
    departments: departments.length,
    divisions: divisions.length
  }

  if (checkingAccess || loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong className="font-semibold">Access Restricted</strong>
            <p className="mt-2">
              User Management is only accessible to Human Capital Executives and Administrators.
              Please contact your system administrator if you believe you should have access.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">User Management</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          Manage users, roles, departments, and divisions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Divisions</p>
                <p className="text-2xl font-bold">{stats.divisions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Users & Roles</h2>
              <p className="text-sm text-gray-500 mt-1">
                Users are automatically added when they sign in via Azure AD. Edit users to assign roles and supervisors.
              </p>
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(userId) => {
                const user = users.find(u => u.id === userId)
                if (user) handleEditUser(user)
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select user to edit" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.isApproved).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department/Division</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.isApproved).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {user.profilePicture ? (
                          <Image
                            src={user.profilePicture}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={
                          user.role === 'ADMIN' ? 'default' :
                          user.role === 'BOARD_CHAIRPERSON' ? 'default' :
                          user.role === 'SG' ? 'default' :
                          user.role === 'DEPUTY_SG' ? 'default' :
                          user.role === 'EXECUTIVE' ? 'secondary' :
                          user.role === 'MANAGER' ? 'outline' :
                          user.role === 'SENIOR' ? 'outline' :
                          user.role === 'CHIEF' ? 'outline' :
                          user.role === 'ADMINISTRATIVE_ASSISTANT' ? 'outline' : 'secondary'
                        }>
                          {formatRoleDisplay(user.role)}
                        </Badge>
                        {user.position && (
                          <span className="text-xs text-gray-600">{user.position}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'BOARD_CHAIRPERSON' ? (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Board Oversight</p>
                          <p className="text-xs text-gray-400">Approves SG Performance</p>
                        </div>
                      ) : user.role === 'SG' ? (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Head of Institution</p>
                          <p className="text-xs text-gray-400">All Departments</p>
                        </div>
                      ) : user.role === 'EXECUTIVE' ? (
                        <div>
                          {(() => {
                            const userDepts = (user as any).userDepartments || []
                            if (userDepts.length > 0) {
                              return (
                                <>
                                  <p className="text-sm font-medium">
                                    {userDepts.map((ud: any) => ud.department.name).join(', ')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {userDepts.length} Department{userDepts.length > 1 ? 's' : ''}
                                  </p>
                                </>
                              )
                            } else if (user.department) {
                              return (
                                <>
                                  <p className="text-sm font-medium">{user.department.name}</p>
                                  <p className="text-xs text-gray-500">Department</p>
                                </>
                              )
                            } else {
                              return <span className="text-gray-400">No department</span>
                            }
                          })()}
                        </div>
                      ) : user.role === 'DEPUTY_SG' && user.department ? (
                        <div>
                          <p className="text-sm font-medium">{user.department.name}</p>
                          <p className="text-xs text-gray-500">Primary Department</p>
                        </div>
                      ) : user.role === 'DEPUTY_SG' ? (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Multiple Departments</p>
                          <p className="text-xs text-gray-400">Deputy Head</p>
                        </div>
                      ) : user.division ? (
                        <div>
                          <p className="text-sm font-medium">{user.division.name}</p>
                          {user.department && <p className="text-xs text-gray-500">{user.department.name}</p>}
                        </div>
                      ) : user.department ? (
                        <div>
                          <p className="text-sm font-medium">{user.department.name}</p>
                          <p className="text-xs text-gray-500">Department</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.supervisor ? user.supervisor.name : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        <div>
                          <p className="text-sm">{new Date(user.lastLoginAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">{new Date(user.lastLoginAt).toLocaleTimeString()}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget({ type: 'user', id: user.id, name: user.name })
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Departments</h2>
            <Button onClick={handleCreateDept}>
              <Building className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{dept.name}</CardTitle>
                      {dept.description && (
                        <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        {dept.divisions?.length || 0} division(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDept(dept)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({ type: 'department', id: dept.id, name: dept.name })
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Divisions Tab */}
        <TabsContent value="divisions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Divisions</h2>
            <Button onClick={handleCreateDiv}>
              <Building2 className="h-4 w-4 mr-2" />
              Add Division
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Division Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divisions.map((div) => (
                  <TableRow key={div.id}>
                    <TableCell className="font-medium">{div.name}</TableCell>
                    <TableCell>{div.department?.name || '-'}</TableCell>
                    <TableCell>{div.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditDiv(div)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget({ type: 'division', id: div.id, name: div.name })
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">System Roles</h2>
            <Button onClick={handleCreateRole}>
              <Shield className="h-4 w-4 mr-2" />
              Add Custom Role
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Can Supervise</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* System Roles */}
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('ADMIN')}</TableCell>
                  <TableCell>Administrator</TableCell>
                  <TableCell><Badge variant="outline">0</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('BOARD_CHAIRPERSON')}</TableCell>
                  <TableCell>Board Chairperson</TableCell>
                  <TableCell><Badge variant="outline">0</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('SG')}</TableCell>
                  <TableCell>Statistician General</TableCell>
                  <TableCell><Badge variant="outline">1</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('DEPUTY_SG')}</TableCell>
                  <TableCell>Deputy Statistician General</TableCell>
                  <TableCell><Badge variant="outline">2</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('EXECUTIVE')}</TableCell>
                  <TableCell>Executive</TableCell>
                  <TableCell><Badge variant="outline">3</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('MANAGER')}</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell><Badge variant="outline">4</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600">Yes</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('SENIOR')}</TableCell>
                  <TableCell>Senior</TableCell>
                  <TableCell><Badge variant="outline">5</Badge></TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('CHIEF')}</TableCell>
                  <TableCell>Chief</TableCell>
                  <TableCell><Badge variant="outline">5</Badge></TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('STAFF')}</TableCell>
                  <TableCell>Staff</TableCell>
                  <TableCell><Badge variant="outline">6</Badge></TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('ADMINISTRATIVE_ASSISTANT')}</TableCell>
                  <TableCell>Administrative Assistant</TableCell>
                  <TableCell><Badge variant="outline">6</Badge></TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium font-mono text-sm">{formatRoleDisplay('VIEWER')}</TableCell>
                  <TableCell>Viewer</TableCell>
                  <TableCell><Badge variant="outline">7</Badge></TableCell>
                  <TableCell><Badge variant="secondary">No</Badge></TableCell>
                  <TableCell><Badge variant="default" className="bg-blue-600">Active</Badge></TableCell>
                  <TableCell><Badge variant="outline">System</Badge></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">Built-in</Badge>
                  </TableCell>
                </TableRow>
                
                {/* Custom Roles */}
                {customRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium font-mono text-sm">{role.name}</TableCell>
                    <TableCell>{role.displayName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.level}</Badge>
                    </TableCell>
                    <TableCell>
                      {role.canSupervise ? (
                        <Badge variant="default" className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isActive ? (
                        <Badge variant="default" className="bg-blue-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Badge variant="outline">System</Badge>
                      ) : (
                        <Badge variant="secondary">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                          disabled={role.isSystem}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget({ type: 'role', id: role.id, name: role.displayName })
                            setDeleteDialogOpen(true)
                          }}
                          disabled={role.isSystem}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Assign roles, departments, and supervisors. User details are synced from Azure AD.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Profile Picture Upload */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <ProfilePictureUpload
                currentPicture={userForm.profilePicture}
                onUpload={(url) => setUserForm({ ...userForm, profilePicture: url })}
                onRemove={() => setUserForm({ ...userForm, profilePicture: null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                name="name"
                value={userForm.name}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Synced from Azure AD</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                value={userForm.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Synced from Azure AD</p>
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{formatRoleDisplay('ADMIN')}</SelectItem>
                  <SelectItem value="BOARD_CHAIRPERSON">{formatRoleDisplay('BOARD_CHAIRPERSON')}</SelectItem>
                  <SelectItem value="SG">{formatRoleDisplay('SG')}</SelectItem>
                  <SelectItem value="DEPUTY_SG">{formatRoleDisplay('DEPUTY_SG')}</SelectItem>
                  <SelectItem value="EXECUTIVE">{formatRoleDisplay('EXECUTIVE')}</SelectItem>
                  <SelectItem value="MANAGER">{formatRoleDisplay('MANAGER')}</SelectItem>
                  <SelectItem value="SENIOR">{formatRoleDisplay('SENIOR')}</SelectItem>
                  <SelectItem value="CHIEF">{formatRoleDisplay('CHIEF')}</SelectItem>
                  <SelectItem value="STAFF">{formatRoleDisplay('STAFF')}</SelectItem>
                  <SelectItem value="ADMINISTRATIVE_ASSISTANT">{formatRoleDisplay('ADMINISTRATIVE_ASSISTANT')}</SelectItem>
                  <SelectItem value="VIEWER">{formatRoleDisplay('VIEWER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position-title">Position Title *</Label>
              <Input
                id="position-title"
                name="position"
                type="text"
                value={userForm.position}
                onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                placeholder="e.g., System Administrator, Data Analyst"
                required
              />
              <p className="text-xs text-gray-500">Job title for this employee (e.g., Senior: System Administrator)</p>
            </div>

            {/* Show Primary Department field for Executives, SG, and Deputy-SG */}
            {(userForm.role === 'EXECUTIVE' || userForm.role === 'DEPUTY_SG' || userForm.role === 'SG') && (
              <>
                <div className="space-y-2">
                  <Label>Primary Department *</Label>
                  <Select 
                    value={userForm.departmentId} 
                    onValueChange={(value) => setUserForm({ ...userForm, departmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">The main department this person leads</p>
                </div>

                <div className="space-y-2">
                  <Label>Additional Departments (Optional)</Label>
                  <MultiSelect
                    options={departments
                      .filter(dept => dept.id !== userForm.departmentId)
                      .map(dept => ({ value: dept.id, label: dept.name }))}
                    selected={userForm.departmentIds}
                    onChange={(selected) => {
                      setUserForm({ ...userForm, departmentIds: selected })
                    }}
                    placeholder="Select additional departments to oversee"
                  />
                  <p className="text-xs text-gray-500">
                    {userForm.departmentIds.length === 0 
                      ? 'Optional: Select additional departments this person oversees' 
                      : `Overseeing ${userForm.departmentIds.length} additional department${userForm.departmentIds.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </>
            )}

            {/* Show Division field for Staff/Managers/Administrative Assistants */}
            {userForm.role !== 'EXECUTIVE' && userForm.role !== 'ADMIN' && userForm.role !== 'VIEWER' && userForm.role !== 'SG' && userForm.role !== 'DEPUTY_SG' && userForm.role !== 'BOARD_CHAIRPERSON' && (
              <div className="space-y-2">
                <Label>Division</Label>
                <Select value={userForm.divisionId} onValueChange={(value) => setUserForm({ ...userForm, divisionId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name} ({div.department?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Supervisor {(userForm.role === 'DEPUTY_SG' || userForm.role === 'EXECUTIVE') && <span className="text-red-600">*</span>}
              </Label>
              <Select 
                value={userForm.supervisorId} 
                onValueChange={(value) => setUserForm({ ...userForm, supervisorId: value })}
                disabled={userForm.role === 'BOARD_CHAIRPERSON'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    userForm.role === 'BOARD_CHAIRPERSON' ? 'Board Chairperson has no supervisor' :
                    userForm.role === 'SG' ? 'Select Board Chairperson as supervisor' :
                    userForm.role === 'DEPUTY_SG' ? 'Select SG as supervisor' :
                    userForm.role === 'EXECUTIVE' ? 'Select SG or Deputy SG' :
                    'Select supervisor'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {/* Only show "None" option if supervisor is not required */}
                  {userForm.role !== 'DEPUTY_SG' && userForm.role !== 'EXECUTIVE' && (
                    <SelectItem value="none">None</SelectItem>
                  )}
                  {users.filter(u => {
                    // Don't show self
                    if (u.id === editingUser?.id) return false
                    
                    // Board Chairperson doesn't report to anyone
                    if (userForm.role === 'BOARD_CHAIRPERSON') return false
                    
                    // SG reports ONLY to Board Chairperson
                    if (userForm.role === 'SG') {
                      return u.role === 'BOARD_CHAIRPERSON'
                    }
                    
                    // Deputy-SG reports ONLY to SG (required)
                    if (userForm.role === 'DEPUTY_SG') {
                      return u.role === 'SG'
                    }
                    
                    // Executives report ONLY to SG or Deputy-SG (required)
                    if (userForm.role === 'EXECUTIVE') {
                      return u.role === 'SG' || u.role === 'DEPUTY_SG'
                    }
                    
                    // Managers report to Executives
                    if (userForm.role === 'MANAGER') {
                      return u.role === 'EXECUTIVE'
                    }
                    
                    // Senior and Chief report to Managers
                    if (userForm.role === 'SENIOR' || userForm.role === 'CHIEF') {
                      return u.role === 'MANAGER' || u.role === 'EXECUTIVE'
                    }
                    
                    // Staff and Admin Assistants can report to Executives, Managers, Senior, or Chief
                    if (userForm.role === 'STAFF' || userForm.role === 'ADMINISTRATIVE_ASSISTANT') {
                      return u.role === 'EXECUTIVE' || u.role === 'MANAGER' || u.role === 'SENIOR' || u.role === 'CHIEF'
                    }
                    
                    // For others (Admin, Viewer), show high-level roles
                    return u.role === 'SG' || u.role === 'DEPUTY_SG' || u.role === 'EXECUTIVE' || u.role === 'MANAGER'
                  }).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userForm.role === 'DEPUTY_SG' && (
                <p className="text-xs text-gray-600">Deputy SG must be supervised by SG</p>
              )}
              {userForm.role === 'EXECUTIVE' && (
                <p className="text-xs text-gray-600">Executives must be supervised by either SG or Deputy SG</p>
              )}
              {userForm.role === 'SG' && (
                <p className="text-xs text-gray-600">Statistician General is supervised by Board Chairperson</p>
              )}
              {userForm.role === 'BOARD_CHAIRPERSON' && (
                <p className="text-xs text-gray-600">Board Chairperson has no supervisor - Approves SG's performance agreements</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>
              {editingDept ? 'Update department information' : 'Add a new department'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                name="departmentName"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder="Engineering"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Input
                id="dept-description"
                name="departmentDescription"
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder="Department description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDept}>
              {editingDept ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Division Dialog */}
      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDiv ? 'Edit Division' : 'Create Division'}</DialogTitle>
            <DialogDescription>
              {editingDiv ? 'Update division information' : 'Add a new division'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="div-name">Name *</Label>
              <Input
                id="div-name"
                name="divisionName"
                value={divForm.name}
                onChange={(e) => setDivForm({ ...divForm, name: e.target.value })}
                placeholder="Backend Team"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={divForm.departmentId} onValueChange={(value) => setDivForm({ ...divForm, departmentId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="div-description">Description</Label>
              <Input
                id="div-description"
                name="divisionDescription"
                value={divForm.description}
                onChange={(e) => setDivForm({ ...divForm, description: e.target.value })}
                placeholder="Division description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDivDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDiv}>
              {editingDiv ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update custom role information' : 'Add a new custom role'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                name="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="SENIOR_ANALYST"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">Internal role identifier (e.g., SENIOR_ANALYST)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-display-name">Display Name *</Label>
              <Input
                id="role-display-name"
                name="roleDisplayName"
                value={roleForm.displayName}
                onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                placeholder="Senior Analyst"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500">User-friendly name shown in the interface</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                name="roleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Role description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-level">Hierarchy Level *</Label>
              <Input
                id="role-level"
                name="roleLevel"
                type="number"
                min="1"
                max="10"
                value={roleForm.level}
                onChange={(e) => setRoleForm({ ...roleForm, level: parseInt(e.target.value) || 5 })}
              />
              <p className="text-xs text-gray-500">1 = Highest authority, 10 = Lowest (e.g., SG=1, Staff=7)</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="role-can-supervise"
                checked={roleForm.canSupervise}
                onChange={(e) => setRoleForm({ ...roleForm, canSupervise: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="role-can-supervise" className="cursor-pointer">
                Can supervise other users
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="role-is-active"
                checked={roleForm.isActive}
                onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="role-is-active" className="cursor-pointer">
                Active (available for assignment)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
