'use client'

import { useState, useEffect } from 'react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, useSignOut } from '@/lib/pms-auth-adapter'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { formatRoleTitleCase } from '@/lib/pms/role-formatter'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  user: {
    name: string
    email: string
    role: string
    profilePicture?: string | null
  }
}

interface UserDetails {
  department?: { name: string } | null
  division?: { name: string } | null
}

export function DashboardHeader({ user }: HeaderProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [fullTitle, setFullTitle] = useState(user.role)
  const [currentProfilePicture, setCurrentProfilePicture] = useState(user.profilePicture)

  useEffect(() => {
    // Fetch user details for full title and profile picture
    const fetchUserDetails = async () => {
      try {
        console.log('[Header] Fetching user details...')
        const res = await fetch('/dashboard/performance/api/me')
        console.log('[Header] Response status:', res.status)
        
        if (res.ok) {
          const data = await res.json()
          console.log('[Header] User data received:', data)
          console.log('[Header] Position title:', data.position)
          console.log('[Header] Profile picture URL:', data.profilePictureUrl)
          setUserDetails(data)
          
          // Update profile picture if it exists - use profilePictureUrl
          if (data.profilePictureUrl) {
            console.log('[Header] Setting profile picture:', data.profilePictureUrl)
            setCurrentProfilePicture(data.profilePictureUrl)
          } else if (data.profilePicture) {
            // Fallback to old profilePicture field if it exists
            console.log('[Header] Using fallback profilePicture:', data.profilePicture.substring(0, 50) + '...')
            setCurrentProfilePicture(data.profilePicture)
          } else {
            console.log('[Header] No profile picture found')
          }
          
          // Display position title from AD (jobTitle takes precedence over position)
          const position = data.jobTitle || data.position || 'Staff Member'
          console.log('[Header] Setting full title to:', position)
          
          // Set full title to show the actual job title from AD
          setFullTitle(position)
        } else if (res.status === 401) {
          // Session expired - attempt to redirect to login for re-authentication
          console.log('[Header] Session expired, redirecting to login...')
          window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent(window.location.pathname)
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error)
      }
    }

    fetchUserDetails()
    
    // Poll for profile picture updates every 30 seconds
    const interval = setInterval(fetchUserDetails, 30000)
    return () => clearInterval(interval)
  }, [user.role])

  // Get the logout function from auth adapter
  const signOut = useSignOut()

  const handleLogout = async () => {
    // Show loading overlay briefly
    setIsLoggingOut(true)
    
    // Use the main NSA desk logout
    try {
      await signOut()
    } catch (error) {
      // Ignore errors since we're already logging out
      console.error('Logout error:', error)
    }
  }

  return (
    <div>
      {/* Logout Loading Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-9999 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4">
            <GoldSpinner size="lg" message="Signing out..." />
          </div>
        </div>
      )}
      
      <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
      <div className="flex items-center justify-end gap-4">
        {/* Real-time Notifications */}
        <NotificationBell variant="default" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 h-auto py-2">
              {currentProfilePicture ? (
                <div className="relative w-10 h-10">
                  <Image
                    src={currentProfilePicture}
                    alt={user.name}
                    fill
                    className="rounded-full object-cover"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{fullTitle}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-600 mt-1">{fullTitle}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </div>
  )
}
