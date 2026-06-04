import { NextRequest, NextResponse } from 'next/server'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

const API_URL = getServerBackendApiUrl()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    console.log('RESUBMIT request for ID:', requestId)
    
    // Use the dedicated resubmit endpoint
    const response = await fetch(`${API_URL}/api/requests/${requestId}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Request not found or cannot be resubmitted' }, { status: 404 })
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Request resubmitted via backend')
    
    return NextResponse.json({ 
      message: 'Request resubmitted successfully',
      request: data 
    })
  } catch (error) {
    console.error('RESUBMIT error:', error)
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
