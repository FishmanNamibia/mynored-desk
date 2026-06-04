/**
 * PMS Button Component
 * 
 * Enhanced button component that applies NSA UI standards.
 * Provides gold, primary, and standard variants.
 */

import { Button } from '@/components/ui/button'
import { colors } from '@/app/ui-standards'
import { cn } from '@/lib/utils'
import * as React from 'react'

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type PMSVariant = ButtonVariant | 'gold' | 'primary'

interface PMSButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant'> {
  variant?: PMSVariant
}

export function PMSButton({ 
  children, 
  className, 
  style,
  variant = 'default',
  ...props 
}: PMSButtonProps) {
  const goldStyles = variant === 'gold' ? {
    backgroundColor: colors.gold,
    color: colors.textDark,
    fontWeight: 600,
  } : {}

  const primaryStyles = variant === 'primary' ? {
    backgroundColor: colors.info,
    color: colors.textWhite,
  } : {}

  // Map custom variants to standard Button variants
  const buttonVariant: ButtonVariant = 
    variant === 'gold' || variant === 'primary' ? 'default' : variant

  return (
    <Button 
      variant={buttonVariant}
      className={cn(
        'transition-all shadow-md hover:shadow-lg',
        className
      )}
      style={{
        ...goldStyles,
        ...primaryStyles,
        ...style
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
