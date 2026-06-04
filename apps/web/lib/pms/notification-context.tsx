'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { toast } from '@/hooks/use-toast'

// ============================================================================
// Types
// ============================================================================

export interface Notification {
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
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  clearNotification: (notificationId: string) => void
}

// ============================================================================
// Context
// ============================================================================

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// ============================================================================
// Notification type display helpers
// ============================================================================

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'TARGET_ASSIGNED': return '🎯'
    case 'TARGET_DUE': return '⏰'
    case 'TARGET_COMPLETED': return '✅'
    case 'APPROVAL_REQUESTED': return '📋'
    case 'APPROVED': return '✅'
    case 'REJECTED': return '❌'
    case 'OVERDUE': return '🚨'
    case 'REMINDER': return '🔔'
    case 'SYSTEM': return '⚙️'
    case 'RATING_360_ASSIGNED': return '⭐'
    case 'RATING_360_COMPLETED': return '🏆'
    case 'DELETE_REQUEST': return '🗑️'
    case 'DELETE_APPROVED': return '✅'
    case 'DELETE_REJECTED': return '❌'
    case 'GENERAL': return '📢'
    default: return '🔔'
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
    case 'OVERDUE': return 'Overdue'
    case 'REMINDER': return 'Reminder'
    case 'SYSTEM': return 'System Notification'
    case 'RATING_360_ASSIGNED': return '360° Rating Assigned'
    case 'RATING_360_COMPLETED': return '360° Rating Completed'
    case 'DELETE_REQUEST': return 'Delete Request'
    case 'DELETE_APPROVED': return 'Delete Approved'
    case 'DELETE_REJECTED': return 'Delete Rejected'
    case 'GENERAL': return 'Notification'
    default: return 'Notification'
  }
}

// ============================================================================
// Provider
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 10
  const seenNotificationIds = useRef<Set<string>>(new Set())

  /**
   * Connect to the SSE stream
   */
  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const es = new EventSource('/dashboard/performance/api/notifications/stream')
      eventSourceRef.current = es

      es.addEventListener('init', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
          setIsConnected(true)
          reconnectAttempts.current = 0

          // Track seen IDs
          seenNotificationIds.current = new Set(
            (data.notifications || []).map((n: Notification) => n.id)
          )
        } catch (err) {
          console.error('[NotificationProvider] Failed to parse init event:', err)
        }
      })

      es.addEventListener('notification', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          const notif = data.notification

          if (notif && !seenNotificationIds.current.has(notif.id)) {
            seenNotificationIds.current.add(notif.id)

            // Add to state
            setNotifications((prev) => [notif, ...prev])
            if (data.unreadCount !== undefined) {
              setUnreadCount(data.unreadCount)
            } else {
              setUnreadCount((prev) => prev + 1)
            }

            // Show toast notification
            const icon = getNotificationIcon(notif.type)
            const title = getNotificationTitle(notif.type)

            toast({
              title: `${icon} ${title}`,
              description: notif.message.length > 100
                ? notif.message.substring(0, 100) + '...'
                : notif.message,
              duration: 6000,
            })
          }
        } catch (err) {
          console.error('[NotificationProvider] Failed to parse notification event:', err)
        }
      })

      es.onerror = () => {
        setIsConnected(false)
        es.close()
        eventSourceRef.current = null

        // Reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          console.log(`[NotificationProvider] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        } else {
          console.warn('[NotificationProvider] Max reconnect attempts reached, falling back to polling')
          // Fall back to polling
          startPolling()
        }
      }
    } catch (err) {
      console.error('[NotificationProvider] Failed to create EventSource:', err)
      startPolling()
    }
  }, [])

  /**
   * Fallback polling mechanism
   */
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const startPolling = useCallback(() => {
    if (pollingRef.current) return

    const poll = async () => {
      try {
        const res = await fetch('/dashboard/performance/api/notifications?limit=50')
        if (res.ok) {
          const data = await res.json()
          const notifs = Array.isArray(data) ? data : data.notifications || []
          setNotifications(notifs)

          const countRes = await fetch('/dashboard/performance/api/notifications/count')
          if (countRes.ok) {
            const countData = await countRes.json()
            setUnreadCount(countData.count || 0)
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    poll()
    pollingRef.current = setInterval(poll, 15000)
  }, [])

  /**
   * Mark a single notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const res = await fetch(`/dashboard/performance/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READ' }),
      })

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, status: 'READ' } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('[NotificationProvider] Failed to mark as read:', error)
    }
  }, [])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/dashboard/performance/api/notifications/mark-all-read', {
        method: 'POST',
      })

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('[NotificationProvider] Failed to mark all as read:', error)
    }
  }, [])

  /**
   * Refresh notifications manually
   */
  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch('/dashboard/performance/api/notifications?limit=50')
      if (res.ok) {
        const data = await res.json()
        const notifs = Array.isArray(data) ? data : data.notifications || []
        setNotifications(notifs)
      }

      const countRes = await fetch('/dashboard/performance/api/notifications/count')
      if (countRes.ok) {
        const countData = await countRes.json()
        setUnreadCount(countData.count || 0)
      }
    } catch (error) {
      console.error('[NotificationProvider] Failed to refresh:', error)
    }
  }, [])

  /**
   * Remove a notification from local state
   */
  const clearNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [connect])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
