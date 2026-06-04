'use client'

/**
 * PMS Theme Provider
 * 
 * Wraps PMS content and injects NSA UI standards as CSS variables.
 * This allows PMS components to gradually adopt the design system
 * without requiring immediate code changes.
 */


import { colors, radius } from '@/app/ui-standards'

interface PMSThemeProviderProps {
  children: React.ReactNode
}

export function PMSThemeProvider({ children }: PMSThemeProviderProps) {
  return (
    <div
      style={{
        // Color tokens
        '--pms-gold': colors.gold,
        '--pms-gold-hover': colors.goldHover,
        '--pms-gold-subtle': colors.goldSubtle,
        '--pms-navy': colors.navy,
        '--pms-navy-mid': colors.navyMid,
        '--pms-navy-light': colors.navyLight,
        '--pms-navy-lightest': colors.navyLightest,
        '--pms-text-white': colors.textWhite,
        '--pms-text-muted': colors.textMuted,
        '--pms-text-secondary': colors.textSecondary,
        '--pms-text-dark': colors.textDark,
        '--pms-card-bg': colors.cardBg,
        '--pms-page-bg': colors.pageBg,
        '--pms-error': colors.error,
        '--pms-success': colors.success,
        '--pms-info': colors.info,
        '--pms-border': colors.border,
        
        // Radius tokens
        '--pms-radius': radius.standard,
        '--pms-radius-sm': radius.sm,
        '--pms-radius-pill': radius.pill,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
