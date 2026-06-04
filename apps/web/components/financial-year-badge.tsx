"use client"

import { Calendar } from "lucide-react"
import { getCurrentFinancialYear, getDaysLeftInFinancialYear } from "@/lib/financial-year"

interface FinancialYearBadgeProps {
  activePeriod?: {
    name: string
    startDate: string
    endDate: string
    daysLeft: number
  } | null
}

export function FinancialYearBadge({ activePeriod }: FinancialYearBadgeProps) {
  // Only show when an active performance period is set
  if (!activePeriod) return null

  const fy = activePeriod.name
  const daysLeft = activePeriod.daysLeft

  return (
    <div 
      className="flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl"
      style={{
        background: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Calendar Icon */}
      <Calendar 
        className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" 
        style={{ color: "#ffffff" }}
      />
      
      {/* FY Year - Inline */}
      <span 
        className="text-sm sm:text-base font-bold whitespace-nowrap"
        style={{ color: "#ffffff" }}
      >
        FY {fy}
      </span>
      
      {/* Separator and Days Left */}
      <span 
        className="text-sm sm:text-base"
        style={{ color: "rgba(255, 255, 255, 0.7)" }}
      >
        •
      </span>
      <span 
        className="text-xs sm:text-sm font-medium whitespace-nowrap"
        style={{ color: "rgba(255, 255, 255, 0.9)" }}
      >
        {daysLeft} days left
      </span>
    </div>
  )
}
