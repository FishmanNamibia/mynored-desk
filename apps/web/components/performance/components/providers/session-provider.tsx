'use client'

import { useSession } from '@/lib/pms-auth-adapter'

function SessionWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  
  // The main NSA desk app handles session management
  // so we just pass through the children
  
  return <>{children}</>
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // No need for NextAuthSessionProvider - we use the main app's AuthProvider
  return <SessionWrapper>{children}</SessionWrapper>
}
