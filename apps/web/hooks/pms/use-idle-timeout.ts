'use client'

import { useEffect, useRef, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UseIdleTimeoutOptions {
  timeout: number // in milliseconds
  warningTime?: number // show warning before logout (in milliseconds)
  onWarning?: () => void
  onTimeout?: () => void
}

export function useIdleTimeout(options: UseIdleTimeoutOptions) {
  const { timeout, warningTime = 60000, onWarning, onTimeout } = options // 1 minute warning default
  const router = useRouter()

  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
    }

    // Set warning timeout (5 minutes - 1 minute = 4 minutes)
    warningRef.current = setTimeout(() => {
      onWarning?.()
    }, timeout - warningTime)

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      onTimeout?.()
      // Force logout
      signOut({ callbackUrl: '/auth/signin', redirect: false })
      router.push('/auth/signin')
    }, timeout)
  }, [timeout, warningTime, onWarning, onTimeout, router])

  const handleActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  useEffect(() => {
    // Activity events to track
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    // Start the timeout initially
    resetTimeout()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current)
      }
    }
  }, [handleActivity, resetTimeout])

  return {
    resetTimeout,
    getTimeUntilTimeout: () => {
      const elapsed = Date.now() - lastActivityRef.current
      return Math.max(0, timeout - elapsed)
    },
    getTimeUntilWarning: () => {
      const elapsed = Date.now() - lastActivityRef.current
      return Math.max(0, timeout - warningTime - elapsed)
    }
  }
}
