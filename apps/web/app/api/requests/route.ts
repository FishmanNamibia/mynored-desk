import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getServerBackendApiUrl } from '@/lib/server-backend-api-url'

// Updated schema to match backend RefreshmentRequest structure
const refreshmentDetailsSchema = z.object({
  mode: z.enum(['SINGLE_ITEM', 'BULK_EVENT']),
  // For SINGLE_ITEM mode
  refreshmentId: z.string().optional(),
  quantityRequested: z.number().optional(),
  // For BULK_EVENT mode
  itemsDescription: z.string().optional(),
  eventDate: z.string().optional(),
  // REQUIRED: Motivation/justification for approval
  purpose: z.string().min(1, "Purpose/motivation is required"),
}).optional()

const requestSchema = z.object({
  type: z.enum(['REFRESHMENT', 'VEHICLE', 'BOARDROOM', 'IT_EQUIPMENT']),
  title: z.string().min(1),
  description: z.string().optional(),
  refreshmentDetails: refreshmentDetailsSchema,
  requiredDate: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
})

const API_URL = getServerBackendApiUrl()

export async function GET(req: NextRequest) {
  try {
    // Get auth token from cookies to forward to backend
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('mynsa_access_token')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${API_URL}/api/requests/my`, {
      headers,
      cache: 'no-store',
    })
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json({ data: data.data || data })
  } catch (error) {
    console.error('Failed to fetch requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Received request data:', body)
    
    const validatedData = requestSchema.parse(body)

    // Get auth token from cookies to forward to backend
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('mynsa_access_token')?.value

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    // Forward to backend API
    const response = await fetch(`${API_URL}/api/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(validatedData),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend API error:', response.status, errorText)
      throw new Error(`Backend API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Request saved via backend:', data)
    
    return NextResponse.json({ 
      message: 'Request submitted successfully',
      request: data 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Failed to create request:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
