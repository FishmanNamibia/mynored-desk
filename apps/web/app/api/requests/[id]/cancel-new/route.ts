import { NextRequest, NextResponse } from 'next/server'

// Initialize global storage if needed  
if (!(global as any).requestStorage) {
  (global as any).requestStorage = []
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    const storage = (global as any).requestStorage || []
    
    console.log('CANCEL request for ID:', requestId)
    console.log('Storage length:', storage.length)
    
    const requestIndex = storage.findIndex((req: any) => req.id === requestId)
    
    if (requestIndex === -1) {
      console.log('Request not found for cancellation, available IDs:', storage.map((r: any) => r.id))
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    const updatedRequest = {
      ...storage[requestIndex],
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    storage[requestIndex] = updatedRequest
    console.log('Request cancelled:', updatedRequest.id)
    
    return NextResponse.json({ 
      message: 'Request cancelled successfully',
      request: updatedRequest 
    })
  } catch (error) {
    console.error('CANCEL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}