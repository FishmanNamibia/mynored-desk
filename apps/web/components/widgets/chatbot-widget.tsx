"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle, X, ChevronLeft, Send, Headphones,
  Lightbulb, CheckCircle2, AlertCircle, Loader2, ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Flow = "choose" | "it-support" | "suggestion" | "success" | "error";
type Priority = "Low" | "Medium" | "High";

interface Department {
  id: string;
  name: string;
  executiveName: string | null;
  executiveEmail: string | null;
}

export function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("choose");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // IT Support form state
  const [itCategory, setItCategory] = useState("Hardware");
  const [itPriority, setItPriority] = useState<Priority>("Medium");
  const [itSubject, setItSubject] = useState("");
  const [itDescription, setItDescription] = useState("");

  // Suggestion form state
  const [sugDeptId, setSugDeptId] = useState("");
  const [sugDeptName, setSugDeptName] = useState("");
  const [suggestion, setSuggestion] = useState("");

  // Fetch departments when suggestion flow opens
  useEffect(() => {
    if (flow !== "suggestion" || departments.length > 0) return;
    setDeptsLoading(true);
    fetch("/dashboard/performance/api/chatbot/departments", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: Department[]) => { setDepartments(data); setDeptsLoading(false); })
      .catch(() => setDeptsLoading(false));
  }, [flow, departments.length]);

  const resetAll = () => {
    setFlow("choose");
    setItSubject(""); setItDescription(""); setItCategory("Hardware"); setItPriority("Medium");
    setSugDeptId(""); setSugDeptName(""); setSuggestion("");
    setSuccessMsg(""); setErrorMsg("");
    setSubmitting(false);
  };

  const handleClose = () => { setOpen(false); setTimeout(resetAll, 300); };
  const handleBack = () => setFlow("choose");

  const submitItSupport = async () => {
    if (!itSubject.trim() || !itDescription.trim()) {
      setErrorMsg("Please fill in the subject and description."); return;
    }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await fetch("/dashboard/performance/api/chatbot/it-support", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: itCategory, priority: itPriority, subject: itSubject, description: itDescription }),
      });
      const data = await res.json();
      if (res.ok) { setSuccessMsg(data.message); setFlow("success"); }
      else setErrorMsg(data.error || "Submission failed. Please try again.");
    } catch { setErrorMsg("Network error. Please try again."); }
    setSubmitting(false);
  };

  const submitSuggestion = async () => {
    if (!sugDeptId || !suggestion.trim()) {
      setErrorMsg("Please select a department and write your suggestion."); return;
    }
    setSubmitting(true); setErrorMsg("");
    try {
      const res = await fetch("/dashboard/performance/api/chatbot/suggestion", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: sugDeptId, departmentName: sugDeptName, suggestion }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (res.ok) { setSuccessMsg(data.message || "Suggestion sent successfully!"); setFlow("success"); }
      else setErrorMsg(data.error || `Server error (${res.status}). Please try again.`);
    } catch (err: any) {
      setErrorMsg("Could not reach the server. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  const itCategories = ["Hardware", "Software", "Network / Connectivity", "Email / Calendar", "Account & Access", "Printer / Scanner", "System Performance", "Other"];
  const priorityColors: Record<Priority, string> = {
    Low: "bg-green-100 text-green-700 border-green-300",
    Medium: "bg-amber-100 text-amber-700 border-amber-300",
    High: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #8f151b 0%, #c62828 100%)" }}
        aria-label="Open chatbot"
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />}
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: "#ef4444" }} />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-[9990] w-[360px] max-h-[580px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: "#fff", border: "1px solid #e5e7eb" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #8f151b 0%, #c62828 100%)" }}
          >
            <div className="flex items-center gap-2.5">
              {flow !== "choose" && flow !== "success" && flow !== "error" && (
                <button onClick={handleBack} className="text-white/60 hover:text-white mr-1">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">NORED Assistant</p>
                <p className="text-white/50 text-[10px]">How can we help?</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4">

            {/* ── CHOOSE ── */}
            {flow === "choose" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Hi <strong>{(user as any)?.displayName?.split(" ")[0] || "there"}</strong> 👋 What would you like to do today?
                </p>

                <button
                  onClick={() => setFlow("it-support")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Headphones className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">IT Support</p>
                    <p className="text-xs text-blue-600">Report a technical issue or request</p>
                  </div>
                </button>

                <button
                  onClick={() => setFlow("suggestion")}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-amber-100 bg-amber-50 hover:border-amber-300 hover:bg-amber-100 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                    style={{ background: "#d4a855" }}>
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900">Suggestion Box</p>
                    <p className="text-xs text-amber-600">Share an idea or feedback with a department</p>
                  </div>
                </button>
              </div>
            )}

            {/* ── IT SUPPORT ── */}
            {flow === "it-support" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Fill in the details below and your request will be sent to the IT Support team.</p>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
                  <div className="relative">
                    <select
                      value={itCategory}
                      onChange={e => setItCategory(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {itCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as Priority[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setItPriority(p)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all ${
                          itPriority === p
                            ? priorityColors[p] + " ring-2 ring-offset-1 " + (p === "Low" ? "ring-green-400" : p === "Medium" ? "ring-amber-400" : "ring-red-400")
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Subject *</label>
                  <input
                    value={itSubject}
                    onChange={e => setItSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Description *</label>
                  <textarea
                    value={itDescription}
                    onChange={e => setItDescription(e.target.value)}
                    placeholder="Describe the problem in detail — include what you were doing and any error messages."
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}

                <button
                  onClick={submitItSupport}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Submitting…" : "Submit IT Request"}
                </button>
              </div>
            )}

            {/* ── SUGGESTION BOX ── */}
            {flow === "suggestion" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Select a department and write your suggestion. It will be sent directly to the department&apos;s executive.
                </p>

                {/* Department dropdown */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Department *</label>
                  {deptsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading departments…
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={sugDeptId}
                        onChange={e => {
                          const dept = departments.find(d => d.id === e.target.value);
                          setSugDeptId(e.target.value);
                          setSugDeptName(dept?.name || "");
                        }}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">— Select department —</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}

                  {/* Show executive info if selected */}
                  {sugDeptId && (() => {
                    const dept = departments.find(d => d.id === sugDeptId);
                    return dept?.executiveName ? (
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        📧 Will be sent to: <strong>{dept.executiveName}</strong>
                        {dept.executiveEmail && <span className="text-gray-400">({dept.executiveEmail})</span>}
                      </p>
                    ) : (
                      <p className="text-[10px] text-red-500 mt-1">No executive found for this department.</p>
                    );
                  })()}
                </div>

                {/* Suggestion */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Your Suggestion *</label>
                  <textarea
                    value={suggestion}
                    onChange={e => setSuggestion(e.target.value)}
                    placeholder="Share your idea, feedback, or improvement suggestion…"
                    rows={5}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{suggestion.length}/1000 characters</p>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}

                <button
                  onClick={submitSuggestion}
                  disabled={submitting || !sugDeptId}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #92400e 0%, #d97706 100%)" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Sending…" : "Send Suggestion"}
                </button>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {flow === "success" && (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-bold text-gray-900">Submitted Successfully!</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{successMsg}</p>
                <button
                  onClick={resetAll}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  ← Back to main menu
                </button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <p className="text-[10px] text-gray-400 text-center">NORED Desk · Secure Internal Tool</p>
          </div>
        </div>
      )}
    </>
  );
}
