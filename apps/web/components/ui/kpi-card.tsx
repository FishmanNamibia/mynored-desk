"use client";

import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckSquare,
  Clock,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  Users,
  Mail,
  Briefcase,
  DollarSign,
  Target,
  Activity,
  Bell,
  Star,
  type LucideIcon,
} from "lucide-react";

// KPI color variants
export type KpiColor = "blue" | "orange" | "green" | "purple" | "teal" | "red" | "amber" | "indigo" | "pink" | "cyan";

// Default KPI types with their icons and colors
export const KPI_DEFAULTS = {
  // Performance Management KPIs
  totalActions: { icon: Target, color: "blue" as KpiColor, label: "My Total Actions" },
  notStarted: { icon: Clock, color: "amber" as KpiColor, label: "My Actions Not Started" },
  inProgress: { icon: Activity, color: "orange" as KpiColor, label: "My Actions In Progress" },
  completed: { icon: CheckSquare, color: "green" as KpiColor, label: "My Actions Completed" },
  overdue: { icon: AlertCircle, color: "red" as KpiColor, label: "My Actions Overdue" },
  completionRate: { icon: TrendingUp, color: "teal" as KpiColor, label: "Actions Completion" },
  
  // Legacy KPIs (keeping for compatibility)
  tasks: { icon: CheckSquare, color: "blue" as KpiColor, label: "My Tasks" },
  approvals: { icon: Clock, color: "orange" as KpiColor, label: "Pending Approvals" },
  memos: { icon: FileText, color: "green" as KpiColor, label: "Active Memos" },
  meetings: { icon: Calendar, color: "purple" as KpiColor, label: "Meetings Today" },
  reviews: { icon: TrendingUp, color: "teal" as KpiColor, label: "Reviews Due" },
  requests: { icon: AlertCircle, color: "red" as KpiColor, label: "Open Requests" },
  users: { icon: Users, color: "indigo" as KpiColor, label: "Active Users" },
  messages: { icon: Mail, color: "amber" as KpiColor, label: "Messages" },
  projects: { icon: Briefcase, color: "cyan" as KpiColor, label: "Projects" },
  budget: { icon: DollarSign, color: "green" as KpiColor, label: "Budget" },
  goals: { icon: Target, color: "purple" as KpiColor, label: "Goals" },
  activity: { icon: Activity, color: "blue" as KpiColor, label: "Activity" },
  notifications: { icon: Bell, color: "orange" as KpiColor, label: "Notifications" },
  ratings: { icon: Star, color: "amber" as KpiColor, label: "Ratings" },
} as const;

export type KpiType = keyof typeof KPI_DEFAULTS;

// Color class mappings
const colorClasses: Record<KpiColor, string> = {
  blue: "bg-red-50 text-red-700",
  orange: "bg-rose-50 text-rose-700",
  green: "bg-green-50 text-green-600",
  purple: "bg-pink-50 text-pink-700",
  teal: "bg-red-100 text-red-800",
  red: "bg-red-50 text-red-600",
  amber: "bg-red-100 text-red-700",
  indigo: "bg-rose-100 text-rose-700",
  pink: "bg-pink-50 text-pink-700",
  cyan: "bg-rose-50 text-rose-600",
};

// Size variants
export type KpiSize = "sm" | "md" | "lg";

const sizeClasses = {
  sm: {
    iconWrapper: "p-1.5 rounded-md",
    icon: "w-4 h-4",
    value: "text-base sm:text-lg",
    label: "text-[9px] sm:text-[10px]",
    trend: "text-[8px] sm:text-[9px]",
    gap: "gap-1 sm:gap-1.5",
    padding: "p-3",
  },
  md: {
    iconWrapper: "p-2 rounded-md",
    icon: "w-5 h-5 sm:w-6 sm:h-6",
    value: "text-lg sm:text-xl lg:text-2xl",
    label: "text-[10px] sm:text-xs",
    trend: "text-[9px] sm:text-[10px]",
    gap: "gap-2 sm:gap-2.5",
    padding: "p-4",
  },
  lg: {
    iconWrapper: "p-2.5 rounded-lg",
    icon: "w-6 h-6 sm:w-7 sm:h-7",
    value: "text-xl sm:text-2xl lg:text-3xl",
    label: "text-xs sm:text-sm",
    trend: "text-[10px] sm:text-xs",
    gap: "gap-3 sm:gap-4",
    padding: "p-5",
  },
};

interface KpiCardProps {
  // Use a preset type
  type?: KpiType;
  // Or provide custom props
  icon?: LucideIcon;
  label?: string;
  value: string | number;
  trend?: string;
  color?: KpiColor;
  size?: KpiSize;
  onClick?: () => void;
  href?: string;
  className?: string;
  enableModal?: boolean; // New prop to enable modal on click
}

export function KpiCard({
  type,
  icon: customIcon,
  label: customLabel,
  value,
  trend,
  color: customColor,
  size = "md",
  onClick,
  href,
  className = "",
  enableModal = false,
}: KpiCardProps) {
  // Get defaults from type if provided
  const defaults = type ? KPI_DEFAULTS[type] : null;
  
  const Icon = customIcon || defaults?.icon || CheckSquare;
  const label = customLabel || defaults?.label || "KPI";
  const color = customColor || defaults?.color || "blue";
  
  const sizeStyle = sizeClasses[size];
  const colorClass = colorClasses[color];

  const content = (
    <Card className={`kpi-card ${enableModal || onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''} ${className}`}>
      <CardContent className={`${sizeStyle.padding}`}>
        <div className={`flex flex-col items-center justify-center text-center ${sizeStyle.gap}`}>
          <div className={`${sizeStyle.iconWrapper} ${colorClass}`}>
            <Icon className={sizeStyle.icon} />
          </div>
          <div className="flex flex-col items-center">
            <p className={`font-bold leading-none ${sizeStyle.value}`}>
              {value}
            </p>
            <p className={`font-medium text-gray-500 leading-tight mt-1 ${sizeStyle.label}`}>
              {label}
            </p>
            {trend && (
              <p className={`opacity-60 leading-tight mt-0.5 ${sizeStyle.trend}`}>
                {trend}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // If enableModal is true, use onClick instead of href
  if (enableModal && onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  if (href && !enableModal) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// Export a grid wrapper for consistent KPI layouts
interface KpiGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function KpiGrid({ children, columns = 6, className = "" }: KpiGridProps) {
  const colClasses = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={`grid ${colClasses[columns]} gap-2 sm:gap-3 ${className}`}>
      {children}
    </div>
  );
}
