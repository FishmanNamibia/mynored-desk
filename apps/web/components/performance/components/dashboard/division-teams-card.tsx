'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, AlertCircle } from 'lucide-react'
import { gradients, shadows } from '@/app/ui-standards'

interface Division {
  divisionName: string
  departmentName: string | null
  manager: { id: string; name: string; jobTitle: string | null } | null
  employeeCount: number
  reportsToExecutive: boolean
}

export function DivisionTeamsCard() {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const fetchDivisions = async () => {
      try {
        const res = await fetch('/dashboard/performance/api/divisions/by-manager')
        if (res.ok && mounted) {
          const data = await res.json()
          setDivisions(data.divisions || [])
        }
      } catch (err) {
        console.error('Failed to fetch divisions:', err)
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    fetchDivisions()
    
    return () => {
      mounted = false
    }
  }, []) // Empty dependency array - only fetch once on mount

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center">
          <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading divisions...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || divisions.length === 0) {
    return null
  }

  return (
    <Card className="mb-6 border-0 shadow-lg overflow-hidden">
      <CardHeader 
        className="pb-3 rounded-t-md"
        style={{
          background: gradients.navyHeader,
          boxShadow: shadows.header,
        }}
      >
        <CardTitle className="text-base flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-white/80" />
          Division Teams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {divisions.map((division) => (
            <div
              key={division.divisionName}
              onClick={() => window.location.href = `/dashboard/performance/dashboard/divisions/${encodeURIComponent(division.divisionName)}`}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {division.divisionName}
                  </h3>
                  {division.departmentName && (
                    <p className="text-xs text-gray-500 truncate">{division.departmentName}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  <Users className="w-3 h-3" />
                  {division.employeeCount}
                </div>
              </div>
              
              {division.manager ? (
                <div className="flex items-center gap-2 p-2 bg-linear-to-r from-blue-50 to-indigo-50 rounded-md">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {division.manager.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{division.manager.name}</p>
                    <p className="text-xs text-gray-600 truncate">{division.manager.jobTitle || 'Manager'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    {division.reportsToExecutive ? 'Reports to Executive' : 'No Manager Assigned'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
