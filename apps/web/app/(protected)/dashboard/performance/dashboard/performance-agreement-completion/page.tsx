'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AgreementCompletionCards } from '@/components/performance/components/dashboard/agreement-completion-cards'
import { canSeeFullDetails, canSeeAllDivisions } from '@/lib/pms/utils'

interface DivisionInfo {
  id: string
  name: string
  departmentId: string
}

interface DepartmentInfo {
  id: string
  name: string
}

interface CompletionStats {
  totalUsers: number
  usersWithAgreements: number
  usersWithCompleteAgreements: number
  usersInProgress: number
  usersNotStarted: number
  totalAgreements: number
  totalApproved: number
  completionRate: number
}

interface DepartmentStats extends CompletionStats {
  departmentId: string
  departmentName: string
}

interface DivisionStats extends CompletionStats {
  divisionId: string
  divisionName: string
}

interface AgreementData {
  organization: CompletionStats
  departments: DepartmentStats[]
  divisions: DivisionStats[]
}

export default function PerformanceAgreementCompletionPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<AgreementData | null>(null)
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

  // Define role-based access levels (consistent with other pages)
  const executiveRoles = ['SG', 'DEPUTY_SG', 'EXECUTIVE'] // Head departments, see combined stats
  const managerRoles = ['MANAGER'] // Belong to divisions, see department + their division
  const adminRoles = ['ADMIN'] // See everything

  const isExecutive = session?.user?.role ? executiveRoles.includes(session.user.role) : false
  const isManager = session?.user?.role ? managerRoles.includes(session.user.role) : false
  const isAdminRole = session?.user?.role === 'ADMIN'
  const isRegularStaff = !isExecutive && !isManager && !isAdminRole

  // Sanitize data to ensure no NaN values
  const sanitizeStats = useMemo(() => (stats: any): CompletionStats => {
    if (!stats) return {
      totalUsers: 0,
      usersWithAgreements: 0,
      usersWithCompleteAgreements: 0,
      usersInProgress: 0,
      usersNotStarted: 0,
      totalAgreements: 0,
      totalApproved: 0,
      completionRate: 0
    }
    
    return {
      totalUsers: Number.isFinite(stats.totalUsers) ? Number(stats.totalUsers) : 0,
      usersWithAgreements: Number.isFinite(stats.usersWithAgreements) ? Number(stats.usersWithAgreements) : 0,
      usersWithCompleteAgreements: Number.isFinite(stats.usersWithCompleteAgreements) ? Number(stats.usersWithCompleteAgreements) : 0,
      usersInProgress: Number.isFinite(stats.usersInProgress) ? Number(stats.usersInProgress) : 0,
      usersNotStarted: Number.isFinite(stats.usersNotStarted) ? Number(stats.usersNotStarted) : 0,
      totalAgreements: Number.isFinite(stats.totalAgreements) ? Number(stats.totalAgreements) : 0,
      totalApproved: Number.isFinite(stats.totalApproved) ? Number(stats.totalApproved) : 0,
      completionRate: Number.isFinite(stats.completionRate) ? Number(stats.completionRate) : 0
    }
  }, [])

  const sanitizeDepartmentStats = (dept: any): DepartmentStats => ({
    ...sanitizeStats(dept),
    departmentId: dept.departmentId,
    departmentName: dept.departmentName || 'Unknown'
  })

  const sanitizeDivisionStats = (div: any): DivisionStats => ({
    ...sanitizeStats(div),
    divisionId: div.divisionId,
    divisionName: div.divisionName || 'Unknown'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch agreement completion data
        const agreementResponse = await fetch('/dashboard/performance/api/performance-agreements/completion-stats')
        if (agreementResponse.ok) {
          const agreementData = await agreementResponse.json()
          // Sanitize all data before setting state
          const sanitizedData = {
            organization: sanitizeStats(agreementData.organization),
            departments: (agreementData.departments || []).map((d: any) => sanitizeDepartmentStats(d)),
            divisions: (agreementData.divisions || []).map((d: any) => sanitizeDivisionStats(d))
          }
          setData(sanitizedData)
        }

        // Fetch user info
        const userResponse = await fetch('/dashboard/performance/api/user/current')
        if (userResponse.ok) {
          const user = await userResponse.json()
          
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
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [session])

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="text-center py-8 text-gray-500">Failed to load data</div>
      </div>
    )
  }

  // If user is not senior staff, show high-level view only
  if (!canSeeFullDetails(session?.user)) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Agreement Completion</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Organization-wide agreement completion overview</p>
        </div>

        <AgreementCompletionCards 
          stats={data.organization} 
          level="organization"
        />
      </div>
    )
  }

  // Determine default tab based on role
  const getDefaultTab = () => {
    if (isAdmin) return 'organization'
    if (canSeeAllDivisions(session?.user) && departmentDivisions.length > 0) return 'department'
    if (userDivisionId) return 'division'
    if (userDepartmentId) return 'department'
    return 'organization'
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Performance Agreement Completion</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">Track performance agreement completion across all organizational levels</p>
      </div>

      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="division">Division</TabsTrigger>
          <TabsTrigger value="department">Department</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        {/* Division Tab */}
        <TabsContent value="division" className="space-y-6">
          {canSeeAllDivisions(session?.user) && departmentDivisions.length > 0 ? (
            // Executives, SG, DSG, ADMIN see all divisions with filter
            <div className="space-y-8">
              <div className={`border rounded-lg p-4 ${isAdmin ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isAdmin ? 'text-red-900' : 'text-blue-900'}`}>
                    {isAdmin ? 'All Divisions (Organization-Wide)' : `All Divisions in ${departmentName}`}
                  </h3>
                  
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-[280px] bg-white">
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
                .map((division) => {
                  const divisionData = data.divisions.find(d => d.divisionId === division.id)
                  if (!divisionData) return null
                  
                  return (
                    <div key={division.id} className="border-t-4 border-purple-500 pt-6 bg-gray-50 p-6 rounded-lg">
                      <AgreementCompletionCards 
                        stats={divisionData}
                        level="division" 
                        levelName={division.name}
                      />
                    </div>
                  )
                })}
            </div>
          ) : userDivisionId ? (
            // Regular users see only their division
            (() => {
              const divisionData = data.divisions.find(d => d.divisionId === userDivisionId)
              if (!divisionData) {
                return <div className="text-center py-8 text-gray-500">No division data available</div>
              }
              return (
                <AgreementCompletionCards 
                  stats={divisionData}
                  level="division" 
                  levelName={divisionName}
                />
              )
            })()
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
              
              {allDepartments.map((dept) => {
                const deptData = data.departments.find(d => d.departmentId === dept.id)
                if (!deptData) return null
                
                return (
                  <div key={dept.id} className="border-t-4 border-blue-500 pt-6 bg-gray-50 p-6 rounded-lg">
                    <AgreementCompletionCards 
                      stats={deptData}
                      level="department" 
                      levelName={dept.name}
                    />
                  </div>
                )
              })}
            </div>
          ) : (session?.user?.role === 'EXECUTIVE' || session?.user?.role === 'SG' || session?.user?.role === 'DEPUTY_SG') && userDepartmentId && departmentDivisions.length > 0 ? (
            // Executives see all divisions in their department
            (() => {
              const deptData = data.departments.find(d => d.departmentId === userDepartmentId)
              if (!deptData) {
                return <div className="text-center py-8 text-gray-500">No department data available</div>
              }
              
              return (
                <div className="space-y-8">
                  {departmentDivisions.map((division) => {
                    const divisionData = data.divisions.find(d => d.divisionId === division.id)
                    if (!divisionData) return null
                    
                    return (
                      <div key={division.id} className="border-t-4 border-purple-500 pt-6 bg-gray-50 p-6 rounded-lg">
                        <AgreementCompletionCards 
                          stats={divisionData}
                          level="division" 
                          levelName={division.name}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })()
          ) : userDepartmentId ? (
            // Regular users see only their department
            (() => {
              const deptData = data.departments.find(d => d.departmentId === userDepartmentId)
              if (!deptData) {
                return <div className="text-center py-8 text-gray-500">No department data available</div>
              }
              return (
                <AgreementCompletionCards 
                  stats={deptData}
                  level="department" 
                  levelName={departmentName}
                />
              )
            })()
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>You are not assigned to a department.</p>
              <p className="text-sm mt-2">Check the Organization tab for organization-wide metrics.</p>
            </div>
          )}
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          {allDepartments.length > 0 && data.departments.length > 0 ? (
            <div className="space-y-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-900">
                    Organization Departments
                  </h3>
                  
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger className="w-[280px] bg-white">
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
                <AgreementCompletionCards 
                  stats={data.organization}
                  level="organization"
                />
              ) : (
                // Show specific department
                (() => {
                  const selectedDept = data.departments.find(d => d.departmentId === selectedDepartmentId)
                  if (!selectedDept) {
                    return <div className="text-center py-8 text-gray-500">Department data not available</div>
                  }
                  return (
                    <div className="border-t-4 border-blue-500 pt-6 bg-gray-50 p-6 rounded-lg">
                      <AgreementCompletionCards 
                        stats={selectedDept}
                        level="department" 
                        levelName={allDepartments.find(d => d.id === selectedDepartmentId)?.name}
                      />
                    </div>
                  )
                })()
              )}
            </div>
          ) : (
            <AgreementCompletionCards 
              stats={data.organization}
              level="organization"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
