import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, DoorOpen, Coffee, Calendar, Clock } from "lucide-react"

interface ServiceRequestListProps {
  filter: "all" | "pending" | "approved" | "completed"
}

const requests = [
  {
    id: 1,
    type: "vehicle",
    title: "Vehicle for Client Meeting",
    description: "Need transportation to downtown office",
    date: "Jan 18, 2026",
    time: "2:00 PM",
    status: "approved",
    requestedDate: "Jan 14, 2026",
  },
  {
    id: 2,
    type: "room",
    title: "Conference Room A",
    description: "Team strategy session",
    date: "Jan 17, 2026",
    time: "10:00 AM - 12:00 PM",
    status: "pending",
    requestedDate: "Jan 14, 2026",
  },
  {
    id: 3,
    type: "refreshments",
    title: "Refreshments for Workshop",
    description: "Coffee and snacks for 20 people",
    date: "Jan 20, 2026",
    time: "9:00 AM",
    status: "pending",
    requestedDate: "Jan 13, 2026",
  },
  {
    id: 4,
    type: "room",
    title: "Meeting Room B",
    description: "Client presentation",
    date: "Jan 16, 2026",
    time: "3:00 PM - 4:30 PM",
    status: "completed",
    requestedDate: "Jan 12, 2026",
  },
  {
    id: 5,
    type: "vehicle",
    title: "Airport Transportation",
    description: "Pick up visiting executives",
    date: "Jan 22, 2026",
    time: "1:00 PM",
    status: "approved",
    requestedDate: "Jan 14, 2026",
  },
]

const statusColors = {
  pending: "default",
  approved: "outline",
  completed: "secondary",
} as const

const typeIcons = {
  vehicle: Car,
  room: DoorOpen,
  refreshments: Coffee,
}

const typeLabels = {
  vehicle: "Vehicle",
  room: "Room Booking",
  refreshments: "Refreshments",
}

export function ServiceRequestList({ filter }: ServiceRequestListProps) {
  const filteredRequests = filter === "all" ? requests : requests.filter((req) => req.status === filter)

  return (
    <div className="space-y-4">
      {filteredRequests.map((request) => {
        const Icon = typeIcons[request.type as keyof typeof typeIcons]

        return (
          <Card
            key={request.id}
            className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{request.title}</h3>
                    <Badge variant="secondary">{typeLabels[request.type as keyof typeof typeLabels]}</Badge>
                    <Badge variant={statusColors[request.status as keyof typeof statusColors]}>{request.status}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{request.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{request.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{request.time}</span>
                    </div>
                    <span>Requested {request.requestedDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      {filteredRequests.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Coffee className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-card-foreground mb-2">No requests found</h3>
            <p className="text-muted-foreground">No {filter !== "all" ? filter : ""} service requests at this time</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
