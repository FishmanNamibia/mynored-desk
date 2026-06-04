import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from "lucide-react"

const columns = [
  { id: "todo", title: "To Do", color: "text-muted-foreground" },
  { id: "in-progress", title: "In Progress", color: "text-chart-2" },
  { id: "review", title: "Review", color: "text-chart-3" },
  { id: "done", title: "Done", color: "text-chart-1" },
]

const tasks = [
  {
    id: 1,
    title: "Review Q4 Budget Report",
    description: "Analyze spending and prepare summary",
    priority: "high",
    assignee: "John Doe",
    dueDate: "Jan 16",
    column: "in-progress",
  },
  {
    id: 2,
    title: "Complete Security Training",
    description: "Annual security certification module",
    priority: "medium",
    assignee: "John Doe",
    dueDate: "Jan 17",
    column: "todo",
  },
  {
    id: 3,
    title: "Update Project Documentation",
    description: "Add new feature documentation",
    priority: "low",
    assignee: "John Doe",
    dueDate: "Jan 20",
    column: "todo",
  },
  {
    id: 4,
    title: "Prepare Presentation Slides",
    description: "Q1 strategy presentation",
    priority: "high",
    assignee: "John Doe",
    dueDate: "Jan 18",
    column: "review",
  },
  {
    id: 5,
    title: "Team Meeting Notes",
    description: "Document action items from standup",
    priority: "low",
    assignee: "John Doe",
    dueDate: "Jan 14",
    column: "done",
  },
  {
    id: 6,
    title: "Code Review",
    description: "Review authentication module PR",
    priority: "medium",
    assignee: "John Doe",
    dueDate: "Jan 15",
    column: "in-progress",
  },
]

export function TaskBoard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.column === column.id)

        return (
          <div key={column.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className={`font-semibold ${column.color}`}>{column.title}</h3>
              <span className="text-sm text-muted-foreground">{columnTasks.length}</span>
            </div>

            <div className="space-y-3 min-h-50">
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-card-foreground text-sm leading-tight">{task.title}</h4>
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "destructive"
                                : task.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs shrink-0"
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{task.dueDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Me</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
