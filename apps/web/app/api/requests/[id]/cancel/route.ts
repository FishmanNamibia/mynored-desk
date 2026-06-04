import { NextRequest, NextResponse } from 'next/server'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

const API_URL = getServerBackendApiUrl()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    console.log('CANCEL request for ID:', requestId)
    
    // Use the dedicated cancel endpoint
    const response = await fetch(`${API_URL}/api/requests/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Request cancelled via backend')
    
    return NextResponse.json({ 
      message: 'Request cancelled successfully',
      request: data 
    })
  } catch (error) {
    console.error('CANCEL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Keep PUT for backwards compatibility
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params })
}
