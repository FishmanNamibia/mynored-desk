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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2,
  CalendarDays,
  Coffee,
  Car,
  Users,
  Monitor,
  RotateCcw,
  Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";

interface Request {
  id: string;
  title: string;
  type: "REFRESHMENT" | "VEHICLE" | "BOARDROOM" | "IT_EQUIPMENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  description?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  approvedBy?: string;
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  rejectionReason?: string;
  approvalReason?: string;
  refreshmentDetails?: {
    items: string[];
    snacks: string[];
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

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-300",
};

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  CANCELLED: XCircle,
};

interface MyRequestsListProps {
  requests?: Request[];
  loading?: boolean;
  onRequestsChange?: () => void;
}

export function MyRequestsList({ 
  requests = [], 
  loading = false, 
  onRequestsChange 
}: MyRequestsListProps) {
  const { user } = useAuth();
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const paginatedRequests = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEditRequest = (request: Request) => {
    setEditingRequest(request);
    setEditForm({
      title: request.title,
      description: request.description || ""
    });
  };

  const handleUpdateRequest = async () => {
    if (!editingRequest) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Update API error:', errorData);
        throw new Error(`Failed to update request: ${response.status} - ${errorData}`);
      }
      
      onRequestsChange?.(); // Refresh the list
      setEditingRequest(null);
      
      // Success notification
      setNotification({type: 'success', message: 'Request updated successfully!'});
      
    } catch (error) {
      console.error("Failed to update request:", error);
      setNotification({type: 'error', message: `Failed to update request. ${error}`});
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setCancelling(requestId);
      const response = await fetch(`/api/requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cancel API error:', errorData);
        throw new Error(`Failed to cancel request: ${response.status} - ${errorData}`);
      }
      
      onRequestsChange?.(); // Refresh the list
      setNotification({type: 'success', message: 'Request cancelled successfully!'});
    } catch (error) {
      console.error("Failed to cancel request:", error);
      setNotification({type: 'error', message: `Failed to cancel request. ${error}`});
    } finally {
      setCancelling(null);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      setDeleting(requestId);
      setDeleteConfirmId(null);
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Delete API error:', errorData);
        throw new Error(`Failed to delete request: ${response.status} - ${errorData}`);
      }
      
      onRequestsChange?.(); // Refresh the list
      setNotification({type: 'success', message: 'Request deleted successfully!'});
    } catch (error) {
      console.error("Failed to delete request:", error);
      setNotification({type: 'error', message: `Failed to delete request. ${error}`});
    } finally {
      setDeleting(null);
    }
  };

  const handleRevertCancel = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}/revert`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Revert API error:', errorData);
        throw new Error(`Failed to revert request: ${response.status} - ${errorData}`);
      }
      
      onRequestsChange?.(); // Refresh the list
      setNotification({type: 'success', message: 'Request resubmitted successfully!'});
    } catch (error) {
      console.error("Failed to revert request:", error);
      setNotification({type: 'error', message: `Failed to resubmit request. ${error}`});
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
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your requests...</p>
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
            <CalendarDays className="w-5 h-5" />
            My Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No requests yet</h3>
              <p className="text-muted-foreground">
                You haven't submitted any requests. Create your first request to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Requests Table */}
              <div className="max-h-120 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request) => {
                    const TypeIcon = requestTypeIcons[request.type];
                    const StatusIcon = statusIcons[request.status];
                    
                    return (
                      <TableRow key={request.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            {request.description && (
                              <div className="flex items-center gap-1 mt-1">
                                <p className="text-sm text-muted-foreground">
                                  {request.description.length > 40 
                                    ? `${request.description.substring(0, 40)}...`
                                    : request.description
                                  }
                                </p>
                                {request.description.length > 40 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                                        <Info className="w-4 h-4" />
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
                          <Badge className={requestTypeColors[request.type]}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {getRequestTypeLabel(request.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1">
                              <Badge className={statusColors[request.status]}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {request.status}
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
                                      {request.status === "REJECTED" ? "Rejection Reason:" : "Comment:"}
                                    </p>
                                    <p className="text-sm">{request.rejectionReason || request.approvalReason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {request.approver && (request.status === "APPROVED" || request.status === "REJECTED") && (
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
                        <TableCell>
                          <p className="text-sm">{formatDate(request.createdAt)}</p>
                          {request.status === "APPROVED" && request.approvedAt && (
                            <p className="text-xs text-green-600">
                              Approved {formatDate(request.approvedAt)}
                            </p>
                          )}
                          {request.status === "REJECTED" && request.rejectedAt && (
                            <p className="text-xs text-red-600">
                              Rejected {formatDate(request.rejectedAt)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {request.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRequest(request)}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelRequest(request.id)}
                                  disabled={cancelling === request.id}
                                  className="text-yellow-600 hover:text-yellow-700"
                                >
                                  {cancelling === request.id ? "Cancelling..." : "Cancel"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeleteConfirmId(request.id)}
                                  disabled={deleting === request.id}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {deleting === request.id ? "Deleting..." : ""}
                                </Button>
                              </>
                            )}
                            {request.status === "CANCELLED" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRevertCancel(request.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Resubmit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeleteConfirmId(request.id)}
                                  disabled={deleting === request.id}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {deleting === request.id ? "Deleting..." : ""}
                                </Button>
                              </>
                            )}
                            {(request.status === "APPROVED" || request.status === "REJECTED") && (
                              <Badge variant="outline" className="text-xs">
                                {request.status === "APPROVED" ? "Completed" : "Closed"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
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
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, requests.length)} of {requests.length}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Request Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Request title"
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details"
                rows={3}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRequest(null)} disabled={updating}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRequest} disabled={updating}>
                {updating ? "Updating..." : "Update Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteRequest(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}