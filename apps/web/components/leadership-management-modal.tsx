"use client";

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";

interface BoardMember {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
  displayOrder: number;
}

interface Executive {
  id: string;
  name: string;
  position: string;
  imageUrl: string;
  displayOrder: number;
}

interface LeadershipManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function LeadershipManagementModal({ open, onOpenChange, onUpdate }: LeadershipManagementModalProps) {
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("board");

  // Form states
  const [boardForm, setBoardForm] = useState({ name: "", position: "", displayOrder: 0, file: null as File | null });
  const [executiveForm, setExecutiveForm] = useState({ name: "", position: "", displayOrder: 0, file: null as File | null });

  useEffect(() => {
    if (open) {
      fetchBoardMembers();
      fetchExecutives();
    }
  }, [open]);

  const fetchBoardMembers = async () => {
    try {
      const res = await fetch("/api/dashboard/board-members");
      if (res.ok) {
        const data = await res.json();
        setBoardMembers(data);
      }
    } catch (error) {
      console.error("Error fetching board members:", error);
    }
  };

  const fetchExecutives = async () => {
    try {
      const res = await fetch("/api/dashboard/executive-committee");
      if (res.ok) {
        const data = await res.json();
        setExecutives(data);
      }
    } catch (error) {
      console.error("Error fetching executives:", error);
    }
  };

  const handleAddBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardForm.name || !boardForm.position || !boardForm.file) {
      toast({ title: "$1", variant: "destructive" });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", boardForm.name);
    formData.append("position", boardForm.position);
    formData.append("displayOrder", boardForm.displayOrder.toString());
    formData.append("file", boardForm.file);

    try {
      const res = await fetch("/api/dashboard/board-members", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setBoardForm({ name: "", position: "", displayOrder: 0, file: null });
        fetchBoardMembers();
        onUpdate?.();
      } else {
        const error = await res.json();
        toast({ title: $1 || "$2", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding board member:", error);
      toast({ title: "$1", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executiveForm.name || !executiveForm.position || !executiveForm.file) {
      toast({ title: "$1", variant: "destructive" });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("name", executiveForm.name);
    formData.append("position", executiveForm.position);
    formData.append("displayOrder", executiveForm.displayOrder.toString());
    formData.append("file", executiveForm.file);

    try {
      const res = await fetch("/api/dashboard/executive-committee", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setExecutiveForm({ name: "", position: "", displayOrder: 0, file: null });
        fetchExecutives();
        onUpdate?.();
      } else {
        const error = await res.json();
        toast({ title: $1 || "$2", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding executive:", error);
      toast({ title: "$1", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoardMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this board member?")) return;

    try {
      const res = await fetch(`/api/dashboard/board-members?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchBoardMembers();
        onUpdate?.();
      } else {
        toast({ title: "$1", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting board member:", error);
      toast({ title: "$1", variant: "destructive" });
    }
  };

  const handleDeleteExecutive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this executive?")) return;

    try {
      const res = await fetch(`/api/dashboard/executive-committee?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchExecutives();
        onUpdate?.();
      } else {
        toast({ title: "$1", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting executive:", error);
      toast({ title: "$1", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Leadership</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="board">Board Members</TabsTrigger>
            <TabsTrigger value="executive">Executive Committee</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-4">
            {/* Add Board Member Form */}
            <form onSubmit={handleAddBoardMember} className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">Add New Board Member</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="board-name">Name</Label>
                  <Input
                    id="board-name"
                    value={boardForm.name}
                    onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-position">Position</Label>
                  <Input
                    id="board-position"
                    value={boardForm.position}
                    onChange={(e) => setBoardForm({ ...boardForm, position: e.target.value })}
                    placeholder="e.g., Chairperson"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-order">Display Order</Label>
                  <Input
                    id="board-order"
                    type="number"
                    value={boardForm.displayOrder}
                    onChange={(e) => setBoardForm({ ...boardForm, displayOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-image">Image</Label>
                  <Input
                    id="board-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBoardForm({ ...boardForm, file: e.target.files?.[0] || null })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Board Member
              </Button>
            </form>

            {/* Board Members List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Current Board Members</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {boardMembers.map((member) => (
                  <div key={member.id} className="border rounded-lg p-3 space-y-2">
                    <div className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={member.imageUrl}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.position}</p>
                      <p className="text-xs text-muted-foreground">Order: {member.displayOrder}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteBoardMember(member.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="executive" className="space-y-4">
            {/* Add Executive Form */}
            <form onSubmit={handleAddExecutive} className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">Add New Executive</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exec-name">Name</Label>
                  <Input
                    id="exec-name"
                    value={executiveForm.name}
                    onChange={(e) => setExecutiveForm({ ...executiveForm, name: e.target.value })}
                    placeholder="e.g., Jane Smith"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exec-position">Position</Label>
                  <Input
                    id="exec-position"
                    value={executiveForm.position}
                    onChange={(e) => setExecutiveForm({ ...executiveForm, position: e.target.value })}
                    placeholder="e.g., CEO"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exec-order">Display Order</Label>
                  <Input
                    id="exec-order"
                    type="number"
                    value={executiveForm.displayOrder}
                    onChange={(e) => setExecutiveForm({ ...executiveForm, displayOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exec-image">Image</Label>
                  <Input
                    id="exec-image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setExecutiveForm({ ...executiveForm, file: e.target.files?.[0] || null })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Executive
              </Button>
            </form>

            {/* Executives List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Current Executives</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {executives.map((exec) => (
                  <div key={exec.id} className="border rounded-lg p-3 space-y-2">
                    <div className="relative aspect-square rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={exec.imageUrl}
                        alt={exec.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{exec.name}</p>
                      <p className="text-xs text-muted-foreground">{exec.position}</p>
                      <p className="text-xs text-muted-foreground">Order: {exec.displayOrder}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteExecutive(exec.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
