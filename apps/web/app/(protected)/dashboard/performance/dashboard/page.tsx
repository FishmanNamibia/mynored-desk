import { redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  // Redirect to the PMS overview dashboard
  redirect('/dashboard/performance/dashboard/overview')
}
