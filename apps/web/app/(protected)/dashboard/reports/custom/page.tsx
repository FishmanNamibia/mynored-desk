"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Play } from "lucide-react";

export default function CustomReportsPage() {
  const customReports = [
    {
      id: 1,
      name: "Monthly Revenue by Department",
      owner: "Finance Team",
      createdDate: "Jan 10, 2026",
      frequency: "Monthly",
      lastRun: "Yesterday",
      status: "active",
    },
    {
      id: 2,
      name: "Employee Attendance Trends",
      owner: "HR Manager",
      createdDate: "Dec 28, 2025",
      frequency: "Weekly",
      lastRun: "Jan 13, 2026",
      status: "active",
    },
    {
      id: 3,
      name: "Support Ticket SLA Analysis",
      owner: "IT Manager",
      createdDate: "Nov 15, 2025",
      frequency: "Daily",
      lastRun: "Today",
      status: "active",
    },
    {
      id: 4,
      name: "Project Budget Variance",
      owner: "Project Manager",
      createdDate: "Jan 5, 2026",
      frequency: "Monthly",
      lastRun: "Scheduled",
      status: "inactive",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Custom Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Build, manage, and schedule custom reports tailored to your needs.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Custom Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customReports.map((report) => (
              <div
                key={report.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Owner: {report.owner} • Created: {report.createdDate} •
                    Frequency: {report.frequency}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last run: {report.lastRun}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={report.status === "active" ? "default" : "outline"}
                  >
                    {report.status}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
