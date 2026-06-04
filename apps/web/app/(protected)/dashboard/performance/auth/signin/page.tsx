'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignInPage() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    // Redirect to main app login - PMS uses the main NSA desk authentication
    if (status === 'unauthenticated') {
      router.push('/')
    } else if (status === 'authenticated') {
      router.push('/dashboard/performance/dashboard/overview')
    }
  }, [status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  )
}
