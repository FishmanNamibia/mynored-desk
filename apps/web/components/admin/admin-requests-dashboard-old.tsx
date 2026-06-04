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
  TrendingDown
} from "lucide-react";
import { useAPIClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { RefreshmentRequestForm } from "./refreshment-request-form";

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
                  <p className="font-medium">{request.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge 
                    variant={
                      request.priority === "URGENT" ? "destructive" :
                      request.priority === "HIGH" ? "default" : "secondary"
                    }
                  >
                    {request.priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Required Date:</span>
                  <p className="font-medium">
                    {request.requiredDate ? new Date(request.requiredDate).toLocaleDateString() : "Not specified"}
                  </p>
                </div>
              </div>
              
              {request.description && (
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="text-sm mt-1 p-3 bg-muted/50 rounded">{request.description}</p>
                </div>
              )}
            </div>

            {/* Requester Info */}
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

          {/* Stock Check Placeholder */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Stock Availability</span>
            </div>
            <p className="text-sm text-blue-700">
              Stock availability check will be implemented here based on request type.
            </p>
          </div>

          {/* Action Selection */}
          {!action && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Action Required</h3>
              <div className="flex gap-3">
                <Button
                  onClick={() => setAction("approve")}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Request
                </Button>
                <Button
                  onClick={() => setAction("reject")}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </div>
            </div>
          )}

          {/* Reason/Comment */}
          {action && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">
                {action === "approve" ? "Approval Notes (Optional)" : "Rejection Reason (Required)"}
              </h3>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  action === "approve" 
                    ? "Add any notes or special instructions..."
                    : "Please provide a reason for rejection (e.g., out of stock, invalid request, etc.)"
                }
                rows={3}
              />
            </div>
          )}

          {/* Form Actions */}
          {action && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setAction(null)}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={action === "reject" && !reason.trim()}
                className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {action === "approve" ? "Approve" : "Reject"} Request
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRequestsDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [refreshmentStock, setRefreshmentStock] = useState<RefreshmentStock[]>([]);
  const [requestCounts, setRequestCounts] = useState<RequestCounts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "stock">("requests");

  const apiClient = useAPIClient();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [requestsResponse, countsResponse, stockResponse] = await Promise.all([
        apiClient.get("/admin/requests"),
        apiClient.get("/admin/requests/counts"),
        apiClient.get("/admin/requests/stock/refreshments")
      ]);
      
      setRequests(requestsResponse.data);
      setRequestCounts(countsResponse.data);
      setRefreshmentStock(stockResponse.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      // Fallback to mock data for development
      setRequests(mockRequests);
      setRequestCounts({ pending: 3, approved: 12, rejected: 2, total: 17 });
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
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
      id: "2", 
      requestNumber: "VEH-2026-002",
      type: "VEHICLE",
      title: "Vehicle for client site visit",
      description: "Need vehicle for visiting client in Windhoek",
      status: "PENDING",
      priority: "NORMAL",
      requester: {
        id: "user2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@nsa.org.na",
        department: "Sales",
        jobTitle: "Account Manager"
      },
      requestDate: "2026-02-04T08:30:00Z",
      requiredDate: "2026-02-06T09:00:00Z"
    },
    {
      id: "3",
      requestNumber: "BR-2026-003", 
      type: "BOARDROOM",
      title: "Conference room for client presentation",
      description: "Need main conference room with projector setup",
      status: "PENDING",
      priority: "URGENT",
      requester: {
        id: "user3",
        firstName: "Mike",
        lastName: "Johnson",
        email: "mike.johnson@nsa.org.na",
        department: "Marketing", 
        jobTitle: "Marketing Manager"
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
      unitCost: 12.50,
      supplier: "Snack Suppliers",
      totalReceived: 200,
      totalDispensed: 175,
      lastRestocked: "2026-01-20T11:30:00Z",
      lastDispensed: "2026-02-02T15:10:00Z",
      isActive: true
    }
  ];

  useEffect(() => {
    // In real implementation, fetch from API
    setTimeout(() => {
      setRequests(mockRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const handleRequestAction = async (requestId: string, action: "approve" | "reject", reason?: string) => {
    try {
      // In real implementation, call API
      // await apiClient.post(`/requests/${requestId}/${action}`, { reason });
      
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: action === "approve" ? "APPROVED" : "REJECTED", rejectionReason: reason }
            : req
        )
      );
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      APPROVED: "bg-green-100 text-green-800 border-green-200", 
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
      COMPLETED: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge className={cn("text-xs", variants[status as keyof typeof variants])}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      LOW: "bg-gray-100 text-gray-600",
      NORMAL: "bg-blue-100 text-blue-600", 
      HIGH: "bg-orange-100 text-orange-600",
      URGENT: "bg-red-100 text-red-600"
    };

    return (
      <Badge className={cn("text-xs", variants[priority as keyof typeof variants])}>
        {priority}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      REFRESHMENT: <Package className="w-4 h-4 text-green-600" />,
      BOARDROOM: <Building className="w-4 h-4 text-blue-600" />,
      VEHICLE: <Car className="w-4 h-4 text-orange-600" />,
      IT_EQUIPMENT: <Monitor className="w-4 h-4 text-purple-600" />
    };

    return icons[type as keyof typeof icons] || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffb800]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");

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
          <RequestsTab 
            requests={requests} 
            loading={loading}
            onRequestAction={handleRequestAction}
            onSelectRequest={(request) => {
              setSelectedRequest(request);
              setActionDialogOpen(true);
            }}
          />
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

// Requests Tab Component
function RequestsTab({ 
  requests, 
  loading, 
  onRequestAction, 
  onSelectRequest 
}: {
  requests: Request[];
  loading: boolean;
  onRequestAction: (id: string, action: "approve" | "reject", reason?: string) => void;
  onSelectRequest: (request: Request) => void;
}) {
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
    return variants[priority as keyof typeof variants] || variants.NORMAL;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading requests...</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
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
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {request.description}
                          </p>
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
                      onClick={() => onSelectRequest(request)}
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
  );
}