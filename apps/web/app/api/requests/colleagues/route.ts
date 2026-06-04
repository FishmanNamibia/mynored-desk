import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

const API_URL = getServerBackendApiUrl()

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookies to forward to backend
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('mynsa_access_token')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    // Forward to backend API - get all colleague requests
    const response = await fetch(`${API_URL}/api/requests/colleagues`, {
      headers,
      cache: 'no-store',
    })
    
    if (!response.ok) {
      console.error('Backend API error:', response.status, await response.text())
      return NextResponse.json({ data: [] })
    }
    
    const data = await response.json()
    console.log('Fetched colleague requests from backend:', data?.length || 0, 'requests')
    
    return NextResponse.json({ data: data.data || data })
  } catch (error) {
    console.error('Failed to fetch colleague requests:', error)
    return NextResponse.json({ data: [] })
  }
}
