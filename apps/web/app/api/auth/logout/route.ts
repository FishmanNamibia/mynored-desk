import { NextRequest, NextResponse } from 'next/server'
import { createPmsAuditLog } from '@/lib/pms-audit'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'
import { getAuthenticatedUser } from '@/lib/server-auth'

const API_URL = getServerBackendApiUrl()

// This is a middleware/wrapper for the existing logout endpoint
// It adds audit logging for logout events

export async function POST(req: NextRequest) {
  // Get the authenticated user before logging out
  let userId = '';
  try {
    const { user } = await getAuthenticatedUser(req);
    if (user?.id) {
      userId = user.id;
    }
  } catch (e) {
    // Ignore errors in getting user
  }

  // Call the original logout handler
  const originalResponse = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  });

  // Log the logout event if we have a user ID
  if (userId) {
    try {
      await createPmsAuditLog({
        action: 'LOGOUT',
        entityType: 'Authentication',
        entityId: userId,
        userId: userId,
        reason: 'User logged out',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });
    } catch (error) {
      console.error('Error logging logout event:', error);
    }
  }
  
  // Return the original response
  return new Response(originalResponse.body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers: originalResponse.headers,
  });
}
