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
    
    console.log('REVERT request for ID:', requestId)
    
    const requestIndex = storage.findIndex((req: any) => req.id === requestId)
    
    if (requestIndex === -1) {
      console.log('Request not found for reversion, available IDs:', storage.map((r: any) => r.id))
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    const currentRequest = storage[requestIndex]
    
    if (currentRequest.status !== 'CANCELLED') {
      return NextResponse.json({ 
        error: 'Only cancelled requests can be reverted' 
      }, { status: 400 })
    }
    
    const updatedRequest = {
      ...currentRequest,
      status: 'PENDING',
      cancelledAt: undefined,
      updatedAt: new Date().toISOString()
    }
    
    storage[requestIndex] = updatedRequest
    console.log('Request reverted:', updatedRequest.id)
    
    return NextResponse.json({ 
      message: 'Request reverted successfully',
      request: updatedRequest 
    })
  } catch (error) {
    console.error('REVERT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}