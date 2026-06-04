/**
 * ============================================================
 * ECharts Configuration & Theme
 * ============================================================
 * 
 * Standardized ECharts configuration matching NSA My Desk design system.
 * All design tokens are imported from ui-standards.ts (single source of truth).
 */

import { colors, chartDesign } from "@/app/ui-standards";
import type { EChartsOption } from "echarts";

/**
 * Standardized container sizing for charts
 * Re-exported from ui-standards.ts for backward compatibility
 */
export const chartContainerSizes = {
  heights: chartDesign.heights,
  grid: chartDesign.grid,
  containment: chartDesign.containment,
};

/**
 * Brand color palette for charts
 * Re-exported from ui-standards.ts for backward compatibility
 */
export const chartColors = {
  primary: [...chartDesign.colors.primary],
  status: { ...chartDesign.colors.status },
  data: { ...chartDesign.colors.data },
  extended: [...chartDesign.colors.extended],
  gradient: {
    navy: [...chartDesign.colors.gradients.navy],
    gold: [...chartDesign.colors.gradients.gold],
    blue: [...chartDesign.colors.gradients.blue],
    green: [...chartDesign.colors.gradients.green],
  },
};

/**
 * Default ECharts theme configuration
 */
export const echartsTheme: EChartsOption = {
  color: chartColors.primary,
  backgroundColor: "transparent",
  textStyle: {
    fontFamily: chartDesign.text.fontFamily,
    fontSize: chartDesign.text.legendSize,
    color: colors.textSecondary,
  },
  title: {
    textStyle: {
      color: colors.textDark,
      fontSize: chartDesign.text.titleSize,
      fontWeight: 600,
    },
    subtextStyle: {
      color: colors.textSecondary,
      fontSize: chartDesign.text.legendSize,
    },
  },
  legend: {
    textStyle: {
      color: colors.textSecondary,
      fontSize: chartDesign.text.legendSize,
    },
    icon: "roundRect",
    itemWidth: 14,
    itemHeight: 14,
    itemGap: 16,
  },
  tooltip: {
    backgroundColor: chartDesign.tooltip.backgroundColor,
    borderColor: chartDesign.tooltip.borderColor,
    borderWidth: chartDesign.tooltip.borderWidth,
    textStyle: {
      color: colors.textDark,
      fontSize: chartDesign.text.tooltipSize,
    },
    padding: [...chartDesign.tooltip.padding],
    extraCssText: chartDesign.tooltip.shadow,
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    top: "10%",
    containLabel: true,
  },
  xAxis: {
    axisLine: {
      lineStyle: { color: chartDesign.axis.lineColor },
    },
    axisTick: {
      lineStyle: { color: chartDesign.axis.lineColor },
    },
    axisLabel: {
      color: colors.textSecondary,
      fontSize: chartDesign.text.labelSize,
    },
    splitLine: { show: false },
  },
  yAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: colors.textSecondary,
      fontSize: chartDesign.text.labelSize,
    },
    splitLine: {
      lineStyle: {
        color: chartDesign.axis.splitLineColor,
        type: chartDesign.axis.splitLineType,
      },
    },
  },
};

/**
 * Common chart options factory functions
 */
export const createBarChartOption = (
  data: any[],
  config: {
    xField: string;
    yFields: { key: string; name: string; color?: string }[];
    title?: string;
    subtitle?: string;
    stack?: boolean;
    horizontal?: boolean;
  }
): EChartsOption => {
  const { xField, yFields, title, subtitle, stack, horizontal } = config;

  const series = yFields.map((field, index) => ({
    name: field.name,
    type: "bar" as const,
    data: data.map((item) => item[field.key]),
    itemStyle: {
      color: field.color || chartColors.primary[index % chartColors.primary.length],
      borderRadius: [4, 4, 0, 0],
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: "rgba(0, 0, 0, 0.3)",
      },
    },
    stack: stack ? "total" : undefined,
  }));

  return {
    ...echartsTheme,
    title: title ? { text: title, subtext: subtitle } : undefined,
    tooltip: {
      ...echartsTheme.tooltip,
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      ...echartsTheme.legend,
      data: yFields.map((f) => f.name),
      top: title ? 40 : 10,
    },
    grid: {
      ...chartContainerSizes.grid.default,
      top: title ? 80 : 60,
      containLabel: true, // Ensures labels don't overflow
    },
    xAxis: horizontal
      ? {
          type: "value" as const,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: colors.textSecondary,
            fontSize: 11,
          },
          splitLine: {
            lineStyle: {
              color: "#f3f4f6",
              type: "dashed" as const,
            },
          },
        }
      : {
          type: "category" as const,
          data: data.map((item) => item[xField]),
          axisLine: {
            lineStyle: {
              color: "#e5e7eb",
            },
          },
          axisTick: {
            lineStyle: {
              color: "#e5e7eb",
            },
          },
          axisLabel: {
            color: colors.textSecondary,
            fontSize: 11,
          },
          splitLine: {
            show: false,
          },
        },
    yAxis: horizontal
      ? {
          type: "category" as const,
          data: data.map((item) => item[xField]),
          axisLine: {
            lineStyle: {
              color: "#e5e7eb",
            },
          },
          axisTick: {
            lineStyle: {
              color: "#e5e7eb",
            },
          },
          axisLabel: {
            color: colors.textSecondary,
            fontSize: 11,
          },
          splitLine: {
            show: false,
          },
        }
      : {
          type: "value" as const,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: colors.textSecondary,
            fontSize: 11,
          },
          splitLine: {
            lineStyle: {
              color: "#f3f4f6",
              type: "dashed" as const,
            },
          },
        },
    series,
  };
};

