'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/pms-auth-adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  User,
  Calendar,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { colors } from "@/app/ui-standards";

interface PerformanceAgreement {
  id: string;
  title: string;
  description?: string;
  kpi?: string;
  target?: string;
  weight?: number;
  rating?: number;
  dueDate: string;
  status: string;
  approvalStatus?: string;
  userId: string;
  supervisorId?: string;
  evidenceUrl?: string;
  evidenceNotes?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    department?: { name: string };
    division?: { name: string };
  };
  initiative?: {
    title: string;
    objective?: {
      title: string;
      goal?: {
        goalNumber: string;
        title: string;
      };
    };
  };
}

interface UserWithAgreements {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  role: string;
  department?: { id: string; name: string };
  division?: { id: string; name: string };
  performanceAgreements: PerformanceAgreement[];
  totalAgreements: number;
  approvedCount: number;
  allApproved: boolean;
  ratedAgreements: number;
  allRated: boolean;
  readyForRating: number;
  notReady: number;
  pendingApproval: number;
  selfRatedNeedsReview?: number;
  allCompleted: boolean;
}

interface AdhocTask {
  id: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  status: string;
  rating?: number;
  approvalStatus?: string;
  completedAt?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PerformanceReviewsPage() {
  const { data: session } = useSession();
  const [reviewsToComplete, setReviewsToComplete] = useState<
    UserWithAgreements[]
  >([]);
  const [myReviews, setMyReviews] = useState<PerformanceAgreement[]>([]);
  const [myAdhocTasks, setMyAdhocTasks] = useState<AdhocTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithAgreements | null>(
    null,
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] =
    useState<PerformanceAgreement | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ready" | "not-ready" | "pending"
  >("all");
  const [myReviewsFilter, setMyReviewsFilter] = useState<
    "all" | "completed" | "pending" | "q1" | "q2" | "q3" | "q4"
  >("all");
  const [selectedMyReview, setSelectedMyReview] =
    useState<PerformanceAgreement | null>(null);
  const [myReviewDetailOpen, setMyReviewDetailOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      // Fetch reviews where current user is the reviewer
      const toCompleteResponse = await fetch(
        "/dashboard/performance/api/performance-reviews/to-complete",
      );
      console.log("To-complete response status:", toCompleteResponse.status);
      if (toCompleteResponse.ok) {
        const data = await toCompleteResponse.json();
        console.log("Reviews to complete:", data);
        console.log("Number of users:", data.length);
        setReviewsToComplete(data);
      } else {
        console.error(
          "To-complete response error:",
          await toCompleteResponse.text(),
        );
      }

      // Fetch reviews where current user is the reviewee
      const myReviewsResponse = await fetch(
        "/dashboard/performance/api/performance-reviews/my-reviews",
      );
      if (myReviewsResponse.ok) {
        const data = await myReviewsResponse.json();
        console.log("My reviews:", data);
        setMyReviews(data.agreements || []);
        setMyAdhocTasks(data.adhocTasks || []);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500 text-white";
      case "IN_PROGRESS":
        return "bg-blue-500 text-white";
      case "PENDING":
        return "bg-amber-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "IN_PROGRESS":
        return <Clock className="w-4 h-4" />;
      case "PENDING":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-semibold">({rating}/5)</span>
      </div>
    );
  };

  const handleOpenReview = (user: UserWithAgreements) => {
    setSelectedUser(user);
    setSelectedAgreement(null);
    setRating(0);
    setReviewDialogOpen(true);
  };

  const handleSelectAgreement = (agreement: PerformanceAgreement) => {
    setSelectedAgreement(agreement);
    setRating(agreement.rating || 0);
  };

  const handleSubmitRating = async () => {
    if (!selectedAgreement || rating === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/dashboard/performance/api/performance-agreements/${selectedAgreement.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: rating,
          }),
        },
      );

