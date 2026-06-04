import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const storage = (global as any).requestStorage || []
    
    return NextResponse.json({
      contextType: 'dynamic-route-debug',
      storageExists: !!(global as any).requestStorage,
      storageLength: storage.length,
      storageContent: storage,
      globalObject: typeof global
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}