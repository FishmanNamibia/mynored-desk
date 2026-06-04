import { NextRequest, NextResponse } from 'next/server'
import { createPmsAuditLog } from '@/lib/pms-audit'

// This is a middleware/wrapper for the existing login endpoint
// It adds audit logging for login events

export async function POST(req: NextRequest) {
  // Clone the request body so we can read it and still forward it
  const bodyText = await req.text();
  let bodyData: any = {};
  
  // Extract user information from request if available
  let userEmail = '';
  try {
    bodyData = JSON.parse(bodyText);
    if (bodyData.email) {
      userEmail = bodyData.email;
    }
  } catch (e) {
    // Ignore JSON parsing errors
  }

  // Call the original login handler with the cloned body
  const originalResponse = await fetch(new URL(req.url).origin + '/api/auth/login', {
    method: 'POST',
    headers: req.headers,
    body: bodyText,
  });

  // If login was successful, log the event
  if (originalResponse.ok) {
    try {
      const responseData = await originalResponse.json();
      
      // If we have a user ID, log the login event
      if (responseData.user?.id) {
        await createPmsAuditLog({
          action: 'LOGIN',
          entityType: 'Authentication',
          entityId: responseData.user.id,
          userId: responseData.user.id,
          reason: 'User logged in',
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        });
      }
      
      // Reconstruct the response
      const res = NextResponse.json(responseData, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
      });
      
      // Copy headers from original response
      originalResponse.headers.forEach((value, key) => {
        res.headers.set(key, value);
      });
      
      return res;
    } catch (error) {
      console.error('Error logging login event:', error);
      
      // Return original response if we fail to log
      return new Response(originalResponse.body, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });
    }
  }
  
  // If login failed, just return the original response
  return new Response(originalResponse.body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers: originalResponse.headers,
  });
}
