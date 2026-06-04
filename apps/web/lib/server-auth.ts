import type { NextRequest } from 'next/server'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

export type AuthUser = {
  id: string
  email?: string
  roles: string[]
  firstName?: string
  lastName?: string
  displayName?: string
  jobTitle?: string
  department?: string
  division?: string
  companyName?: string
  lastLoginAt?: string
}

export type AuthResult = {
  user: AuthUser | null
  setCookieHeaders: string[]
}

function normalizeRoles(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) return input.filter(Boolean).map(String)
  return [String(input)]
}

export function userHasAnyRole(user: AuthUser | null, roles: string[]): boolean {
  if (!user) return false

  const engineeringRoleAliases: Record<string, string[]> = {
    ENGINEERING_REQUEST_INITIATOR: ['REQUEST_INITIATOR'],
    ENGINEERING_APPLICATION_PROCESSOR: ['APPLICATION_PROCESSOR'],
    ENGINEERING_TECHNICAL_REVIEWER: [
      'TECHNICAL_REVIEWER',
      'TECHNICAL_REVIEWER_SUPERVISOR',
      'TECHNICAL_SUPERVISOR',
      'SUPERVISOR',
    ],
    ENGINEERING_CONNECTION_FINALISER: [
      'CONNECTION_FINALISER',
      'CONNECTION_FINALIZER',
      'FINALISER',
      'FINALIZER',
    ],
  }

  const canonicalize = (value: string) =>
    value
      .trim()
      .toUpperCase()
      .replace(/[\s\-:]+/g, '_')  // Also replace colons (e.g., "Executive: Human Capital")
      .replace(/_+/g, '_')         // Collapse multiple underscores
      .replace(/^_|_$/g, '')       // Trim leading/trailing underscores

  // Build effective roles from both the roles array AND the jobTitle
  const effectiveRoles = [...user.roles]
  if (user.jobTitle) {
    effectiveRoles.push(user.jobTitle)
  }
  const userRoles = effectiveRoles.map(r => canonicalize(String(r)))
  const requiredRoles = roles.map(r => canonicalize(String(r)))

  // Debug logging
  console.log('[userHasAnyRole] userRoles (canonicalized):', userRoles)
  console.log('[userHasAnyRole] requiredRoles (canonicalized):', requiredRoles)

  const matches = (userRole: string, required: string) => {
    if (userRole === required) return true

    const userRoleAliases = engineeringRoleAliases[userRole] ?? []
    const requiredRoleAliases = engineeringRoleAliases[required] ?? []
    if (
      userRoleAliases.includes(required) ||
      requiredRoleAliases.includes(userRole) ||
      userRoleAliases.some((alias) => requiredRoleAliases.includes(alias))
    ) {
      return true
    }

    // Treat department-specific executives as EXECUTIVE.
    // Matches: EXECUTIVE, EXECUTIVE_HUMAN_CAPITAL, HUMAN_CAPITAL_EXECUTIVE, HC_EXECUTIVE, etc.
    if (required === 'EXECUTIVE' || required === 'HUMAN_CAPITAL_EXECUTIVE' || required === 'HC_EXECUTIVE') {
      const isExecutive = userRole.includes('EXECUTIVE') || 
                          userRole.includes('EXEC') ||
                          userRole === 'HUMAN_CAPITAL_EXECUTIVE' ||
                          userRole === 'HC_EXECUTIVE'
      if (isExecutive) {
        console.log('[userHasAnyRole] Matched executive role:', userRole, 'for required:', required)
        return true
      }
    }

    // Treat ADMINISTRATOR / ADMIN_* as ADMIN.
    if (required === 'ADMIN') {
      return userRole.includes('ADMIN')
    }

    // Common SG naming variants.
    if (required === 'SG') {
      return userRole === 'SG' || userRole === 'SECRETARY_GENERAL'
    }

    if (required === 'DEPUTY_SG') {
      return userRole === 'DEPUTY_SG' || userRole === 'DEPUTY_SECRETARY_GENERAL'
    }

    // Default: exact-only.
    return false
  }

  const result = requiredRoles.some(required => userRoles.some(userRole => matches(userRole, required)))
  console.log('[userHasAnyRole] Final result:', result)
  return result
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>()
  if (!cookieHeader) return map

  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex <= 0) continue
    const name = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!name) continue
    map.set(name, value)
  }

  return map
}

