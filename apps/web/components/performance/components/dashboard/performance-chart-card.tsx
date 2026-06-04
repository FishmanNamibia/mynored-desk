"use client";

import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart as BarChartIcon,
  FileDown,
} from "lucide-react";
import {
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
} from "@/components/ui/echarts-wrapper";
import { chartColors, chartContainerSizes } from "@/lib/echarts-config";

interface PerformanceChartCardProps {
  canExport?: boolean;
  stats: {
    totalStaff?: number;
    submittedAgreements?: number;
    approvedAgreements?: number;
    averageCompletion?: number;
    departmentStats?: Array<{
      name: string;
      submitted: number;
      total: number;
      percentage: number;
      approved: number;
      pending: number;
      notStarted: number;
      overdue: number;
    }>;
    divisionStats?: Array<{
      name: string;
      department: string;
      submitted: number;
      total: number;
      percentage: number;
      approved: number;
      pending: number;
      notStarted: number;
      overdue: number;
    }>;
    organizationStats?: Array<{
      name: string;
      submitted: number;
      total: number;
      percentage: number;
      approved: number;
      pending: number;
      notStarted: number;
      overdue: number;
    }>;
  } | null;
  submissionRate: number;
  approvalRate: number;
  metricLevel: "division" | "department" | "organization";
}

type ChartType = "bar" | "pie" | "line" | "area";

