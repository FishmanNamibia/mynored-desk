"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canManageContent } from "@/lib/permissions";
import { LeadershipManagementModal } from "@/components/leadership-management-modal";
import { toast } from "@/hooks/use-toast";

interface WelcomeLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  order: number;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  expiresAt?: string;
  createdById: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  createdById: string;
}

interface CustomWidget {
  id: string;
  type: string;
  title: string;
  description?: string;
  content?: string;
  isActive: boolean;
  createdAt: string;
}

export default function WidgetManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "leadership" | "notices" | "events" | "custom"
  >("leadership");
  const [leadershipTab, setLeadershipTab] = useState<
    "board" | "executive" | "vision" | "mission" | "values"
  >("board");

  // Board Members State
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoardMember, setEditingBoardMember] = useState<any>(null);
  const [boardForm, setBoardForm] = useState({
    name: "",
    position: "",
    displayOrder: 0,
    file: null as File | null,
    existingImageUrl: "",
  });

  // Executive Committee State
  const [executives, setExecutives] = useState<any[]>([]);
  const [showExecutiveForm, setShowExecutiveForm] = useState(false);
  const [executiveForm, setExecutiveForm] = useState({
    name: "",
    position: "",
    displayOrder: 0,
    file: null as File | null,
  });

  // Vision State
  const [vision, setVision] = useState<any>(null);
  const [showVisionForm, setShowVisionForm] = useState(false);
  const [visionForm, setVisionForm] = useState({
    content: "",
    file: null as File | null,
  });

  // Mission State
  const [mission, setMission] = useState<any>(null);
  const [showMissionForm, setShowMissionForm] = useState(false);
  const [missionForm, setMissionForm] = useState({
    content: "",
    file: null as File | null,
  });

  // Core Values State
  const [coreValues, setCoreValues] = useState<any[]>([]);
  const [showValueForm, setShowValueForm] = useState(false);
  const [valueForm, setValueForm] = useState({
    name: "",
    description: "",
    icon: "",
    displayOrder: 0,
  });

  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    priority: "medium" as "low" | "medium" | "high",
    expiresAt: "",
  });

  // Events State
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });

  // Custom Widgets State
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);

  const canManage = canManageContent((user as any)?.jobTitle);

  useEffect(() => {
    if (activeTab === "leadership") {
      if (leadershipTab === "board") fetchBoardMembers();
      if (leadershipTab === "executive") fetchExecutives();
      if (leadershipTab === "vision") fetchVision();
      if (leadershipTab === "mission") fetchMission();
      if (leadershipTab === "values") fetchCoreValues();
    }
    if (activeTab === "notices") fetchNotices();
    if (activeTab === "events") fetchEvents();
    if (activeTab === "custom") fetchCustomWidgets();
  }, [activeTab, leadershipTab]);

  // Board Members Functions
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

  const handleSaveBoardMember = async () => {
    if (!boardForm.name || !boardForm.position) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!editingBoardMember && !boardForm.file) {
      toast({ title: "Please select an image", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("name", boardForm.name);
    formData.append("position", boardForm.position);
    formData.append("displayOrder", boardForm.displayOrder.toString());
    if (boardForm.file) {
      formData.append("file", boardForm.file);
    }
    if (editingBoardMember) {
      formData.append("id", editingBoardMember.id);
      formData.append("existingImageUrl", boardForm.existingImageUrl);
    }

    try {
      const url = editingBoardMember
        ? `/api/dashboard/board-members?id=${editingBoardMember.id}`
        : "/api/dashboard/board-members";
      const method = editingBoardMember ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        fetchBoardMembers();
        setShowBoardForm(false);
        setEditingBoardMember(null);
        setBoardForm({
          name: "",
          position: "",
          displayOrder: 0,
          file: null,
          existingImageUrl: "",
        });
      } else {
        const error = await res.json();
        toast({
          title: error.error || "Failed to save board member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving board member:", error);
    }
  };

  const handleDeleteBoardMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this board member?")) return;

    try {
      const res = await fetch(`/api/dashboard/board-members?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchBoardMembers();
    } catch (error) {
      console.error("Error deleting board member:", error);
    }
  };

  // Executive Committee Functions
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

  const handleSaveExecutive = async () => {
    if (!executiveForm.name || !executiveForm.position || !executiveForm.file) {
      toast({
        title: "Please fill in all required fields and select an image",
        variant: "destructive",
      });
      return;
    }

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
        fetchExecutives();
        setShowExecutiveForm(false);
        setExecutiveForm({
          name: "",
          position: "",
          displayOrder: 0,
          file: null,
        });
      } else {
        const error = await res.json();
        toast({
          title: error.error || "Failed to add executive",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving executive:", error);
    }
  };

  const handleDeleteExecutive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this executive?")) return;

    try {
      const res = await fetch(`/api/dashboard/executive-committee?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchExecutives();
    } catch (error) {
      console.error("Error deleting executive:", error);
    }
  };

  // Vision Functions
  const fetchVision = async () => {
    try {
      const res = await fetch("/api/dashboard/vision");
      if (res.ok) {
        const data = await res.json();
        setVision(data);
        if (data) {
          setVisionForm({ content: data.content, file: null });
        }
      }
    } catch (error) {
      console.error("Error fetching vision:", error);
    }
  };

  const handleSaveVision = async () => {
    if (!visionForm.content) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("content", visionForm.content);
    if (visionForm.file) {
      formData.append("file", visionForm.file);
    }
    if (vision?.imageUrl) {
      formData.append("existingImageUrl", vision.imageUrl);
    }

    try {
      const res = await fetch("/api/dashboard/vision", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        fetchVision();
        setShowVisionForm(false);
        toast({ title: "Vision updated successfully!" });
      } else {
        const error = await res.json();
        toast({
          title: error.error || "Failed to update vision",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving vision:", error);
    }
  };

  // Mission Functions
  const fetchMission = async () => {
    try {
      const res = await fetch("/api/dashboard/mission");
      if (res.ok) {
        const data = await res.json();
        setMission(data);
        if (data) {
          setMissionForm({ content: data.content, file: null });
        }
      }
    } catch (error) {
      console.error("Error fetching mission:", error);
    }
  };

  const handleSaveMission = async () => {
    if (!missionForm.content) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("content", missionForm.content);
    if (missionForm.file) {
      formData.append("file", missionForm.file);
    }
    if (mission?.imageUrl) {
      formData.append("existingImageUrl", mission.imageUrl);
    }

    try {
      const res = await fetch("/api/dashboard/mission", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        fetchMission();
        setShowMissionForm(false);
        toast({ title: "Mission updated successfully!" });
      } else {
        const error = await res.json();
        toast({
          title: error.error || "Failed to update mission",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving mission:", error);
    }
  };

  // Core Values Functions
  const fetchCoreValues = async () => {
    try {
      const res = await fetch("/api/dashboard/core-values");
      if (res.ok) {
        const data = await res.json();
        setCoreValues(data);
      }
    } catch (error) {
      console.error("Error fetching core values:", error);
    }
  };

  const handleSaveCoreValue = async () => {
    if (!valueForm.name || !valueForm.description || !valueForm.icon) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/dashboard/core-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valueForm),
      });

      if (res.ok) {
        fetchCoreValues();
        setShowValueForm(false);
        setValueForm({ name: "", description: "", icon: "", displayOrder: 0 });
      } else {
        const error = await res.json();
        toast({
          title: error.error || "Failed to add core value",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving core value:", error);
    }
  };

  const handleDeleteCoreValue = async (id: string) => {
    if (!confirm("Are you sure you want to delete this core value?")) return;

    try {
      const res = await fetch(`/api/dashboard/core-values?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchCoreValues();
    } catch (error) {
      console.error("Error deleting core value:", error);
    }
  };

  // Notices Functions
  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/dashboard/notices", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotices(data);
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
    }
  };

  const handleSaveNotice = async () => {
    if (!noticeForm.title || !noticeForm.content) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingNotice
        ? `/api/dashboard/notices/${editingNotice.id}`
        : "/api/dashboard/notices";
      const method = editingNotice ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
        credentials: "include",
      });

      if (res.ok) {
        fetchNotices();
        setShowNoticeForm(false);
        setEditingNotice(null);
        setNoticeForm({
          title: "",
          content: "",
          priority: "medium",
          expiresAt: "",
        });
      }
    } catch (error) {
      console.error("Error saving notice:", error);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const res = await fetch(`/api/dashboard/notices/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) fetchNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  // Events Functions
  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/dashboard/events", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingEvent
        ? `/api/dashboard/events/${editingEvent.id}`
        : "/api/dashboard/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventForm),
        credentials: "include",
      });

      if (res.ok) {
        fetchEvents();
        setShowEventForm(false);
        setEditingEvent(null);
        setEventForm({ title: "", description: "", date: "", location: "" });
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const res = await fetch(`/api/dashboard/events/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  // Custom Widgets Functions
  const fetchCustomWidgets = async () => {
    try {
      const res = await fetch("/api/dashboard/widgets", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCustomWidgets(data);
      }
    } catch (error) {
      console.error("Error fetching custom widgets:", error);
    }
  };

  const handleDeleteCustomWidget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this widget?")) return;

    try {
      const res = await fetch(`/api/dashboard/widgets?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) fetchCustomWidgets();
    } catch (error) {
      console.error("Error deleting widget:", error);
    }
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="widget-card p-8 text-center">
          <p className="text-muted-foreground">
            You don't have permission to manage widgets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Widget Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage content for dashboard widgets
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("leadership")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "leadership"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Leadership
          </button>
          <button
            onClick={() => setActiveTab("notices")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "notices"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Notices
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "events"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "custom"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom Widgets
          </button>
        </div>

        {/* Leadership Tab */}
        {activeTab === "leadership" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Leadership Management</h2>
            </div>

            {/* Sub-tabs for Board and Executive */}
            <div className="flex gap-2 border-b border-border overflow-x-auto">
              <button
                onClick={() => setLeadershipTab("board")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  leadershipTab === "board"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Board Members
              </button>
              <button
                onClick={() => setLeadershipTab("executive")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  leadershipTab === "executive"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Executive Committee
              </button>
              <button
                onClick={() => setLeadershipTab("vision")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  leadershipTab === "vision"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Vision
              </button>
              <button
                onClick={() => setLeadershipTab("mission")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  leadershipTab === "mission"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Mission
              </button>
              <button
                onClick={() => setLeadershipTab("values")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  leadershipTab === "values"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Core Values
              </button>
            </div>

            {/* Board Members Section */}
            {leadershipTab === "board" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Board Members</h3>
                  <Button
                    onClick={() => {
                      setShowBoardForm(true);
                      setEditingBoardMember(null);
                      setBoardForm({
                        name: "",
                        position: "",
                        displayOrder: 0,
                        file: null,
                        existingImageUrl: "",
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Board Member
                  </Button>
                </div>

                {showBoardForm && (
                  <div className="widget-card p-4 space-y-4">
                    <h3 className="font-semibold">
                      {editingBoardMember
                        ? "Edit Board Member"
                        : "New Board Member"}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={boardForm.name}
                          onChange={(e) =>
                            setBoardForm({ ...boardForm, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Position *
                        </label>
                        <input
                          type="text"
                          value={boardForm.position}
                          onChange={(e) =>
                            setBoardForm({
                              ...boardForm,
                              position: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., Chairperson"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={boardForm.displayOrder}
                          onChange={(e) =>
                            setBoardForm({
                              ...boardForm,
                              displayOrder: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Image{" "}
                          {editingBoardMember
                            ? "(optional - leave empty to keep current)"
                            : "*"}
                        </label>
                        {editingBoardMember && boardForm.existingImageUrl && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Current: {boardForm.existingImageUrl}
                          </p>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setBoardForm({
                              ...boardForm,
                              file: e.target.files?.[0] || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveBoardMember} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setShowBoardForm(false);
                          setEditingBoardMember(null);
                          setBoardForm({
                            name: "",
                            position: "",
                            displayOrder: 0,
                            file: null,
                            existingImageUrl: "",
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="widget-card overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Image URL
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Position
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Order
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {boardMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {member.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground font-mono text-xs">
                            {member.imageUrl}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {member.position}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {member.displayOrder}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                onClick={() => {
                                  setEditingBoardMember(member);
                                  setBoardForm({
                                    name: member.name,
                                    position: member.position,
                                    displayOrder: member.displayOrder,
                                    file: null,
                                    existingImageUrl: member.imageUrl,
                                  });
                                  setShowBoardForm(true);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDeleteBoardMember(member.id)
                                }
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {boardMembers.length === 0 && (
                  <div className="widget-card p-8 text-center text-muted-foreground">
                    No board members yet. Click "Add Board Member" to create
                    one.
                  </div>
                )}
              </div>
            )}

            {/* Executive Committee Section */}
            {leadershipTab === "executive" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">
                    Executive Committee
                  </h3>
                  <Button
                    onClick={() => {
                      setShowExecutiveForm(true);
                      setExecutiveForm({
                        name: "",
                        position: "",
                        displayOrder: 0,
                        file: null,
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Executive
                  </Button>
                </div>

                {showExecutiveForm && (
                  <div className="widget-card p-4 space-y-4">
                    <h3 className="font-semibold">New Executive</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={executiveForm.name}
                          onChange={(e) =>
                            setExecutiveForm({
                              ...executiveForm,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., Jane Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Position *
                        </label>
                        <input
                          type="text"
                          value={executiveForm.position}
                          onChange={(e) =>
                            setExecutiveForm({
                              ...executiveForm,
                              position: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., CEO"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={executiveForm.displayOrder}
                          onChange={(e) =>
                            setExecutiveForm({
                              ...executiveForm,
                              displayOrder: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Image *
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setExecutiveForm({
                              ...executiveForm,
                              file: e.target.files?.[0] || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveExecutive} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setShowExecutiveForm(false);
                          setExecutiveForm({
                            name: "",
                            position: "",
                            displayOrder: 0,
                            file: null,
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {executives.map((exec) => (
                    <div key={exec.id} className="widget-card p-4">
                      <div className="relative aspect-square rounded-md overflow-hidden mb-3 bg-gray-100">
                        <img
                          src={exec.imageUrl}
                          alt={exec.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 mb-3">
                        <h4 className="font-semibold text-sm">{exec.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {exec.position}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order: {exec.displayOrder}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteExecutive(exec.id)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
                {executives.length === 0 && (
                  <div className="widget-card p-8 text-center text-muted-foreground">
                    No executives yet. Click "Add Executive" to create one.
                  </div>
                )}
              </div>
            )}

            {/* Vision Section */}
            {leadershipTab === "vision" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Vision Statement</h3>
                  <Button
                    onClick={() => setShowVisionForm(!showVisionForm)}
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {showVisionForm ? "Cancel" : "Edit Vision"}
                  </Button>
                </div>

                {showVisionForm && (
                  <div className="widget-card p-4 space-y-4">
                    <h3 className="font-semibold">Edit Vision</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Content *
                        </label>
                        <textarea
                          value={visionForm.content}
                          onChange={(e) =>
                            setVisionForm({
                              ...visionForm,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          rows={4}
                          placeholder="Enter vision statement"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Image (optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setVisionForm({
                              ...visionForm,
                              file: e.target.files?.[0] || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveVision} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setShowVisionForm(false)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {vision && !showVisionForm && (
                  <div className="widget-card p-6">
                    {vision.imageUrl && (
                      <div className="relative w-full h-48 rounded-md overflow-hidden mb-4 bg-gray-100">
                        <img
                          src={vision.imageUrl}
                          alt="Vision"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{vision.content}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mission Section */}
            {leadershipTab === "mission" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Mission Statement</h3>
                  <Button
                    onClick={() => setShowMissionForm(!showMissionForm)}
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {showMissionForm ? "Cancel" : "Edit Mission"}
                  </Button>
                </div>

                {showMissionForm && (
                  <div className="widget-card p-4 space-y-4">
                    <h3 className="font-semibold">Edit Mission</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Content *
                        </label>
                        <textarea
                          value={missionForm.content}
                          onChange={(e) =>
                            setMissionForm({
                              ...missionForm,
                              content: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          rows={4}
                          placeholder="Enter mission statement"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Image (optional)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setMissionForm({
                              ...missionForm,
                              file: e.target.files?.[0] || null,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveMission} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setShowMissionForm(false)}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {mission && !showMissionForm && (
                  <div className="widget-card p-6">
                    {mission.imageUrl && (
                      <div className="relative w-full h-48 rounded-md overflow-hidden mb-4 bg-gray-100">
                        <img
                          src={mission.imageUrl}
                          alt="Mission"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{mission.content}</p>
                  </div>
                )}
              </div>
            )}

            {/* Core Values Section */}
            {leadershipTab === "values" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold">Core Values</h3>
                  <Button
                    onClick={() => {
                      setShowValueForm(true);
                      setValueForm({
                        name: "",
                        description: "",
                        icon: "",
                        displayOrder: 0,
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Core Value
                  </Button>
                </div>

                {showValueForm && (
                  <div className="widget-card p-4 space-y-4">
                    <h3 className="font-semibold">New Core Value</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={valueForm.name}
                          onChange={(e) =>
                            setValueForm({ ...valueForm, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., Integrity"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Description *
                        </label>
                        <textarea
                          value={valueForm.description}
                          onChange={(e) =>
                            setValueForm({
                              ...valueForm,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          rows={3}
                          placeholder="Describe this core value"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Icon (emoji) *
                        </label>
                        <input
                          type="text"
                          value={valueForm.icon}
                          onChange={(e) =>
                            setValueForm({ ...valueForm, icon: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="e.g., 🎯"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Display Order
                        </label>
                        <input
                          type="number"
                          value={valueForm.displayOrder}
                          onChange={(e) =>
                            setValueForm({
                              ...valueForm,
                              displayOrder: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-md"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCoreValue} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={() => {
                          setShowValueForm(false);
                          setValueForm({
                            name: "",
                            description: "",
                            icon: "",
                            displayOrder: 0,
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coreValues.map((value) => (
                    <div key={value.id} className="widget-card p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{value.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            {value.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {value.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Order: {value.displayOrder}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteCoreValue(value.id)}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
                {coreValues.length === 0 && (
                  <div className="widget-card p-8 text-center text-muted-foreground">
                    No core values yet. Click "Add Core Value" to create one.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notices Tab */}
        {activeTab === "notices" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Notices</h2>
              <Button
                onClick={() => {
                  setShowNoticeForm(true);
                  setEditingNotice(null);
                  setNoticeForm({
                    title: "",
                    content: "",
                    priority: "medium",
                    expiresAt: "",
                  });
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Notice
              </Button>
            </div>

            {showNoticeForm && (
              <div className="widget-card p-4 space-y-4">
                <h3 className="font-semibold">
                  {editingNotice ? "Edit Notice" : "New Notice"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={noticeForm.title}
                      onChange={(e) =>
                        setNoticeForm({ ...noticeForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="Notice title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Content *
                    </label>
                    <textarea
                      value={noticeForm.content}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          content: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                      rows={4}
                      placeholder="Notice content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Priority
                    </label>
                    <select
                      value={noticeForm.priority}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          priority: e.target.value as "low" | "medium" | "high",
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Expires At (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={noticeForm.expiresAt}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          expiresAt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveNotice} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNoticeForm(false);
                      setEditingNotice(null);
                      setNoticeForm({
                        title: "",
                        content: "",
                        priority: "medium",
                        expiresAt: "",
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {notices.map((notice) => (
                <div key={notice.id} className="widget-card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{notice.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            notice.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : notice.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {notice.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notice.content}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingNotice(notice);
                          setNoticeForm({
                            title: notice.title,
                            content: notice.content,
                            priority: notice.priority,
                            expiresAt: notice.expiresAt || "",
                          });
                          setShowNoticeForm(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteNotice(notice.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {notices.length === 0 && (
                <div className="widget-card p-8 text-center text-muted-foreground">
                  No notices yet. Click "Add Notice" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Events</h2>
              <Button
                onClick={() => {
                  setShowEventForm(true);
                  setEditingEvent(null);
                  setEventForm({
                    title: "",
                    description: "",
                    date: "",
                    location: "",
                  });
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>

            {showEventForm && (
              <div className="widget-card p-4 space-y-4">
                <h3 className="font-semibold">
                  {editingEvent ? "Edit Event" : "New Event"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="Event title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      value={eventForm.description}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                      rows={3}
                      placeholder="Event description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Location (optional)
                    </label>
                    <input
                      type="text"
                      value={eventForm.location}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md"
                      placeholder="Event location"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEvent} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEventForm(false);
                      setEditingEvent(null);
                      setEventForm({
                        title: "",
                        description: "",
                        date: "",
                        location: "",
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="widget-card p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>📅 {new Date(event.date).toLocaleString()}</span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingEvent(event);
                          setEventForm({
                            title: event.title,
                            description: event.description,
                            date: event.date,
                            location: event.location || "",
                          });
                          setShowEventForm(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteEvent(event.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="widget-card p-8 text-center text-muted-foreground">
                  No events yet. Click "Add Event" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Widgets Tab */}
        {activeTab === "custom" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Custom Widgets</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your custom widgets like to-do lists, notes, and more
                </p>
              </div>
              <a
                href="/dashboard/settings/widgets/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Create Widget
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customWidgets.map((widget) => (
                <div key={widget.id} className="widget-card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{widget.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {widget.type}
                        </span>
                      </div>
                      {widget.description && (
                        <p className="text-sm text-muted-foreground">
                          {widget.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {widget.content && (
                    <div className="mb-3 p-3 bg-muted/30 rounded-md border border-border/50">
                      <p className="text-xs text-foreground line-clamp-3 whitespace-pre-wrap">
                        {widget.content}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(widget.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      onClick={() => handleDeleteCustomWidget(widget.id)}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {customWidgets.length === 0 && (
                <div className="col-span-full widget-card p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No custom widgets yet. Create your first widget to get
                    started!
                  </p>
                  <a
                    href="/dashboard/settings/widgets/create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Widget
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
