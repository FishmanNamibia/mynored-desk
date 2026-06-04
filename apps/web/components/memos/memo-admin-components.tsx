"use client";

import { useState } from "react";

export interface MemoAdmin {
  id: string;
  title: string;
  subject: string;
  status: string;
  currentStage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OverviewTabProps {
  memos: MemoAdmin[];
}

export function OverviewTab({ memos }: OverviewTabProps) {
  const stats = {
    total: memos.length,
    draft: memos.filter(m => m.status === "DRAFT").length,
    pending: memos.filter(m => m.status === "PENDING").length,
    approved: memos.filter(m => m.status === "APPROVED").length,
    rejected: memos.filter(m => m.status === "REJECTED").length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white rounded-lg border p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-xs text-gray-500">Total Memos</div>
      </div>
      <div className="bg-gray-50 rounded-lg border p-4">
        <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
        <div className="text-xs text-gray-500">Draft</div>
      </div>
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        <div className="text-xs text-amber-600">Pending</div>
      </div>
      <div className="bg-green-50 rounded-lg border border-green-200 p-4">
        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        <div className="text-xs text-green-600">Approved</div>
      </div>
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        <div className="text-xs text-red-600">Rejected</div>
      </div>
    </div>
  );
}

interface InspectorTabProps {
  memos: MemoAdmin[];
  onAction: (memoId: string, action: string, comment?: string, stage?: string) => void;
  actionLoading: string | null;
  onRefresh: () => void;
}

export function InspectorTab({ memos, onAction, actionLoading }: InspectorTabProps) {
  return (
    <div className="space-y-3">
      {memos.map(memo => (
        <div key={memo.id} className="bg-white rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{memo.subject}</h3>
              <p className="text-xs text-gray-500 mt-1">Status: {memo.status}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAction(memo.id, "approve")}
                disabled={actionLoading === memo.id}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => onAction(memo.id, "reject")}
                disabled={actionLoading === memo.id}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
      {memos.length === 0 && (
        <p className="text-center text-gray-500 py-8">No memos found</p>
      )}
    </div>
  );
}

interface TesterTabProps {
  memos: MemoAdmin[];
  onAction: (memoId: string, action: string, comment?: string, stage?: string) => void;
  actionLoading: string | null;
  onRefresh: () => void;
  onSeed: () => void;
  onDeleteTests: () => void;
  seedLoading: boolean;
  deleteLoading: boolean;
  lastActionResult: string | null;
}

export function TesterTab({ 
  onSeed, 
  onDeleteTests, 
  seedLoading, 
  deleteLoading 
}: TesterTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Test Data Management</h3>
        <div className="flex gap-3">
          <button
            onClick={onSeed}
            disabled={seedLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {seedLoading ? "Seeding..." : "Seed Test Memos"}
          </button>
          <button
            onClick={onDeleteTests}
            disabled={deleteLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            {deleteLoading ? "Deleting..." : "Delete Test Memos"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RolesTabProps {
  memos: MemoAdmin[];
}

export function RolesTab({ memos }: RolesTabProps) {
  const [selectedRole, setSelectedRole] = useState("Manager");
  const roles = ["Manager", "Executive", "Finance", "PMU", "SG"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {roles.map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              selectedRole === role
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {role}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Memos visible to {selectedRole}
        </h3>
        <p className="text-sm text-gray-500">
          {memos.length} memo{memos.length !== 1 ? "s" : ""} visible to this role
        </p>
      </div>
    </div>
  );
}