function applySetCookieToMap(map: Map<string, string>, setCookie: string) {
  const firstPart = setCookie.split(';')[0]?.trim()
  if (!firstPart) return
  const eqIndex = firstPart.indexOf('=')
  if (eqIndex <= 0) return
  const name = firstPart.slice(0, eqIndex).trim()
  const value = firstPart.slice(eqIndex + 1).trim()
  if (!name) return
  map.set(name, value)
}

function serializeCookieMap(map: Map<string, string>): string {
  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function getSetCookieHeaders(response: Response): string[] {
  const anyHeaders = response.headers as any
  const getSetCookie = anyHeaders?.getSetCookie
  if (typeof getSetCookie === 'function') {
    const values = getSetCookie.call(response.headers)
    if (Array.isArray(values)) return values
  }

  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}

async function fetchBackendUser(cookieHeader: string | null): Promise<{ user: AuthUser | null; setCookieHeaders: string[] }> {
  // Use internal URL for server-side fetches to avoid routing through nginx/external proxy
  const apiUrl = getServerBackendApiUrl()

  try {
    const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: 'no-store',
    })

    if (meResponse.ok) {
      const data = await meResponse.json()
      const user = data?.user
        ? ({
            ...data.user,
            roles: normalizeRoles(data.user.roles),
          } as AuthUser)
        : null
      return { user, setCookieHeaders: [] }
    }

    if (meResponse.status !== 401) {
      console.warn('[fetchBackendUser] Non-401 error from /auth/me:', meResponse.status)
      return { user: null, setCookieHeaders: [] }
    }

    // Attempt refresh-session then retry /auth/me with updated cookies.
    const refreshResponse = await fetch(`${apiUrl}/api/auth/refresh-session`, {
      method: 'POST',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: 'no-store',
    })

    const setCookieHeaders = getSetCookieHeaders(refreshResponse)
    if (!refreshResponse.ok) {
      console.warn('[fetchBackendUser] Session refresh failed:', refreshResponse.status)
      return { user: null, setCookieHeaders }
    }

    const cookieMap = parseCookieHeader(cookieHeader)
    for (const sc of setCookieHeaders) {
      applySetCookieToMap(cookieMap, sc)
    }

    const updatedCookieHeader = serializeCookieMap(cookieMap)
    const retryResponse = await fetch(`${apiUrl}/api/auth/me`, {
      method: 'GET',
      headers: updatedCookieHeader ? { cookie: updatedCookieHeader } : undefined,
      cache: 'no-store',
    })

    if (!retryResponse.ok) {
      console.warn('[fetchBackendUser] Retry /auth/me failed:', retryResponse.status)
      return { user: null, setCookieHeaders }
    }

    const data = await retryResponse.json()
    const user = data?.user
      ? ({
          ...data.user,
          roles: normalizeRoles(data.user.roles),
        } as AuthUser)
      : null

    return { user, setCookieHeaders }
  } catch (error) {
    // Network error - backend API server is likely not running or unreachable
    console.error('[fetchBackendUser] Network error connecting to backend API:', error instanceof Error ? error.message : error)
    return { user: null, setCookieHeaders: [] }
  }
}

/**
 * Auth for Next.js route handlers backed by the NestJS cookie session.
 *
 * If the access token expired, this helper refreshes it using the
 * HttpOnly refresh cookie and returns Set-Cookie headers that the route
 * should forward to the browser.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthResult> {
  const cookieHeader = req.headers.get('cookie')
  return await fetchBackendUser(cookieHeader)
}
