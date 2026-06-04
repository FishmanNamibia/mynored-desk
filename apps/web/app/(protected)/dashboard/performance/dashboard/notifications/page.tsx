'use client'

import { toast } from "@/hooks/use-toast";

import { useEffect, useState } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Bell, Check, X, Trash2, AlertCircle, Mail, MailOpen, ExternalLink, FileCheck, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  status: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  entityData?: any
  metadata?: any
  sender: {
    id: string
    name: string
    email: string
    role: string
  }
  adminNote?: string
  respondedAt?: string
  createdAt: string
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [reviewDetails, setReviewDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const fetchNotifications = () => {
    fetch('/dashboard/performance/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch notifications:', err)
        setNotifications([])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchNotifications()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Debug: Monitor dialog state changes
  useEffect(() => {
    console.log('viewDialogOpen state changed to:', viewDialogOpen)
  }, [viewDialogOpen])

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification)
    setAdminNote('')
    setDialogOpen(true)
  }

  const handleApprove = async () => {
    if (!selectedNotification) return
    setProcessing(true)

    try {
      const response = await fetch(`/dashboard/performance/api/notifications/${selectedNotification.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          adminNote,
        }),
      })

      if (response.ok) {
        setDialogOpen(false)
        fetchNotifications()
      } else {
        toast({ title: 'Failed to approve request', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to approve:', error)
      toast({ title: 'Failed to approve request', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedNotification) return
    if (!adminNote.trim()) {
      toast({ title: 'Please provide a reason for rejection', variant: 'destructive' })
      return
    }
    setProcessing(true)

    try {
      const response = await fetch(`/dashboard/performance/api/notifications/${selectedNotification.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          adminNote,
        }),
      })

      if (response.ok) {
        setDialogOpen(false)
        fetchNotifications()
      } else {
        toast({ title: 'Failed to reject request', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to reject:', error)
      toast({ title: 'Failed to reject request', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    console.log('Marking as read:', notificationId)
    try {
      const response = await fetch(`/dashboard/performance/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READ' }),
      })

      console.log('Mark as read response:', response.status, response.ok)
      if (response.ok) {
        console.log('Refreshing notifications...')
        fetchNotifications()
      } else {
        const errorText = await response.text()
        console.error('Failed to mark as read:', response.status, errorText)
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const fetchReviewDetails = async (notification: Notification) => {
    // Check if this is a review notification
    const isReview = notification.message.toLowerCase().includes('reviewed') || 
                     (notification.message.toLowerCase().includes('approved') && notification.message.toLowerCase().includes('rejected'))
    
    console.log('Fetching review details - isReview:', isReview, 'message:', notification.message)
    
    if (!isReview || !session?.user?.id) {
      console.log('Skipping review details fetch')
      return
    }
    
    setLoadingDetails(true)
    try {
      console.log('Fetching agreements for user:', session.user.id)
      // Fetch user's performance agreements
      const res = await fetch(`/dashboard/performance/api/performance-agreements/user/${session.user.id}`)
      if (res.ok) {
        const agreements = await res.json()
        console.log('Fetched agreements:', agreements.length)
        
        // Check if notification has metadata with specific reviewed IDs
        const metadata = notification.entityData || notification.metadata
        if (metadata?.approvedIds || metadata?.rejectedIds) {
          // Filter to show only the agreements from this specific review
          const approvedIds = metadata.approvedIds || []
          const rejectedIds = metadata.rejectedIds || []
          
          const details = {
            approved: agreements.filter((a: any) => approvedIds.includes(a.id)),
            rejected: agreements.filter((a: any) => rejectedIds.includes(a.id)),
            pending: []
          }
          console.log('Review details (filtered by notification):', details)
          setReviewDetails(details)
        } else {
          // Fallback: show all approved/rejected (old behavior)
          const details = {
            approved: agreements.filter((a: any) => a.approvalStatus === 'APPROVED'),
            rejected: agreements.filter((a: any) => a.approvalStatus === 'REJECTED'),
            pending: agreements.filter((a: any) => a.approvalStatus === 'PENDING')
          }
          console.log('Review details (all):', details)
          setReviewDetails(details)
        }
      }
    } catch (error) {
      console.error('Failed to fetch review details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    console.log('=== Notification clicked ===')
    console.log('Notification:', notification)
    console.log('Current viewDialogOpen state:', viewDialogOpen)
    
    setSelectedNotification(notification)
    setReviewDetails(null) // Reset previous details
    console.log('Selected notification set')
    
    // For delete requests or weight unlock requests that need action, open the review dialog
    const isWeightUnlock = notification.entityType === 'UserTaskWeight' && 
      notification.type === 'APPROVAL_REQUESTED' && 
      notification.status === 'PENDING'
    if ((notification.type === 'DELETE_REQUEST' && notification.status === 'PENDING') || isWeightUnlock) {
      console.log('Opening action dialog')
      setDialogOpen(true)
      setAdminNote('')
    } else {
      // For all notifications (including submissions), open the view dialog
      console.log('Opening view dialog, setting viewDialogOpen to true')
      setViewDialogOpen(true)
      console.log('viewDialogOpen should now be true')
      
      // Fetch details if it's a review notification
      fetchReviewDetails(notification)
      
      // Mark as read if it's unread
      if (notification.status === 'PENDING') {
        console.log('Marking as read...')
        handleMarkAsRead(notification.id)
      }
    }
  }
  
  const handleGoToApprovals = () => {
    if (!selectedNotification) return
    
    // Determine which tab to open
    if (selectedNotification.type === 'PERFORMANCE_AGREEMENT_SUBMISSION' || 
        selectedNotification.entityType === 'PerformanceAgreement' ||
        (selectedNotification.type === 'GENERAL' && selectedNotification.message.toLowerCase().includes('performance agreement') && selectedNotification.message.toLowerCase().includes('submitted'))) {
      router.push('/dashboard/approvals?tab=agreements')
    } else if (selectedNotification.type === 'ADHOC_TASK_SUBMISSION' || 
        selectedNotification.entityType === 'AdhocTask' ||
        selectedNotification.type === 'TASK_ASSIGNED') {
      router.push('/dashboard/approvals?tab=tasks')
    }
    
    // Close dialog and navigate after a short delay for smooth UX
    setViewDialogOpen(false)
    setTimeout(() => {
      // Navigation handled above
    }, 100)
  }

  const unreadNotifications = notifications.filter(n => n.status === 'PENDING')
  const readNotifications = notifications.filter(n => n.status === 'READ')

  // Convert notifications to individual items (no grouping)
  const groupNotifications = (notificationList: Notification[]) => {
    return notificationList.map(notification => ({
      main: notification,
      related: []
    }))
  }

  const groupedUnread = groupNotifications(unreadNotifications)
  const groupedRead = groupNotifications(readNotifications)

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Notifications</h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-tight">
              {unreadNotifications.length} unread, {readNotifications.length} read
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadNotifications.length > 0 && (
            <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
              <Mail className="h-4 w-4 mr-2" />
              {unreadNotifications.length} Unread
            </Badge>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm mt-1">You don't have any notifications at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 px-2">UNREAD ({unreadNotifications.length})</h2>
              {groupedUnread.map((group) => (
                <div
                  key={group.main.id}
                  onClick={() => handleNotificationClick(group.main)}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 wrap-break-word">
                          {group.main.message}
                        </h3>
                        {group.main.type === 'DELETE_REQUEST' && (
                          <Badge className="bg-red-100 text-red-800 text-xs shrink-0">
                            Action Required
                          </Badge>
                        )}
                        {group.main.entityType === 'UserTaskWeight' && group.main.type === 'APPROVAL_REQUESTED' && group.main.status === 'PENDING' && (
                          <Badge className="bg-amber-100 text-amber-800 text-xs shrink-0">
                            Unlock Request
                          </Badge>
                        )}
                        {(group.main.type === 'PERFORMANCE_AGREEMENT_SUBMISSION' || 
                          group.main.entityType === 'PerformanceAgreement' ||
                          group.main.type === 'ADHOC_TASK_SUBMISSION' ||
                          group.main.entityType === 'AdhocTask' ||
                          group.main.type === 'TASK_ASSIGNED' ||
                          (group.main.type === 'GENERAL' && group.main.message.toLowerCase().includes('submitted') && 
                           (group.main.message.toLowerCase().includes('performance agreement') || group.main.message.toLowerCase().includes('task')))) && (
                          <Badge className="bg-green-100 text-green-800 text-xs shrink-0 flex items-center gap-1">
                            <FileCheck className="h-3 w-3" />
                            Submission
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 truncate">
                        From: <span className="font-medium">{group.main.sender?.name || 'Unknown'}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(group.main.createdAt), { addSuffix: true })}
                        </p>
                        {(group.main.type === 'PERFORMANCE_AGREEMENT_SUBMISSION' || 
                          group.main.entityType === 'PerformanceAgreement' ||
                          group.main.type === 'ADHOC_TASK_SUBMISSION' ||
                          group.main.entityType === 'AdhocTask' ||
                          group.main.type === 'TASK_ASSIGNED' ||
                          (group.main.type === 'GENERAL' && group.main.message.toLowerCase().includes('submitted') && 
                           (group.main.message.toLowerCase().includes('performance agreement') || group.main.message.toLowerCase().includes('task')))) && (
                          <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
                            Click to view details
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(group.main.type === 'DELETE_REQUEST' || 
                        (group.main.entityType === 'UserTaskWeight' && group.main.type === 'APPROVAL_REQUESTED' && group.main.status === 'PENDING')) ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDetails(group.main)
                          }}
                        >
                          Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleMarkAsRead(group.main.id, e)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 px-2">READ ({readNotifications.length})</h2>
              {groupedRead.map((group) => (
                <div
                  key={group.main.id}
                  onClick={() => handleNotificationClick(group.main)}
                  className="bg-white border border-gray-200 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <MailOpen className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-700 line-clamp-2 wrap-break-word flex-1">
                          {group.main.message}
                          {group.related.length > 0 && (
                            <span className="text-sm font-normal text-gray-500 ml-2">
                              (and {group.related.length} more)
                            </span>
                          )}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`shrink-0 ${
                            group.main.status === 'APPROVED'
                              ? 'border-green-300 text-green-700 bg-green-50'
                              : group.main.status === 'REJECTED'
                              ? 'border-red-300 text-red-700 bg-red-50'
                              : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {group.main.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2 truncate">
                        From: {group.main.sender?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(group.main.createdAt), { addSuffix: true })}
                      </p>
                      {group.main.adminNote && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-700">Response:</p>
                          <p className="text-xs text-gray-600 mt-1 wrap-break-word">{group.main.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notification Details / Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedNotification?.entityType === 'UserTaskWeight' ? 'Weight Allocation Unlock Request' : 'Review Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.entityType === 'UserTaskWeight'
                ? 'A team member is requesting permission to modify their weight allocation.'
                : 'Review and respond to this request'}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              {/* Weight Unlock specific info */}
              {selectedNotification.entityType === 'UserTaskWeight' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-1">Weight Allocation Unlock</h4>
                      <p className="text-sm text-amber-800">
                        {(selectedNotification.metadata as any)?.requesterName || selectedNotification.sender?.name || 'A user'} from{' '}
                        <strong>{(selectedNotification.metadata as any)?.department || 'your department'}</strong>{' '}
                        is requesting to unlock their performance weight allocation so they can modify the distribution of weights across task categories.
                      </p>
                      <p className="text-xs text-amber-700 mt-2">
                        Approving will allow them to change their weight allocation. Rejecting will keep the current weights locked.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Generic request info */}
              {selectedNotification.entityType !== 'UserTaskWeight' && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Request Type</Label>
                    <p className="text-lg font-semibold mt-1">{selectedNotification.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Message</Label>
                    <p className="mt-1">{selectedNotification.message}</p>
                  </div>
                </>
              )}

              <div>
                <Label className="text-sm font-medium">Requested by</Label>
                <p className="mt-1">
                  {selectedNotification.sender?.name || 'Unknown'} ({selectedNotification.sender?.email || 'N/A'})
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Submitted</Label>
                <p className="mt-1 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true })}
                </p>
              </div>

              {selectedNotification.entityData && selectedNotification.entityType !== 'UserTaskWeight' && (
                <div>
                  <Label className="text-sm font-medium">Details</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedNotification.entityData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="adminNote">
                  {selectedNotification.entityType === 'UserTaskWeight' ? 'Comment (required for rejection)' : 'Response Note'}
                </Label>
                <textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  placeholder={selectedNotification.entityType === 'UserTaskWeight'
                    ? 'Add a comment (e.g., reason for approval or rejection)...'
                    : 'Add a note (required for rejection)'}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Reject'}
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              <Check className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : selectedNotification?.entityType === 'UserTaskWeight' ? 'Grant Unlock' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Notification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification?.status === 'PENDING' ? (
                <Mail className="h-5 w-5 text-blue-600" />
              ) : (
                <MailOpen className="h-5 w-5 text-gray-600" />
              )}
              Notification Details
            </DialogTitle>
            <DialogDescription>
              View notification details and take action if needed
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    selectedNotification.status === 'PENDING'
                      ? 'border-blue-300 text-blue-700 bg-blue-50'
                      : selectedNotification.status === 'APPROVED'
                      ? 'border-green-300 text-green-700 bg-green-50'
                      : selectedNotification.status === 'REJECTED'
                      ? 'border-red-300 text-red-700 bg-red-50'
                      : 'border-gray-300 text-gray-700'
                  }
                >
                  {selectedNotification.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedNotification.type.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Submission Indicator */}
              {(selectedNotification.type === 'PERFORMANCE_AGREEMENT_SUBMISSION' || 
                selectedNotification.entityType === 'PerformanceAgreement' ||
                selectedNotification.type === 'ADHOC_TASK_SUBMISSION' ||
                selectedNotification.entityType === 'AdhocTask' ||
                selectedNotification.type === 'TASK_ASSIGNED' ||
                (selectedNotification.type === 'GENERAL' && selectedNotification.message.toLowerCase().includes('submitted') && 
                 (selectedNotification.message.toLowerCase().includes('performance agreement') || selectedNotification.message.toLowerCase().includes('task')))) && (
                <div className="p-4 bg-linear-to-r from-green-50 to-blue-50 border-l-4 border-green-500 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        {selectedNotification.entityType === 'PerformanceAgreement' || 
                         selectedNotification.message.toLowerCase().includes('performance agreement')
                          ? 'Performance Agreement Submission'
                          : 'Task Submission'}
                      </h4>
                      <p className="text-sm text-green-800">
                        This submission is awaiting your review and approval. Click "Go to Approvals" below to review the details and take action.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">Message</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-base leading-relaxed wrap-break-word whitespace-normal">
                    {selectedNotification.message}
                  </p>
                </div>
              </div>

              {/* Review Details Breakdown */}
              {loadingDetails ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 text-center">Loading review details...</p>
                </div>
              ) : reviewDetails && (reviewDetails.approved.length > 0 || reviewDetails.rejected.length > 0) && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Review Details</Label>
                  
                  {/* Approved Initiatives */}
                  {reviewDetails.approved.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-green-900">
                          Approved ({reviewDetails.approved.length})
                        </h4>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {reviewDetails.approved.slice(0, 5).map((agreement: any, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Navigating to agreement:', agreement.id)
                              setViewDialogOpen(false)
                              setTimeout(() => {
                                router.push(`/dashboard/my-tasks/performance?highlight=${agreement.id}`)
                              }, 100)
                            }}
                            className="w-full text-left p-2 rounded hover:bg-green-100 transition-colors flex items-start gap-2 group"
                          >
                            <Check className="h-3 w-3 mt-0.5 shrink-0 text-green-600" />
                            <span className="text-sm text-green-800 line-clamp-1 flex-1 group-hover:underline">
                              {agreement.customAction || agreement.initiative?.title}
                            </span>
                            <ExternalLink className="h-3 w-3 text-green-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                          </button>
                        ))}
                        {reviewDetails.approved.length > 5 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setViewDialogOpen(false)
                              setTimeout(() => {
                                router.push('/dashboard/my-tasks/performance?filter=approved')
                              }, 100)
                            }}
                            className="w-full text-left p-2 text-xs text-green-600 hover:text-green-700 hover:underline italic"
                          >
                            View all {reviewDetails.approved.length} approved initiatives →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Rejected Initiatives */}
                  {reviewDetails.rejected.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-3">
                        <X className="h-4 w-4 text-red-600" />
                        <h4 className="font-semibold text-red-900">
                          Rejected ({reviewDetails.rejected.length}) - Click to Resolve
                        </h4>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {reviewDetails.rejected.map((agreement: any, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Navigating to rejected agreement:', agreement.id)
                              setViewDialogOpen(false)
                              setTimeout(() => {
                                router.push(`/dashboard/my-tasks/performance?highlight=${agreement.id}`)
                              }, 100)
                            }}
                            className="w-full text-left p-2 rounded hover:bg-red-100 transition-colors flex items-start gap-2 group"
                          >
                            <X className="h-3 w-3 mt-0.5 shrink-0 text-red-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-red-800 line-clamp-1 group-hover:underline">
                                {agreement.customAction || agreement.initiative?.title}
                              </p>
                              {agreement.progressNotes && (
                                <p className="text-xs text-red-600 mt-1 line-clamp-2">
                                  Reason: {agreement.progressNotes}
                                </p>
                              )}
                            </div>
                            <ExternalLink className="h-3 w-3 text-red-600 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                          </button>
                        ))}
                      </div>
                      {reviewDetails.rejected.length > 0 && (
                        <div className="mt-3 p-2 bg-red-100 rounded">
                          <p className="text-xs text-red-700">
                            💡 Tip: Click any rejected item to view and fix it directly
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setViewDialogOpen(false)
                      setTimeout(() => {
                        router.push('/dashboard/my-tasks/performance')
                      }, 100)
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View All My Performance Agreements
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">From</Label>
                  <div className="mt-1">
                    <p className="font-medium">{selectedNotification.sender?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{selectedNotification.sender?.email || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: {selectedNotification.sender?.role || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Received</Label>
                  <div className="mt-1">
                    <p className="text-sm">
                      {new Date(selectedNotification.createdAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {selectedNotification.entityType && selectedNotification.entityId && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Related To</Label>
                  <div className="mt-1 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm">
                      <span className="font-medium">{selectedNotification.entityType}</span>
                      <span className="text-gray-600 ml-2">ID: {selectedNotification.entityId}</span>
                    </p>
                  </div>
                </div>
              )}

              {selectedNotification.adminNote && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Admin Response</Label>
                  <div className="mt-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm leading-relaxed wrap-break-word whitespace-normal">
                      {selectedNotification.adminNote}
                    </p>
                    {selectedNotification.respondedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Responded {formatDistanceToNow(new Date(selectedNotification.respondedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedNotification.entityData && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Additional Details</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {JSON.stringify(selectedNotification.entityData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              {/* Mark as Read button - only for unread notifications */}
              {selectedNotification?.status === 'PENDING' && selectedNotification.type !== 'DELETE_REQUEST' && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (selectedNotification) {
                      handleMarkAsRead(selectedNotification.id)
                      setViewDialogOpen(false)
                    }
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
              )}
              
              {/* Action buttons based on notification type */}
              {selectedNotification && (() => {
                const message = selectedNotification.message.toLowerCase()
                const isReview = message.includes('reviewed') || 
                                (message.includes('approved') && message.includes('rejected'))
                const isSubmission = selectedNotification.type === 'PERFORMANCE_AGREEMENT_SUBMISSION' || 
                                    message.includes('submitted') && message.includes('performance agreement')
                const isTaskNotification = selectedNotification.entityType === 'Target' || 
                                          message.includes('task') && (message.includes('approved') || message.includes('rejected'))
                
                // For review notifications (employee receiving supervisor's review)
                if (isReview) {
                  return (
                    <Button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setViewDialogOpen(false)
                        setTimeout(() => {
                          router.push('/dashboard/my-tasks/performance')
                        }, 100)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View My Performance Agreement
                    </Button>
                  )
                }
                
                // For submission notifications (supervisor receiving employee's submission)
                if (isSubmission) {
                  return (
                    <Button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleGoToApprovals()
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Go to Approvals
                    </Button>
                  )
                }
                
                // For task notifications (approved/rejected tasks)
                if (isTaskNotification) {
                  return (
                    <Button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setViewDialogOpen(false)
                        setTimeout(() => {
                          router.push('/dashboard/my-tasks/performance')
                        }, 100)
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View My Performance Agreement
                    </Button>
                  )
                }
                
                return null
              })()}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
