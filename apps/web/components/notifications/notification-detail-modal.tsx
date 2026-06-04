'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Calendar, User, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationDetailModalProps {
  notification: {
    id: string
    type: string
    status: string
    message: string
    entityType?: string | null
    entityId?: string | null
    metadata?: any
    senderId?: string | null
    receiverId: string
    sender?: { id: string; name: string; email: string } | null
    createdAt: string
    updatedAt: string
  } | null
  open: boolean
  onClose: () => void
  onMarkAsRead?: (id: string) => void
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'TARGET_ASSIGNED': return '🎯'
    case 'TARGET_DUE': return '⏰'
    case 'TARGET_COMPLETED': return '✅'
    case 'APPROVAL_REQUESTED': return '📋'
    case 'APPROVED': return '✅'
    case 'REJECTED': return '❌'
    case 'MEMO_SUBMITTED': return '📝'
    case 'MEMO_APPROVED': return '✅'
    case 'MEMO_RETURNED': return '🔄'
    case 'REVIEW_ASSIGNED': return '👁️'
    case 'REVIEW_SUBMITTED': return '📊'
    case 'WEIGHT_UNLOCK_REQUEST': return '🔓'
    default: return '📢'
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'TARGET_ASSIGNED': return 'Target Assigned'
    case 'TARGET_DUE': return 'Target Due Soon'
    case 'TARGET_COMPLETED': return 'Target Completed'
    case 'APPROVAL_REQUESTED': return 'Approval Requested'
    case 'APPROVED': return 'Approved'
    case 'REJECTED': return 'Rejected'
    case 'MEMO_SUBMITTED': return 'Memo Submitted'
    case 'MEMO_APPROVED': return 'Memo Approved'
    case 'MEMO_RETURNED': return 'Memo Returned'
    case 'REVIEW_ASSIGNED': return 'Review Assigned'
    case 'REVIEW_SUBMITTED': return 'Review Submitted'
    case 'WEIGHT_UNLOCK_REQUEST': return 'Weight Unlock Request'
    default: return 'Notification'
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotificationDetailModal({ 
  notification, 
  open, 
  onClose,
  onMarkAsRead 
}: NotificationDetailModalProps) {
  if (!notification) return null

  const isUnread = notification.status === 'PENDING'
  const isWeightUnlock = notification.type === 'WEIGHT_UNLOCK_REQUEST'

  const handleViewEntity = () => {
    if (notification.entityType && notification.entityId) {
      const entityRoutes: Record<string, string> = {
        'MEMO': `/dashboard/memos/${notification.entityId}`,
        'TARGET': `/dashboard/performance/targets/${notification.entityId}`,
        'REVIEW': `/dashboard/performance/reviews/${notification.entityId}`,
      }
      const route = entityRoutes[notification.entityType]
      if (route) {
        window.location.href = route
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-xl shrink-0">
                {isWeightUnlock ? '🔓' : getNotificationIcon(notification.type)}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  {isWeightUnlock ? 'Weight Unlock Request' : getNotificationTitle(notification.type)}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  View notification details and take action if needed
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            <Badge className={cn(
              'text-xs px-2 py-0.5',
              isUnread ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
            )}>
              {isUnread ? 'UNREAD' : 'READ'}
            </Badge>
            <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs px-2 py-0.5">
              {getNotificationTitle(notification.type).toUpperCase()}
            </Badge>
            {isWeightUnlock && (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5">
                ACTION REQUIRED
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Message Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Message</h3>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                {notification.message}
              </p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sender Info */}
            {notification.sender && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">From</h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{(notification.sender as any).name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{notification.sender.email}</span>
                  </div>
                  {notification.metadata?.role && (
                    <div className="text-xs text-gray-500">
                      Role: {notification.metadata.role}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Date Info */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Received</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(notification.createdAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {timeAgo(notification.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Related Entity */}
          {notification.entityType && notification.entityId && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Related To</h3>
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-red-900">{notification.entityType}</span>
                  <span className="text-red-700">ID: {notification.entityId.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {notification.entityType && notification.entityId && (
              <Button
                onClick={handleViewEntity}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View {notification.entityType.toLowerCase()}
              </Button>
            )}
            {isUnread && onMarkAsRead && (
              <Button
                onClick={() => {
                  onMarkAsRead(notification.id)
                  onClose()
                }}
                variant="outline"
                className="flex-1"
              >
                Mark as Read
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
