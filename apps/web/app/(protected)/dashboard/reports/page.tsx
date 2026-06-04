"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Download,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import { colors } from "@/app/ui-standards";

export default function ReportsDashboardPage() {
  const keyMetrics = [
    {
      label: "Reports Generated",
      value: "1,247",
      change: "+12% this month",
      icon: BarChart3,
    },
    {
      label: "Scheduled Reports",
      value: "34",
      change: "4 due this week",
      icon: LineChart,
    },
    {
      label: "Data Sources",
      value: "18",
      change: "All operational",
      icon: PieChart,
    },
    {
      label: "Avg Gen Time",
      value: "2.3s",
      change: "Up from 1.8s",
      icon: TrendingUp,
    },
  ];

  const popularReports = [
    {
      id: 1,
      name: "Monthly Performance Review",
      category: "HR",
      frequency: "Monthly",
      lastRun: "Jan 15, 2026",
    },
    {
      id: 2,
      name: "Financial Summary Dashboard",
      category: "Finance",
      frequency: "Daily",
      lastRun: "Today",
    },
    {
      id: 3,
      name: "Employee Engagement Survey",
      category: "HR",
      frequency: "Quarterly",
      lastRun: "Jan 1, 2026",
    },
    {
      id: 4,
      name: "IT System Health Report",
      category: "IT",
      frequency: "Weekly",
      lastRun: "Jan 14, 2026",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            High-level analytics, key performance indicators, and report management.
          </p>
        </div>
        <Button style={{ background: colors.gold, color: 'white' }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {keyMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{metric.label}</span>
                  <Icon className="w-4 h-4" style={{ color: colors.gold }} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{metric.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports Management */}
      <Card>
        <CardHeader>
          <CardTitle>Report Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="popular" className="w-full">
            <TabsList className="h-10">
              <TabsTrigger value="popular">Popular Reports</TabsTrigger>
              <TabsTrigger value="custom">Custom Reports</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="pt-4">
              <div className="space-y-3">
                {popularReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.category} • {report.frequency} • Last run:{" "}
                        {report.lastRun}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Your custom-built reports will appear here.
              </p>
            </TabsContent>

            <TabsContent value="scheduled" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Scheduled reports and automated delivery settings.
              </p>
            </TabsContent>

            <TabsContent value="templates" className="pt-4">
              <p className="text-sm text-muted-foreground py-4">
                Pre-built report templates for quick creation.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Report Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg border border-border">
              <p className="font-medium mb-2">Most Used Reports</p>
              <p className="text-sm text-muted-foreground">
                Financial Summary Dashboard (412 views) and Performance Review
                (287 views)
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="font-medium mb-2">Peak Usage Time</p>
              <p className="text-sm text-muted-foreground">
                Monday mornings (9-11 AM) - Plan heavy report runs elsewhere
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
