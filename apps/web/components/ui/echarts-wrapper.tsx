"use client";

/**
 * ============================================================
 * ECharts Wrapper Components
 * ============================================================
 * 
 * Standardized React wrapper components for ECharts.
 * Provides consistent theming, responsive behavior, and loading states.
 */

import React, { useRef, useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption, ECharts } from "echarts";
import { echartsTheme, getResponsiveOption } from "@/lib/echarts-config";
import { GoldSpinner } from "@/components/ui/gold-spinner";

interface BaseChartProps {
  option: EChartsOption;
  height?: number | string;
  loading?: boolean;
  className?: string;
  onChartReady?: (chart: ECharts) => void;
  style?: React.CSSProperties;
}

/**
 * Base ECharts wrapper component with responsive behavior
 */
export function EChartsWrapper({
  option,
  height = 350,
  loading = false,
  className = "",
  onChartReady,
  style,
}: BaseChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width for responsive options
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);

    return () => observer.disconnect();
  }, []);

  // Apply responsive options based on container width
  const responsiveOption = containerWidth > 0 ? getResponsiveOption(option, containerWidth) : option;

  // Merge with theme
  const finalOption: EChartsOption = {
    ...echartsTheme,
    ...responsiveOption,
  };

  // Handle chart ready callback
  const handleChartReady = () => {
    if (chartRef.current && onChartReady) {
      const chartInstance = chartRef.current.getEchartsInstance();
      onChartReady(chartInstance);
    }
  };

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ height, ...style }}
      >
        <GoldSpinner size="md" message="Loading chart..." />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${className}`}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        maxWidth: '100%',
        overflow: 'hidden',
        ...style 
      }}
    >
      <ReactECharts
        ref={chartRef}
        option={finalOption}
        style={{ 
          height: '100%', 
          width: '100%',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        notMerge={true}
        lazyUpdate={true}
        onChartReady={handleChartReady}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
}

/**
 * Bar Chart Component
 */
interface BarChartProps {
  data: any[];
  xField: string;
  yFields: { key: string; name: string; color?: string }[];
  title?: string;
  subtitle?: string;
  height?: number | string;
  loading?: boolean;
  stack?: boolean;
  horizontal?: boolean;
  className?: string;
}

export function BarChart({
  data,
  xField,
  yFields,
  title,
  subtitle,
  height = 350,
  loading = false,
  stack = false,
  horizontal = false,
  className,
}: BarChartProps) {
  const { createBarChartOption } = require("@/lib/echarts-config");
  
  const option = createBarChartOption(data, {
    xField,
    yFields,
    title,
    subtitle,
    stack,
    horizontal,
  });

  return <EChartsWrapper option={option} height={height} loading={loading} className={className} />;
}

/**
 * Line Chart Component
 */
interface LineChartProps {
  data: any[];
  xField: string;
  yFields: { key: string; name: string; color?: string; smooth?: boolean }[];
  title?: string;
  subtitle?: string;
  height?: number | string;
  loading?: boolean;
  area?: boolean;
  className?: string;
}

export function LineChart({
  data,
  xField,
  yFields,
  title,
  subtitle,
  height = 350,
  loading = false,
  area = false,
  className,
}: LineChartProps) {
  const { createLineChartOption } = require("@/lib/echarts-config");
  
  const option = createLineChartOption(data, {
    xField,
    yFields,
    title,
    subtitle,
    area,
  });

  return <EChartsWrapper option={option} height={height} loading={loading} className={className} />;
}

/**
 * Pie Chart Component
 */
interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
  subtitle?: string;
  height?: number | string;
  loading?: boolean;
  radius?: string | [string, string];
  center?: [string, string];
  showLabel?: boolean;
  className?: string;
}

export function PieChart({
  data,
  title,
  subtitle,
  height = 300,
  loading = false,
  radius,
  center,
  showLabel = true,
  className,
}: PieChartProps) {
  const { createPieChartOption } = require("@/lib/echarts-config");
  
  const option = createPieChartOption(data, {
    title,
    subtitle,
    radius,
    center,
    showLabel,
  });

  return <EChartsWrapper option={option} height={height} loading={loading} className={className} />;
}

/**
 * Area Chart Component (Line chart with filled area)
 */
export function AreaChart(props: LineChartProps) {
  return <LineChart {...props} area={true} />;
}

/**
 * Radar Chart Component
 */
interface RadarChartProps {
  data: any[];
  indicators: { name: string; max: number }[];
  seriesName?: string;
  height?: number | string;
  loading?: boolean;
  className?: string;
  areaStyle?: boolean;
}

export function RadarChart({
  data,
  indicators,
  seriesName = "Score",
  height = 400,
  loading = false,
  className,
  areaStyle = true,
}: RadarChartProps) {
  const { echartsTheme, chartColors } = require("@/lib/echarts-config");

  const option: EChartsOption = {
    ...echartsTheme,
    radar: {
      indicator: indicators,
      shape: "polygon",
      splitNumber: 5,
      axisName: {
        color: chartColors.primary[0],
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"],
        },
      },
      axisLine: {
        lineStyle: {
          color: "#cbd5e1",
        },
      },
    },
    series: [
      {
        name: seriesName,
        type: "radar",
        data: data.map((item) => ({
          value: item.value,
          name: item.name || seriesName,
          areaStyle: areaStyle
            ? {
                opacity: 0.3,
                color: chartColors.primary[1],
              }
            : undefined,
          lineStyle: {
            width: 2,
            color: chartColors.primary[1],
          },
          itemStyle: {
            color: chartColors.primary[1],
          },
        })),
      },
    ],
    tooltip: {
      ...echartsTheme.tooltip,
      trigger: "item",
    },
  };

  return <EChartsWrapper option={option} height={height} loading={loading} className={className} />;
}
