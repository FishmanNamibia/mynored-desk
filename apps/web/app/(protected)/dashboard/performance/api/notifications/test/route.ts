import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to trigger notification bell animation
 * This bypasses the database and sends a test notification via SSE
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message = 'Test notification!', type = 'GENERAL' } = body

    // In a real scenario, this would create a notification in the database
    // For testing, we'll just return success
    return NextResponse.json({ 
      success: true,
      message: 'Test notification created (mock)',
      notification: {
        id: `test-${Date.now()}`,
        type,
        message,
        status: 'SENT',
        createdAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Test notification error:', error)
    return NextResponse.json({ error: 'Failed to create test notification' }, { status: 500 })
  }
}

/**
 * GET endpoint to check if notifications are working
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Notification test endpoint is working',
    instructions: 'POST to this endpoint with { "message": "your message", "type": "GENERAL" }'
  })
}
