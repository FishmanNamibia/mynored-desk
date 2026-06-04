import { NextRequest, NextResponse } from 'next/server'

// Initialize global storage if needed  
if (!(global as any).requestStorage) {
  (global as any).requestStorage = []
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    const storage = (global as any).requestStorage || []
    
    console.log('GET request for ID:', requestId)
    console.log('Storage length:', storage.length)
    
    const foundRequest = storage.find((req: any) => req.id === requestId)
    
    if (!foundRequest) {
      console.log('Request not found, available IDs:', storage.map((r: any) => r.id))
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
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    const storage = (global as any).requestStorage || []
    
    console.log('DELETE request for ID:', requestId)
    
    const requestIndex = storage.findIndex((req: any) => req.id === requestId)
    
    if (requestIndex === -1) {
      console.log('Request not found for deletion, available IDs:', storage.map((r: any) => r.id))
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    const deletedRequest = storage.splice(requestIndex, 1)[0]
    console.log('Request deleted:', deletedRequest.id)
    
    return NextResponse.json({ 
      message: 'Request deleted successfully',
      request: deletedRequest 
    })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    const storage = (global as any).requestStorage || []
    const body = await request.json()
    
    console.log('PUT request for ID:', requestId)
    
    const requestIndex = storage.findIndex((req: any) => req.id === requestId)
    
    if (requestIndex === -1) {
      console.log('Request not found for update, available IDs:', storage.map((r: any) => r.id))
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    const updatedRequest = {
      ...storage[requestIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    storage[requestIndex] = updatedRequest
    console.log('Request updated:', updatedRequest.id)
    
    return NextResponse.json({ 
      message: 'Request updated successfully',
      request: updatedRequest 
    })
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}