'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LevelStatsCards } from '@/components/performance/components/dashboard/level-stats-cards'
import { PerformersRanking } from '@/components/performance/components/dashboard/performers-ranking'
import { MyPerformanceRateCard } from '@/components/performance/components/dashboard/my-performance-rate-card'
import { useSession } from '@/lib/pms-auth-adapter'

interface DivisionInfo {
  id: string
  name: string
  departmentId: string
}

interface DepartmentInfo {
  id: string
  name: string
}

export default function PerformanceManagementPage() {
  const { data: session } = useSession()
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null)
  const [userDivisionId, setUserDivisionId] = useState<string | null>(null)
  const [departmentName, setDepartmentName] = useState<string>('')
  const [divisionName, setDivisionName] = useState<string>('')
  const [departmentDivisions, setDepartmentDivisions] = useState<DivisionInfo[]>([])
  const [allDepartments, setAllDepartments] = useState<DepartmentInfo[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Define role-based access levels
  const executiveRoles = ['SG', 'DEPUTY_SG', 'EXECUTIVE'] // Head departments, see combined stats
  const managerRoles = ['MANAGER'] // Belong to divisions, see department + their division
  const adminRoles = ['ADMIN'] // See everything

  // Access control logic
  const isExecutive = session?.user?.role ? executiveRoles.includes(session.user.role) : false
  const isManager = session?.user?.role ? managerRoles.includes(session.user.role) : false
  const isAdminRole = session?.user?.role === 'ADMIN'
  const isRegularStaff = !isExecutive && !isManager && !isAdminRole

  useEffect(() => {
    // Fetch user's department and division info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/dashboard/performance/api/user/current')
        if (response.ok) {
          const user = await response.json()
          
          // For EXECUTIVE/SG/DEPUTY_SG: Use primary department (departmentId)
          // Additional departments are in userDepartments for oversight purposes
          setUserDepartmentId(user.departmentId)
          setUserDivisionId(user.divisionId)
          setDepartmentName(user.department?.name || 'My Department')
          setDivisionName(user.division?.name || 'My Division')
          setDepartmentDivisions(user.departmentDivisions || [])
          setAllDepartments(user.allDepartments || [])
          setIsAdmin(user.isAdmin || false)
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchUserInfo()
    } else {
      setLoading(false)
    }
  }, [session])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    )
  }

  // If user is regular staff, show high-level view only
  if (isRegularStaff) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
          <p className="text-gray-500 mt-1">Organization-wide performance overview</p>
        </div>

        {/* My Personal Performance Rate Card */}
        <div className="max-w-2xl mx-auto">
          <MyPerformanceRateCard />
        </div>

        {/* High-level view for regular staff */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Organization Performance</h2>
            <p className="text-gray-500 mt-1">High-level performance indicators</p>
          </div>

          {/* Organization-Level Performance Indicators */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Indicators</h3>
            <LevelStatsCards level="organization" />
          </div>

          {/* Top Performers - High Level */}
          <PerformersRanking />
        </div>
      </div>
    )
  }

  // Senior staff sees full detailed view with drill-down
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Management</h1>
        <p className="text-gray-500 mt-1">Track all performance management initiatives and actions</p>
      </div>

      {/* My Personal Performance Rate Card */}
      <div className="max-w-2xl mx-auto">
        <MyPerformanceRateCard />
      </div>

      <Tabs defaultValue={
        isAdmin ? "organization" : 
        (session?.user?.role === 'EXECUTIVE' || session?.user?.role === 'SG' || session?.user?.role === 'DEPUTY_SG') ? "department" : 
        userDivisionId ? "division" : 
        userDepartmentId ? "department" : 
        "organization"
      } className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="division">Division</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        {/* Division Tab */}
        <TabsContent value="division" className="space-y-6">
          {(isAdminRole || isExecutive) && departmentDivisions.length > 0 ? (
            // Executives, SG, DSG, ADMIN see all divisions with filter
            <div className="space-y-8">
              <div className={`border rounded-lg p-4 ${isAdminRole ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isAdminRole ? 'text-red-900' : 'text-blue-900'}`}>
                    {isAdminRole ? 'All Divisions (Organization-Wide)' : `All Divisions in ${departmentName}`}
                  </h3>
                  
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-[280px] bg-card">
                      <SelectValue placeholder="Select division to view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {departmentDivisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {departmentDivisions
                .filter(division => selectedDivisionId === 'all' || division.id === selectedDivisionId)
                .map((division) => (
                  <div key={division.id} className="border-t-4 border-purple-500 pt-6 bg-gray-50 p-6 rounded-lg">
                    <div className="space-y-6">
                      <LevelStatsCards level="division" levelId={division.id} levelName={division.name} />
                      <PerformersRanking />
                    </div>
                  </div>
                ))}
            </div>
          ) : userDivisionId ? (
            // Regular users see only their division
            <div className="space-y-6">
              <LevelStatsCards level="division" levelId={userDivisionId} levelName={divisionName} />
              <PerformersRanking />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>You are not assigned to a division.</p>
              <p className="text-sm mt-2">Check the Department or Organization tab for broader metrics.</p>
            </div>
          )}
        </TabsContent>

        {/* Department Tab */}
        <TabsContent value="department" className="space-y-6">
          {isAdmin && allDepartments.length > 0 ? (
            // Admin sees all departments
            <div className="space-y-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-900">
                  All Departments (Organization-Wide)
                </h3>
              </div>
              
              {allDepartments.map((dept) => (
                <div key={dept.id} className="border-t-4 border-blue-500 pt-6 bg-gray-50 p-6 rounded-lg">
                  <div className="space-y-6">
                    <LevelStatsCards level="department" levelId={dept.id} levelName={dept.name} />
                    <PerformersRanking />
                  </div>
                </div>
              ))}
            </div>
          ) : userDepartmentId ? (
            // Executives and regular users see their department-level data
            <div className="space-y-6">
              <LevelStatsCards level="department" levelId={userDepartmentId} levelName={departmentName} />
              <PerformersRanking />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>You are not assigned to a department.</p>
              <p className="text-sm mt-2">Check the Organization tab for organization-wide metrics.</p>
            </div>
          )}
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          {/* Organization-wide Summary for Executives and Admins */}
          {(isAdminRole || isExecutive) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">
                Organization Overview
              </h3>
              <LevelStatsCards 
                level="organization"
                levelName="Organization"
              />
            </div>
          )}
          
          {allDepartments.length > 0 ? (
            <div className="space-y-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-900">
                    Organization Departments
                  </h3>
                  
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="w-[280px] bg-card">
                      <SelectValue placeholder="Select department to view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {allDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedDepartmentId === 'all' ? (
                // Show organization-wide view
                <div className="space-y-6">
                  <LevelStatsCards level="organization" />
                  <PerformersRanking />
                </div>
              ) : (
                // Show specific department
                <div className="border-t-4 border-blue-500 pt-6 bg-gray-50 p-6 rounded-lg">
                  <div className="space-y-6">
                    <LevelStatsCards 
                      level="department" 
                      levelId={selectedDepartmentId}
                      levelName={allDepartments.find(d => d.id === selectedDepartmentId)?.name}
                    />
                    <PerformersRanking />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <LevelStatsCards level="organization" />
              <PerformersRanking />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