export function PerformanceChartCard({
  stats,
  submissionRate,
  approvalRate,
  metricLevel,
  canExport = false,
}: PerformanceChartCardProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch(
        "/dashboard/performance/api/dashboard/export-chart-data",
      );

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: error.error || "Failed to export dashboard PDF",
          variant: "destructive",
        });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting dashboard PDF:", error);
      toast({
        title: "Failed to export dashboard PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Get level-specific label
  const getLevelLabel = () => {
    switch (metricLevel) {
      case "division":
        return "Division";
      case "department":
        return "Department";
      case "organization":
        return "Organization";
      default:
        return "Organization";
    }
  };

  // Abbreviate department/division names by taking first letter of each word
  const abbreviateName = (name: string): string => {
    // Split by spaces and common separators
    const words = name.split(/\s+|\band\b/i).filter((word) => {
      // Filter out common small words
      const lowerWord = word.toLowerCase();
      return (
        lowerWord !== "of" &&
        lowerWord !== "the" &&
        lowerWord !== "and" &&
        lowerWord !== "&" &&
        word.length > 0
      );
    });

    // Take first letter of each word, but use full word for short all-caps acronyms (e.g. IT, HR, HC)
    const abbreviation = words
      .map((word) =>
        word.length <= 4 && word === word.toUpperCase()
          ? word.toUpperCase()
          : word.charAt(0).toUpperCase(),
      )
      .join("");

    // Return abbreviation if it's reasonable length (2-6 characters)
    if (abbreviation.length >= 2 && abbreviation.length <= 6) {
      return abbreviation;
    }

    // If abbreviation is too long, take first 4 letters
    if (abbreviation.length > 6) {
      return abbreviation.substring(0, 4);
    }

    // If too short or empty, return original name truncated
    if (name.length > 15) {
      return name.substring(0, 12) + "...";
    }

    return name;
  };

  // Get data based on selected metric level
  const getChartData = () => {
    switch (metricLevel) {
      case "division":
        return (
          stats?.divisionStats?.slice(0, 10).map((div) => ({
            name: abbreviateName(div.name),
            fullName: div.name,
            approved: div.approved,
            pending: div.pending,
            notStarted: div.notStarted,
            overdue: div.overdue,
            total: div.total,
          })) || []
        );
      case "department":
        return (
          stats?.departmentStats?.slice(0, 10).map((dept) => ({
            name: abbreviateName(dept.name),
            fullName: dept.name,
            approved: dept.approved,
            pending: dept.pending,
            notStarted: dept.notStarted,
            overdue: dept.overdue,
            total: dept.total,
          })) || []
        );
      case "organization":
        return (
          stats?.organizationStats?.map((org) => ({
            name: org.name,
            fullName: org.name,
            approved: org.approved,
            pending: org.pending,
            notStarted: org.notStarted,
            overdue: org.overdue,
            total: org.total,
          })) || []
        );
      default:
        return [];
    }
  };

  const chartData = getChartData();

  // Generate ticks for y-axis - cleaner intervals to avoid clutter
  const getYAxisTicks = () => {
    if (chartData.length === 0) return [0, 2, 4, 6, 8, 10];

    // Find the maximum value across all data points
    let maxValue = 10; // Start with minimum of 10
    chartData.forEach((d) => {
      const total = (d.approved || 0) + (d.pending || 0) + (d.overdue || 0);
      if (total > maxValue) maxValue = total;
    });

    // Determine appropriate interval based on max value
    let interval = 1;
    if (maxValue > 20) interval = 5;
    else if (maxValue > 10) interval = 2;
    else interval = 2; // For 0-10, show 0, 2, 4, 6, 8, 10

    // Generate ticks at intervals
    const ticks = [];
    for (let i = 0; i <= maxValue; i += interval) {
      ticks.push(i);
    }
    // Always include the max value if not already included
    if (ticks[ticks.length - 1] !== maxValue) {
      ticks.push(maxValue);
    }
    return ticks;
  };

  // Prepare data for simple bar chart
  const barData = [
    {
      name: "Total Staff",
      value: stats?.totalStaff || 0,
      color: "#3B82F6",
    },
    {
      name: "Submitted",
      value: stats?.submittedAgreements || 0,
      color: "#10B981",
    },
    {
      name: "Approved",
      value: stats?.approvedAgreements || 0,
      color: "#8B5CF6",
    },
  ];

  // Prepare line/area chart data using Complete/Incomplete/Overdue
  const statusData = [
    {
      name: "Complete",
      value: chartData.reduce((sum, d) => sum + (d.approved || 0), 0),
      color: "#1E40AF",
    },
    {
      name: "Incomplete",
      value: chartData.reduce((sum, d) => sum + (d.pending || 0), 0),
      color: "#F97316",
    },
    {
      name: "Overdue",
      value: chartData.reduce((sum, d) => sum + (d.overdue || 0), 0),
      color: "#16A34A",
    },
  ];

  // Prepare pie chart data using the same Complete/Incomplete/Overdue structure
  const pieData = [
    {
      name: "Complete",
      value: chartData.reduce((sum, d) => sum + (d.approved || 0), 0),
      color: "#1E40AF",
    },
    {
      name: "Incomplete",
      value: chartData.reduce((sum, d) => sum + (d.pending || 0), 0),
      color: "#F97316",
    },
    {
      name: "Overdue",
      value: chartData.reduce((sum, d) => sum + (d.overdue || 0), 0),
      color: "#16A34A",
    },
  ];

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart
            data={chartData}
            xField="name"
            yFields={[
              {
                key: "approved",
                name: "Complete",
                color: chartColors.status.complete,
              },
              {
                key: "pending",
                name: "Incomplete",
                color: chartColors.status.incomplete,
              },
              {
                key: "overdue",
                name: "Overdue",
                color: chartColors.status.overdue,
              },
            ]}
            height={chartContainerSizes.heights.small}
          />
        );

      case "pie":
        return (
          <PieChart data={pieData} height={chartContainerSizes.heights.small} />
        );

      case "line":
        return (
          <LineChart
            data={statusData}
            xField="name"
            yFields={[
              {
                key: "value",
                name: "Count",
                color: chartColors.primary[2],
                smooth: true,
              },
            ]}
            height={chartContainerSizes.heights.small}
          />
        );

      case "area":
        return (
          <AreaChart
            data={statusData}
            xField="name"
            yFields={[
              {
                key: "value",
                name: "Count",
                color: chartColors.primary[2],
                smooth: true,
              },
            ]}
            height={chartContainerSizes.heights.small}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Performance Agreement Trends ({getLevelLabel()})
          </CardTitle>
          <div className="flex gap-2">
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="h-8 px-3"
              >
                <FileDown className="w-4 h-4 mr-1" />
                {exporting ? "Exporting..." : "Export"}
              </Button>
            )}
            <div className="flex gap-1">
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="h-8 w-8 p-0"
              >
                <BarChartIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("pie")}
                className="h-8 w-8 p-0"
              >
                <PieChartIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
                className="h-8 w-8 p-0"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("area")}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">{renderChart()}</div>
      </CardContent>
    </Card>
  );
}
