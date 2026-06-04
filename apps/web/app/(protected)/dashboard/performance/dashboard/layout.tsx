'use client'

export default function PerformanceDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout is now just a pass-through since the parent /performance/ layout handles the sidebar
  return <>{children}</>
}
