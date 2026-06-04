/**
 * ============================================================
 * NORED Desk — UI Design Standards
 * ============================================================
 *
 * Single source of truth for all UI tokens: colors, gradients,
 * shadows, border-radius, typography, and component styles.
 *
 * USAGE:
 *   import { colors, gradients, shadows, radius, components } from "@/app/ui-standards";
 *
 * All components should reference these tokens instead of
 * hard-coding hex values or style strings.
 * ============================================================
 */

// ─── Brand Colors ───────────────────────────────────────────
export const colors = {
  /** Primary NORED red accent — buttons, highlights, active states */
  gold: "#ef4444",
  /** Pressed / hover brand red */
  goldHover: "#dc2626",
  /** Soft red accent background */
  goldSubtle: "rgba(239, 68, 68, 0.14)",

  /** Deep maroon — header and sidebar base */
  navy: "#4a0f19",
  /** Maroon mid-dark — gradient stop */
  navyMid: "#651424",
  /** Maroon mid — gradient stop */
  navyLight: "#7f1d2d",
  /** Bright brand red — gradient edge */
  navyLightest: "#b91c1c",

  /** Text on dark backgrounds */
  textWhite: "#ffffff",
  /** Muted text on dark backgrounds */
  textMuted: "#fecaca",
  /** Subtitle / secondary text on light backgrounds */
  textSecondary: "#64748b",
  /** Dark heading text on light backgrounds */
  textDark: "#4a0f19",

  /** Card / container background */
  cardBg: "#ffffff",
  /** Page background (from CSS variable) */
  pageBg: "hsl(var(--background))",

  /** Destructive / error red */
  error: "#dc2626",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",

  /** Success green */
  success: "#16a34a",

  /** Primary action red */
  info: "#b91c1c",

  /** Border colors */
  border: "hsl(var(--border))",
  borderSubtle: "rgba(255, 255, 255, 0.1)",
  borderLight: "rgba(255, 255, 255, 0.2)",
} as const;

// ─── Gradients ──────────────────────────────────────────────
export const gradients = {
  /** Primary dark NORED gradient — header, sidebar heading, auth pages */
  navyHeader:
    "linear-gradient(135deg, #2a080f 0%, #4a0f19 34%, #7f1d2d 68%, #b91c1c 100%)",

  /** Ombre maroon-to-red banner */
  navyToGold:
    "linear-gradient(135deg, #3a0b13 0%, #5d1120 30%, #7f1d2d 58%, #b91c1c 82%, #ef4444 100%)",

  /** Ambient blur overlay — login & auth pages */
  ambientOverlay:
    "radial-gradient(ellipse at 20% 40%, rgba(239,68,68,0.28) 0%, transparent 58%), radial-gradient(ellipse at 80% 22%, rgba(255,255,255,0.14) 0%, transparent 42%), radial-gradient(ellipse at 55% 86%, rgba(127,29,45,0.48) 0%, transparent 60%)",

  /** Red glow — ambient decorative effect */
  goldGlow: "radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 60%)",
  goldGlowSubtle:
    "radial-gradient(circle, rgba(248,113,113,0.26) 0%, transparent 70%)",
  goldGlowEllipse:
    "radial-gradient(ellipse, rgba(239,68,68,0.52) 0%, transparent 70%)",
} as const;

// ─── Shadows ────────────────────────────────────────────────
export const shadows = {
  /** Header shadow */
  header: "0 4px 20px rgba(42, 8, 15, 0.32)",
  /** Greeting banner shadow with gold glow */
  banner:
    "0 4px 24px rgba(58, 11, 19, 0.28), 0 0 60px rgba(239, 68, 68, 0.1)",
  /** Card shadow */
  card: "0 1px 3px rgba(0, 0, 0, 0.06)",
  /** Card hover shadow */
  cardHover: "0 3px 8px rgba(0, 0, 0, 0.12)",
  /** Elevated card */
  cardElevated: "0 4px 24px rgba(0, 0, 0, 0.1)",
  /** Active sidebar item */
  sidebarActive: "0 8px 18px rgba(185, 28, 28, 0.24)",
} as const;

// ─── Border Radius ──────────────────────────────────────────
export const radius = {
  /** Standard container radius — 4px (--radius CSS variable) */
  standard: "4px",
  /** Small radius */
  sm: "2px",
  /** Extra — for pills, search bars */
  pill: "24px",
  /** Full circle */
  full: "9999px",
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  /** Font family stack */
  fontFamily:
    "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",

  /** Page title — e.g. "NORED Desk" on login */
  pageTitle: "text-4xl font-bold tracking-tight",
  /** Section heading — e.g. greeting "Good Morning" */
  sectionTitle: "text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight",
  /** Card heading */
  cardTitle: "text-2xl font-bold",
  /** Subtitle / description */
  subtitle: "text-sm leading-relaxed",
  /** Small label — e.g. "NORED" */
  label: "text-sm uppercase tracking-[0.25em] font-semibold",
  /** Small label (compact) — used in sign-in card */
  labelCompact: "text-xs uppercase tracking-[0.2em] font-semibold",
} as const;

// ─── Component Styles ───────────────────────────────────────
// Pre-built style objects for common components.
// Import and spread into `style` or `className` props.

