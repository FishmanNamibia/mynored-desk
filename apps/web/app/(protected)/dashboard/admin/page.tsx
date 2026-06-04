"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Zap,
  Car,
  DoorOpen,
  Coffee,
  Users,
  Loader2,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface RequestItem {
  id: string;
  requestNumber?: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  requestDate?: string;
  createdAt?: string;
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    departmentName?: string;
  };
}

interface Boardroom {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  amenities?: string;
  isAvailable: boolean;
}

interface Vehicle {
  id: string;
  make?: string;
  model?: string;
  registrationNumber?: string;
  isAvailable?: boolean;
}

interface Refreshment {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  givenOut: number;
  supplier?: string;
  expiryDate?: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [pendingRequests, setPendingRequests] = useState<RequestItem[]>([]);
  const [boardrooms, setBoardrooms] = useState<Boardroom[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [refreshments, setRefreshments] = useState<Refreshment[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, boardroomsRes, vehiclesRes, refreshmentsRes] = await Promise.all([
        fetch(`/api/admin/requests/counts`).catch(() => null),
        fetch(`/api/admin/requests`).catch(() => null),
        fetch(`/api/admin/boardrooms`).catch(() => null),
        fetch(`/api/admin/vehicles`).catch(() => null),
        fetch(`/api/admin/refreshments`).catch(() => null),
      ]);

      if (statsRes?.ok) setStats(await statsRes.json());
      if (pendingRes?.ok) setPendingRequests(await pendingRes.json());
      if (boardroomsRes?.ok) setBoardrooms(await boardroomsRes.json());
      if (vehiclesRes?.ok) setVehicles(await vehiclesRes.json());
      if (refreshmentsRes?.ok) setRefreshments(await refreshmentsRes.json());
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproval = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: "" }),
      });
      if (res.ok) {
        toast({ title: `Request ${action === "APPROVE" ? "approved" : "rejected"} successfully` });
        fetchData();
      } else {
        toast({ title: "Action failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      REFRESHMENT: "Refreshments",
      BOARDROOM: "Room Booking",
      VEHICLE: "Vehicle",
      IT_EQUIPMENT: "IT Equipment",
    };
    return map[t] || t;
  };

  const typeBadgeColor = (t: string) => {
    const map: Record<string, string> = {
      REFRESHMENT: "bg-amber-100 text-amber-800",
      BOARDROOM: "bg-blue-100 text-blue-800",
      VEHICLE: "bg-purple-100 text-purple-800",
      IT_EQUIPMENT: "bg-cyan-100 text-cyan-800",
    };
    return map[t] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-foreground">
            Administration
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage requests, approvals, resources, and organizational settings.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold">{loading ? "—" : stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-bold">{loading ? "—" : stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Rejected</p>
                <p className="text-2xl font-bold">{loading ? "—" : stats.rejected}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold">{loading ? "—" : stats.total}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="h-10">
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rooms" className="gap-1.5">
                <DoorOpen className="w-3.5 h-3.5" /> Boardrooms ({boardrooms.length})
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="gap-1.5">
                <Car className="w-3.5 h-3.5" /> Vehicles ({vehicles.length})
              </TabsTrigger>
              <TabsTrigger value="refreshments" className="gap-1.5">
                <Coffee className="w-3.5 h-3.5" /> Stock ({refreshments.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending Approvals */}
            <TabsContent value="pending" className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No pending requests to review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor(item.type)}`}>
                            {typeLabel(item.type)}
                          </span>
                          {item.priority === "URGENT" && (
                            <Badge variant="destructive" className="text-xs">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.requestNumber || item.id.slice(0, 8)} •{" "}
                          {item.requester ? `${item.requester.firstName} ${item.requester.lastName}` : "Unknown"} •{" "}
                          {item.requester?.departmentName || "—"} •{" "}
                          {formatDate(item.createdAt || item.requestDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={actionLoading === item.id}
                          onClick={() => handleApproval(item.id, "REJECT")}
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={actionLoading === item.id}
                          onClick={() => handleApproval(item.id, "APPROVE")}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Boardrooms */}
            <TabsContent value="rooms" className="pt-4">
              {boardrooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DoorOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium">No boardrooms configured</p>
                  <p className="text-sm">Add boardrooms to enable room booking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {boardrooms.map((room) => (
                    <Card key={room.id} className="relative">
                      <CardContent className="pt-5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{room.name}</p>
                          <Badge variant={room.isAvailable ? "default" : "secondary"}>
                            {room.isAvailable ? "Available" : "Occupied"}
                          </Badge>
                        </div>
                        {room.location && (
                          <p className="text-sm text-muted-foreground">{room.location}</p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {room.capacity && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {room.capacity} seats
                            </span>
                          )}
                          {room.amenities && <span>{room.amenities}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vehicles */}
            <TabsContent value="vehicles" className="pt-4">
              {vehicles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium">No vehicles in fleet</p>
                  <p className="text-sm">Add vehicles to enable fleet management.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 px-4 font-medium">Vehicle</th>
                        <th className="py-3 px-4 font-medium">Registration</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map((v) => (
                        <tr key={v.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            {v.make} {v.model}
                          </td>
                          <td className="py-3 px-4">{v.registrationNumber || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge variant={v.isAvailable ? "default" : "secondary"}>
                              {v.isAvailable ? "Available" : "In Use"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* Refreshment Stock */}
            <TabsContent value="refreshments" className="pt-4">
              {refreshments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Coffee className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium">No stock items</p>
                  <p className="text-sm">Add refreshment items to manage stock.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 px-4 font-medium">Item</th>
                        <th className="py-3 px-4 font-medium">Category</th>
                        <th className="py-3 px-4 font-medium">In Stock</th>
                        <th className="py-3 px-4 font-medium">Given Out</th>
                        <th className="py-3 px-4 font-medium">Supplier</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refreshments.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{item.name}</td>
                          <td className="py-3 px-4">{item.category || "—"}</td>
                          <td className="py-3 px-4">{item.quantity}</td>
                          <td className="py-3 px-4">{item.givenOut}</td>
                          <td className="py-3 px-4">{item.supplier || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge variant={item.quantity <= 5 ? "destructive" : "default"}>
                              {item.quantity <= 5 ? "Low Stock" : "OK"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
