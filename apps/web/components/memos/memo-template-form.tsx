"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X, Save, Send, Trash2, Calendar as CalendarIcon, UserCheck, ChevronDown, ChevronUp, FileText, GitBranch } from "lucide-react";
import { MemoFormData, ThroughPerson, SignatureInfo, MemoAttachment } from "@/types/memo.types";
import { SignatureBlock } from "@/components/memos/signature-block";
import { SubmitApprovalDialog } from "@/components/memos/submit-approval-dialog";
import { WorkflowTracker, WorkflowType, detectWorkflowType, getInitialSubmissionStatus } from "@/components/memos/workflow-tracker";
import { UserAutocomplete } from "@/components/memos/user-autocomplete";
import { useAuth } from "@/lib/auth-context";
import {
  getTodayISO,
  calculateAvailableFunds,
  shouldRouteToCouncil,
  formatCurrency,
} from "@/lib/memo-helpers";

interface MemoTemplateFormProps {
  memoId?: string;
  initialData?: Partial<MemoFormData>;
  onSuccess?: () => void;
}

export function MemoTemplateForm({ memoId, initialData, onSuccess }: MemoTemplateFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMemoId, setSavedMemoId] = useState<string | null>(memoId || null);

  const [formData, setFormData] = useState<MemoFormData>({
    memoTo: initialData?.memoTo || "",
    memoToTitle: initialData?.memoToTitle || "",
    memoThrough: initialData?.memoThrough || [],
    memoFrom: initialData?.memoFrom || "",
    memoFromTitle: initialData?.memoFromTitle || "",
    memoDate: initialData?.memoDate || getTodayISO(),
    subject: initialData?.subject || "",
    purpose: initialData?.purpose || "",
    procurementActivity: initialData?.procurementActivity || "",
    budgetVote: initialData?.budgetVote || "",
    budgetedAmount: initialData?.budgetedAmount || "",
    amountSpent: initialData?.amountSpent || "",
    availableFunds: initialData?.availableFunds || "",
    executiveName: initialData?.executiveName || "",
    financialVerification: initialData?.financialVerification || "",
    budgetApproved: initialData?.budgetApproved || "",
    financialComments: initialData?.financialComments || "",
    executiveSignatureDate: initialData?.executiveSignatureDate || "",
    recommendation: initialData?.recommendation || "",
    status: initialData?.status || "DRAFT",
    priority: initialData?.priority || "NORMAL",
    initiatorSignature: initialData?.initiatorSignature || {
      name: "",
      position: "",
    },
    throughSignatures: initialData?.throughSignatures || [],
    recipientSignature: initialData?.recipientSignature || {
      name: "", 
      position: "PMU (Procurement)", 
      department: "Procurement Management Unit"
    },
    financeSignature: initialData?.financeSignature || {
      name: "",
      position: "Executive: Finance and Administration",
      department: "Finance and Administration"
    },
  });
  
  const [showSignatures, setShowSignatures] = useState(true);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size: number; type: string }>>(
    (initialData as any)?.attachments || []
  );
  const [isUploading, setIsUploading] = useState(false);
  
  // Workflow state
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [workflowType, setWorkflowType] = useState<WorkflowType>(() => 
    detectWorkflowType(
      (initialData as any)?.templateId, 
      initialData?.budgetedAmount, 
      initialData?.priority
    )
  );

  // Auto-detect workflow type when relevant fields change
  useEffect(() => {
    const detectedType = detectWorkflowType(
      undefined, // No template ID available in form after initial load
      formData.budgetedAmount,
      formData.priority
    );
    // Only auto-update if it's a meaningful change (from standard to specific)
    if (detectedType !== "standard" && workflowType === "standard") {
      setWorkflowType(detectedType);
    }
  }, [formData.budgetedAmount, formData.priority, workflowType]);


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach((file) => formDataUpload.append("files", file));

      const response = await fetch("/api/memos/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      if (data.success && data.files) {
        setAttachments((prev) => [...prev, ...data.files]);
      }
    } catch (err) {
      setError("Failed to upload file(s)");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Auto-fill FROM field from current user
  useEffect(() => {
    if (user && !formData.memoFrom) {
      const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "";
      const userPosition = (user as any).position || user.jobTitle || "";
      setFormData((prev) => ({
        ...prev,
        memoFrom: displayName,
        memoFromTitle: userPosition,
        initiatorSignature: {
          ...prev.initiatorSignature,
          name: displayName,
          position: userPosition,
        },
      }));
    }
  }, [user, formData.memoFrom]); 

  // Auto-calculate available funds
  useEffect(() => {
    if (formData.budgetedAmount && formData.amountSpent) {
      const available = calculateAvailableFunds(formData.budgetedAmount, formData.amountSpent);
      setFormData((prev) => ({ ...prev, availableFunds: available }));
    }
  }, [formData.budgetedAmount, formData.amountSpent]);
  
  // Auto-generate signatures for each person in the through chain
  useEffect(() => {
    // Create signature blocks for each person in the through chain
    const signatures = formData.memoThrough.map(person => ({
      name: person.name,
      position: person.title,
      department: "",
      signed: false,
      signatureDate: "",
    }));
    
    // Only update if the signatures don't match (to avoid infinite loop)
    if (signatures.length !== formData.throughSignatures?.length ||
        JSON.stringify(signatures.map(s => s.name + s.position)) !== 
        JSON.stringify(formData.throughSignatures?.map(s => s.name + s.position))) {
      setFormData(prev => ({
        ...prev,
        throughSignatures: signatures,
      }));
    }
  }, [formData.memoThrough]);

  const handleInputChange = (field: keyof MemoFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addThroughPerson = () => {
    setFormData((prev) => ({
      ...prev,
      memoThrough: [...prev.memoThrough, { name: "", title: "" }],
    }));
  };

  const removeThroughPerson = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      memoThrough: prev.memoThrough.filter((_, i) => i !== index),
    }));
  };

  const updateThroughPerson = (index: number, field: keyof ThroughPerson, value: string) => {
    setFormData((prev) => ({
      ...prev,
      memoThrough: prev.memoThrough.map((person, i) =>
        i === index ? { ...person, [field]: value } : person
      ),
    }));
  };
  
  const updateSignature = (type: 'initiator' | 'recipient' | 'finance', updatedSignature: SignatureInfo) => {
    setFormData((prev) => ({
      ...prev,
      [type === 'initiator' ? 'initiatorSignature' : 
       type === 'recipient' ? 'recipientSignature' : 'financeSignature']: updatedSignature,
    }));
  };

  const updateThroughSignature = (index: number, updatedSignature: SignatureInfo) => {
    setFormData((prev) => ({
      ...prev,
      throughSignatures: prev.throughSignatures?.map((signature, i) => 
        i === index ? updatedSignature : signature
      ) || [],
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.memoTo || !formData.memoFrom || !formData.subject || !formData.purpose || !formData.recommendation) {
      setError("Please fill in all required fields (To, From, Subject, Purpose, Recommendation)");
      return false;
    }
    if (!formData.department || !formData.position) {
      setError("Department and Position are required fields");
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const url = memoId ? `/api/memos/${memoId}` : "/api/memos";
      const method = memoId ? "PUT" : "POST";

      const payload: any = {
        ...formData,
        budgetedAmount: formData.budgetedAmount ? Number(formData.budgetedAmount) : undefined,
        amountSpent: formData.amountSpent ? Number(formData.amountSpent) : undefined,
        availableFunds: formData.availableFunds ? Number(formData.availableFunds) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdById: user?.id,
        status: "DRAFT",
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key];
        }
      });

      payload.memoTo = formData.memoTo || '';
      payload.memoFrom = formData.memoFrom || '';
      payload.subject = formData.subject || '';
      payload.purpose = formData.purpose || '';
      payload.recommendation = formData.recommendation || '';
      payload.createdById = user?.id;
      payload.status = "DRAFT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save memo");

      const savedMemo = await response.json();
      setSavedMemoId(savedMemo.id);
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/memos/${savedMemo.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save memo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndGetId = async (): Promise<string | null> => {
    if (!validateForm()) return null;

    setIsSubmitting(true);
    setError(null);

    try {
      const url = savedMemoId ? `/api/memos/${savedMemoId}` : "/api/memos";
      const method = savedMemoId ? "PUT" : "POST";

      const payload: any = {
        ...formData,
        budgetedAmount: formData.budgetedAmount ? Number(formData.budgetedAmount) : undefined,
        amountSpent: formData.amountSpent ? Number(formData.amountSpent) : undefined,
        availableFunds: formData.availableFunds ? Number(formData.availableFunds) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdById: user?.id,
        status: "DRAFT",
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key];
        }
      });

      payload.memoTo = formData.memoTo || '';
      payload.memoFrom = formData.memoFrom || '';
      payload.subject = formData.subject || '';
      payload.purpose = formData.purpose || '';
      payload.recommendation = formData.recommendation || '';
      payload.createdById = user?.id;
      payload.status = "DRAFT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save memo");

      const saved = await response.json();
      setSavedMemoId(saved.id);
      return saved.id;
    } catch (err: any) {
      setError(err.message || "Failed to save memo");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const url = memoId ? `/api/memos/${memoId}` : "/api/memos";
      const method = memoId ? "PUT" : "POST";

      // Use workflow-aware initial status
      const initialStatus = getInitialSubmissionStatus(workflowType);

      const payload: any = {
        ...formData,
        budgetedAmount: formData.budgetedAmount ? Number(formData.budgetedAmount) : undefined,
        amountSpent: formData.amountSpent ? Number(formData.amountSpent) : undefined,
        availableFunds: formData.availableFunds ? Number(formData.availableFunds) : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdById: user?.id,
        status: initialStatus,
        workflowType: workflowType, // Store workflow type for reference
      };

      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      payload.createdById = user?.id;
      payload.status = initialStatus;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to submit memo");

      const savedMemo = await response.json();
      router.push(`/dashboard/memos/${savedMemo.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit memo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsCouncilApproval = shouldRouteToCouncil(formData.budgetedAmount || 0);

  return (
    <div className="min-h-full">
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {memoId ? "Edit Memo" : "Create Official Memorandum"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Complete the official NORED memo template
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/memos")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>

        {initialData && Object.keys(initialData).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            <span>Template applied. Pre-filled fields can be edited as needed.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {needsCouncilApproval && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
            ⚠️ This memo requires Council approval (Budget amount exceeds N$15,000)
          </div>
        )}

        {/* Workflow Tracker Section */}
        <div className="widget-card rounded-xl border border-gray-200 bg-card">
          <div className="py-3 px-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold">Approval Workflow</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWorkflow(!showWorkflow)}
              className="text-gray-500"
            >
              {showWorkflow ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
          {showWorkflow && (
            <div className="p-4">
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Workflow Type</label>
                <select
                  value={workflowType}
                  onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}
                  className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                >
                  <option value="standard">Standard Workflow</option>
                  <option value="procurement">Procurement Workflow</option>
                  <option value="financial">Financial Workflow</option>
                  <option value="urgent">Urgent Workflow (Priority: HIGH/URGENT)</option>
                </select>
              </div>
              
              <WorkflowTracker
                workflowType={workflowType}
                currentStatus="DRAFT"
                editable={false}
                showInfo={true}
              />
              
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Workflow auto-detection:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><strong>Standard:</strong> Default workflow for general memos</li>
                  <li><strong>Procurement:</strong> Auto-selected for procurement templates or amounts &gt; N$50,000</li>
                  <li><strong>Financial:</strong> Auto-selected for budget transfers or amounts &gt; N$10,000</li>
                  <li><strong>Urgent:</strong> Auto-selected when priority is HIGH or URGENT</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Memo Template Form */}
        <Card className="widget-card">
          <CardHeader className="border-b border-gray-100">
            <div className="text-center space-y-1">
              <CardTitle className="text-xl font-bold text-foreground">
                NORED
              </CardTitle>
              <p className="text-sm text-gray-600 font-medium">Official Memorandum</p>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* ROUTING INFORMATION */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">
                Routing Information
              </h3>

              {/* DEPARTMENT & POSITION - side by side, required */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  Your Details<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Department</Label>
                    <Input
                      placeholder="Enter department"
                      value={formData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      className="border-gray-200 focus:border-blue-400"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Position</Label>
                    <Input
                      placeholder="Enter position"
                      value={formData.position}
                      onChange={(e) => handleInputChange("position", e.target.value)}
                      className="border-gray-200 focus:border-blue-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* TO - name with autocomplete */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  To<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="md:col-span-2 space-y-2">
                  <UserAutocomplete
                    placeholder="Recipient name"
                    value={formData.memoTo}
                    onChange={(val) => handleInputChange("memoTo", val)}
                    className="border-gray-200 focus:border-blue-400"
                    required
                  />
                  <Input
                    placeholder="Position: Department (optional)"
                    value={formData.memoToTitle}
                    onChange={(e) => handleInputChange("memoToTitle", e.target.value)}
                    className="border-gray-200 focus:border-blue-400 text-sm"
                  />
                </div>
              </div>

              {/* THROUGH */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  Through
                </Label>
                <div className="md:col-span-2 space-y-2">
                  {formData.memoThrough.map((person, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex-1 space-y-2">
                        <UserAutocomplete
                          placeholder="Name"
                          value={person.name}
                          onChange={(val) => updateThroughPerson(index, "name", val)}
                          onSelectUser={(user) => {
                            // Auto-fill position and department from selected user
                            setFormData((prev) => ({
                              ...prev,
                              memoThrough: prev.memoThrough.map((p, i) =>
                                i === index
                                  ? { ...p, name: user.name, title: user.position || "", department: user.department || "" }
                                  : p
                              ),
                            }));
                          }}
                          className="bg-card border-border text-sm"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Position"
                            value={person.title}
                            onChange={(e) => updateThroughPerson(index, "title", e.target.value)}
                            className="bg-card border-border text-sm"
                          />
                          <Input
                            placeholder="Department"
                            value={person.department}
                            onChange={(e) => updateThroughPerson(index, "department", e.target.value)}
                            className="bg-card border-border text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeThroughPerson(index)}
                        className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addThroughPerson}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Through Person
                  </Button>
                </div>
              </div>

              {/* FROM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  From<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="md:col-span-2 space-y-2">
                  <UserAutocomplete
                    placeholder="Select the memo author"
                    value={formData.memoFrom}
                    onChange={(val) => handleInputChange("memoFrom", val)}
                    onSelectUser={(selectedUser) => {
                      setFormData((prev) => ({
                        ...prev,
                        memoFrom: selectedUser.name,
                        department: selectedUser.department || prev.department,
                        position: selectedUser.position || prev.position,
                        initiatorSignature: {
                          ...prev.initiatorSignature,
                          name: selectedUser.name,
                          position: selectedUser.position || "",
                          department: selectedUser.department || "",
                        },
                      }));
                    }}
                    className="border-gray-200 focus:border-blue-400"
                    required
                  />
                  <Input
                    placeholder="Position: Department (optional)"
                    value={formData.memoFromTitle}
                    onChange={(e) => handleInputChange("memoFromTitle", e.target.value)}
                    className="border-gray-200 focus:border-blue-400 text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Prepared by: <span className="font-medium">{formData.preparedBy || "—"}</span>
                    {formData.preparedBy && formData.memoFrom && formData.preparedBy !== formData.memoFrom && (
                      <span className="ml-1 text-gray-400">— memo will first go to <strong>{formData.memoFrom}</strong> for review</span>
                    )}
                  </p>
                </div>
              </div>

              {/* DATE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  Date
                </Label>
                <div className="md:col-span-2 flex gap-2">
                  <Input
                    type="date"
                    value={formData.memoDate}
                    onChange={(e) => handleInputChange("memoDate", e.target.value)}
                    className="border-gray-200 focus:border-blue-400"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange("memoDate", getTodayISO())}
                  >
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Today
                  </Button>
                </div>
              </div>

              {/* SUBJECT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  Subject<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="md:col-span-2">
                  <Input
                    placeholder="Enter memo subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    className="border-gray-200 focus:border-blue-400 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* PRIORITY */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Label className="text-xs font-semibold text-gray-700 uppercase md:col-span-1 flex items-center">
                  Priority
                </Label>
                <div className="md:col-span-2">
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange("priority", e.target.value)}
                    className="w-full sm:w-48 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  {(formData.priority === "HIGH" || formData.priority === "URGENT") && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚡ High/Urgent priority uses expedited workflow (Executive → SG)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 1. PURPOSE */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">
                1. Purpose<span className="text-red-500 ml-1">*</span>
              </h3>
              <Textarea
                placeholder="State the purpose of this memorandum..."
                value={formData.purpose}
                onChange={(e) => handleInputChange("purpose", e.target.value)}
                className="border-gray-200 focus:border-blue-400 min-h-32"
                required
              />
            </div>

            {/* 2. FINANCIAL IMPLICATION */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">
                2. Financial Implication
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">
                    a) Procurement Activity
                  </Label>
                  <Input
                    placeholder="Enter activity"
                    value={formData.procurementActivity}
                    onChange={(e) => handleInputChange("procurementActivity", e.target.value)}
                    className="border-gray-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">
                    b) Budget Vote
                  </Label>
                  <Input
                    placeholder="Enter budget vote"
                    value={formData.budgetVote}
                    onChange={(e) => handleInputChange("budgetVote", e.target.value)}
                    className="border-gray-200 focus:border-blue-400"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">
                    c) Budgeted Amount (N$)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.budgetedAmount}
                    onChange={(e) => handleInputChange("budgetedAmount", e.target.value)}
                    className="border-gray-200 focus:border-blue-400"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">
                    d) Amount Spent (N$)
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amountSpent}
                    onChange={(e) => handleInputChange("amountSpent", e.target.value)}
                    className="border-gray-200 focus:border-blue-400"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">
                    e) Available Funds (N$) - Auto-calculated
                  </Label>
                  <Input
                    type="text"
                    value={formatCurrency(formData.availableFunds)}
                    readOnly
                    className="border-gray-200 bg-gray-50 font-semibold text-green-700"
                  />
                </div>
              </div>

              {/* Executive Approval Section */}
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 uppercase">
                  Approval of Financial Implication
                </h4>
                <p className="text-xs text-gray-600">
                  Position: <span className="font-semibold">Executive Finance and Administration</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Executive Name</Label>
                    <Input
                      placeholder="Enter executive name"
                      value={formData.executiveName}
                      onChange={(e) => handleInputChange("executiveName", e.target.value)}
                      className="bg-card border-border"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Signature Date</Label>
                    <Input
                      type="date"
                      value={formData.executiveSignatureDate}
                      onChange={(e) => handleInputChange("executiveSignatureDate", e.target.value)}
                      className="bg-card border-border"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Financial Verification</Label>
                    <select
                      value={formData.financialVerification}
                      onChange={(e) => handleInputChange("financialVerification", e.target.value)}
                      className="w-full h-10 px-3 border border-border rounded-lg bg-card text-foreground text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 mb-1.5 block">Budget Approved</Label>
                    <select
                      value={formData.budgetApproved}
                      onChange={(e) => handleInputChange("budgetApproved", e.target.value)}
                      className="w-full h-10 px-3 border border-border rounded-lg bg-card text-foreground text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-600 mb-1.5 block">Comment(s)</Label>
                  <Textarea
                    placeholder="Enter any comments..."
                    value={formData.financialComments}
                    onChange={(e) => handleInputChange("financialComments", e.target.value)}
                    className="bg-white border-gray-200 min-h-20"
                  />
                </div>
              </div>
            </div>

            {/* 3. RECOMMENDATION */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">
                3. Recommendation<span className="text-red-500 ml-1">*</span>
              </h3>
              <Textarea
                placeholder="Enter your recommendation..."
                value={formData.recommendation}
                onChange={(e) => handleInputChange("recommendation", e.target.value)}
                className="border-gray-200 focus:border-blue-400 min-h-32"
                required
              />
            </div>

            {/* 4. ATTACHMENTS */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide border-b pb-2">
                4. Attachments
              </h3>

              <div className="space-y-3">
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-gray-500">
                    {isUploading ? (
                      <span className="text-sm">Uploading...</span>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          Click to attach files (PDF, Word, Images)
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>

                <p className="text-xs text-gray-400">
                  Supported: PDF, Word, Excel, PNG, JPG. Max 10MB per file.
                </p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="pt-6 mt-2 border-t-2 border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                  Approval Signatures
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignatures(!showSignatures)}
                  className="text-gray-500"
                >
                  {showSignatures ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide Signatures
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show Signatures
                    </>
                  )}
                </Button>
              </div>
              
              {showSignatures && (
                <div className="space-y-6">
                  {/* Initiator's Signature */}
                  <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="text-xs font-semibold text-blue-700 uppercase mb-3">
                      <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                      Initial Sender Signature
                    </h4>
                    <SignatureBlock
                      label="Initiator"
                      signatureInfo={formData.initiatorSignature || { name: '', position: '' }}
                      onChange={(info) => updateSignature('initiator', info)}
                      showSeparator={false}
                    />
                  </div>
                  
                  {/* Through Chain Signatures */}
                  {formData.throughSignatures && formData.throughSignatures.length > 0 && (
                    <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                      <h4 className="text-xs font-semibold text-amber-700 uppercase mb-3">
                        <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                        Routing Chain Signatures
                      </h4>
                      <div className="space-y-8">
                        {formData.throughSignatures.map((signature, index) => (
                          <SignatureBlock
                            key={index}
                            index={index}
                            label={`Routing Level ${index + 1}`}
                            signatureInfo={signature}
                            onChange={(info) => updateThroughSignature(index, info)}
                            showSeparator={index !== 0}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Financial Executive Signature */}
                  <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="text-xs font-semibold text-green-700 uppercase mb-3">
                      <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                      Financial Approval
                    </h4>
                    <SignatureBlock
                      label="Executive: Finance and Administration"
                      signatureInfo={formData.financeSignature || { name: '', position: 'Executive: Finance and Administration' }}
                      onChange={(info) => updateSignature('finance', info)}
                      showSeparator={false}
                    />
                  </div>
                  
                  {/* Procurement Unit (Final Recipient) Signature */}
                  <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="text-xs font-semibold text-red-700 uppercase mb-3">
                      <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                      Final Approval
                    </h4>
                    <SignatureBlock
                      label="PMU (Procurement)"
                      signatureInfo={formData.recipientSignature || { name: '', position: 'PMU' }}
                      onChange={(info) => updateSignature('recipient', info)}
                      showSeparator={false}
                    />
                  </div>
                  
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-700">
                    <p className="font-semibold">Approval Workflow:</p>
                    <p className="text-xs mt-1">This memo will be routed through the following hierarchy:</p>
                    <ol className="text-xs mt-1 list-decimal ml-5 space-y-1">
                      <li>Initiated by <strong>{formData.memoFrom || 'Sender'}</strong></li>
                      {formData.memoThrough.map((person, i) => (
                        <li key={i}>Through <strong>{person.name}</strong> ({person.title})</li>
                      ))}
                      <li>Financial approval by <strong>Executive: Finance and Administration</strong></li>
                      <li>Final approval by <strong>PMU (Procurement)</strong></li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="pt-4 mt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                NORED
              </p>
              <p className="text-xs text-gray-400 italic">
                Electricity For Development
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="sm:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>

          {savedMemoId ? (
            <SubmitApprovalDialog
              memoId={savedMemoId}
              memoThrough={formData.memoThrough}
              onSubmitted={() => router.push(`/dashboard/memos/${savedMemoId}`)}
            >
              <Button className="sm:w-auto" style={{ backgroundColor: "#2563eb" }}>
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </SubmitApprovalDialog>
          ) : (
            <Button
              onClick={async () => {
                const id = await handleSaveAndGetId();
                if (!id) return;
              }}
              disabled={isSubmitting}
              className="sm:w-auto"
              style={{ backgroundColor: "#2563eb" }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save & Prepare Submission"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
