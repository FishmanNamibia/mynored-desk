'use client'

/**
 * PMS Auth Adapter
 * 
 * This module provides a compatibility layer between the PMS components 
 * (which were built with next-auth) and the main NSA desk authentication 
 * (which uses MSAL/Entra via useAuth).
 * 
 * It exports a `useSession` hook that mimics the next-auth/react interface
 * but uses the main app's auth context internally.
 */

import { useAuth, User } from './auth-context'

// Mimic next-auth session structure
interface Session {
  user: {
    id: string
    name: string
    email: string
    role: string
    jobTitle?: string
    departmentId?: string
    divisionId?: string
    profilePicture?: string | null
    staffId?: string
  }
  expires: string
}

interface UseSessionReturn {
  data: Session | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  update: () => Promise<void>
}

// Cache to avoid re-computing and re-logging on every render
let _lastRoleMappingEmail: string | null = null
let _lastRoleMappingResult: string | null = null

// Enhanced role mapping using AD job title and department information
function mapToPmsRole(user: any): string {
  // Return cached result if same user
  const email = user?.email || ''
  if (email && email === _lastRoleMappingEmail && _lastRoleMappingResult) {
    return _lastRoleMappingResult
  }
  
  // Check job title from AD first (most reliable)
  const jobTitle = (user?.jobTitle || user?.title || '').toLowerCase()
  const department = (user?.department || '').toLowerCase()
  const userName = (user?.name || '').toLowerCase()
  
  let result = 'STAFF'

  // Special check for Test HC user - based on profile showing "Executive: Human Capital"
  if (userName.includes('test hc') || userName === 'test hc' || 
      jobTitle.includes('executive: human capital') || 
      jobTitle.includes('executive human capital')) {
    result = 'HUMAN_CAPITAL_EXECUTIVE'
  }
  // Check for admin/system administrator roles
  else if (jobTitle.includes('admin') || jobTitle.includes('administrator') || jobTitle.includes('system')) {
    result = 'ADMIN'
  }
  // Check for Secretary General
  else if (jobTitle.includes('secretary') && jobTitle.includes('general')) {
    result = 'SG'
  }
  // Check for Deputy Secretary General
  else if (jobTitle.includes('deputy') && (jobTitle.includes('secretary') || jobTitle.includes('sg'))) {
    result = 'DEPUTY_SG'
  }
  // Check for Executive roles in job title with department specificity
  else if (jobTitle.includes('executive')) {
    if (department.includes('human capital') || department.includes('human resources') || department.includes('hr')) {
      result = 'HUMAN_CAPITAL_EXECUTIVE'
    } else {
      result = 'EXECUTIVE'
    }
  } else {
    // Check user.roles array for 'Executive for Human Capital' pattern
    const userRoles = user?.roles || []
    const executiveRole = userRoles.find((role: string) => {
      return role.toLowerCase().includes('executive') && 
        (role.toLowerCase().includes('human capital') || role.toLowerCase().includes('human resources'))
    })
    
    if (executiveRole) {
      result = 'HUMAN_CAPITAL_EXECUTIVE'
    } else if (jobTitle.includes('manager') || jobTitle.includes('mgr') || jobTitle.includes('head')) {
      result = 'MANAGER'
    } else if (jobTitle.includes('assistant') || jobTitle.includes('admin')) {
      result = 'ADMINISTRATIVE_ASSISTANT'
    } else if (userRoles.length > 0) {
      const role = userRoles[0].toLowerCase()
      if (role.includes('admin')) result = 'ADMIN'
      else if (role.includes('sg') || role.includes('secretary') || role.includes('general')) result = 'SG'
      else if (role.includes('deputy')) result = 'DEPUTY_SG'
      else if (role.includes('executive') || role.includes('exec')) result = 'EXECUTIVE'
      else if (role.includes('manager') || role.includes('mgr')) result = 'MANAGER'
      else if (role.includes('assistant')) result = 'ADMINISTRATIVE_ASSISTANT'
      else if (role.includes('viewer') || role.includes('view')) result = 'VIEWER'
    }
  }

  // Cache and log only once per user
  console.log(`[PMS Auth] Role mapped for ${email}: ${result}`)
  _lastRoleMappingEmail = email
  _lastRoleMappingResult = result
  return result
}

/**
 * Adapter hook that provides next-auth compatible session interface
 * using the main NSA desk auth context
 */
export function useSession(): UseSessionReturn {
  const { user, loading, isAuthenticated, refreshSession } = useAuth()
  
  // Map auth state to next-auth status
  let status: 'loading' | 'authenticated' | 'unauthenticated'
  if (loading) {
    status = 'loading'
  } else if (isAuthenticated && user) {
    status = 'authenticated'
  } else {
    status = 'unauthenticated'
  }
  
  // Convert our user to next-auth session format with enhanced role mapping
  let data: Session | null = null
  if (user && isAuthenticated) {
    data = {
      user: {
        id: user.id,
        name: user.displayName || user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.email,
        email: user.email,
        role: mapToPmsRole(user), // Use enhanced role mapping
        jobTitle: user.jobTitle,
        departmentId: user.department,
        divisionId: user.division,
        profilePicture: null,
        staffId: user.id,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    }
  }
  
  return {
    data,
    status,
    update: refreshSession
  }
}

/**
 * Adapter for signOut - uses the main app's logout
 */
export function useSignOut() {
  const { logout } = useAuth()
  return logout
}
