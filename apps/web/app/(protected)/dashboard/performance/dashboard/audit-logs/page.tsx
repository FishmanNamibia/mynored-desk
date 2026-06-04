'use client'

import { toast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/pms/utils'
import { Shield, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  reason?: string
  ipAddress?: string
  createdAt: string
  actor: {
    name: string
    email: string
    role: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [undoDialogOpen, setUndoDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [undoing, setUndoing] = useState(false)

  const isAdmin = session?.user?.role === 'ADMIN'

  const fetchLogs = (page: number) => {
    setLoading(true)
    fetch(`/dashboard/performance/api/audit-logs?page=${page}&limit=50`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || [])
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 })
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch audit logs:', err)
        setLogs([])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchLogs(1)
  }, [])

  const handleUndoClick = (log: AuditLog) => {
    setSelectedLog(log)
    setUndoDialogOpen(true)
  }

  const handleUndoConfirm = async () => {
    if (!selectedLog) return

    setUndoing(true)
    try {
      const response = await fetch(`/dashboard/performance/api/audit-logs/${selectedLog.id}/undo`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({ title: '✅ Action undone successfully!' })
        // Refresh logs
        fetchLogs(pagination.page)
      } else {
        const error = await response.json()
        toast({ title: `$1`, variant: "destructive" })
      }
    } catch (error) {
      console.error('Error undoing action:', error)
      toast({ title: '❌ An unexpected error occurred while undoing the action.', variant: 'destructive' })
    } finally {
      setUndoing(false)
      setUndoDialogOpen(false)
      setSelectedLog(null)
    }
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      DEADLINE_OVERRIDE: 'bg-orange-100 text-orange-800',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  if (loading && logs.length === 0) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Audit Logs</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Complete audit trail of all system changes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No audit logs found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>IP Address</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.actor?.name || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{log.actor?.email || 'N/A'}</p>
                          {log.actor && (
                            <Badge className="mt-1 text-xs">
                              {log.actor.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.entityType}</p>
                          <p className="text-xs text-gray-500 font-mono">
                            {log.entityId.substring(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.ipAddress || '-'}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUndoClick(log)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            Undo
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Undo Confirmation Dialog */}
      <AlertDialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Action?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to undo this {selectedLog?.action} action on {selectedLog?.entityType}?
              <br /><br />
              <strong>Action:</strong> {selectedLog?.action}<br />
              <strong>Entity Type:</strong> {selectedLog?.entityType}<br />
              <strong>Entity ID:</strong> {selectedLog?.entityId}
              <br /><br />
              This will attempt to reverse the changes made by this action. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndoConfirm}
              disabled={undoing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {undoing ? 'Undoing...' : 'Yes, Undo Action'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
