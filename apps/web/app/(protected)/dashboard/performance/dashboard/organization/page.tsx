'use client'

import { StatsCards } from '@/components/performance/components/dashboard/stats-cards'
import { PerformanceGraphs } from '@/components/performance/components/dashboard/performance-graphs'
import { PerformersRanking } from '@/components/performance/components/dashboard/performers-ranking'
import { DepartmentPerformance } from '@/components/performance/components/dashboard/department-performance'
import { TrendsChart } from '@/components/performance/components/dashboard/trends-chart'

export default function OrganizationDashboardPage() {
  // Auth is handled by the protected layout in the main NSA desk app

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Organization Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          NSA-wide performance overview
        </p>
      </div>

      {/* Organization-wide Stats */}
      <StatsCards />
      
      {/* Performance Graphs - Overall NSA, Departments, Divisions */}
      <PerformanceGraphs />

      {/* Top & Least Performers */}
      <PerformersRanking />

      {/* Performance & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DepartmentPerformance />
        <TrendsChart />
      </div>
    </div>
  )
}
