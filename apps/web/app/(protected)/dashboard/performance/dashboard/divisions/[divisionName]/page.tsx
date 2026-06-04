'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Briefcase, Mail, Building2, ChevronRight, Star, CheckCircle, Clock, AlertCircle, X, FileText, Target, Weight } from 'lucide-react'

interface Agreement {
  id: string
  title: string
  goal: string | null
  goalNumber: number | null
  objective: string | null
  measure: string | null
  target: string | null
  approvalStatus: string | null
  rating: number | null
  weight: number | null
  status: string | null
  percentComplete: number | null
  progressNotes: string | null
  evidenceUrl: string | null
  evidenceNotes: string | null
}

interface Employee {
  id: string
  name: string
  email: string
  jobTitle: string | null
  agreementStatus: 'approved' | 'pending' | 'not_submitted' | 'rejected'
  rating: number | null
  agreements: Agreement[]
}

interface DivisionDetail {
  divisionName: string
  departmentName: string | null
  employees: Employee[]
  stats: {
    total: number
    approved: number
    pending: number
    notSubmitted: number
    averageRating: number | null
    ratedCount: number
  }
}

export default function DivisionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [division, setDivision] = useState<DivisionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [statFilter, setStatFilter] = useState<'all' | 'approved' | 'pending' | 'not_submitted' | null>(null)

  const divisionName = decodeURIComponent(params.divisionName as string)

  useEffect(() => {
    const fetchDivisionDetail = async () => {
      try {
        const res = await fetch(`/dashboard/performance/api/divisions/employees?division=${encodeURIComponent(divisionName)}`)
        if (res.ok) {
          const data = await res.json()
          setDivision(data)
        }
      } catch (error) {
        console.error('Failed to fetch division details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (divisionName) {
      fetchDivisionDetail()
    }
  }, [divisionName])

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 flex items-center justify-center min-h-100">
        <div className="text-center">
          <Users className="w-12 h-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading division details...</p>
        </div>
      </div>
    )
  }

  if (!division) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found in your reporting structure for this division.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'pending':
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'not_submitted':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" />Not Submitted</Badge>
      case 'rejected':
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-600">Draft</Badge>
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-blue-600" />
            {division.divisionName === 'No Division Assigned' ? 'My Team' : division.divisionName}
          </h1>
          {division.departmentName && (
            <p className="text-gray-500 mt-1">Department: {division.departmentName}</p>
          )}
        </div>
      </div>

      {/* Stats Summary - Clickable cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-linear-to-br from-amber-50 to-yellow-100 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700">
                  {division.stats.averageRating !== null 
                    ? division.stats.averageRating.toFixed(1) 
                    : '-'}
                </p>
                <p className="text-xs text-amber-600">
                  Avg Rating {division.stats.ratedCount > 0 && `(${division.stats.ratedCount} rated)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setStatFilter(statFilter === 'all' ? null : 'all')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{division.stats.total}</p>
                <p className="text-xs text-gray-500">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatFilter(statFilter === 'approved' ? null : 'approved')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{division.stats.approved}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatFilter(statFilter === 'pending' ? null : 'pending')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{division.stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${statFilter === 'not_submitted' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => setStatFilter(statFilter === 'not_submitted' ? null : 'not_submitted')}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{division.stats.notSubmitted}</p>
                <p className="text-xs text-gray-500">Not Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stat Filter Popup - shows filtered employee names */}
      {statFilter && (() => {
        const filterLabel = statFilter === 'all' ? 'All Employees' 
          : statFilter === 'approved' ? 'Approved' 
          : statFilter === 'pending' ? 'Pending' 
          : 'Not Submitted'
        const filtered = statFilter === 'all' 
          ? division.employees 
          : division.employees.filter(e => e.agreementStatus === statFilter)
        const borderColor = statFilter === 'approved' ? 'border-green-200' 
          : statFilter === 'pending' ? 'border-yellow-200' 
          : statFilter === 'not_submitted' ? 'border-gray-200' 
          : 'border-blue-200'
        const headerBg = statFilter === 'approved' ? 'bg-green-50' 
          : statFilter === 'pending' ? 'bg-yellow-50' 
          : statFilter === 'not_submitted' ? 'bg-gray-50' 
          : 'bg-blue-50'

        return (
          <Card className={`mb-6 ${borderColor} border-2`}>
            <CardHeader className={`${headerBg} py-3`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {statFilter === 'approved' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {statFilter === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                  {statFilter === 'not_submitted' && <AlertCircle className="w-4 h-4 text-gray-600" />}
                  {statFilter === 'all' && <Users className="w-4 h-4 text-blue-600" />}
                  {filterLabel} ({filtered.length})
                </CardTitle>
                <button onClick={() => setStatFilter(null)} className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="py-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-500 py-3 text-center">No employees in this category.</p>
              ) : (
                <div className="divide-y max-h-75 overflow-y-auto">
                  {filtered.map(emp => (
                    <div 
                      key={emp.id} 
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      onClick={() => { setStatFilter(null); setSelectedEmployee(emp); }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.jobTitle || 'Staff'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.rating !== null && (
                          <span className="text-xs font-medium text-amber-600">{emp.rating.toFixed(1)}/5</span>
                        )}
                        {getStatusBadge(emp.agreementStatus)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Hint to click stat cards if no filter is active */}
      {!statFilter && division.employees.length > 0 && (
        <p className="text-sm text-gray-400 text-center mb-4">Click a stat card above to view employees by status</p>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmployee(null)}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-linear-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {selectedEmployee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-600">{selectedEmployee.jobTitle || 'Staff'} • {selectedEmployee.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedEmployee.rating !== null && (
                  <div className="flex items-center gap-1 bg-amber-100 px-3 py-1.5 rounded-full">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-amber-700">{selectedEmployee.rating.toFixed(2)}/5</span>
                  </div>
                )}
                {getStatusBadge(selectedEmployee.agreementStatus)}
                <button onClick={() => setSelectedEmployee(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Performance Agreement Actions ({selectedEmployee.agreements.length})
              </h3>

              {selectedEmployee.agreements.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No performance agreements found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEmployee.agreements.map((agreement, idx) => (
                    <div key={agreement.id} className="border rounded-lg p-4 hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{agreement.title}</p>
                          {agreement.goal && (
                            <p className="text-xs text-blue-600 mt-0.5">
                              Goal {agreement.goalNumber}: {agreement.goal}
                            </p>
                          )}
                          {agreement.objective && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              <Target className="w-3 h-3 inline mr-1" />
                              {agreement.objective}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getStatusBadge(agreement.approvalStatus)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                        {agreement.weight !== null && (
                          <div className="bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-500 text-xs">Weight</span>
                            <p className="font-medium">{agreement.weight}%</p>
                          </div>
                        )}
                        {agreement.rating !== null && (
                          <div className="bg-amber-50 rounded px-2 py-1">
                            <span className="text-gray-500 text-xs">Self Rating</span>
                            <p className="font-medium text-amber-700">{agreement.rating}/5</p>
                          </div>
                        )}
                        {agreement.percentComplete !== null && (
                          <div className="bg-green-50 rounded px-2 py-1">
                            <span className="text-gray-500 text-xs">Progress</span>
                            <p className="font-medium text-green-700">{agreement.percentComplete}%</p>
                          </div>
                        )}
                      </div>

                      {(agreement.measure || agreement.target) && (
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                          {agreement.measure && (
                            <div>
                              <span className="text-gray-500 text-xs">Measure</span>
                              <p className="text-gray-700">{agreement.measure}</p>
                            </div>
                          )}
                          {agreement.target && (
                            <div>
                              <span className="text-gray-500 text-xs">Target</span>
                              <p className="text-gray-700">{agreement.target}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {agreement.progressNotes && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500 text-xs">Progress Notes</span>
                          <p className="text-gray-700">{agreement.progressNotes}</p>
                        </div>
                      )}

                      {agreement.evidenceNotes && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500 text-xs">Evidence</span>
                          <p className="text-gray-700">{agreement.evidenceNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-3 bg-gray-50 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
