import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[API TEST] Simple test endpoint called')
  return NextResponse.json({ 
    message: 'Test endpoint works!', 
    timestamp: new Date().toISOString() 
  })
}
