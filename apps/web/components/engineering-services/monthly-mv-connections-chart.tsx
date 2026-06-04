"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import type { MovementChartPoint } from "@/lib/engineering-services/new-connection-reporting";

const chartSeries = [
  { key: "received", label: "Received", color: "#2563eb", yAxisIndex: 0 },
  { key: "energised", label: "Energised", color: "#16a34a", yAxisIndex: 0 },
  {
    key: "pendingEnergising",
    label: "Pending energising",
    color: "#dc2626",
    yAxisIndex: 0,
  },
  { key: "pending", label: "Pending", color: "#111827", yAxisIndex: 1 },
  {
    key: "backlog",
    label: "Backlog >6 months",
    color: "#7c3aed",
    yAxisIndex: 1,
  },
] as const;

export function MonthlyMvConnectionsChart({
  data,
}: {
  data: MovementChartPoint[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-6 text-sm text-muted-foreground">
        No live movement data is currently available for the selected reporting period.
      </div>
    );
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    animationDuration: 700,
    animationEasing: "cubicOut",
    color: chartSeries.map((series) => series.color),
    legend: {
      top: 0,
      left: "center",
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        color: "#475569",
        fontSize: 12,
      },
    },
    grid: {
      top: 56,
      left: 24,
      right: 24,
      bottom: 56,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.94)",
      borderWidth: 0,
      textStyle: {
        color: "#f8fafc",
      },
      axisPointer: {
        type: "cross",
        label: {
          backgroundColor: "#991b1b",
        },
      },
    },
    toolbox: {
      right: 0,
      top: 0,
      feature: {
        saveAsImage: {
          title: "Save chart",
          pixelRatio: 2,
        },
        dataZoom: {
          title: {
            zoom: "Zoom",
            back: "Reset zoom",
          },
        },
        restore: {
          title: "Reset",
        },
      },
      iconStyle: {
        borderColor: "#b91c1c",
      },
      emphasis: {
        iconStyle: {
          borderColor: "#991b1b",
        },
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((point) => point.month),
      axisLine: {
        lineStyle: {
          color: "#e2e8f0",
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#64748b",
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Monthly movement",
        minInterval: 1,
        axisLine: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
            type: "dashed",
          },
        },
        axisLabel: {
          color: "#64748b",
        },
        nameTextStyle: {
          color: "#64748b",
          padding: [0, 0, 0, 8],
        },
      },
      {
        type: "value",
        name: "Open pipeline",
        minInterval: 1,
        axisLine: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          color: "#64748b",
        },
        nameTextStyle: {
          color: "#64748b",
          padding: [0, 8, 0, 0],
        },
      },
    ],
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
      },
      {
        type: "slider",
        height: 18,
        bottom: 10,
        borderColor: "#fecaca",
        backgroundColor: "#fff1f2",
        fillerColor: "rgba(220, 38, 38, 0.16)",
        handleStyle: {
          color: "#dc2626",
        },
        moveHandleStyle: {
          color: "#b91c1c",
        },
      },
    ],
    series: chartSeries.map((series) => ({
      name: series.label,
      type: "line",
      smooth: true,
      showSymbol: true,
      symbol: "circle",
      symbolSize: 9,
      yAxisIndex: series.yAxisIndex,
      data: data.map((point) => point[series.key]),
      lineStyle: {
        width: 3,
        color: series.color,
      },
      itemStyle: {
        color: series.color,
        borderColor: "#ffffff",
        borderWidth: 2,
      },
      emphasis: {
        focus: "series",
      },
      areaStyle:
        series.key === "energised"
          ? {
              color: "rgba(22, 163, 74, 0.08)",
            }
          : undefined,
    })),
  };

  return (
    <div className="rounded-2xl border border-red-100 bg-white p-4">
      <ReactECharts
        option={option}
        notMerge
        lazyUpdate
        style={{ height: 380, width: "100%" }}
      />
    </div>
  );
}
