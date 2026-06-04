'use client'

import { useEffect, useRef, useCallback } from 'react'
import { logout } from '@/lib/logout'

/**
 * Auto-logout hook that signs out users after a period of inactivity
 * @param timeoutMinutes - Minutes of inactivity before logout (default: 300 minutes = 5 hours)
 */
export function useAutoLogout(timeoutMinutes: number = 300) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Don't set new timers if timeout is disabled
    if (timeoutMinutes <= 0) {
      return
    }

    // Show warning 5 minutes before logout
    const warningTime = (timeoutMinutes - 5) * 60 * 1000
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        // Show warning notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Session Expiring Soon', {
              body: 'You will be logged out in 5 minutes due to inactivity.',
              icon: '/apple-icon.png',
            })
          }
        }
        
        // Also show browser alert as fallback
        console.warn('Session will expire in 5 minutes due to inactivity')
      }, warningTime)
    }

    // Set main logout timer - uses our enhanced logout function
    const logoutTime = timeoutMinutes * 60 * 1000
    timeoutRef.current = setTimeout(() => {
      console.log('Auto-logout: Session expired due to inactivity')
      logout()
    }, logoutTime)
  }, [timeoutMinutes])

  useEffect(() => {
    // Don't set up auto-logout if timeout is 0 or negative (disabled)
    if (timeoutMinutes <= 0) {
      return
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Reset timer on any user activity
    const handleActivity = () => {
      resetTimer()
    }

    // Initialize timer
    resetTimer()

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [timeoutMinutes, resetTimer])
}
