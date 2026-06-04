'use client'

import { useState } from 'react'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'
import { useConnectionMonitor } from '@/hooks/use-connection-monitor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, Wifi, WifiOff, AlertTriangle } from 'lucide-react'

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [showConnectionWarning, setShowConnectionWarning] = useState(false)
  const [connectionLost, setConnectionLost] = useState(false)

  // 5 minutes idle timeout
  const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

  const { resetTimeout, getTimeUntilTimeout } = useIdleTimeout({
    timeout: IDLE_TIMEOUT,
    warningTime: 60000, // Show warning 1 minute before timeout
    onWarning: () => {
      setShowIdleWarning(true)
    },
    onTimeout: () => {
      setShowIdleWarning(false)
      console.log('User logged out due to idle timeout')
    }
  })

  const { isOnline, connectionLost: monitorConnectionLost } = useConnectionMonitor({
    heartbeatInterval: 30000, // Check every 30 seconds
    connectionTimeout: 60000, // Timeout after 1 minute of no heartbeat
    onConnectionLost: () => {
      setShowConnectionWarning(true)
      setConnectionLost(true)
    },
    onConnectionRestored: () => {
      setShowConnectionWarning(false)
      setConnectionLost(false)
    }
  })

  const handleStayLoggedIn = () => {
    setShowIdleWarning(false)
    resetTimeout()
  }

  const formatTime = (milliseconds: number) => {
    const seconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  return (
    <>
      {children}

      {/* Idle Timeout Warning */}
      {showIdleWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Session Timeout Warning</h3>
            </div>
            <p className="text-gray-600 mb-4">
              You will be automatically logged out in <strong>{formatTime(getTimeUntilTimeout())}</strong> due to inactivity.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              For security reasons, inactive sessions are automatically terminated after 5 minutes.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleStayLoggedIn} className="flex-1">
                Stay Logged In
              </Button>
              <Button variant="outline" className="flex-1">
                Logout Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Lost Warning */}
      {showConnectionWarning && (
        <Alert className="fixed top-4 right-4 w-96 z-[9998] border-red-300 bg-red-50">
          <WifiOff className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Connection Lost</strong>
            <br />
            You will be automatically logged out in 5 seconds due to connection interruption.
            <br />
            <span className="text-sm">Please check your internet connection.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Restored Notification */}
      {connectionLost && !showConnectionWarning && (
        <Alert className="fixed top-4 right-4 w-96 z-[9998] border-green-300 bg-green-50">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Connection Restored</strong>
            <br />
            Your connection has been restored. Welcome back!
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
