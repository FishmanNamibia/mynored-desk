"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Fuel, Calendar } from "lucide-react";

export default function VehicleBookingPage() {
  const vehicleBookings = [
    {
      id: "VB-001",
      vehicle: "Land Cruiser (1) - Reg: NAM-001",
      bookedBy: "Executive",
      date: "Jan 20, 2026",
      time: "8:00 AM - 5:00 PM",
      purpose: "Client Meeting",
      status: "confirmed",
    },
    {
      id: "VB-002",
      vehicle: "Toyota Corolla (3) - Reg: NAM-003",
      bookedBy: "Sales Team",
      date: "Jan 20, 2026",
      time: "9:00 AM - 4:00 PM",
      purpose: "Field Sales",
      status: "confirmed",
    },
    {
      id: "VB-003",
      vehicle: "Honda Odyssey (5) - Reg: NAM-005",
      bookedBy: "HR Manager",
      date: "Jan 21, 2026",
      time: "2:00 PM - 5:00 PM",
      purpose: "Team Outing",
      status: "pending",
    },
  ];

  const availableVehicles = [
    {
      name: "Land Cruiser",
      seating: 7,
      type: "SUV",
      fuel: "Diesel",
      mileage: "42,500 km",
    },
    {
      name: "Toyota Corolla",
      seating: 5,
      type: "Sedan",
      fuel: "Petrol",
      mileage: "28,300 km",
    },
    {
      name: "Honda Odyssey",
      seating: 8,
      type: "Minivan",
      fuel: "Petrol",
      mileage: "15,600 km",
    },
    {
      name: "Hyundai i10",
      seating: 5,
      type: "Hatchback",
      fuel: "Petrol",
      mileage: "19,200 km",
    },
  ];

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Vehicle Bookings
          </h1>
          <p className="text-sm text-muted-foreground">
            Request and manage fleet vehicle reservations.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Book Vehicle
        </Button>
      </div>

      {/* Available Vehicles */}
      <Card>
        <CardHeader>
          <CardTitle>Available Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableVehicles.map((vehicle) => (
              <div
                key={vehicle.name}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{vehicle.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.type}
                    </p>
                  </div>
                  <Badge>{vehicle.seating} seater</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-4 h-4" />
                    {vehicle.fuel}
                  </span>
                  <span>{vehicle.mileage}</span>
                </div>
                <Button size="sm" className="w-full">
                  Reserve
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
            {vehicleBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{booking.vehicle}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {booking.bookedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {booking.date}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Time: {booking.time} • Purpose: {booking.purpose}
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
