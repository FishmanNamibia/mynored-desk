'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GoldSpinner } from '@/components/ui/gold-spinner'

/**
 * Redirect from /dashboard/notifications to the performance notifications page.
 * This ensures the Bell icon link in the performance header works correctly.
 */
export default function NotificationsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/performance/dashboard/notifications')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-100">
      <GoldSpinner size="md" message="Redirecting..." />
    </div>
  )
}
