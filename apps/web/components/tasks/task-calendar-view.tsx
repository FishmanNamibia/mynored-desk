"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, User } from "lucide-react"

export function TaskCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const tasks = [
    { date: 15, title: "Review Q4 Budget", project: "Census Data", assignedBy: "Sarah Chen", priority: "high" },
    { date: 16, title: "Security Training", project: "Staff Training", assignedBy: "HR Dept", priority: "medium" },
    {
      date: 18,
      title: "Presentation Slides",
      project: "Economic Report",
      assignedBy: "Director Smith",
      priority: "high",
    },
    { date: 20, title: "Update Documentation", project: "Portal Upgrade", assignedBy: "Mike Johnson", priority: "low" },
    { date: 22, title: "Team Meeting", project: "Census Data", assignedBy: "Sarah Chen", priority: "medium" },
  ]

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-25" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const dayTasks = tasks.filter((t) => t.date === day)
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()

              return (
                <div
                  key={day}
                  className={`min-h-25 border border-border rounded-lg p-2 ${
                    isToday ? "bg-primary/5 border-primary" : "bg-card"
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.map((task, idx) => (
                      <div
                        key={idx}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                        title={`${task.title}\nProject: ${task.project}\nAssigned by: ${task.assignedBy}`}
                      >
                        <div className="font-medium truncate">{task.title}</div>
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          <User className="w-3 h-3" />
                          <span className="truncate">{task.assignedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task Details Legend */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Calendar Legend</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 rounded"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 rounded"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded"></div>
              <span className="text-sm">Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
