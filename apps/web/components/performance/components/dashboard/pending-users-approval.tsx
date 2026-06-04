"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, UserX, Clock, Mail } from "lucide-react";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
}

interface Division {
  id: string;
  name: string;
  departmentId: string;
}

interface PendingUsersApprovalProps {
  pendingUsers: PendingUser[];
  departments: Department[];
  divisions: Division[];
  onApprove: () => void;
}

export function PendingUsersApproval({
  pendingUsers,
  departments,
  divisions,
  onApprove,
}: PendingUsersApprovalProps) {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    role: "STAFF",
    departmentId: "",
    divisionId: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/dashboard/performance/api/users/${selectedUser.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "APPROVE",
            role: approvalForm.role,
            departmentId: approvalForm.departmentId || undefined,
            divisionId: approvalForm.divisionId || undefined,
          }),
        },
      );

      if (response.ok) {
        setApprovalDialogOpen(false);
        setSelectedUser(null);
        setApprovalForm({ role: "STAFF", departmentId: "", divisionId: "" });
        onApprove();
      } else {
        toast({ title: "Failed to approve user", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to approve user:", error);
      toast({ title: "Failed to approve user", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/dashboard/performance/api/users/${selectedUser.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REJECT",
            rejectionReason,
          }),
        },
      );

      if (response.ok) {
        setApprovalDialogOpen(false);
        setSelectedUser(null);
        setRejectionReason("");
        onApprove();
      } else {
        toast({ title: "Failed to reject user", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to reject user:", error);
      toast({ title: "Failed to reject user", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <UserCheck className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No pending user registrations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Registrations ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{user.name}</h4>
                    <Badge variant="outline" className="bg-yellow-100">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(user);
                      setApprovalDialogOpen(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review User Registration</DialogTitle>
            <DialogDescription>
              Approve or reject the registration for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm">
                <strong>Name:</strong> {selectedUser?.name}
              </p>
              <p className="text-sm">
                <strong>Email:</strong> {selectedUser?.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Assign Role *</Label>
              <Select
                value={approvalForm.role}
                onValueChange={(value) =>
                  setApprovalForm({ ...approvalForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive</SelectItem>
                  <SelectItem value="ADMINISTRATIVE_ASSISTANT">
                    Administrative Assistant
                  </SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="DEPUTY_SG">Deputy SG</SelectItem>
                  <SelectItem value="SG">SG</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {["EXECUTIVE", "DEPUTY_SG"].includes(approvalForm.role) && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={approvalForm.departmentId}
                  onValueChange={(value) =>
                    setApprovalForm({ ...approvalForm, departmentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {["STAFF", "MANAGER", "ADMINISTRATIVE_ASSISTANT"].includes(
              approvalForm.role,
            ) && (
              <div className="space-y-2">
                <Label>Division</Label>
                <Select
                  value={approvalForm.divisionId}
                  onValueChange={(value) =>
                    setApprovalForm({ ...approvalForm, divisionId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((div) => (
                      <SelectItem key={div.id} value={div.id}>
                        {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rejection Reason (if rejecting)</Label>
              <Textarea
                placeholder="Provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              <UserX className="h-4 w-4 mr-1" />
              {processing ? "Rejecting..." : "Reject"}
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              <UserCheck className="h-4 w-4 mr-1" />
              {processing ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
