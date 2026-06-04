'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Database, Download, Upload, Clock, Trash2, RefreshCw,
  Shield, CheckCircle, AlertTriangle, XCircle, Calendar,
  HardDrive, Activity, Settings, Play, Square, FileArchive
} from 'lucide-react'

const ALLOWED_EMAIL = 'afanuel@nsa.org.na'

interface Backup {
  filename: string
  size: number
  createdAt: string
}

interface ListData {
  backups: Backup[]
  hasSchedule: boolean
  cronLine: string
  scheduleHour: string
  scheduleMinute: string
  recentLogs: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-NA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  } catch { return iso }
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {label}
    </span>
  )
}

export default function DbBackupPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Backup | null>(null)

  // Schedule settings
  const [scheduleHour, setScheduleHour] = useState('2')
  const [scheduleMinute, setScheduleMinute] = useState('0')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [retentionDays, setRetentionDays] = useState(10)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 6000)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/dashboard/api/db-backup/list')
      const json = await res.json()
      if (json.success) {
        setData(json)
        setScheduleEnabled(json.hasSchedule)
        if (json.scheduleHour) setScheduleHour(json.scheduleHour)
        if (json.scheduleMinute) setScheduleMinute(json.scheduleMinute)
      }
    } catch (e) {
      showMsg('error', 'Failed to load backup data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Access guard
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  const userEmail = (user as any)?.email || (user as any)?.userPrincipalName || ''
  if (userEmail.toLowerCase() !== ALLOWED_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 border border-red-200 rounded-2xl p-10 max-w-sm mx-auto">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-500 text-sm">This page is restricted to the system administrator only.</p>
        </div>
      </div>
    )
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/dashboard/api/db-backup/create', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        showMsg('success', `✅ Backup created: ${json.filename} (${formatBytes(json.size)})`)
        fetchData()
      } else {
        showMsg('error', `❌ ${json.error}`)
      }
    } catch {
      showMsg('error', '❌ Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backup: Backup) => {
    setConfirmRestore(null)
    setRestoring(backup.filename)
    try {
      const res = await fetch('/dashboard/api/db-backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backup.filename }),
      })
      const json = await res.json()
      if (json.success) {
        showMsg('success', `✅ ${json.message}`)
        fetchData()
      } else {
        showMsg('error', `❌ ${json.error}`)
      }
    } catch {
      showMsg('error', '❌ Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const handleDelete = async (backup: Backup) => {
    setConfirmDelete(null)
    setDeleting(backup.filename)
    try {
      const res = await fetch('/dashboard/api/db-backup/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backup.filename }),
      })
      const json = await res.json()
      if (json.success) {
        showMsg('success', `🗑️ ${json.message}`)
        fetchData()
      } else {
        showMsg('error', `❌ ${json.error}`)
      }
    } catch {
      showMsg('error', '❌ Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    try {
      const res = await fetch('/dashboard/api/db-backup/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hour: parseInt(scheduleHour),
          minute: parseInt(scheduleMinute),
          enabled: scheduleEnabled,
          retentionDays,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showMsg('success', `✅ ${json.message}`)
        fetchData()
      } else {
        showMsg('error', `❌ ${json.error}`)
      }
    } catch {
      showMsg('error', '❌ Failed to update schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const latestBackup = data?.backups?.[0]
  const totalSize = data?.backups?.reduce((a, b) => a + b.size, 0) || 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg">
            <Database className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Backup Manager</h1>
            <p className="text-sm text-gray-500 mt-0.5">Production database · mynsa_desk_dev · 172.16.192.63</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge ok={data?.hasSchedule || false} label={data?.hasSchedule ? 'Auto-backup ON' : 'Auto-backup OFF'} />
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notification */}
      {msg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-sm ${
          msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileArchive, label: 'Total Backups', value: loading ? '…' : String(data?.backups?.length || 0), color: 'text-blue-600 bg-blue-50' },
          { icon: HardDrive, label: 'Total Storage', value: loading ? '…' : formatBytes(totalSize), color: 'text-indigo-600 bg-indigo-50' },
          { icon: Clock, label: 'Last Backup', value: loading ? '…' : (latestBackup ? formatDate(latestBackup.createdAt) : 'None yet'), color: 'text-teal-600 bg-teal-50' },
          { icon: Calendar, label: 'Next Scheduled', value: loading ? '…' : (data?.hasSchedule ? `Daily at ${String(data.scheduleHour).padStart(2,'0')}:${String(data.scheduleMinute).padStart(2,'0')}` : 'Not set'), color: 'text-orange-600 bg-orange-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold text-gray-900 mt-1 truncate" title={value}>{value}</p>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Create Backup */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Backup Now</h2>
              <p className="text-xs text-gray-500">Full database snapshot with compression</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            Creates a complete compressed backup of <span className="font-semibold text-gray-800">mynsa_desk_dev</span> and saves it to the server. This may take up to 2 minutes.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {creating ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Creating backup…</>
            ) : (
              <><Download className="h-4 w-4" /> Create Backup</>
            )}
          </button>
          {creating && (
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Activity className="h-4 w-4 animate-pulse" />
              Running pg_dump… please wait, this may take a moment.
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Settings className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Daily Auto-Backup</h2>
              <p className="text-xs text-gray-500">Linux cron job · {retentionDays}-day retention</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Enable daily backup</span>
              <button
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduleEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${scheduleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Run at hour (0–23)</label>
                <input
                  type="number" min={0} max={23}
                  value={scheduleHour}
                  onChange={e => setScheduleHour(e.target.value)}
                  disabled={!scheduleEnabled}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Minute (0–59)</label>
                <input
                  type="number" min={0} max={59}
                  value={scheduleMinute}
                  onChange={e => setScheduleMinute(e.target.value)}
                  disabled={!scheduleEnabled}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Retention (days)</label>
              <input
                type="number" min={1} max={30}
                value={retentionDays}
                onChange={e => setRetentionDays(parseInt(e.target.value) || 10)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {savingSchedule ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</> : <><Calendar className="h-4 w-4" /> Save Schedule</>}
            </button>
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <FileArchive className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">Backup Files</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {data?.backups?.length || 0} files
            </span>
          </div>
          <p className="text-xs text-gray-400">/home/afanuel/backups/scheduled/</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading backups…
          </div>
        ) : !data?.backups?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Database className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No backups yet</p>
            <p className="text-sm mt-1">Create your first backup using the button above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.backups.map((backup) => (
              <div key={backup.filename} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <FileArchive className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{backup.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(backup.createdAt)} · {formatBytes(backup.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => setConfirmRestore(backup)}
                    disabled={!!restoring}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {restoring === backup.filename ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Restoring…</>
                    ) : (
                      <><Upload className="h-3.5 w-3.5" /> Restore</>
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(backup)}
                    disabled={!!deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {deleting === backup.filename ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                    ) : (
                      <><Trash2 className="h-3.5 w-3.5" /> Delete</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Logs */}
      {data?.recentLogs && (
        <div className="bg-gray-900 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-gray-300">Recent Activity Log</span>
          </div>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
            {data.recentLogs}
          </pre>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmRestore(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Restore Database?</h3>
                <p className="text-sm text-gray-500">This will overwrite the current database</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Warning — this action cannot be undone</p>
              <p>Restoring <span className="font-mono font-bold">{confirmRestore.filename}</span> will replace ALL current data with the backup data from <span className="font-semibold">{formatDate(confirmRestore.createdAt)}</span>.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestore(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleRestore(confirmRestore)} className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Backup?</h3>
                <p className="text-sm text-gray-500">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to permanently delete <span className="font-mono font-bold text-gray-800">{confirmDelete.filename}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
