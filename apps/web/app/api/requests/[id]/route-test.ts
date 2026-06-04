import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storage = (global as any).requestStorage || []
    
    console.log('=== DYNAMIC ROUTE DEBUG ===')
    console.log('Request ID:', params.id)
    console.log('Storage exists:', !!storage)
    console.log('Storage length:', storage.length)
    console.log('All IDs:', storage.map((r: any) => r.id))
    
    const request = storage.find((r: any) => r.id === params.id)
    
    if (!request) {
      console.log('Request not found in storage')
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    return NextResponse.json({ request })
  } catch (error) {
    console.error('Failed to fetch request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}