import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

interface TaskCategory {
  id: string
  name: string
  weight: number
}

// GET - Load user's task weights
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      console.log('[user-task-weights GET] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[user-task-weights GET] User:', user.id, user.email)

    // Get active performance period
    let activePeriod = null
    try {
      activePeriod = await prisma.performancePeriod.findFirst({
        where: { isActive: true }
      })
      console.log('[user-task-weights GET] Active period:', activePeriod?.id || 'none')
    } catch (periodError: any) {
      console.error('[user-task-weights GET] Error fetching period:', periodError.message)
    }

    // Get user's task weights
    let userWeights = null
    try {
      userWeights = await prisma.userTaskWeight.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      console.log('[user-task-weights GET] Found weights:', !!userWeights, userWeights?.id)
    } catch (weightError: any) {
      console.error('[user-task-weights GET] Error fetching weights:', weightError.message)
    }

    if (userWeights && userWeights.categories) {
      const categories = JSON.parse(userWeights.categories) as TaskCategory[]
      console.log('[user-task-weights GET] Returning', categories.length, 'saved categories')
      return NextResponse.json({
        categories,
        isApproved: userWeights.isApproved
      })
    }

    // Return default categories if no user-specific weights exist
    console.log('[user-task-weights GET] No saved weights, returning defaults')
    const defaultCategories: TaskCategory[] = [
      { id: 'perf', name: 'Performance Agreement Tasks', weight: 60 },
      { id: 'adhoc', name: 'Ad-Hoc', weight: 10 },
      { id: 'risk', name: 'Risk Tasks', weight: 10 },
      { id: 'project', name: 'Project Tasks', weight: 10 },
      { id: 'audit', name: 'Audit Tasks', weight: 10 }
    ]

    return NextResponse.json({
      categories: defaultCategories,
      isApproved: false
    })

  } catch (error: any) {
    console.error('[user-task-weights GET] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch task weights', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Save user's task weights
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      console.log('[user-task-weights POST] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[user-task-weights POST] User:', user.id, user.email)

    const body = await request.json()
    const { categories } = body as { categories: TaskCategory[] }
    console.log('[user-task-weights POST] Categories received:', JSON.stringify(categories))

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Invalid categories data' }, { status: 400 })
    }

    // Validate that weights sum to 100
    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0)
    if (totalWeight !== 100) {
      console.log('[user-task-weights POST] Weight total is', totalWeight, 'not 100')
      return NextResponse.json({ error: 'Weights must sum to 100%' }, { status: 400 })
    }

    // Get active performance period
    let activePeriod = null
    try {
      activePeriod = await prisma.performancePeriod.findFirst({
        where: { isActive: true }
      })
      console.log('[user-task-weights POST] Active period:', activePeriod?.id || 'none')
    } catch (periodError: any) {
      console.error('[user-task-weights POST] Error fetching period:', periodError.message)
    }

    // Find existing record
    let existing = null
    try {
      existing = await prisma.userTaskWeight.findFirst({
        where: {
          userId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      console.log('[user-task-weights POST] Existing record:', existing?.id || 'none')
    } catch (findError: any) {
      console.error('[user-task-weights POST] Error finding existing:', findError.message)
    }

    let userWeights
    if (existing) {
      userWeights = await prisma.userTaskWeight.update({
        where: { id: existing.id },
        data: {
          categories: JSON.stringify(categories),
          updatedAt: new Date()
        }
      })
      console.log('[user-task-weights POST] Updated record:', userWeights.id)
    } else {
      userWeights = await prisma.userTaskWeight.create({
        data: {
          userId: user.id,
          taskType: 'STRATEGIC',
          weight: 100,
          categories: JSON.stringify(categories),
          isApproved: false
        }
      })
      console.log('[user-task-weights POST] Created record:', userWeights.id)
    }

    return NextResponse.json({
      success: true,
      categories: JSON.parse(userWeights.categories || '[]'),
      isApproved: userWeights.isApproved
    })

  } catch (error: any) {
    console.error('[user-task-weights POST] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to save task weights', details: error.message },
      { status: 500 }
    )
  }
}
