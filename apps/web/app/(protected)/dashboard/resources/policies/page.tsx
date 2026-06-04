"use client";

import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowLeft, Download, FileText, Calendar, Eye, Plus, X, Upload, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { canManageContent } from "@/lib/permissions";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PolicyDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  version: string;
  effectiveDate: string;
  fileSize: string;
  pdfPath: string;
  signedDate?: string;
  reviewDate?: string;
  reviewYears?: number;
  status?: string;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Operational":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Compliance":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "HR":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getReviewStatus = (reviewDate?: string) => {
  if (!reviewDate) {
    return { status: "N/A", color: "bg-gray-100 text-gray-800 border-gray-200" };
  }
  
  const today = new Date();
  const review = new Date(reviewDate);
  
  if (review < today) {
    return { status: "Overdue", color: "bg-red-100 text-red-800 border-red-200" };
  } else {
    return { status: "To Be Reviewed", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  }
};

export default function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<PolicyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Operational",
    signedDate: "",
    reviewYears: 2,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [calculatedReviewDate, setCalculatedReviewDate] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    if (formData.signedDate && formData.reviewYears) {
      const signed = new Date(formData.signedDate);
      const review = new Date(signed);
      review.setFullYear(review.getFullYear() + formData.reviewYears);
      setCalculatedReviewDate(review.toISOString().split('T')[0]);
    } else {
      setCalculatedReviewDate("");
    }
  }, [formData.signedDate, formData.reviewYears]);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/dashboard/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({ title: 'Please select a PDF file', variant: 'destructive' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('signedDate', formData.signedDate);
      formDataToSend.append('reviewYears', formData.reviewYears.toString());
      formDataToSend.append('file', selectedFile);

      const res = await fetch('/api/dashboard/policies', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });

      if (res.ok) {
        await fetchPolicies();
        setShowForm(false);
        setFormData({ title: "", description: "", category: "Operational", signedDate: "", reviewYears: 2 });
        setSelectedFile(null);
        setCalculatedReviewDate("");
      } else {
        const error = await res.json();
        toast({ title: error.error || 'Failed to create policy', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({ title: 'Failed to create policy', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
      return;
    }

    setDeletingId(policyId);
    try {
      const res = await fetch(`/api/dashboard/policies?id=${policyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchPolicies();
      } else {
        const error = await res.json();
        toast({ title: error.error || 'Failed to delete policy', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({ title: 'Failed to delete policy', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-green-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Policies & Procedures</h1>
              <p className="text-sm text-muted-foreground mt-1">NSA Governance Framework</p>
            </div>
          </div>
          {canManageContent(user?.jobTitle) && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-9 text-sm gap-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Policy
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <th className="text-left p-4 font-semibold text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        Policy Document
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-sm text-foreground">Category</th>
                    <th className="text-left p-4 font-semibold text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        Signed Date
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Review Date
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-sm text-foreground">Review Status</th>
                    <th className="text-left p-4 font-semibold text-sm text-foreground">Size</th>
                    <th className="text-right p-4 font-semibold text-sm text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        Loading policies...
                      </td>
                    </tr>
                  ) : policies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No policies found. Add your first policy to get started.
                      </td>
                    </tr>
                  ) : (
                    policies.map((policy, index) => (
                    <tr 
                      key={policy.id}
                      className={`border-b border-gray-100 hover:bg-green-50/50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{policy.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`text-xs ${getCategoryColor(policy.category)}`}>
                          {policy.category}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {policy.signedDate ? new Date(policy.signedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : policy.effectiveDate}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {policy.reviewDate ? new Date(policy.reviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={`text-xs ${getReviewStatus(policy.reviewDate).color}`}>
                          {getReviewStatus(policy.reviewDate).status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">{policy.fileSize}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                            onClick={() => window.open(policy.pdfPath, '_blank')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            asChild
                          >
                            <a href={policy.pdfPath} download>
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </Button>
                          {canManageContent(user?.jobTitle) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                              onClick={() => handleDelete(policy.id)}
                              disabled={deletingId === policy.id}
                            >
                              {deletingId === policy.id ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"></div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            For questions about these policies, please contact the HR Department or Compliance Office.
          </p>
        </div>
      </div>

      {/* Policy Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Add New Policy</h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Policy Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Data Protection & Privacy Policy"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the policy"
                  required
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Operational">Operational</option>
                  <option value="Compliance">Compliance</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewYears" className="text-sm font-medium">
                  Review Period (Years) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reviewYears"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.reviewYears}
                  onChange={(e) => setFormData({ ...formData, reviewYears: parseInt(e.target.value) || 2 })}
                  required
                  className="w-full"
                  placeholder="e.g., 2"
                />
                <p className="text-xs text-muted-foreground">
                  Number of years after which this policy should be reviewed
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signedDate" className="text-sm font-medium">
                    Signed Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="signedDate"
                    type="date"
                    value={formData.signedDate}
                    onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewDate" className="text-sm font-medium">
                    Review Date (Auto-calculated)
                  </Label>
                  <Input
                    id="reviewDate"
                    type="date"
                    value={calculatedReviewDate}
                    readOnly
                    disabled
                    className="w-full bg-gray-50 cursor-not-allowed"
                    placeholder="Select signed date first"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  Policy Document (PDF) <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-green-500 transition-colors">
                  <input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {selectedFile ? selectedFile.name : 'Click to upload PDF'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFile 
                        ? `${(selectedFile.size / 1024).toFixed(2)} KB` 
                        : 'Maximum file size: 10MB'}
                    </p>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Review Schedule</p>
                    <p className="text-blue-700">
                      Review date will be automatically calculated based on the review period you specify.
                      Status will be "To Be Reviewed" until the review date passes, then "Overdue".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Policy
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
