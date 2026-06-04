import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"

const activities = [
  {
    id: 1,
    action: "Memo approved",
    description: "Security clearance renewal",
    time: "2 hours ago",
  },
  {
    id: 2,
    action: "Task completed",
    description: "Monthly report submission",
    time: "5 hours ago",
  },
  {
    id: 3,
    action: "Review submitted",
    description: "Q4 Performance review",
    time: "1 day ago",
  },
  {
    id: 4,
    action: "Request created",
    description: "Conference room booking",
    time: "2 days ago",
  },
]

export function ActivityWidget() {
  return (
    <Card className="widget-card">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {index < activities.length - 1 && <div className="w-px h-full bg-border mt-2" />}
              </div>
              <div className="flex-1 pb-4">
                <h4 className="font-medium text-card-foreground text-sm">{activity.action}</h4>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
