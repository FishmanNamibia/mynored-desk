import { colors } from "@/app/ui-standards"

// Consistent color system for the My Desk application
export const themeColors = {
  // Primary brand colors — references ui-standards
  primary: colors.navy,
  
  // KPI card icon colors
  blue: {
    bg: "bg-red-50",
    text: "text-red-700",
    hex: "#B91C1C"
  },
  orange: {
    bg: "bg-rose-50", 
    text: "text-rose-700",
    hex: "#BE123C"
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600", 
    hex: "#10B981"
  },
  purple: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    hex: "#BE185D"
  },
  teal: {
    bg: "bg-red-100",
    text: "text-red-800",
    hex: "#991B1B"
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    hex: "#EF4444"
  },
  amber: {
    bg: "bg-red-100",
    text: "text-red-700",
    hex: "#DC2626"
  },
  indigo: {
    bg: "bg-rose-100",
    text: "text-rose-700",
    hex: "#9F1239"
  },
  pink: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    hex: "#DB2777"
  },
  cyan: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    hex: "#E11D48"
  },
  
  // Status/Priority colors (consistent mapping)
  status: {
    high: "#DC2626",
    urgent: "#B91C1C",
    medium: "#E11D48",
    low: "#10B981",
    success: "#10B981",
    warning: "#E11D48",
    info: "#B91C1C",
  }
} as const;

// Helper function to get KPI color classes
export const getKpiColorClasses = (color: keyof typeof themeColors) => {
  if (color === 'primary') return { bg: 'bg-red-50', text: 'text-red-700' };
  return { bg: themeColors[color].bg, text: themeColors[color].text };
};

// Helper function to get status colors
export const getStatusColor = (status: 'high' | 'medium' | 'low' | 'urgent' | 'success' | 'warning' | 'info') => {
  return themeColors.status[status];
};
