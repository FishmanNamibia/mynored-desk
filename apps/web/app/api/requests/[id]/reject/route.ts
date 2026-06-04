import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

const API_URL = getServerBackendApiUrl()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    const body = await request.json().catch(() => ({}))
    
    // Get auth token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('mynsa_access_token')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    console.log('REJECT request for ID:', requestId)
    
    const response = await fetch(`${API_URL}/api/requests/${requestId}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('Reject API error:', errorData)
      return NextResponse.json({ error: 'Failed to reject request' }, { status: response.status })
    }
    
    const data = await response.json()
    console.log('Request rejected via backend')
    
    return NextResponse.json({ 
      message: 'Request rejected successfully',
      request: data 
    })
  } catch (error) {
    console.error('REJECT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
