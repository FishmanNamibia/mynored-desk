import { NextRequest, NextResponse } from 'next/server'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

const API_URL = getServerBackendApiUrl()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    console.log('GET request for ID:', requestId)
    
    // Forward to backend API - Note: Backend doesn't have individual request endpoints yet
    // For now, get all requests and filter client-side
    const response = await fetch(`${API_URL}/api/requests/my`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    const requests = data.data || data
    const foundRequest = requests.find((req: any) => req.id === requestId)
    
    if (!foundRequest) {
      console.log('Request not found')
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    return NextResponse.json({ request: foundRequest })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    
    console.log('DELETE request for ID:', requestId)
    
    // Forward to backend API
    const response = await fetch(`${API_URL}/api/requests/${requestId}`, {
      method: 'DELETE',
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
    console.log('Request deleted via backend')
    
    return NextResponse.json({ 
      message: 'Request deleted successfully',
      request: data 
    })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    const body = await request.json()
    
    console.log('PUT request for ID:', requestId)
    
    // Forward to backend API
    const response = await fetch(`${API_URL}/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 })
      }
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Request updated via backend')
    
    return NextResponse.json({ 
      message: 'Request updated successfully',
      request: data 
    })
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
