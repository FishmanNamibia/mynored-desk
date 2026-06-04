"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  department?: {
    id: string;
    name: string;
    division: {
      id: string;
      name: string;
    };
  };
}

interface Target {
  id: string;
  title: string;
  assignedTo?: {
    id: string;
    name: string;
    department?: {
      name: string;
      division: {
        name: string;
      };
    };
  };
}

interface AssignTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target | null;
  users: User[];
  onSuccess: () => void;
}

export function AssignTargetDialog({
  open,
  onOpenChange,
  target,
  users,
  onSuccess,
}: AssignTargetDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target?.assignedTo) {
      setSelectedUserId(target.assignedTo.id);
    } else {
      setSelectedUserId("");
    }
  }, [target]);

  const handleAssign = async () => {
    if (!target || !selectedUserId) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/dashboard/performance/api/targets/${target.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedToId: selectedUserId,
          }),
        },
      );

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        toast({ title: `$1`, variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to assign target:", error);
      toast({ title: "Failed to assign target", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = Array.isArray(users)
    ? users.find((u) => u.id === selectedUserId)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.assignedTo ? "Reassign" : "Assign"} Target
          </DialogTitle>
          <DialogDescription>
            {target?.assignedTo
              ? "Change the staff member assigned to this target"
              : "Assign this target to a staff member"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">{target?.title}</p>
            </div>
          </div>

          {target?.assignedTo && (
            <div className="space-y-2">
              <Label>Currently Assigned To</Label>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="font-medium">{target.assignedTo.name}</p>
                <p className="text-sm text-gray-600">
                  {target.assignedTo.department?.name || "No Department"} -{" "}
                  {target.assignedTo.department?.division.name || "No Division"}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assign To *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-gray-500">
                          {user.department?.name || "No Dept"} -{" "}
                          {user.department?.division.name || "No Div"}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-users" disabled>
                    No users available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="space-y-2">
              <Label>Target will be aligned to:</Label>
              <div className="p-3 bg-green-50 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Staff:</span>
                  <Badge>{selectedUser.name}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Department:</span>
                  <Badge variant="outline">
                    {selectedUser.department?.name || "None"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Division:</span>
                  <Badge variant="outline">
                    {selectedUser.department?.division.name || "None"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedUserId || submitting}
          >
            {submitting
              ? "Assigning..."
              : target?.assignedTo
                ? "Reassign"
                : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
