import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Get the base URL from the request
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`
  
  // Microsoft logout URL - this will clear the Azure AD session
  const microsoftLogoutUrl = `https://login.microsoftonline.com/8d5664e4-f94a-4f3b-a9eb-da674717443b/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(`${baseUrl}/auth/signin`)}`
  
  // Clear the NextAuth session cookie by setting it to expire immediately
  const response = NextResponse.redirect(microsoftLogoutUrl)
  
  // Clear all NextAuth-related cookies
  response.cookies.set('next-auth.session-token', '', { 
    expires: new Date(0),
    path: '/' 
  })
  response.cookies.set('next-auth.csrf-token', '', { 
    expires: new Date(0),
    path: '/' 
  })
  response.cookies.set('next-auth.callback-url', '', { 
    expires: new Date(0),
    path: '/' 
  })
  
  // Also clear the secure versions (for HTTPS)
  response.cookies.set('__Secure-next-auth.session-token', '', { 
    expires: new Date(0),
    path: '/',
    secure: true
  })
  response.cookies.set('__Secure-next-auth.csrf-token', '', { 
    expires: new Date(0),
    path: '/',
    secure: true
  })
  response.cookies.set('__Secure-next-auth.callback-url', '', { 
    expires: new Date(0),
    path: '/',
    secure: true
  })
  
  // Also clear Host-prefixed cookies (used in production with secure cookies)
  response.cookies.set('__Host-next-auth.csrf-token', '', { 
    expires: new Date(0),
    path: '/',
    secure: true
  })
  
  return response
}
