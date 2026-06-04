"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp } from "lucide-react";

export default function PerformanceReportsPage() {
  const performanceData = [
    {
      employee: "John Smith",
      role: "Systems Admin",
      rating: 4.5,
      goals: "9/10",
      attendance: "98%",
      trend: "up",
    },
    {
      employee: "Sarah Nkosi",
      role: "Project Manager",
      rating: 4.8,
      goals: "10/10",
      attendance: "100%",
      trend: "up",
    },
    {
      employee: "Mike Johnson",
      role: "Analyst",
      rating: 4.1,
      goals: "7/10",
      attendance: "95%",
      trend: "stable",
    },
    {
      employee: "Lisa Chen",
      role: "Developer",
      rating: 4.6,
      goals: "9/10",
      attendance: "97%",
      trend: "up",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Performance Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed performance analytics, ratings, and employee trends.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceData.map((emp) => (
              <div
                key={emp.employee}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{emp.employee}</p>
                  <p className="text-sm text-muted-foreground">{emp.role}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{emp.rating}/5.0</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{emp.goals}</p>
                    <p className="text-xs text-muted-foreground">Goals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{emp.attendance}</p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {emp.trend}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
