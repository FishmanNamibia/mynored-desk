'use client'

import { useAuth } from '@/lib/auth-context'
import { NotificationProvider } from '@/lib/pms/notification-context'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { PMSThemeProvider } from '@/components/performance/ui-bridge'

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <GoldSpinner size="lg" message="Loading Performance Management..." />
      </div>
    )
  }

  return (
    <NotificationProvider>
      <PMSThemeProvider>
        {children}
      </PMSThemeProvider>
    </NotificationProvider>
  )
}