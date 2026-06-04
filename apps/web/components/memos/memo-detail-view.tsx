"use client";

import { toast } from "@/hooks/use-toast";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Download, 
  ArrowLeft,
  FileText,
  FileDown,
  Loader2
} from "lucide-react";
import { Memo } from "@/types/memo.types";
import { MemoApprovalTracker } from "@/components/memos/memo-approval-tracker";
import { SubmitApprovalDialog } from "@/components/memos/submit-approval-dialog";
import { useAuth } from "@/lib/auth-context";
import {
  formatDateForDisplay,
  formatCurrency,
  getStatusColor,
  getPriorityColor,
} from "@/lib/memo-helpers";
import { generateMemoPDF } from "@/lib/memo-pdf-generator";

interface MemoDetailViewProps {
  memo: Memo;
  onUpdate?: () => void;
}

export function MemoDetailView({ memo, onUpdate }: MemoDetailViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnComment, setReturnComment] = useState("");

  const isCreator = user?.id === memo.createdById;
  const canEdit = isCreator && memo.status === "DRAFT";
  const canDelete = isCreator;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this memo?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/memos/${memo.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete memo");

      router.push("/dashboard/memos");
    } catch (err) {
      toast({ title: "$1", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = async () => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/memos/${memo.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (!response.ok) throw new Error("Failed to approve memo");

      if (onUpdate) onUpdate();
    } catch (err) {
      toast({ title: "$1", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/memos/${memo.id}/export`);
      if (!response.ok) throw new Error("Failed to export memo");

      const data = await response.json();
      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      } else {
        throw new Error(data.message || "Export failed");
      }
    } catch (err) {
      toast({ title: "Failed to export memo as Word document", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleReturnToSender = async () => {
    if (!returnComment.trim()) {
      toast({ title: "Please provide a comment", variant: "destructive" });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/memos/${memo.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RETURNED",
          returnComment: returnComment.trim(),
          returnedBy: user?.id,
          returnedByName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.username || "",
        }),
      });

      if (!response.ok) throw new Error("Failed to return memo");

      setShowReturnForm(false);
      setReturnComment("");
      if (onUpdate) onUpdate();
    } catch (err) {
      toast({ title: "Failed to return memo", variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDownloadPDF = async (preview = false) => {
    setIsDownloading(true);
    try {
      await generateMemoPDF(memo, preview);
    } catch (error) {
      console.error('Error generating memo PDF:', error);
      toast({ title: 'Failed to generate PDF. Please try again.', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 20mm 25mm;
            size: A4 portrait;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .print-memo-wrapper {
            width: 100%;
            background: white;
          }
          
          /* Hide Sidebar and Footer for simple template */
          .print-sidebar {
            display: none !important;
          }
          
          /* Main Content Area - Full Width */
          .print-content {
            width: 100%;
            padding: 0;
          }
          
          .print-memo-fields {
            margin-bottom: 6mm;
            font-size: 11pt;
            line-height: 1.6;
          }
          
          .print-memo-fields .field-row {
            margin-bottom: 1mm;
          }
          
          .print-memo-fields .field-label {
            font-weight: bold;
            display: inline;
            color: #000;
          }
          
          .print-memo-fields .field-value {
            display: inline;
            margin-left: 3mm;
          }
          
          .print-memo-fields .field-value.subject {
            text-transform: uppercase;
          }
          
          .print-memo-fields .field-sublabel {
            font-size: 10pt;
            color: #333;
            margin-left: 15mm;
            display: block;
          }
          
          .print-section {
            margin-bottom: 6mm;
            page-break-inside: avoid;
          }
          
          .print-section h3 {
            font-size: 11pt;
            font-weight: bold;
            margin: 0 0 2mm 0;
            color: #000;
          }
          
          .print-section-content {
            font-size: 10pt;
            line-height: 1.6;
            text-align: justify;
          }
          
          .print-financial-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm;
            margin: 3mm 0;
          }
          
          .print-financial-item {
            font-size: 9pt;
          }
          
          .print-financial-item .label {
            font-weight: 600;
            color: #000;
            font-size: 10pt;
          }
          
          .print-financial-item .value {
            margin-top: 1mm;
          }
          
          .print-approval-box {
            margin-top: 4mm;
            padding: 3mm;
            border: 1px solid #000;
            background: transparent;
            page-break-inside: avoid;
          }
          
          .print-approval-box h4 {
            font-size: 10pt;
            font-weight: bold;
            margin: 0 0 2mm 0;
            color: #000;
          }
          
          /* Footer - Hidden for simple template */
          .print-footer {
            display: none !important;
          }
        }
        
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
      
      {/* Print-only template with NSA branding */}
      <div className="print-only print-memo-wrapper">
        {/* Left Sidebar */}
        <div className="print-sidebar">
          <div>
            <div className="print-sidebar-logo">
              <h1>NORED</h1>
              <p>Electricity For Development</p>
            </div>
            
            <div className="print-sidebar-contact">
              <h3>CONTACT INFORMATION</h3>
              
              <div className="contact-section">
                <p><strong>Head Office:</strong></p>
                <p>Shiimi Building</p>
                <p>204 Independence Avenue</p>
                <p>Windhoek, Namibia</p>
              </div>
              
              <div className="contact-section">
                <p><strong>Postal Address:</strong></p>
                <p>Private Bag 13356</p>
                <p>Windhoek, Namibia</p>
              </div>
              
              <div className="contact-section">
                <p><strong>Tel:</strong> +264 61 283 1000</p>
                <p><strong>Fax:</strong> +264 61 283 4000</p>
                <p><strong>Type:</strong> Internal Correspondence</p>
                <p><strong>Brand:</strong> NORED</p>
              </div>
            </div>
          </div>
          
          <div className="print-sidebar-doc-ref">
            <p><strong>Document Ref:</strong></p>
            <p>{memo.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Status:</strong> {memo.status}</p>
            <p><strong>Priority:</strong> {memo.priority}</p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="print-content">
          {/* Routing Fields - Start directly without header */}
          <div className="print-memo-fields">
            <div className="field-row">
              <span className="field-label">TO:</span>
              <span className="field-value">{memo.memoTo}</span>
              {memo.memoToTitle && (
                <div className="field-sublabel">({memo.memoToTitle})</div>
              )}
            </div>
            
            {memo.memoThrough && memo.memoThrough.length > 0 && (
              <>
                {memo.memoThrough.map((p: any, idx: number) => (
                  <div key={idx} className="field-row">
                    {idx === 0 && <span className="field-label">THROUGH:</span>}
                    {idx > 0 && <span style={{ marginLeft: '15mm', display: 'inline-block' }}></span>}
                    <span className="field-value">{p.name}</span>
                    {p.title && (
                      <div className="field-sublabel">({p.title})</div>
                    )}
                  </div>
                ))}
              </>
            )}
            
            <div className="field-row">
              <span className="field-label">FROM:</span>
              <span className="field-value">{memo.memoFrom}</span>
              {memo.memoFromTitle && (
                <div className="field-sublabel">({memo.memoFromTitle})</div>
              )}
            </div>
            
            <div className="field-row">
              <span className="field-label">DATE:</span>
              <span className="field-value">
                {memo.memoDate ? new Date(memo.memoDate).toLocaleDateString('en-GB', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                }).toUpperCase() : 'DATE NOT SPECIFIED'}
              </span>
            </div>
            
            <div className="field-row" style={{ marginTop: '2mm' }}>
              <span className="field-label">SUBJECT:</span>
              <span className="field-value subject">{memo.subject?.toUpperCase()}</span>
            </div>
          </div>
          
          {/* 1. PURPOSE */}
          <div className="print-section">
            <h3>1. PURPOSE</h3>
            <div className="print-section-content">{memo.purpose}</div>
          </div>
          
          {/* 2. FINANCIAL IMPLICATION */}
          {(memo.budgetedAmount || memo.procurementActivity) && (
            <div className="print-section">
              <h3>2. FINANCIAL IMPLICATION</h3>
              
              <div className="print-financial-grid">
                {memo.procurementActivity && (
                  <div className="print-financial-item">
                    <div className="label">a) Procurement Activity:</div>
                    <div className="value">{memo.procurementActivity}</div>
                  </div>
                )}
                
                {memo.budgetVote && (
                  <div className="print-financial-item">
                    <div className="label">b) Budget Vote:</div>
                    <div className="value">{memo.budgetVote}</div>
                  </div>
                )}
                
                {memo.budgetedAmount !== null && (
                  <div className="print-financial-item">
                    <div className="label">c) Budgeted Amount:</div>
                    <div className="value"><strong>{formatCurrency(memo.budgetedAmount)}</strong></div>
                  </div>
                )}
                
                {memo.amountSpent !== null && (
                  <div className="print-financial-item">
                    <div className="label">d) Amount Spent:</div>
                    <div className="value"><strong>{formatCurrency(memo.amountSpent)}</strong></div>
                  </div>
                )}
                
                {memo.availableFunds !== null && (
                  <div className="print-financial-item">
                    <div className="label">e) Available Funds:</div>
                    <div className="value"><strong>{formatCurrency(memo.availableFunds)}</strong></div>
                  </div>
                )}
              </div>
              
              {/* Executive Approval Section */}
              {memo.executiveName && (
                <div className="print-approval-box">
                  <h4>Approval of the financial implication:</h4>
                  <div style={{ fontSize: '9pt', marginTop: '2mm' }}>
                    <p><strong>Position:</strong> Executive Finance and Administration</p>
                    <p><strong>Executive Name:</strong> {memo.executiveName}</p>
                    {memo.financialVerification && (
                      <p><strong>Financial Verification:</strong> {memo.financialVerification}</p>
                    )}
                    {memo.budgetApproved && (
                      <p><strong>Budget Approved:</strong> {memo.budgetApproved}</p>
                    )}
                    {memo.financialComments && (
                      <div style={{ marginTop: '2mm' }}>
                        <p><strong>Comment(s):</strong></p>
                        <p style={{ whiteSpace: 'pre-wrap', marginTop: '1mm' }}>{memo.financialComments}</p>
                      </div>
                    )}
                    {memo.executiveSignatureDate && (
                      <p style={{ marginTop: '2mm' }}>
                        <strong>Date:</strong> {new Date(memo.executiveSignatureDate).toLocaleDateString('en-GB')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 3. RECOMMENDATION */}
          <div className="print-section">
            <h3>3. RECOMMENDATION</h3>
            <div className="print-section-content">{memo.recommendation}</div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="print-footer">
          <p className="footer-main">NORED | Northern Regional Electricity Distributor</p>
          <p className="footer-tagline">Electricity For Development</p>
        </div>
      </div>
      
      {/* Screen view */}
      <div className="min-h-full no-print">
        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/memos")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Memo Details
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Reference: {memo.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getPriorityColor(memo.priority || "NORMAL")}>
              {memo.priority}
            </Badge>
            <Badge className={getStatusColor(memo.status || "DRAFT")}>
              {memo.status}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/memos/${memo.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          
          {isCreator && (memo.status === "DRAFT" || memo.status === "REJECTED") && (
            <SubmitApprovalDialog
              memoId={memo.id}
              memoThrough={memo.memoThrough}
              onSubmitted={onUpdate}
            />
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            disabled={isExporting}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-1" />
            )}
            Export to Word
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Download className="w-4 h-4 mr-1" />
            Print
          </Button>

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>

        {/* Memo Content */}
        <Card className="widget-card print:shadow-none">
          <CardHeader className="border-b border-gray-100">
            <div className="text-center space-y-1">
              <CardTitle className="text-xl font-bold text-gray-900">
                NORED
              </CardTitle>
              <p className="text-sm text-gray-600 font-medium">Official Memorandum</p>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* ROUTING INFORMATION */}
            <div className="space-y-3">
              <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">
                Routing Information
              </h3>

              <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                <div className="font-semibold text-gray-700">TO:</div>
                <div>
                  <div className="font-medium text-gray-900">{memo.memoTo}</div>
                  {memo.memoToTitle && (
                    <div className="text-xs text-gray-500">{memo.memoToTitle}</div>
                  )}
                </div>

                {memo.memoThrough && memo.memoThrough.length > 0 && (
                  <>
                    <div className="font-semibold text-gray-700">THROUGH:</div>
                    <div className="space-y-2">
                      {memo.memoThrough.map((person: any, index: number) => (
                        <div key={index}>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          {person.title && (
                            <div className="text-xs text-gray-500">{person.title}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="font-semibold text-gray-700">FROM:</div>
                <div>
                  <div className="font-medium text-gray-900">{memo.memoFrom}</div>
                  {memo.memoFromTitle && (
                    <div className="text-xs text-gray-500">{memo.memoFromTitle}</div>
                  )}
                </div>

                <div className="font-semibold text-gray-700">DATE:</div>
                <div className="text-gray-900">
                  {formatDateForDisplay(memo.memoDate)}
                </div>

                <div className="font-semibold text-gray-700">SUBJECT:</div>
                <div className="font-bold text-gray-900 uppercase underline">
                  {memo.subject}
                </div>
              </div>
            </div>

            {/* 1. PURPOSE */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">1. PURPOSE</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {memo.purpose}
              </div>
            </div>

            {/* 2. FINANCIAL IMPLICATION */}
            {(memo.budgetedAmount || memo.procurementActivity) && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">2. FINANCIAL IMPLICATION</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {memo.procurementActivity && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">a) Procurement Activity</div>
                      <div className="text-gray-900">{memo.procurementActivity}</div>
                    </div>
                  )}

                  {memo.budgetVote && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">b) Budget Vote</div>
                      <div className="text-gray-900">{memo.budgetVote}</div>
                    </div>
                  )}

                  {memo.budgetedAmount !== null && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">c) Budgeted Amount</div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(memo.budgetedAmount)}
                      </div>
                    </div>
                  )}

                  {memo.amountSpent !== null && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">d) Amount Spent</div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(memo.amountSpent)}
                      </div>
                    </div>
                  )}

                  {memo.availableFunds !== null && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">e) Available Funds</div>
                      <div className="font-bold text-green-700">
                        {formatCurrency(memo.availableFunds)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Executive Approval */}
                {memo.executiveName && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">
                      Approval of Financial Implication
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Position</div>
                        <div className="text-gray-900 font-medium">
                          Executive Finance and Administration
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">Executive Name</div>
                        <div className="text-gray-900">{memo.executiveName}</div>
                      </div>

                      {memo.financialVerification && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Financial Verification</div>
                          <Badge variant={memo.financialVerification === "Yes" ? "default" : "secondary"}>
                            {memo.financialVerification}
                          </Badge>
                        </div>
                      )}

                      {memo.budgetApproved && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Budget Approved</div>
                          <Badge variant={memo.budgetApproved === "Yes" ? "default" : "secondary"}>
                            {memo.budgetApproved}
                          </Badge>
                        </div>
                      )}

                      {memo.executiveSignatureDate && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Signature Date</div>
                          <div className="text-gray-900">
                            {formatDateForDisplay(memo.executiveSignatureDate)}
                          </div>
                        </div>
                      )}
                    </div>

                    {memo.financialComments && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">Comment(s)</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {memo.financialComments}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. RECOMMENDATION */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">3. RECOMMENDATION</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {memo.recommendation}
              </div>
            </div>

            {/* 4. ATTACHMENTS */}
            {memo.attachments && Array.isArray(memo.attachments) && memo.attachments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-700">4. ATTACHMENTS</h3>
                <div className="space-y-2">
                  {memo.attachments.map((file: any, index: number) => (
                    <a
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                          {file.type ? ` • ${file.type}` : ''}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-gray-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500 font-semibold">
                NORED
              </p>
              <p className="text-xs text-gray-400 italic">
                Electricity For Development
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow */}
        {(memo as any).approvals && (memo as any).approvals.length > 0 && (
          <MemoApprovalTracker
            approvals={(memo as any).approvals}
            memoId={memo.id}
            memoStatus={memo.status || "DRAFT"}
            currentUserId={user?.id}
            onAction={onUpdate}
          />
        )}

        {/* Metadata Card */}
        <Card className="widget-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Document Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-1">Created</div>
              <div className="text-gray-900">
                {new Date(memo.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Last Updated</div>
              <div className="text-gray-900">
                {new Date(memo.updatedAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Document ID</div>
              <div className="text-gray-900 font-mono text-xs">
                {memo.id}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
