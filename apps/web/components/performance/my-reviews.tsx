import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, TrendingUp } from "lucide-react"

const reviews = [
  {
    id: 1,
    period: "Q4 2025",
    type: "Quarterly Review",
    status: "completed",
    score: 4.5,
    completedDate: "Jan 10, 2026",
  },
  {
    id: 2,
    period: "Q3 2025",
    type: "Quarterly Review",
    status: "completed",
    score: 4.2,
    completedDate: "Oct 15, 2025",
  },
  {
    id: 3,
    period: "Annual 2025",
    type: "Annual Review",
    status: "completed",
    score: 4.3,
    completedDate: "Dec 30, 2025",
  },
]

export function MyReviews() {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card
          key={review.id}
          className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{review.period}</h3>
                    <Badge variant="outline">{review.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{review.type}</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall Score</span>
                        <span className="text-lg font-semibold text-primary">{review.score}/5.0</span>
                      </div>
                      <Progress value={review.score * 20} className="h-2" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Completed {review.completedDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
