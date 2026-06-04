"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  CalendarDays,
  Coffee,
  Car,
  Users,
  Monitor,
  User,
  Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Request {
  id: string;
  requestNumber: string;
  title: string;
  type: "REFRESHMENT" | "VEHICLE" | "BOARDROOM" | "IT_EQUIPMENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  description?: string;
  priority?: string;
  createdAt: string;
  requestDate: string;
  requiredDate?: string;
  approvalReason?: string;
  rejectionReason?: string;
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  requester: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle?: string;
    departmentName?: string;
  };
}

const requestTypeIcons = {
  REFRESHMENT: Coffee,
  VEHICLE: Car,
  BOARDROOM: Users,
  IT_EQUIPMENT: Monitor,
};

const requestTypeColors = {
  REFRESHMENT: "bg-blue-100 text-blue-800 border-blue-300",
  VEHICLE: "bg-green-100 text-green-800 border-green-300",
  BOARDROOM: "bg-purple-100 text-purple-800 border-purple-300",
  IT_EQUIPMENT: "bg-gray-100 text-gray-800 border-gray-300",
};

const priorityColors = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-600",
};

interface ColleaguesRequestsListProps {
  onRequestsChange?: () => void;
}

export function ColleaguesRequestsList({ onRequestsChange }: ColleaguesRequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [actionDialog, setActionDialog] = useState<{
    request: Request | null;
    action: "approve" | "reject" | null;
  }>({ request: null, action: null });
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadColleagueRequests();
  }, []);

  const loadColleagueRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/colleagues/public');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || data || []);
      }
    } catch (error) {
      console.error("Failed to load colleague requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests by status
  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const approvedRequests = requests.filter(r => r.status === "APPROVED");
  const rejectedRequests = requests.filter(r => r.status === "REJECTED");
  const filteredRequests = activeTab === "PENDING" ? pendingRequests : activeTab === "APPROVED" ? approvedRequests : rejectedRequests;
  
  // Paginate filtered requests
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleAction = async () => {
    if (!actionDialog.request || !actionDialog.action) return;
    
    // Require reason for rejection
    if (actionDialog.action === "reject" && !reason.trim()) {
      setNotification({ type: 'error', message: 'Please provide a reason for rejection' });
      return;
    }

    try {
      setProcessing(true);
      const endpoint = `/api/requests/${actionDialog.request.requestId}/${actionDialog.action}/public`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${actionDialog.action} request`);
      }

      setNotification({ 
        type: 'success', 
        message: `Request ${actionDialog.action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
      
      // Close dialog and refresh
      setActionDialog({ request: null, action: null });
      setReason("");
      loadColleagueRequests();
      onRequestsChange?.();
    } catch (error) {
      console.error(`Failed to ${actionDialog.action} request:`, error);
      setNotification({ type: 'error', message: `Failed to ${actionDialog.action} request` });
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "REFRESHMENT": return "Refreshments";
      case "VEHICLE": return "Vehicle";
      case "BOARDROOM": return "Boardroom";
      case "IT_EQUIPMENT": return "IT Equipment";
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Colleagues Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Notification Bar */}
      {notification && (
        <div className={`mb-4 px-4 py-3 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <p className="text-sm font-medium">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto text-sm hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Colleagues Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "PENDING" | "APPROVED" | "REJECTED")} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="PENDING" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved
                {approvedRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{approvedRequests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="REJECTED" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
                {rejectedRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{rejectedRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              {activeTab === "PENDING" ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    There are no pending requests from colleagues to review.
                  </p>
                </>
              ) : (
                <>
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No {activeTab.toLowerCase()} requests</h3>
                  <p className="text-muted-foreground">
                    There are no {activeTab.toLowerCase()} requests from colleagues.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
            <div className="max-h-120 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Type</TableHead>
                  {activeTab !== "PENDING" && <TableHead>Status</TableHead>}
                  <TableHead>Requested</TableHead>
                  <TableHead>Needed By</TableHead>
                  {activeTab === "PENDING" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => {
                  const TypeIcon = requestTypeIcons[request.type];
                  
                  return (
                    <TableRow key={request.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div>
                          {/* Show items description first (e.g., Water, Chips) */}
                          <p className="font-medium">{request.title}</p>
                          {/* Request number second */}
                          <p className="text-xs text-muted-foreground mt-0.5">{request.requestNumber}</p>
                          {/* Full description at the bottom */}
                          {request.description && (
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {request.description.length > 35
                                  ? `${request.description.substring(0, 35)}...`
                                  : request.description
                                }
                              </p>
                              {request.description.length > 35 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
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
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {request.requester.firstName} {request.requester.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.requester.jobTitle || request.requester.departmentName || 'No Position'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={requestTypeColors[request.type]}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {getRequestTypeLabel(request.type)}
                        </Badge>
                      </TableCell>
                      {activeTab !== "PENDING" && (
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1">
                              <Badge className={activeTab === "APPROVED" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}>
                                {activeTab === "APPROVED" ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                {activeTab}
                              </Badge>
                              {(request.rejectionReason || request.approvalReason) && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                                      <Info className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs bg-popover text-popover-foreground border shadow-md p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {activeTab === "REJECTED" ? "Rejection Reason:" : "Comment:"}
                                    </p>
                                    <p className="text-sm">{request.rejectionReason || request.approvalReason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {request.approver && (
                              <div className="mt-1">
                                {(() => {
                                  const fullName = `${request.approver.firstName} ${request.approver.lastName}`;
                                  const displayName = fullName.length > 15 ? `${fullName.substring(0, 15)}...` : fullName;
                                  return fullName.length > 15 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground cursor-default">By: {displayName}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-popover text-popover-foreground border shadow-md p-2">
                                        <p className="text-sm">{fullName}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">By: {fullName}</p>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <p className="text-sm">{formatDate(request.requestDate || request.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        {request.requiredDate ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-sm">{new Date(request.requiredDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </TableCell>
                      {activeTab === "PENDING" && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActionDialog({ request, action: "approve" })}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActionDialog({ request, action: "reject" })}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog 
        open={!!actionDialog.request} 
        onOpenChange={(open) => !open && setActionDialog({ request: null, action: null })}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.action === "approve" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {actionDialog.action === "approve" ? "Approve" : "Reject"} Request
            </DialogTitle>
          </DialogHeader>
          
          {actionDialog.request && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{actionDialog.request.title}</p>
                <p className="text-sm text-muted-foreground">
                  {actionDialog.request.requestNumber} • {getRequestTypeLabel(actionDialog.request.type)}
                </p>
                <p className="text-sm mt-2">
                  Requested by: {actionDialog.request.requester.firstName} {actionDialog.request.requester.lastName}
                </p>
              </div>

              <div>
                <Label htmlFor="reason">
                  {actionDialog.action === "approve" ? "Comment (optional)" : "Reason for rejection (required)"}
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={actionDialog.action === "approve" 
                    ? "Add a comment for the requester..." 
                    : "Please provide a reason for rejection..."
                  }
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setActionDialog({ request: null, action: null });
                setReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              disabled={processing}
              className={actionDialog.action === "approve" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing 
                ? "Processing..." 
                : actionDialog.action === "approve" ? "Approve Request" : "Reject Request"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
