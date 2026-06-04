"use client"

import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Star, Users, Award } from "lucide-react"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { colors } from "@/app/ui-standards"

const feedback = [
  {
    id: 1,
    from: "Director Smith",
    type: "360 Feedback",
    rating: 5,
    date: "Jan 12, 2026",
    comment:
      "Excellent leadership and technical skills. Great team player who consistently delivers high-quality work.",
  },
  {
    id: 2,
    from: "Sarah Chen",
    type: "Peer Feedback",
    rating: 4,
    date: "Jan 10, 2026",
    comment: "Very collaborative and always willing to help. Strong problem-solving abilities.",
  },
  {
    id: 3,
    from: "Michael Rodriguez",
    type: "Peer Feedback",
    rating: 5,
    date: "Jan 8, 2026",
    comment: "Outstanding communication skills and attention to detail. A valuable asset to the team.",
  },
]

export function FeedbackReceived() {
  // Calculate stats
  const totalFeedback = feedback.length
  const avgRating = (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1)
  const fiveStarCount = feedback.filter(f => f.rating === 5).length
  const peerFeedback = feedback.filter(f => f.type === "Peer Feedback").length

  return (
    <div className="min-h-full">
      <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            360 Feedback
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            View feedback received from managers, peers, and team members.
          </p>
        </div>

        {/* KPI Cards */}
        <KpiGrid columns={4}>
          <KpiCard
            icon={MessageSquare}
            label="Total Feedback"
            value={totalFeedback}
            trend="All time received"
            color="blue"
            size="lg"
          />
          <KpiCard
            icon={Star}
            label="Average Rating"
            value={`${avgRating}/5`}
            trend="Overall score"
            color="amber"
            size="lg"
          />
          <KpiCard
            icon={Award}
            label="5-Star Ratings"
            value={fiveStarCount}
            trend="Excellent feedback"
            color="green"
            size="lg"
          />
          <KpiCard
            icon={Users}
            label="Peer Feedback"
            value={peerFeedback}
            trend="From colleagues"
            color="purple"
            size="lg"
          />
        </KpiGrid>

        {/* Feedback List */}
        <div className="space-y-3">
          {feedback.map((item) => (
            <Card key={item.id} className="widget-card">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div 
                    className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
                    style={{ backgroundColor: "#f0f4f8" }}
                  >
                    <MessageSquare className="w-5 h-5" style={{ color: colors.navy }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">{item.from}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        item.type === "360 Feedback" 
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < item.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                        />
                      ))}
                      <span className="text-sm text-gray-400 ml-2">{item.date}</span>
                    </div>
                    <p className="text-gray-600 italic leading-relaxed">"{item.comment}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {feedback.length === 0 && (
            <Card className="widget-card">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No feedback yet</h3>
                <p className="text-gray-500">You haven't received any feedback yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
