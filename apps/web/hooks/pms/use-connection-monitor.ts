'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UseConnectionMonitorOptions {
  heartbeatInterval?: number // in milliseconds
  connectionTimeout?: number // in milliseconds
  onConnectionLost?: () => void
  onConnectionRestored?: () => void
}

export function useConnectionMonitor(options: UseConnectionMonitorOptions = {}) {
  const {
    heartbeatInterval = 30000, // 30 seconds
    connectionTimeout = 60000, // 1 minute
    onConnectionLost,
    onConnectionRestored
  } = options

  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)
  const [connectionLost, setConnectionLost] = useState(false)
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now())

  const checkConnection = useCallback(async () => {
    try {
      // Simple heartbeat check to API
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (response.ok) {
        setLastHeartbeat(Date.now())
        if (connectionLost) {
          setConnectionLost(false)
          onConnectionRestored?.()
        }
        return true
      }
    } catch (error) {
      console.warn('Connection check failed:', error)
    }
    return false
  }, [connectionLost, onConnectionRestored])

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored')
      setIsOnline(true)
      checkConnection()
    }

    const handleOffline = () => {
      console.log('Network connection lost')
      setIsOnline(false)
      onConnectionLost?.()
      setConnectionLost(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [checkConnection, onConnectionLost])

  // Heartbeat monitoring
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now()
      const timeSinceLastHeartbeat = now - lastHeartbeat

      // If we haven't had a successful heartbeat in the timeout period
      if (timeSinceLastHeartbeat > connectionTimeout) {
        console.log('Connection timeout - no heartbeat received')
        if (!connectionLost) {
          setConnectionLost(true)
          onConnectionLost?.()
          // Force logout after connection is lost
          setTimeout(() => {
            signOut({ callbackUrl: '/auth/signin', redirect: false })
            router.push('/auth/signin')
          }, 5000) // Give 5 seconds for user to see the message
        }
      } else {
        // Regular heartbeat check
        await checkConnection()
      }
    }, heartbeatInterval)

    return () => clearInterval(interval)
  }, [heartbeatInterval, connectionTimeout, lastHeartbeat, connectionLost, checkConnection, onConnectionLost, router])

  return {
    isOnline,
    connectionLost,
    checkConnection,
    timeSinceLastHeartbeat: Date.now() - lastHeartbeat
  }
}