      if (response.ok) {
        toast({ title: `$1`, variant: "destructive" });
        // Move to next unrated agreement if available
        const nextUnrated = selectedUser?.performanceAgreements.find(
          (a) => !a.rating && a.id !== selectedAgreement.id,
        );
        if (nextUnrated) {
          handleSelectAgreement(nextUnrated);
        } else {
          setSelectedAgreement(null);
          setRating(0);
        }
        fetchReviews(); // Refresh the list
      } else {
        toast({ title: "Failed to submit rating", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({ title: "Error submitting rating", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPerformanceAgreement = async () => {
    if (!session?.user) return;

    // Check if all agreements are approved and rated
    const allApproved = myReviews.every((r) => r.approvalStatus === "APPROVED");
    const allRated = myReviews.every((r) => r.rating !== null);

    if (!allApproved || !allRated) {
      const missingApprovals = myReviews.filter(
        (r) => r.approvalStatus !== "APPROVED",
      ).length;
      const missingRatings = myReviews.filter((r) => r.rating === null).length;

      let errorMessage = "Cannot export performance agreement:\n\n";
      if (missingApprovals > 0) {
        errorMessage += `• ${missingApprovals} agreement(s) not yet approved by supervisor\n`;
      }
      if (missingRatings > 0) {
        errorMessage += `• ${missingRatings} agreement(s) not yet rated by supervisor\n`;
      }
      errorMessage +=
        "\nAll agreements must be approved and rated before export.";

      toast({ title: errorMessage, variant: "destructive" });
      return;
    }

    // Fetch the full performance rate breakdown (all 5 components)
    let myRateData: any = null;
    try {
      const rateRes = await fetch(
        "/dashboard/performance/api/performance-agreements/my-rate",
      );
      if (rateRes.ok) {
        myRateData = await rateRes.json();
      }
    } catch (error) {
      console.error("Error fetching my-rate data:", error);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("INDIVIDUAL PERFORMANCE AGREEMENT (RATED)", 105, 20, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Employee: ${session.user.name}`, 14, 35);
    doc.text(`Email: ${session.user.email}`, 14, 42);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 49);

    // Use the full weighted total from all 5 components if available
    const finalRating = myRateData?.finalRating ?? 0;
    const finalPercentage = myRateData?.finalPercentage ?? 0;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    if (myRateData) {
      doc.text(
        `Overall Performance Score: ${finalRating.toFixed(2)} / 5.0  (${finalPercentage.toFixed(1)}%)`,
        14,
        60,
      );
    } else {
      const totalRate = myReviews.reduce((sum, r) => {
        return sum + ((r.rating || 0) * (r.weight || 0)) / 100;
      }, 0);
      doc.text(
        `Overall Performance Rate: ${totalRate.toFixed(2)} / 5.0`,
        14,
        60,
      );
    }

    // Prepare table data
    const tableData = myReviews.map((agreement, index) => [
      (index + 1).toString(),
      agreement.title || "N/A",
      agreement.kpi || "N/A",
      agreement.target || "N/A",
      `${agreement.weight || 0}%`,
      new Date(agreement.dueDate).toLocaleDateString(),
      agreement.rating?.toString() || "N/A",
    ]);

    // Generate table
    autoTable(doc, {
      startY: 70,
      head: [
        ["#", "Initiative", "KPI", "Target", "Weight", "Due Date", "Rating"],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
        6: { cellWidth: 15 },
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY || 70;

    // Add Ad-hoc Tasks section if there are any
    if (myAdhocTasks.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("AD-HOC TASKS (COMPLETED & RATED)", 14, finalY + 15);

      // Prepare adhoc tasks table data
      const adhocTableData = myAdhocTasks.map((task, index) => [
        (index + 1).toString(),
        task.title || "N/A",
        task.description || "N/A",
        task.priority || "N/A",
        task.completedAt
          ? new Date(task.completedAt).toLocaleDateString()
          : "N/A",
        task.rating?.toString() || "N/A",
      ]);

      // Generate adhoc tasks table
      autoTable(doc, {
        startY: finalY + 20,
        head: [["#", "Task", "Description", "Priority", "Completed", "Rating"]],
        body: adhocTableData,
        theme: "grid",
        headStyles: {
          fillColor: [46, 125, 50],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 20 },
        },
      });

      finalY = (doc as any).lastAutoTable.finalY || finalY + 40;
    }

    // ============================================
    // OVERALL PERFORMANCE SCORE SUMMARY (All 5 Components)
    // ============================================
    if (myRateData) {
      doc.addPage();
      finalY = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 128, 185);
      doc.text("OVERALL PERFORMANCE SCORE SUMMARY", pageWidth / 2, finalY, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
      finalY += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Employee: ${session.user.name}`, 14, finalY);
      doc.text(
        `Date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
        pageWidth - 14,
        finalY,
        { align: "right" },
      );
      finalY += 10;

      const comp = myRateData.components;
      const wts = myRateData.weights;

      const summaryData = [
        [
          "Performance Agreements",
          `${wts.performanceAgreement}%`,
          `${comp.performanceAgreement.rating.toFixed(2)} / 5`,
          `${comp.performanceAgreement.weightedScore.toFixed(2)}`,
          `${comp.performanceAgreement.ratedCount || 0}/${comp.performanceAgreement.initiativesCount} rated`,
        ],
        [
          "Ad-hoc Tasks",
          `${wts.adhoc}%`,
          `${comp.adhoc.rating.toFixed(2)} / 5`,
          `${comp.adhoc.weightedScore.toFixed(2)}`,
          `${comp.adhoc.tasksCompleted}/${comp.adhoc.tasksTotal} completed (${comp.adhoc.completionRate.toFixed(0)}%)`,
        ],
        [
          "Projects",
          `${wts.projects}%`,
          `${comp.projects.rating.toFixed(2)} / 5`,
          `${comp.projects.weightedScore.toFixed(2)}`,
          comp.projects.tasksTotal > 0
            ? `${comp.projects.tasksCompleted}/${comp.projects.tasksTotal} completed`
            : "No project tasks",
        ],
        [
          "Risk Management",
          `${wts.riskManagement}%`,
          `${comp.riskManagement.rating.toFixed(2)} / 5`,
          `${comp.riskManagement.weightedScore.toFixed(2)}`,
          comp.riskManagement.tasksTotal > 0
            ? `${comp.riskManagement.tasksCompleted}/${comp.riskManagement.tasksTotal} completed`
            : "No risk tasks",
        ],
        [
          "Audit Tasks",
          `${wts.audit}%`,
          `${comp.audit.rating.toFixed(2)} / 5`,
          `${comp.audit.weightedScore.toFixed(2)}`,
          comp.audit.tasksTotal > 0
            ? `${comp.audit.tasksCompleted}/${comp.audit.tasksTotal} completed`
            : "No audit tasks",
        ],
        [
          "360-Degree Rating",
          `${wts.rating360}%`,
          `${comp.rating360.rating.toFixed(2)} / 5`,
          `${comp.rating360.weightedScore.toFixed(2)}`,
          comp.rating360.hasAnyRatings
            ? comp.rating360.hasCompleted
              ? "Completed"
              : "In progress"
            : "Not started",
        ],
        [
          "OVERALL TOTAL",
          "100%",
          `${myRateData.finalRating.toFixed(2)} / 5`,
          `${myRateData.finalRating.toFixed(2)}`,
          `${myRateData.finalPercentage.toFixed(1)}%`,
        ],
      ];

      autoTable(doc, {
        startY: finalY,
        head: [["Component", "Weight", "Rating", "Weighted Score", "Details"]],
        body: summaryData,
        theme: "grid",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
          halign: "center",
          cellPadding: 3,
        },
        bodyStyles: { fontSize: 9, cellPadding: 3, valign: "middle" },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: "bold" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 30, halign: "center" },
          4: { cellWidth: 55 },
        },
        margin: { left: 14, right: 14 },
        didParseCell: function (data: any) {
          if (data.row.index === summaryData.length - 1) {
            data.cell.styles.fillColor = [41, 128, 185];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 10;
          }
        },
      });

      finalY = (doc as any).lastAutoTable.finalY || finalY + 60;

      finalY += 8;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const perfLevel =
        myRateData.finalRating >= 4.5
          ? "Outstanding"
          : myRateData.finalRating >= 4.0
            ? "Excellent"
            : myRateData.finalRating >= 3.5
              ? "Very Good"
              : myRateData.finalRating >= 3.0
                ? "Good"
                : myRateData.finalRating >= 2.5
                  ? "Satisfactory"
                  : "Needs Improvement";

      doc.setTextColor(41, 128, 185);
      doc.text(`Performance Level: ${perfLevel}`, pageWidth / 2, finalY, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);

      finalY += 12;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Rating Scale:  1 = Unacceptable  |  2 = Needs Improvement  |  3 = Good  |  4 = Excellent  |  5 = Outstanding",
        pageWidth / 2,
        finalY,
        { align: "center" },
      );
      doc.setTextColor(0, 0, 0);

      // ============================================
      // 360-DEGREE RATING DETAILED BREAKDOWN
      // ============================================
      const r360 = myRateData.rating360Detail;
      if (r360) {
        doc.addPage();
        finalY = 20;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 128, 185);
        doc.text("360-DEGREE RATING BREAKDOWN", pageWidth / 2, finalY, {
          align: "center",
        });
        doc.setTextColor(0, 0, 0);
        finalY += 10;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Employee: ${session.user.name}`, 14, finalY);
        doc.text(`Cycle: ${r360.cycleName}`, pageWidth / 2, finalY, {
          align: "center",
        });
        doc.text(`Status: ${r360.status}`, pageWidth - 14, finalY, {
          align: "right",
        });
        finalY += 8;

        // Rater breakdown table
        const raterRows: any[] = [];
        if (r360.selfRating !== null && r360.selfRating !== undefined) {
          raterRows.push([
            "Self Rating",
            `${Number(r360.selfRating).toFixed(2)} / 5`,
            "1 respondent",
          ]);
        }
        if (
          r360.supervisorRating !== null &&
          r360.supervisorRating !== undefined
        ) {
          raterRows.push([
            "Supervisor Rating",
            `${Number(r360.supervisorRating).toFixed(2)} / 5`,
            "1 respondent",
          ]);
        }
        if (r360.peerAverage !== null && r360.peerAverage !== undefined) {
          raterRows.push([
            "Peer Rating (Average)",
            `${Number(r360.peerAverage).toFixed(2)} / 5`,
            `${r360.peerCount} respondent(s)`,
          ]);
        }
        if (
          r360.subordinateAverage !== null &&
          r360.subordinateAverage !== undefined
        ) {
          raterRows.push([
            "Subordinate Rating (Average)",
            `${Number(r360.subordinateAverage).toFixed(2)} / 5`,
            `${r360.subordinateCount} respondent(s)`,
          ]);
        }
        if (r360.averageRating !== null && r360.averageRating !== undefined) {
          raterRows.push([
            "Overall 360 Average",
            `${Number(r360.averageRating).toFixed(2)} / 5`,
            "All raters combined",
          ]);
        }

        if (raterRows.length > 0) {
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text("Rating by Rater Type", 14, finalY);
          finalY += 2;

          autoTable(doc, {
            startY: finalY,
            head: [["Rater Type", "Rating", "Respondents"]],
            body: raterRows,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 10,
              halign: "center",
              cellPadding: 3,
            },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: "middle" },
            columnStyles: {
              0: { cellWidth: 55, fontStyle: "bold" },
              1: { cellWidth: 30, halign: "center" },
              2: { cellWidth: 45, halign: "center" },
            },
            margin: { left: 14, right: 14 },
            didParseCell: function (data: any) {
              if (
                data.row.index === raterRows.length - 1 &&
                raterRows[raterRows.length - 1][0] === "Overall 360 Average"
              ) {
                data.cell.styles.fillColor = [230, 240, 250];
                data.cell.styles.fontStyle = "bold";
              }
            },
          });

          finalY = (doc as any).lastAutoTable.finalY || finalY + 40;
        }

        // Competency / Category breakdown
        const breakdownData =
          r360.competencyBreakdown?.length > 0
            ? r360.competencyBreakdown
            : r360.categoryBreakdown?.length > 0
              ? r360.categoryBreakdown.map((c: any) => ({
                  competency: c.category,
                  averageScore: c.averageScore,
                  responseCount: c.responseCount,
                }))
              : [];

        if (breakdownData.length > 0) {
          finalY += 10;
          if (finalY + 30 > pageHeight - 20) {
            doc.addPage();
            finalY = 20;
          }

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text("Competency / Category Scores", 14, finalY);
          finalY += 2;

          const compRows = breakdownData.map((c: any) => [
            c.competency || c.category || "General",
            c.averageScore !== null
              ? `${Number(c.averageScore).toFixed(2)} / 5`
              : "N/A",
            `${c.responseCount} response(s)`,
          ]);

          autoTable(doc, {
            startY: finalY,
            head: [["Competency / Category", "Average Score", "Responses"]],
            body: compRows,
            theme: "grid",
            headStyles: {
              fillColor: [46, 125, 50],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 10,
              halign: "center",
              cellPadding: 3,
            },
            bodyStyles: { fontSize: 9, cellPadding: 3, valign: "middle" },
            columnStyles: {
              0: { cellWidth: 70 },
              1: { cellWidth: 30, halign: "center" },
              2: { cellWidth: 30, halign: "center" },
            },
            margin: { left: 14, right: 14 },
          });

          finalY = (doc as any).lastAutoTable.finalY || finalY + 40;
        }
      }
    }

    // Save the PDF
    doc.save(
      `Performance_Agreement_Rated_${session.user.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  if (loading) {
    return <div className="p-3 sm:p-4 lg:p-6">Loading...</div>;
  }

  // Filter users based on status
  const filteredUsers = reviewsToComplete.filter((user) => {
    switch (statusFilter) {
      case "ready":
        return user.allApproved && user.totalAgreements > 0;
      case "not-ready":
        return user.totalAgreements === 0;
      case "pending":
        return user.totalAgreements > 0 && !user.allApproved;
      default:
        return true;
    }
  });

  // Calculate statistics
  const stats = {
    total: reviewsToComplete.length,
    readyForRating: reviewsToComplete.filter(
      (u) => u.allApproved && u.totalAgreements > 0,
    ).length,
    notReady: reviewsToComplete.filter((u) => u.totalAgreements === 0).length,
    pendingApproval: reviewsToComplete.filter(
      (u) => u.totalAgreements > 0 && !u.allApproved,
    ).length,
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            Performance Reviews
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">
            Manage and view performance reviews
          </p>
        </div>
        {/* Export Button - Always visible, grayed out when not ready */}
        {myReviews.length > 0 && (
          <Button
            onClick={handleExportPerformanceAgreement}
            className={`flex items-center gap-2 ${
              myReviews.every(
                (r) => r.approvalStatus === "APPROVED" && r.rating !== null,
              )
                ? "text-white hover:opacity-90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
            }`}
            style={
              myReviews.every(
                (r) => r.approvalStatus === "APPROVED" && r.rating !== null,
              )
                ? { backgroundColor: colors.navyLightest }
                : {}
            }
          >
            <Download className="w-4 h-4" />
            Export Rated Performance Agreement
          </Button>
        )}
      </div>

      <Tabs defaultValue="my-reviews" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-reviews" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            My Review
          </TabsTrigger>
          <TabsTrigger value="to-complete" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Reviews to Complete
            {stats.readyForRating > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.readyForRating}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Reviews to Complete Tab */}
        <TabsContent value="to-complete" className="space-y-4 mt-6">
          {/* Filter Cards */}
          {reviewsToComplete.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card
                className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2" : "hover:shadow-md"}`}
                onClick={() => setStatusFilter("all")}
                style={
                  statusFilter === "all"
                    ? ({
                        "--tw-ring-color": colors.navyLightest,
                      } as React.CSSProperties)
                    : {}
                }
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {stats.total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All Employees
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${statusFilter === "ready" ? "ring-2" : "hover:shadow-md"}`}
                onClick={() => setStatusFilter("ready")}
                style={
                  statusFilter === "ready"
                    ? ({
                        "--tw-ring-color": colors.navyLightest,
                      } as React.CSSProperties)
                    : {}
                }
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.readyForRating}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agreements Complete
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2" : "hover:shadow-md"}`}
                onClick={() => setStatusFilter("pending")}
                style={
                  statusFilter === "pending"
                    ? ({
                        "--tw-ring-color": colors.navyLightest,
                      } as React.CSSProperties)
                    : {}
                }
              >
                <CardContent className="p-4 text-center">
                  <p
                    className="text-2xl font-bold"
                    style={{ color: colors.navyLightest }}
                  >
                    {stats.pendingApproval}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agreements Pending
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${statusFilter === "not-ready" ? "ring-2" : "hover:shadow-md"}`}
                onClick={() => setStatusFilter("not-ready")}
                style={
                  statusFilter === "not-ready"
                    ? ({
                        "--tw-ring-color": colors.navyLightest,
                      } as React.CSSProperties)
                    : {}
                }
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.notReady}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No Agreements
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {reviewsToComplete.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No reviews to complete
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Performance reviews assigned to you will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    No employees in this category
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Try selecting a different filter
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handleOpenReview(user)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header with name and job title */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="w-4 h-4 text-gray-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.jobTitle || "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Agreement Completion Status Badge */}
                      <div className="flex justify-center">
                        {user.totalAgreements === 0 ? (
                          <Badge className="bg-gray-500 text-white text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            No Agreements
                          </Badge>
                        ) : user.allApproved ? (
                          <Badge className="bg-green-600 text-white text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Agreements Complete
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 text-white text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Agreements Incomplete
                          </Badge>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold text-foreground">
                            {user.totalAgreements}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">
                            Approved
                          </p>
                          <p className="text-lg font-bold text-green-600">
                            {user.approvedCount}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">
                            Pending
                          </p>
                          <p className="text-lg font-bold text-amber-600">
                            {user.totalAgreements - user.approvedCount}
                          </p>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="text-center pt-2 border-t">
                        <p
                          className="text-xs text-gray-500 truncate"
                          title={
                            user.department?.name ||
                            user.division?.name ||
                            "No department assigned"
                          }
                        >
                          {user.department?.name ||
                            user.division?.name ||
                            "No department"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Reviews Tab */}
        <TabsContent value="my-reviews" className="space-y-4 mt-6">
          {myReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No reviews found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Your performance reviews will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Performance Rate Card */}
                <Card
                  className={`bg-linear-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer transition-all ${
                    myReviewsFilter === "all"
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setMyReviewsFilter("all")}
                >
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 font-medium mb-1">
                      Overall Performance Rate
                    </p>
                    <p className="text-4xl font-bold text-blue-900">
                      {(() => {
                        const ratedAgreements = myReviews.filter(
                          (r) => r.rating !== null,
                        );
                        if (ratedAgreements.length === 0) return "0.0";

                        const totalRate = ratedAgreements.reduce((sum, r) => {
                          return (
                            sum + ((r.rating || 0) * (r.weight || 0)) / 100
                          );
                        }, 0);

                        return totalRate.toFixed(1);
                      })()}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Out of 100% Total Weight
                    </p>
                  </CardContent>
                </Card>

                {/* Rated Count Card */}
                <Card
                  className={`bg-linear-to-br from-green-50 to-green-100 border-green-200 cursor-pointer transition-all ${
                    myReviewsFilter === "completed"
                      ? "ring-2 ring-green-500 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setMyReviewsFilter("completed")}
                >
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Rated Items
                    </p>
                    <p className="text-4xl font-bold text-green-900">
                      {myReviews.filter((r) => r.rating !== null).length +
                        myAdhocTasks.length}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      {myReviews.filter((r) => r.rating !== null).length}{" "}
                      Agreements + {myAdhocTasks.length} Ad-hoc Tasks
                    </p>
                  </CardContent>
                </Card>

                {/* Unrated Count Card */}
                <Card
                  className={`bg-linear-to-br from-amber-50 to-amber-100 border-amber-200 cursor-pointer transition-all ${
                    myReviewsFilter === "pending"
                      ? "ring-2 ring-amber-500 shadow-lg"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setMyReviewsFilter("pending")}
                >
                  <CardContent className="p-6 text-center">
                    <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm text-amber-700 font-medium mb-1">
                      Pending Rating
                    </p>
                    <p className="text-4xl font-bold text-amber-900">
                      {myReviews.filter((r) => r.rating === null).length}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      Awaiting Review
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quarter Filter Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(
                  [
                    {
                      key: "q1",
                      label: "Q1",
                      months: "Apr – Jun",
                      range: [4, 5, 6],
                      from: "from-purple-50",
                      to: "to-purple-100",
                      border: "border-purple-200",
                      ring: "ring-purple-500",
                      icon: "text-purple-600",
                      title: "text-purple-700",
                      count: "text-purple-900",
                      sub: "text-purple-600",
                    },
                    {
                      key: "q2",
                      label: "Q2",
                      months: "Jul – Sep",
                      range: [7, 8, 9],
                      from: "from-indigo-50",
                      to: "to-indigo-100",
                      border: "border-indigo-200",
                      ring: "ring-indigo-500",
                      icon: "text-indigo-600",
                      title: "text-indigo-700",
                      count: "text-indigo-900",
                      sub: "text-indigo-600",
                    },
                    {
                      key: "q3",
                      label: "Q3",
                      months: "Oct – Dec",
                      range: [10, 11, 12],
                      from: "from-teal-50",
                      to: "to-teal-100",
                      border: "border-teal-200",
                      ring: "ring-teal-500",
                      icon: "text-teal-600",
                      title: "text-teal-700",
                      count: "text-teal-900",
                      sub: "text-teal-600",
                    },
                    {
                      key: "q4",
                      label: "Q4",
                      months: "Jan – Mar",
                      range: [1, 2, 3],
                      from: "from-rose-50",
                      to: "to-rose-100",
                      border: "border-rose-200",
                      ring: "ring-rose-500",
                      icon: "text-rose-600",
                      title: "text-rose-700",
                      count: "text-rose-900",
                      sub: "text-rose-600",
                    },
                  ] as const
                ).map((q) => {
                  const qCount = myReviews.filter((r) => {
                    if (!r.dueDate) return false;
                    const m = new Date(r.dueDate).getMonth() + 1;
                    return (q.range as readonly number[]).includes(m);
                  }).length;
                  return (
                    <Card
                      key={q.key}
                      className={`bg-linear-to-br ${q.from} ${q.to} ${q.border} cursor-pointer transition-all ${
                        myReviewsFilter === q.key
                          ? `ring-2 ${q.ring} shadow-lg`
                          : "hover:shadow-md"
                      }`}
                      onClick={() => setMyReviewsFilter(q.key)}
                    >
                      <CardContent className="p-5 text-center">
                        <Calendar
                          className={`w-7 h-7 ${q.icon} mx-auto mb-2`}
                        />
                        <p className={`text-sm font-bold ${q.title} mb-0.5`}>
                          {q.label}
                        </p>
                        <p className={`text-3xl font-bold ${q.count}`}>
                          {qCount}
                        </p>
                        <p className={`text-xs ${q.sub} mt-1`}>{q.months}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Agreement Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myReviews
                  .filter((review) => {
                    if (myReviewsFilter === "completed")
                      return review.rating !== null;
                    if (myReviewsFilter === "pending")
                      return review.rating === null;
                    if (myReviewsFilter === "q1")
                      return (
                        !!review.dueDate &&
                        [1, 2, 3].includes(
                          new Date(review.dueDate).getMonth() + 1,
                        )
                      );
                    if (myReviewsFilter === "q2")
                      return (
                        !!review.dueDate &&
                        [4, 5, 6].includes(
                          new Date(review.dueDate).getMonth() + 1,
                        )
                      );
                    if (myReviewsFilter === "q3")
                      return (
                        !!review.dueDate &&
                        [7, 8, 9].includes(
                          new Date(review.dueDate).getMonth() + 1,
                        )
                      );
                    if (myReviewsFilter === "q4")
                      return (
                        !!review.dueDate &&
                        [10, 11, 12].includes(
                          new Date(review.dueDate).getMonth() + 1,
                        )
                      );
                    return true;
                  })
                  .map((review) => (
                    <Card
                      key={review.id}
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedMyReview(review);
                        setMyReviewDetailOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header with title */}
                          <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm line-clamp-2">
                                {review.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-1">
                                {review.initiative?.objective?.goal?.goalNumber}{" "}
                                - {review.initiative?.objective?.goal?.title}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="flex justify-center">
                            {review.rating ? (
                              <Badge className="bg-green-500 text-white text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Rated
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Rating
                              </Badge>
                            )}
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Weight
                              </p>
                              <p
                                className="text-lg font-bold"
                                style={{ color: colors.navyLightest }}
                              >
                                {review.weight}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                Rating
                              </p>
                              {review.rating ? (
                                <p className="text-lg font-bold text-green-600">
                                  {review.rating}/5
                                </p>
                              ) : (
                                <p className="text-lg font-bold text-gray-400">
                                  -
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Due Date */}
                          <div className="text-center pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Due Date
                            </p>
                            <p className="text-xs text-foreground font-medium">
                              {new Date(review.dueDate).toLocaleDateString()}
                            </p>
                          </div>

                          {/* KPI if exists */}
                          {review.kpi && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-gray-500 mb-1">KPI</p>
                              <p className="text-xs text-gray-700 line-clamp-2">
                                {review.kpi}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Ad-hoc Tasks Section */}
              {myAdhocTasks.length > 0 && (
                <div className="space-y-4 mt-8">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Ad-hoc Tasks (Completed & Rated)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {myAdhocTasks.map((task) => (
                      <Card
                        key={task.id}
                        className="hover:shadow-lg transition-all cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header with title */}
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm line-clamp-2">
                                  {task.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Ad-hoc Task
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex justify-center">
                              <Badge className="bg-green-500 text-white text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  Priority
                                </p>
                                <p
                                  className={`text-sm font-bold ${
                                    task.priority === "HIGH"
                                      ? "text-red-600"
                                      : task.priority === "MEDIUM"
                                        ? "text-amber-600"
                                        : "text-foreground"
                                  }`}
                                >
                                  {task.priority}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">
                                  Rating
                                </p>
                                <p className="text-lg font-bold text-green-600">
                                  {task.rating}/5
                                </p>
                              </div>
                            </div>

                            {/* Completed Date */}
                            <div className="text-center pt-2 border-t">
                              <p className="text-xs text-muted-foreground">
                                Completed
                              </p>
                              <p className="text-xs text-foreground font-medium">
                                {task.completedAt
                                  ? new Date(
                                      task.completedAt,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </p>
                            </div>

                            {/* Description if exists */}
                            {task.description && (
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Description
                                </p>
                                <p className="text-xs text-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog - Subordinate's Performance Agreements */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Performance Agreements — {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
              <span>{selectedUser?.jobTitle || "—"}</span>
              <span className="text-gray-300">|</span>
              <span>{selectedUser?.email}</span>
              <span className="text-gray-300">|</span>
              <span>
                {selectedUser?.department?.name ||
                  selectedUser?.division?.name ||
                  "No Department"}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Stats */}
            <div
              className="grid grid-cols-4 gap-3 p-4 rounded-lg"
              style={{ backgroundColor: "#f0f4fa" }}
            >
              <div className="text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {selectedUser?.totalAgreements || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {selectedUser?.approvedCount || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {(selectedUser?.totalAgreements || 0) -
                    (selectedUser?.approvedCount || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Status</p>
                {selectedUser?.allApproved ? (
                  <Badge className="bg-green-600 text-white text-xs mt-1">
                    Complete
                  </Badge>
                ) : selectedUser?.totalAgreements === 0 ? (
                  <Badge className="bg-gray-500 text-white text-xs mt-1">
                    None
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500 text-white text-xs mt-1">
                    Incomplete
                  </Badge>
                )}
              </div>
            </div>

            {/* Agreements List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base text-foreground">
                Performance Agreements
              </h3>
              {!selectedUser?.performanceAgreements ||
              selectedUser.performanceAgreements.length === 0 ? (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">
                    No Agreements Found
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {selectedUser?.name} has no performance agreements for the
                    current period.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedUser.performanceAgreements.map(
                    (agreement, index) => (
                      <div
                        key={agreement.id}
                        className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400">
                                #{index + 1}
                              </span>
                              <p className="font-medium text-sm">
                                {agreement.title}
                              </p>
                            </div>
                            {agreement.initiative?.objective?.goal && (
                              <p className="text-xs text-gray-500 mt-1">
                                {agreement.initiative.objective.goal.goalNumber}{" "}
                                — {agreement.initiative.objective.goal.title}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                              {agreement.weight != null && (
                                <span>
                                  Weight:{" "}
                                  <strong className="text-foreground">
                                    {agreement.weight}%
                                  </strong>
                                </span>
                              )}
                              <span>
                                Due:{" "}
                                <strong className="text-foreground">
                                  {new Date(
                                    agreement.dueDate,
                                  ).toLocaleDateString()}
                                </strong>
                              </span>
                              <span>
                                Status:{" "}
                                <strong className="text-foreground">
                                  {agreement.status?.replace("_", " ") ||
                                    "NOT STARTED"}
                                </strong>
                              </span>
                            </div>
                            {agreement.kpi && (
                              <p className="text-xs text-gray-500 mt-1">
                                KPI: {agreement.kpi}
                              </p>
                            )}
                            {agreement.target && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Target: {agreement.target}
                              </p>
                            )}
                            {agreement.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {agreement.description}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            {agreement.approvalStatus === "APPROVED" ? (
                              <Badge className="bg-green-600 text-white text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            ) : agreement.approvalStatus === "PENDING" ? (
                              <Badge className="bg-blue-500 text-white text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending Approval
                              </Badge>
                            ) : agreement.approvalStatus === "REJECTED" ? (
                              <Badge className="bg-red-500 text-white text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-400 text-white text-xs">
                                Not Submitted
                              </Badge>
                            )}
                            {agreement.rating != null && (
                              <Badge className="bg-purple-500 text-white text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Rated {agreement.rating}/5
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My Review Detail Dialog */}
      <Dialog open={myReviewDetailOpen} onOpenChange={setMyReviewDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedMyReview?.title}
            </DialogTitle>
            <DialogDescription>Performance Agreement Details</DialogDescription>
          </DialogHeader>

          {selectedMyReview && (
            <div className="space-y-4">
              {/* Goal Information */}
              {selectedMyReview.initiative?.objective?.goal && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Strategic Goal
                  </h4>
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">
                      {selectedMyReview.initiative.objective.goal.goalNumber}
                    </span>{" "}
                    - {selectedMyReview.initiative.objective.goal.title}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedMyReview.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-700">
                    {selectedMyReview.description}
                  </p>
                </div>
              )}

              {/* KPI */}
              {selectedMyReview.kpi && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Key Performance Indicator (KPI)
                  </h4>
                  <p className="text-sm text-gray-700">
                    {selectedMyReview.kpi}
                  </p>
                </div>
              )}

              {/* Target */}
              {selectedMyReview.target && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Target</h4>
                  <p className="text-sm text-gray-700">
                    {selectedMyReview.target}
                  </p>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Weight</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedMyReview.weight}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  {selectedMyReview.rating ? (
                    <p className="text-2xl font-bold text-green-600">
                      {selectedMyReview.rating}/5
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-gray-400">-</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {selectedMyReview.rating ? (
                    <Badge className="bg-green-500 text-white">Rated</Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white">Pending</Badge>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-sm font-semibold text-purple-900">
                  Due Date:
                </span>
                <span className="text-sm text-purple-800">
                  {new Date(selectedMyReview.dueDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>

              {/* Approval Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-semibold text-gray-900">
                  Approval Status:
                </span>
                <Badge
                  className={
                    selectedMyReview.approvalStatus === "APPROVED"
                      ? "bg-green-500 text-white"
                      : selectedMyReview.approvalStatus === "REJECTED"
                        ? "bg-red-500 text-white"
                        : "bg-yellow-500 text-white"
                  }
                >
                  {selectedMyReview.approvalStatus || "PENDING"}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMyReviewDetailOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
