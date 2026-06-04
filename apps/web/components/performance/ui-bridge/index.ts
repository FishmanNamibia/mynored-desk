/**
 * PMS UI Bridge Layer
 * 
 * This module provides a bridge between the Performance Management System (PMS)
 * and the main NSA Desk UI standards. It allows PMS components to gradually
 * adopt the main application's design system without breaking existing functionality.
 * 
 * Usage:
 *   import { colors, gradients, PMSCard } from '@/components/performance/ui-bridge'
 */

// Re-export UI standards for PMS consumption
export { 
  colors, 
  gradients, 
  shadows, 
  components, 
  tw, 
  radius, 
  typography 
} from '@/app/ui-standards'

// Re-export GoldSpinner for consistent loading states
export { GoldSpinner } from '@/components/ui/gold-spinner'

// Re-export PMS-specific components
export { PMSCard, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './pms-card'
export { PMSButton } from './pms-button'
export { PMSThemeProvider } from './pms-theme-provider'
