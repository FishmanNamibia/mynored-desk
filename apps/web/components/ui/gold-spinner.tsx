'use client'

import { cn } from '@/lib/utils'
import { colors } from '@/app/ui-standards'

interface GoldSpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional loading message below the spinner */
  message?: string
  /** Additional className for the wrapper */
  className?: string
}

const sizeMap = {
  sm: { ring: 'w-8 h-8', border: '3px' },
  md: { ring: 'w-12 h-12', border: '4px' },
  lg: { ring: 'w-20 h-20', border: '4px' },
}

/**
 * Gold Loading Spinner — NSA standard loading indicator.
 *
 * Uses the brand gold (#d4a843) accent color with a spinning ring.
 * Import from `@/components/ui/gold-spinner`.
 *
 * @example
 *   <GoldSpinner />
 *   <GoldSpinner size="lg" message="Loading dashboard..." />
 */
export function GoldSpinner({ size = 'md', message, className }: GoldSpinnerProps) {
  const s = sizeMap[size]

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('relative', s.ring)}>
        {/* Track ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: `${s.border} solid #e2e8f0` }}
        />
        {/* Spinning gold ring */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            borderWidth: s.border,
            borderStyle: 'solid',
            borderColor: colors.gold,
            borderTopColor: 'transparent',
          }}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-500 font-medium">{message}</p>
      )}
    </div>
  )
}
