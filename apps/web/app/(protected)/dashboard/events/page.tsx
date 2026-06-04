import { CalendarDays } from 'lucide-react'

export default function EventsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <CalendarDays className="h-16 w-16 text-muted-foreground/40" />
      <h1 className="text-2xl font-semibold">Events</h1>
      <p className="text-muted-foreground max-w-md">
        Upcoming company events and calendar items will appear here.
      </p>
    </div>
  )
}
