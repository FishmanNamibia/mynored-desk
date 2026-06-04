"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function TaskReportsPage() {
  const taskStats = [
    { label: "Total Tasks", value: "1,247", icon: Clock },
    { label: "Completed", value: "1,089", icon: CheckCircle },
    { label: "Pending", value: "98", icon: Clock },
    { label: "Overdue", value: "45", icon: AlertCircle },
  ];

  const taskMetrics = [
    {
      metric: "Avg Completion Time",
      value: "3.2 days",
      previousMonth: "3.5 days",
      change: "↓ 8.6% improvement",
    },
    {
      metric: "On-Time Completion Rate",
      value: "87.4%",
      previousMonth: "84.2%",
      change: "↑ 3.2% improvement",
    },
    {
      metric: "SLA Compliance",
      value: "92.1%",
      previousMonth: "90.5%",
      change: "↑ 1.6% improvement",
    },
    {
      metric: "Avg Workload per Staff",
      value: "18.5 tasks",
      previousMonth: "19.2 tasks",
      change: "↓ balanced workload",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Task Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Task completion, SLA compliance, and workload distribution
            analytics.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {taskStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taskMetrics.map((item) => (
              <div
                key={item.metric}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{item.metric}</p>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {item.change}
                  </span>
                </div>
                <p className="text-2xl font-bold mb-1">{item.value}</p>
                <p className="text-sm text-muted-foreground">
                  Previous month: {item.previousMonth}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