export const createLineChartOption = (
  data: any[],
  config: {
    xField: string;
    yFields: { key: string; name: string; color?: string; smooth?: boolean }[];
    title?: string;
    subtitle?: string;
    area?: boolean;
  }
): EChartsOption => {
  const { xField, yFields, title, subtitle, area } = config;

  const series = yFields.map((field, index) => ({
    name: field.name,
    type: "line" as const,
    data: data.map((item) => item[field.key]),
    smooth: field.smooth !== false,
    lineStyle: {
      width: 2,
      color: field.color || chartColors.primary[index % chartColors.primary.length],
    },
    itemStyle: {
      color: field.color || chartColors.primary[index % chartColors.primary.length],
    },
    areaStyle: area
      ? {
          opacity: 0.3,
          color: field.color || chartColors.primary[index % chartColors.primary.length],
        }
      : undefined,
    emphasis: {
      focus: "series" as const,
    },
  }));

  return {
    ...echartsTheme,
    title: title ? { text: title, subtext: subtitle } : undefined,
    tooltip: {
      ...echartsTheme.tooltip,
      trigger: "axis",
    },
    legend: {
      ...echartsTheme.legend,
      data: yFields.map((f) => f.name),
      top: title ? 40 : 10,
    },
    grid: {
      ...chartContainerSizes.grid.default,
      top: title ? 80 : 60,
      containLabel: true, // Ensures labels don't overflow
    },
    xAxis: {
      type: "category" as const,
      data: data.map((item) => item[xField]),
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisTick: {
        lineStyle: {
          color: "#e5e7eb",
        },
      },
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: "value" as const,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: "#f3f4f6",
          type: "dashed" as const,
        },
      },
    },
    series,
  };
};

export const createPieChartOption = (
  data: { name: string; value: number; color?: string }[],
  config: {
    title?: string;
    subtitle?: string;
    radius?: string | [string, string];
    center?: [string, string];
    showLabel?: boolean;
  }
): EChartsOption => {
  const {
    title,
    subtitle,
    radius = [...chartDesign.pie.radius],
    center,
    showLabel = true,
  } = config;

  return {
    ...echartsTheme,
    title: title ? { text: title, subtext: subtitle } : undefined,
    tooltip: {
      ...echartsTheme.tooltip,
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    legend: {
      ...echartsTheme.legend,
      orient: chartDesign.pie.legend.orient,
      left: "center",
      top: 0,
    },
    series: [
      {
        name: title || "Data",
        type: "pie",
        radius,
        center: center || [...chartDesign.pie.center],
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color || chartColors.primary[index % chartColors.primary.length],
          },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.3)",
          },
        },
        label: {
          show: showLabel,
          formatter: '{b}: {d}%',
          fontSize: chartDesign.pie.label.fontSize,
          color: colors.textSecondary,
          position: chartDesign.pie.label.position,
          alignTo: chartDesign.pie.label.alignTo,
          edgeDistance: chartDesign.pie.label.edgeDistance,
        },
        labelLine: {
          show: showLabel,
          length: chartDesign.pie.labelLine.length,
          length2: chartDesign.pie.labelLine.length2,
          smooth: chartDesign.pie.labelLine.smooth,
          lineStyle: {
            width: 1,
          },
        },
        labelLayout: {
          hideOverlap: false,
          moveOverlap: 'shiftY',
        },
      },
    ],
  };
};

/**
 * Responsive chart options
 */
export const getResponsiveOption = (baseOption: EChartsOption, width: number): EChartsOption => {
  if (width < 640) {
    // Mobile
    return {
      ...baseOption,
      grid: {
        ...baseOption.grid,
        left: "5%",
        right: "5%",
        bottom: "5%",
      },
      legend: {
        ...baseOption.legend,
        orient: "horizontal",
        bottom: 0,
        left: "center",
      },
    };
  }
  return baseOption;
};
