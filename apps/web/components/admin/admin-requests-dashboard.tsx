"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package, 
  Car, 
  Monitor, 
  Building,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  Warehouse,
  TrendingDown,
  Info
} from "lucide-react";
import { useAPIClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Request {
  id: string;
  requestNumber: string;
  type: "REFRESHMENT" | "BOARDROOM" | "VEHICLE" | "IT_EQUIPMENT";
  title: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    jobTitle?: string;
  };
  requestDate: string;
  requiredDate?: string;
  rejectionReason?: string;
}

interface RefreshmentStock {
  id: string;
  name: string;
  category?: string;
  unitType: string;
  currentStock: number;
  minimumLevel: number;
  maximumLevel: number;
  expiryDate?: string;
  unitCost?: number;
  supplier?: string;
  totalReceived: number;
  totalDispensed: number;
  lastRestocked?: string;
  lastDispensed?: string;
  isActive: boolean;
  notes?: string;
}

interface RequestCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface RequestActionDialogProps {
  request: Request | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (requestId: string, action: "approve" | "reject", reason?: string) => void;
}

function RequestActionDialog({ request, isOpen, onClose, onAction }: RequestActionDialogProps) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!request || !action) return;
    
    onAction(request.id, action, reason);
    setAction(null);
    setReason("");
    onClose();
  };

  if (!request) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "REFRESHMENT": return <Package className="w-4 h-4" />;
      case "BOARDROOM": return <Building className="w-4 h-4" />;
      case "VEHICLE": return <Car className="w-4 h-4" />;
      case "IT_EQUIPMENT": return <Monitor className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(request.type)}
            Review Request - {request.requestNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Request Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">Request Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-medium">{request.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{request.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant="outline">{request.priority}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Required Date:</span>
                  <p className="font-medium">
                    {request.requiredDate ? new Date(request.requiredDate).toLocaleDateString() : "Not specified"}
                  </p>
                </div>
              </div>
              {request.description && (
                <div className="mt-4">
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1">{request.description}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">Requester Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{request.requester.firstName} {request.requester.lastName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{request.requester.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <p className="font-medium">{request.requester.department || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Job Title:</span>
                  <p className="font-medium">{request.requester.jobTitle || "Not specified"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Action</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  variant={action === "approve" ? "default" : "outline"}
                  onClick={() => setAction("approve")}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
                <Button
                  variant={action === "reject" ? "destructive" : "outline"}
                  onClick={() => setAction("reject")}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            </div>

            {action === "reject" && (
              <div>
                <Label htmlFor="reason" className="text-sm font-medium">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            )}

            {action === "approve" && (
              <div>
                <Label htmlFor="approvalNotes" className="text-sm font-medium">Approval Notes (Optional)</Label>
                <Textarea
                  id="approvalNotes"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Any additional notes or instructions..."
                  className="mt-2"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!action || (action === "reject" && !reason.trim())}
            >
              {action === "approve" ? "Approve Request" : "Reject Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockManagementTab({ stock, loading }: { stock: RefreshmentStock[]; loading: boolean }) {
  const [selectedItem, setSelectedItem] = useState<RefreshmentStock | null>(null);
  const [stockOperation, setStockOperation] = useState<{ type: "ADD" | "REMOVE"; quantity: number }>({ type: "ADD", quantity: 0 });

  const getLowStockItems = () => stock.filter(item => item.currentStock <= item.minimumLevel);
  
  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getExpiryStatus = (expiryDate?: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    if (daysUntilExpiry === null) return "no-expiry";
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 7) return "expires-soon";
    if (daysUntilExpiry <= 30) return "expires-warning";
    return "fresh";
  };

  const getExpiryBadge = (expiryDate?: string) => {
    const status = getExpiryStatus(expiryDate);
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
    
    switch (status) {
      case "expired":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Expired</Badge>;
      case "expires-soon":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Expires in {daysUntilExpiry} days</Badge>;
      case "expires-warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Expires in {daysUntilExpiry} days</Badge>;
      case "fresh":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Fresh</Badge>;
      default:
        return <Badge variant="outline">No expiry</Badge>;
    }
  };
  
  const getStockStatus = (item: RefreshmentStock) => {
    if (item.currentStock <= item.minimumLevel) return "critical";
    if (item.currentStock <= item.minimumLevel * 1.5) return "low";
    return "normal";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading stock...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const lowStockItems = getLowStockItems();

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <TrendingDown className="w-5 h-5" />
              Low Stock Alert ({lowStockItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {item.currentStock} {item.unitType} | Minimum: {item.minimumLevel} {item.unitType}
                    </p>
                  </div>
                  <Badge variant="destructive">Critical</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            Refreshment Stock Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Until Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((item) => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.supplier}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.currentStock} {item.unitType}</p>
                        <p className="text-xs text-muted-foreground">
                          Min: {item.minimumLevel} | Max: {item.maximumLevel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {item.expiryDate ? (
                          <p className="text-sm font-medium">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No expiry</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.expiryDate ? (
                          <>
                            <span className={cn(
                              "text-sm font-medium",
                              getExpiryStatus(item.expiryDate) === "expired" && "text-red-600",
                              getExpiryStatus(item.expiryDate) === "expires-soon" && "text-orange-600",
                              getExpiryStatus(item.expiryDate) === "expires-warning" && "text-yellow-600"
                            )}>
                              {getDaysUntilExpiry(item.expiryDate) !== null ? 
                                `${getDaysUntilExpiry(item.expiryDate)} days` : 
                                "N/A"
                              }
                            </span>
                            {getExpiryBadge(item.expiryDate)}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">No expiry</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={status === "critical" ? "destructive" : status === "low" ? "secondary" : "default"}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.lastRestocked ? (
                          <>
                            <p>Restocked: {new Date(item.lastRestocked).toLocaleDateString()}</p>
                            {item.lastDispensed && (
                              <p className="text-muted-foreground">
                                Used: {new Date(item.lastDispensed).toLocaleDateString()}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground">No recent activity</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedItem(item)}
                      >
                        Update Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminRequestsDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [refreshmentStock, setRefreshmentStock] = useState<RefreshmentStock[]>([]);
  const [requestCounts, setRequestCounts] = useState<RequestCounts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "stock">("requests");

  const apiClient = useAPIClient();

  // Mock data for development
  const mockRequests: Request[] = [
    {
      id: "1",
      requestNumber: "REF-2026-001",
      type: "REFRESHMENT",
      title: "Coffee and pastries for board meeting",
      description: "Need refreshments for 15 people for quarterly board meeting",
      status: "PENDING",
      priority: "HIGH",
      requester: {
        id: "user1",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@nsa.org.na",
        department: "Executive",
        jobTitle: "Executive Assistant"
      },
      requestDate: "2026-02-04T10:00:00Z",
      requiredDate: "2026-02-05T14:00:00Z"
    },
    {
      id: "3",
      requestNumber: "BR-2026-003", 
      type: "BOARDROOM",
      title: "Conference room for client presentation",
      description: "Need main conference room with projector setup",
      status: "PENDING",
      priority: "NORMAL",
      requester: {
        id: "user3",
        firstName: "Mike",
        lastName: "Johnson",
        email: "mike.johnson@nsa.org.na",
        department: "Sales",
        jobTitle: "Sales Manager"
      },
      requestDate: "2026-02-04T11:15:00Z",
      requiredDate: "2026-02-05T10:00:00Z"
    }
  ];

  const mockStock: RefreshmentStock[] = [
    {
      id: "stock1",
      name: "Bottled Water (500ml)",
      category: "Water",
      unitType: "bottles",
      currentStock: 45,
      minimumLevel: 50,
      maximumLevel: 200,
      expiryDate: "2026-12-31T23:59:59Z", // Good for long time
      unitCost: 2.50,
      supplier: "Fresh Water Co.",
      totalReceived: 1250,
      totalDispensed: 1205,
      lastRestocked: "2026-01-28T14:30:00Z",
      lastDispensed: "2026-02-03T16:20:00Z",
      isActive: true,
      notes: "Low stock - reorder soon"
    },
    {
      id: "stock2", 
      name: "Coffee Beans (1kg)",
      category: "Coffee",
      unitType: "packets",
      currentStock: 8,
      minimumLevel: 10,
      maximumLevel: 50,
      expiryDate: "2026-02-15T23:59:59Z", // Expires in 11 days - nearly expired
      unitCost: 65.00,
      supplier: "Bean Masters",
      totalReceived: 125,
      totalDispensed: 117,
      lastRestocked: "2026-01-15T09:00:00Z",
      lastDispensed: "2026-02-04T07:45:00Z",
      isActive: true,
      notes: "Critical level - urgent reorder"
    },
    {
      id: "stock3",
      name: "Mixed Nuts (250g)",
      category: "Snacks", 
      unitType: "packets",
      currentStock: 25,
      minimumLevel: 15,
      maximumLevel: 75,
      expiryDate: "2026-02-02T23:59:59Z", // Expired 2 days ago
      unitCost: 12.50,
      supplier: "Snack Suppliers",
      totalReceived: 200,
      totalDispensed: 175,
      lastRestocked: "2026-01-20T11:30:00Z",
      lastDispensed: "2026-02-02T15:10:00Z",
      isActive: true
    }
  ];

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [requestsResponse, countsResponse, stockResponse] = await Promise.all([
        apiClient.get("/admin/requests"),
        apiClient.get("/admin/requests/counts"),
        apiClient.get("/admin/requests/stock/refreshments")
      ]);
      
      setRequests((requestsResponse as any)?.data);
      setRequestCounts((countsResponse as any)?.data);
      setRefreshmentStock((stockResponse as any)?.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      // Fallback to mock data for development
      setRequests(mockRequests);
      setRequestCounts({ pending: 2, approved: 12, rejected: 2, total: 16 });
      setRefreshmentStock(mockStock);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject", rejectionReason?: string) => {
    try {
      await apiClient.post(`/admin/requests/${requestId}/approve`, {
        action: action.toUpperCase(),
        rejectionReason
      });
      
      // Refresh the requests
      await fetchRequests();
    } catch (error) {
      console.error("Failed to process request:", error);
      
      // Mock implementation for development
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: action === "approve" ? "APPROVED" : "REJECTED", rejectionReason }
            : req
        )
      );
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = requests.filter(r => r.status === "PENDING");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "REFRESHMENT": return <Package className="w-4 h-4" />;
      case "BOARDROOM": return <Building className="w-4 h-4" />;
      case "VEHICLE": return <Car className="w-4 h-4" />;
      case "IT_EQUIPMENT": return <Monitor className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      LOW: "bg-gray-100 text-gray-800",
      NORMAL: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800"
    };
    return (
      <Badge className={cn("text-xs", variants[priority as keyof typeof variants] || variants.NORMAL)}>
        {priority}
      </Badge>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Dashboard Header with Tabs */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            <p className="text-muted-foreground">Manage requests and inventory</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "requests" ? "default" : "outline"}
              onClick={() => setActiveTab("requests")}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Requests
            </Button>
            <Button
              variant={activeTab === "stock" ? "default" : "outline"}
              onClick={() => setActiveTab("stock")}
              className="flex items-center gap-2"
            >
              <Warehouse className="w-4 h-4" />
              Stock Management
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{requestCounts.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{requestCounts.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{requestCounts.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{requestCounts.total}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === "requests" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Requests ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending requests at this time</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Required Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            {getTypeIcon(request.type)}
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{request.title}</p>
                              <p className="text-xs text-muted-foreground">{request.requestNumber}</p>
                              {request.description && (
                                <div className="flex items-center gap-1 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    {request.description.length > 35
                                      ? `${request.description.substring(0, 35)}...`
                                      : request.description
                                    }
                                  </p>
                                  {request.description.length > 35 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                          <Info className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground border shadow-md p-3">
                                        <p className="text-sm">{request.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {request.requester.firstName} {request.requester.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.requester.department}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(request.priority)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {request.requiredDate 
                                ? new Date(request.requiredDate).toLocaleDateString()
                                : "Not specified"
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <StockManagementTab 
            stock={refreshmentStock}
            loading={loading}
          />
        )}
      </div>

      {/* Request Action Dialog */}
      <RequestActionDialog
        request={selectedRequest}
        isOpen={actionDialogOpen}
        onClose={() => {
          setActionDialogOpen(false);
          setSelectedRequest(null);
        }}
        onAction={handleRequestAction}
      />
    </>
  );
}