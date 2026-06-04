import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"

export function StatsCards() {
  return (
    <KpiGrid columns={4}>
      <KpiCard 
        type="tasks" 
        label="Tasks Assigned"
        value="12" 
        trend="+3 this week" 
        size="lg"
      />
      <KpiCard 
        type="approvals" 
        value="5" 
        trend="2 urgent" 
        size="lg"
      />
      <KpiCard 
        type="reviews" 
        label="Completed Reviews"
        value="8" 
        trend="+2 this month" 
        size="lg"
      />
      <KpiCard 
        type="requests" 
        value="3" 
        trend="1 pending" 
        size="lg"
      />
    </KpiGrid>
  )
}
