import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const tasks = [
  {
    id: 1,
    title: "Review Q4 Budget Report",
    description: "Analyze spending and prepare summary",
    priority: "high",
    status: "in-progress",
    assignee: "John Doe",
    dueDate: "Jan 16",
    completed: false,
  },
  {
    id: 2,
    title: "Complete Security Training",
    description: "Annual security certification module",
    priority: "medium",
    status: "todo",
    assignee: "John Doe",
    dueDate: "Jan 17",
    completed: false,
  },
  {
    id: 3,
    title: "Update Project Documentation",
    description: "Add new feature documentation",
    priority: "low",
    status: "todo",
    assignee: "John Doe",
    dueDate: "Jan 20",
    completed: false,
  },
  {
    id: 4,
    title: "Prepare Presentation Slides",
    description: "Q1 strategy presentation",
    priority: "high",
    status: "review",
    assignee: "John Doe",
    dueDate: "Jan 18",
    completed: false,
  },
  {
    id: 5,
    title: "Team Meeting Notes",
    description: "Document action items from standup",
    priority: "low",
    status: "done",
    assignee: "John Doe",
    dueDate: "Jan 14",
    completed: true,
  },
]

const statusColors = {
  todo: "secondary",
  "in-progress": "default",
  review: "outline",
  done: "outline",
} as const

export function TaskListView() {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Checkbox checked={task.completed} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-card-foreground mb-1">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge variant={statusColors[task.status as keyof typeof statusColors]} className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{task.assignee}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Due {task.dueDate}</span>
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
