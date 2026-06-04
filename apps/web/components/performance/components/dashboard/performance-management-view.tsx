'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { LevelStatsCards } from '@/components/dashboard/level-stats-cards'
import { PerformersRanking } from '@/components/dashboard/performers-ranking'
import { MyPerformanceRateCard } from '@/components/dashboard/my-performance-rate-card'
import { IndividualActionsSummary } from '@/components/dashboard/individual-actions-summary'
import { PerformancePeriodComparison } from '@/components/dashboard/performance-period-comparison'
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
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('combined')
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

  // Tab visibility based on role
  const canSeeDepartmentTab = true // Everyone can see department level
  const canSeeDivisionTab = isManager || isAdminRole // Only managers and admins see individual divisions
  const canSeeOrganizationTab = true // Everyone can see organization level

  useEffect(() => {
    // Fetch user's department and division info
    const fetchUserInfo = async () => {
      try {
        const response = await fetch('/dashboard/performance/api/user/current')
        if (response.ok) {
          const user = await response.json()
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
    return <div className="text-center py-8 text-gray-500">Loading...</div>
  }

  // All users see the tabbed interface with Individual tab
  return (
    <div className="space-y-6">

      {/* My Personal Performance Rate Card */}
      <div className="max-w-2xl mx-auto">
        <MyPerformanceRateCard />
      </div>


      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <GoldSpinner size="md" message="Loading dashboard..." />
        </div>
      ) : (
        <Tabs defaultValue={
          isAdminRole ? "organization" :
          isExecutive ? "department" :
          isManager ? "division" :
          "department"
        } className="w-full">
          <TabsList className={`grid w-full ${canSeeDivisionTab ? 'grid-cols-4' : canSeeDepartmentTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            {canSeeDepartmentTab && <TabsTrigger value="department">My Department</TabsTrigger>}
            {canSeeDivisionTab && <TabsTrigger value="division">My Division</TabsTrigger>}
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>

        {/* Individual Tab - Summary Cards */}
        <TabsContent value="individual" className="space-y-6">
          <IndividualActionsSummary />
        </TabsContent>

        {/* Division Tab */}
        <TabsContent value="division" className="space-y-6">
          {isAdmin && departmentDivisions.length > 0 ? (
            // Admin sees all divisions with filter
            <div className="space-y-8">
              <div className={`border rounded-lg p-4 ${isAdmin ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isAdmin ? 'text-red-900' : 'text-blue-900'}`}>
                    {isAdmin ? 'All Divisions (Organization-Wide)' : `All Divisions in ${departmentName}`}
                  </h3>

                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-70 bg-white">
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
          ) : isManager && userDivisionId ? (
            // Managers see only their own division
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900">
                  {divisionName} Division
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your division's performance metrics and contributions
                </p>
              </div>

              <div className="space-y-6">
                <LevelStatsCards level="division" levelId={userDivisionId} levelName={divisionName} />
                <PerformersRanking />
              </div>
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
          {isAdmin ? (
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
          ) : isExecutive && userDepartmentId ? (
            // Executives see combined stats for all divisions in their department
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {departmentName} - Combined Department Performance
                  </h3>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-50 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">Combined View (All)</SelectItem>
                      <SelectItem value="department">{departmentName}</SelectItem>
                      {departmentDivisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {departmentDivisions.length > 0 
                    ? 'Shows aggregated statistics from all divisions under your department leadership'
                    : 'Department-level performance statistics (no divisions currently assigned)'}
                </p>
              </div>

              {/* Show selected view */}
              {selectedDivisionId === 'combined' ? (
                // Combined view - aggregated department and all divisions
                <div className="space-y-6">
                  <LevelStatsCards level="department" levelId={userDepartmentId} levelName={departmentName} />
                  <PerformersRanking />
                </div>
              ) : selectedDivisionId === 'department' ? (
                // Department level view only
                <div className="space-y-6">
                  <LevelStatsCards level="department" levelId={userDepartmentId} levelName={departmentName} />
                  <PerformersRanking />
                </div>
              ) : (
                // Individual division view
                departmentDivisions
                  .filter(division => division.id === selectedDivisionId)
                  .map((division) => (
                    <div key={division.id} className="border-t-4 border-purple-500 pt-6 bg-gray-50 p-6 rounded-lg">
                      <div className="space-y-6">
                        <LevelStatsCards level="division" levelId={division.id} levelName={division.name} />
                        <PerformersRanking />
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : isManager && userDepartmentId ? (
            // Managers see their department
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900">
                  {departmentName} Department
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Department-level performance indicators and contributions
                </p>
              </div>

              <div className="space-y-6">
                <LevelStatsCards level="department" levelId={userDepartmentId} levelName={departmentName} />
                <PerformersRanking />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>You are not assigned to a department.</p>
            </div>
          )}
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          {allDepartments.length > 0 ? (
            <div className="space-y-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-900">
                    Organization Departments
                  </h3>
                  
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="w-70 bg-white">
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
                <div className="space-y-6">
                  {/* Performance Period Comparison */}
                  <PerformancePeriodComparison />
                  
                  {/* Organization-wide view */}
                  <div className="space-y-6">
                    <LevelStatsCards level="organization" />
                    <PerformersRanking />
                  </div>
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
      )}
    </div>
  )
}
