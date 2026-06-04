/**
 * PMS Card Component
 * 
 * Drop-in replacement for the standard Card component that applies
 * NSA UI standards automatically. Maintains the same API as shadcn Card.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { colors, shadows, radius } from '@/app/ui-standards'
import { cn } from '@/lib/utils'

interface PMSCardProps extends React.ComponentProps<typeof Card> {
  elevated?: boolean
  hover?: boolean
}

export function PMSCard({ 
  children, 
  className, 
  style, 
  elevated = false,
  hover = false,
  ...props 
}: PMSCardProps) {
  return (
    <Card 
      className={cn(
        hover && 'transition-all hover:-translate-y-px',
        className
      )}
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: radius.standard,
        boxShadow: elevated ? shadows.cardElevated : shadows.card,
        ...(hover && {
          transition: 'all 0.2s ease-in-out',
        }),
        ...style
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

// Re-export Card sub-components for convenience
export { CardContent, CardHeader, CardTitle, CardDescription, CardFooter }
