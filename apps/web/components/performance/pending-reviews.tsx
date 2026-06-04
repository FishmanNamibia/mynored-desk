"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users, ArrowRight, FileCheck, ClipboardList, AlertCircle } from "lucide-react"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { colors } from "@/app/ui-standards"

const pendingReviews = [
  {
    id: 1,
    employee: "Sarah Chen",
    position: "Senior Developer",
    type: "Quarterly Review",
    dueDate: "Jan 20, 2026",
    progress: 60,
  },
  {
    id: 2,
    employee: "Michael Rodriguez",
    position: "Product Manager",
    type: "360 Feedback",
    dueDate: "Jan 18, 2026",
    progress: 30,
  },
  {
    id: 3,
    employee: "Emily Watson",
    position: "UX Designer",
    type: "Quarterly Review",
    dueDate: "Jan 25, 2026",
    progress: 0,
  },
]

interface PendingReviewsProps {
  variant?: "agreements" | "pending" | "default"
}

export function PendingReviews({ variant = "default" }: PendingReviewsProps) {
  const title = variant === "agreements" 
    ? "Performance Agreements" 
    : variant === "pending" 
      ? "Pending Reviews" 
      : "Reviews"
  
  const description = variant === "agreements"
    ? "Manage and track performance agreements for your team members."
    : variant === "pending"
      ? "Reviews awaiting your completion or approval."
      : "View and manage performance reviews."

  // Calculate stats
  const totalReviews = pendingReviews.length
  const inProgress = pendingReviews.filter(r => r.progress > 0 && r.progress < 100).length
  const notStarted = pendingReviews.filter(r => r.progress === 0).length
  const dueSoon = pendingReviews.filter(r => {
    const dueDate = new Date(r.dueDate)
    const today = new Date()
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }).length

  return (
    <div className="min-h-full">
      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            {description}
          </p>
        </div>

        {/* KPI Cards */}
        <KpiGrid columns={4}>
          <KpiCard
            icon={ClipboardList}
            label="Total Reviews"
            value={totalReviews}
            trend="Active agreements"
            color="blue"
            size="lg"
          />
          <KpiCard
            icon={Clock}
            label="In Progress"
            value={inProgress}
            trend="Partially completed"
            color="amber"
            size="lg"
          />
          <KpiCard
            icon={AlertCircle}
            label="Not Started"
            value={notStarted}
            trend="Awaiting action"
            color="purple"
            size="lg"
          />
          <KpiCard
            icon={FileCheck}
            label="Due This Week"
            value={dueSoon}
            trend="Needs attention"
            color="red"
            size="lg"
          />
        </KpiGrid>

        {/* Reviews List */}
        <div className="space-y-3">
          {pendingReviews.map((review) => (
            <Card 
              key={review.id} 
              className="widget-card hover:border-gray-200 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div 
                    className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
                    style={{ backgroundColor: "#f0f4f8" }}
                  >
                    <Users className="w-5 h-5" style={{ color: colors.navy }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-base font-semibold text-gray-900">{review.employee}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {review.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{review.position}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due {review.dueDate}</span>
                      </div>
                      <span className={review.progress > 0 ? "text-blue-500" : "text-gray-400"}>
                        {review.progress}% complete
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      className="text-xs font-medium"
                    >
                      Continue Review
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingReviews.length === 0 && (
            <Card className="widget-card">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending reviews</h3>
                <p className="text-gray-500">You're all caught up!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
