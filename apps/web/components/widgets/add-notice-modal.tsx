"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddNoticeModalProps {
  spToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddNoticeModal({ spToken, onClose, onSuccess }: AddNoticeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Summary / description is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/graph/sharepoint-notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SP-Token": spToken,
        },
        body: JSON.stringify({ title, description, content }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || `Failed to create notice (${res.status})`);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-red-100 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Create New Notice</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-red-50 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {success ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-sm font-medium text-green-700">Notice published to SharePoint!</p>
            <p className="text-xs text-gray-400">The widget will refresh automatically.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-title" className="text-xs font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="notice-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Staff Meeting — 20 March 2026"
                className="text-sm"
                disabled={submitting}
                maxLength={255}
              />
            </div>

            {/* Description / Summary */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-desc" className="text-xs font-medium">
                Summary <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="notice-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary shown in the Notices widget on the dashboard…"
                rows={2}
                className="text-sm resize-none"
                disabled={submitting}
                maxLength={500}
              />
            </div>

            {/* Full content */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-content" className="text-xs font-medium">
                Full Notice Body{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="notice-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Full notice text that will appear on the SharePoint page. If left blank the summary is used."
                rows={6}
                className="text-sm resize-none"
                disabled={submitting}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="text-xs gap-1.5 bg-red-600 hover:bg-red-700"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Publishing…" : "Publish to SharePoint"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
