'use client'

import { StatsCards } from '@/components/performance/components/dashboard/stats-cards'
import { DepartmentPerformance } from '@/components/performance/components/dashboard/department-performance'

export default function DivisionalDashboardPage() {
  // Auth is handled by the protected layout in the main NSA desk app

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Divisional Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          Performance overview for your division
        </p>
      </div>

      {/* Division Stats */}
      <StatsCards />
      
      {/* Division Performance */}
      <DepartmentPerformance />
    </div>
  )
}