export const components = {
  /** Dashboard header bar */
  header: {
    background: gradients.navyHeader,
    boxShadow: shadows.header,
    fontFamily: typography.fontFamily,
  },

  /** Sidebar module heading */
  sidebarHeading: {
    backgroundColor: colors.navy,
    boxShadow: shadows.header,
  },

  /** Sidebar active nav item */
  sidebarActiveItem: {
    backgroundColor: colors.gold,
    color: colors.textWhite,
    fontWeight: 500,
    boxShadow: shadows.sidebarActive,
  },

  /** Greeting / welcome banner */
  greetingBanner: {
    background: gradients.navyToGold,
    boxShadow: shadows.banner,
  },

  /** Auth page background (login, loading, error) */
  authBackground: {
    background: gradients.navyHeader,
  },

  /** Auth ambient blur overlay */
  authAmbient: {
    background: gradients.ambientOverlay,
    filter: "blur(80px)",
  },

  /** Gold accent button (e.g. sign-in) */
  buttonGold: {
    backgroundColor: colors.gold,
    color: colors.textWhite,
  },

  /** Info / primary button */
  buttonPrimary: {
    backgroundColor: colors.info,
    color: colors.textWhite,
  },

  /** White card container */
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.standard,
  },

  /** Glass card on dark backgrounds */
  cardGlass: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(8px)",
    borderRadius: radius.standard,
    border: `1px solid ${colors.borderLight}`,
  },

  /** Error message box */
  errorBox: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderRadius: radius.standard,
  },

  /** Gold loading spinner */
  loadingSpinner: {
    borderColor: colors.gold,
    borderWidth: "4px",
  },

  /** User avatar */
  avatar: {
    backgroundColor: colors.gold,
    color: colors.textWhite,
  },
} as const;

// ─── Tailwind Class Presets ─────────────────────────────────
// Reusable className strings for common patterns.

// ─── Chart Design Standards ─────────────────────────────────
// Single source of truth for all chart styling, sizing, and layout.
// Import these in echarts-config.ts and chart components.

export const chartDesign = {
  /** Chart color palettes */
  colors: {
    /** Primary palette for multi-series charts */
    primary: [
      "#4a0f19",  // Maroon
      "#ef4444",  // NORED red
      "#f97316",  // Warm orange
      "#16a34a",  // Green
      "#2563eb",  // Blue
      "#8b5cf6",  // Purple
      "#ec4899",  // Pink
      "#14b8a6",  // Teal
    ],
    /** Status colors for agreement/task tracking */
    status: {
      complete: "#b91c1c",
      approved: "#16a34a",
      incomplete: "#f97316",
      pending: "#f97316",
      overdue: "#dc2626",
    },
    /** Semantic data colors for department/division charts */
    data: {
      totalStaff: "#ef4444",
      completed: "#22c55e",
      inProgress: "#eab308",
      notStarted: "#ef4444",
      completionRate: "#8b5cf6",
    },
    /** Extended palette for pie charts with many segments */
    extended: ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"],
    /** Gradient pairs [start, end] */
    gradients: {
      navy: ["#4a0f19", "#7f1d2d"],
      gold: ["#dc2626", "#ef4444"],
      blue: ["#b91c1c", "#ef4444"],
      green: ["#15803d", "#16a34a"],
    },
  },

  /** Standardized chart container heights */
  heights: {
    small: 250,
    medium: 350,
    large: 500,
    xlarge: 600,
  },

  /** Grid padding presets (top, right, bottom, left) */
  grid: {
    default: { top: 60, right: 40, bottom: 60, left: 60 },
    compact: { top: 40, right: 30, bottom: 40, left: 50 },
    withLegend: { top: 80, right: 40, bottom: 60, left: 60 },
    rotatedLabels: { top: 60, right: 40, bottom: 120, left: 60 },
  },

  /** Pie chart layout defaults */
  pie: {
    radius: ["25%", "55%"] as [string, string],
    center: ["50%", "50%"] as [string, string],
    label: {
      fontSize: 11,
      position: "outside" as const,
      alignTo: "edge" as const,
      edgeDistance: "10%",
    },
    labelLine: {
      length: 15,
      length2: 10,
      smooth: true,
    },
    legend: {
      orient: "horizontal" as const,
      position: "top" as const,
    },
  },

  /** Bar chart defaults */
  bar: {
    borderRadius: [4, 4, 0, 0] as number[],
    barMaxWidth: 40,
  },

  /** Line/Area chart defaults */
  line: {
    lineWidth: 2,
    smooth: true,
    areaOpacity: 0.3,
  },

  /** Typography for chart elements */
  text: {
    fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    titleSize: 16,
    labelSize: 11,
    legendSize: 12,
    tooltipSize: 12,
  },

  /** Tooltip styling */
  tooltip: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    padding: [8, 12] as [number, number],
    shadow: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 4px;",
  },

  /** Axis styling */
  axis: {
    lineColor: "#e5e7eb",
    splitLineColor: "#f3f4f6",
    splitLineType: "dashed" as const,
  },

  /** Container CSS for overflow prevention */
  containment: "width: 100%; max-width: 100%; overflow: hidden;",
} as const;

// ─── Tailwind Class Presets ─────────────────────────────────
// Reusable className strings for common patterns.

export const tw = {
  /** Standard card container */
  card: "bg-white rounded-md shadow-sm",
  /** Card with hover effect */
  cardHover: "bg-white rounded-md shadow-sm transition-all hover:shadow-md hover:-translate-y-px",
  /** Standard button */
  button: "rounded-md font-semibold transition-all shadow-md hover:shadow-lg",
  /** Large button (e.g. sign-in) */
  buttonLg: "w-full h-14 text-base font-semibold rounded-md shadow-md transition-all hover:shadow-lg hover:brightness-105",
  /** Feature card on dark background */
  featureCard: "rounded-md p-5 border",
  /** Glass container on dark background */
  glass: "bg-white/10 backdrop-blur-sm rounded-md border border-white/20",
  /** Page section spacing */
  section: "space-y-4 sm:space-y-5 lg:space-y-6",
  /** Page padding */
  pagePadding: "p-3 sm:p-4 lg:p-6",
} as const;
