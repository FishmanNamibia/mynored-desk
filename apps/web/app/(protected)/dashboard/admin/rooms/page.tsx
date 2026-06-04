"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Clock, MapPin } from "lucide-react";

export default function RoomBookingPage() {
  const roomBookings = [
    {
      id: "RB-001",
      room: "Board Room A",
      bookedBy: "J. Smith",
      date: "Jan 20, 2026",
      time: "10:00 AM - 12:00 PM",
      capacity: 12,
      status: "confirmed",
    },
    {
      id: "RB-002",
      room: "Training Room 1",
      bookedBy: "L. Kamwi",
      date: "Jan 20, 2026",
      time: "2:00 PM - 5:00 PM",
      capacity: 20,
      status: "confirmed",
    },
    {
      id: "RB-003",
      room: "Meeting Room B",
      bookedBy: "M. Nkomo",
      date: "Jan 21, 2026",
      time: "9:00 AM - 10:30 AM",
      capacity: 8,
      status: "pending",
    },
    {
      id: "RB-004",
      room: "Auditorium",
      bookedBy: "Director",
      date: "Jan 22, 2026",
      time: "3:00 PM - 6:00 PM",
      capacity: 150,
      status: "confirmed",
    },
  ];

  const availableRooms = [
    {
      name: "Board Room A",
      capacity: 12,
      floor: "3rd Floor",
      amenities: "Projector, Whiteboard, Video Conference",
    },
    {
      name: "Meeting Room B",
      capacity: 8,
      floor: "2nd Floor",
      amenities: "Projector, Whiteboard",
    },
    {
      name: "Training Room 1",
      capacity: 20,
      floor: "1st Floor",
      amenities: "Projector, Computers, Whiteboard",
    },
    {
      name: "Auditorium",
      capacity: 150,
      floor: "Ground Floor",
      amenities: "Projector, Sound System, Stage",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Room Bookings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage conference room reservations and facility bookings.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Book Room
        </Button>
      </div>

      {/* Available Rooms */}
      <Card>
        <CardHeader>
          <CardTitle>Available Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRooms.map((room) => (
              <div
                key={room.name}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.floor}
                    </p>
                  </div>
                  <Badge>{room.capacity} capacity</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {room.amenities}
                </p>
                <Button size="sm" className="w-full">
                  Book Now
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roomBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{booking.room}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {booking.capacity} capacity
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {booking.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {booking.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Booked by: {booking.bookedBy}
                  </p>
                </div>
                <Badge
                  variant={
                    booking.status === "confirmed" ? "default" : "outline"
                  }
                >
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
