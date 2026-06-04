"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Users, Target, ListTodo } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"

export function TaskDashboard() {
  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          Task Management
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 leading-tight">
          Track and manage your tasks and team progress.
        </p>
      </div>

      {/* Stats Grid - Using KpiCard */}
      <KpiGrid columns={4}>
        <KpiCard
          icon={ListTodo}
          label="Total Tasks"
          value="48"
          trend="+12% from last month"
          color="blue"
          size="lg"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value="32"
          trend="67% completion rate"
          color="green"
          size="lg"
        />
        <KpiCard
          icon={Clock}
          label="In Progress"
          value="12"
          trend="Active tasks"
          color="purple"
          size="lg"
        />
        <KpiCard
          icon={AlertCircle}
          label="Overdue"
          value="4"
          trend="Needs attention"
          color="red"
          size="lg"
        />
      </KpiGrid>

      {/* Progress by Project */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="widget-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Tasks by Project
            </CardTitle>
            <CardDescription>Progress across your active projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Census Data Collection</span>
                <span className="text-sm text-muted-foreground">15/20 tasks</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Q4 Economic Report</span>
                <span className="text-sm text-muted-foreground">8/12 tasks</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Statistical Portal Upgrade</span>
                <span className="text-sm text-muted-foreground">5/10 tasks</span>
              </div>
              <Progress value={50} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Staff Training Program</span>
                <span className="text-sm text-muted-foreground">4/6 tasks</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="widget-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Performance
            </CardTitle>
            <CardDescription>Tasks completed by team members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">SC</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Sarah Chen</p>
                  <p className="text-xs text-muted-foreground">15 tasks completed</p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">MJ</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Mike Johnson</p>
                  <p className="text-xs text-muted-foreground">12 tasks completed</p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">AT</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Alex Turner</p>
                  <p className="text-xs text-muted-foreground">10 tasks completed</p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Due Dates */}
      <Card className="widget-card">
        <CardHeader>
          <CardTitle>Upcoming Due Dates</CardTitle>
          <CardDescription>Tasks due in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { task: "Review Q4 Budget Report", project: "Census Data Collection", due: "Today", priority: "high" },
              { task: "Complete Security Training", project: "Staff Training", due: "Tomorrow", priority: "medium" },
              { task: "Update Project Documentation", project: "Statistical Portal", due: "Jan 20", priority: "low" },
              { task: "Prepare Presentation Slides", project: "Q4 Economic Report", due: "Jan 18", priority: "high" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.task}</p>
                  <p className="text-xs text-muted-foreground">{item.project}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      item.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : item.priority === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{item.due}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
