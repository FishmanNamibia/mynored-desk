import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[API] Simple test endpoint called')
  return NextResponse.json({ message: 'Simple test works', timestamp: new Date().toISOString() })
}
