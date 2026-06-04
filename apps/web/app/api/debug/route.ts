import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Debug - Global object exists:', typeof global)
    console.log('Debug - Global requestStorage exists:', !!(global as any).requestStorage)
    console.log('Debug - Storage contents:', (global as any).requestStorage)
    
    return NextResponse.json({
      globalExists: typeof global !== 'undefined',
      storageExists: !!(global as any).requestStorage,
      storageLength: (global as any).requestStorage ? (global as any).requestStorage.length : 0,
      storageContents: (global as any).requestStorage || []
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}