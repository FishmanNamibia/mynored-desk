import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PerformanceManagementPage() {
  // Redirect to the main PMS dashboard overview
  redirect('/dashboard/performance/dashboard/overview')
}
