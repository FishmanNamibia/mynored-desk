import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

interface TaskCategory {
  id: string
  name: string
  weight: number
}

// Import Prisma types properly
import { Prisma } from '@prisma/client'

// Define our extended type with the pendingCategories field
interface UserTaskWeightWithPending {
  id: string
  userId: string
  categories: string
  pendingCategories?: string | null
  isApproved: boolean
  approvedById: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Note: We need to use `as any` for Prisma operations involving pendingCategories
// because the field exists in the database but isn't defined in the Prisma schema

// Helper to fetch active performance period
async function getActivePeriod() {
  try {
    return await prisma.performancePeriod.findFirst({
      where: { isActive: true }
    })
  } catch (error: any) {
    console.error('[getActivePeriod] Error:', error.message)
    return null
  }
}

// Helper to check if a user is an executive by job title
function isExecutiveTitle(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false
  const t = jobTitle.toLowerCase()
  return t.includes('executive') || t.includes('statistician general') || t.includes('deputy statistician')
}

// Helper to check if a user can manage weight allocations
// Covers: all executives, Statistician General, Deputy Statistician General, OD Specialists
function isWeightManagerTitle(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false
  const t = jobTitle.toLowerCase()
  return (
    t.includes('executive') ||
    t.includes('statistician general') ||
    t.includes('deputy statistician') ||
    t.includes('od specialist') ||
    t.includes('organisational development specialist') ||
    t.includes('organizational development specialist')
  )
}

// GET - Load user's task weights
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual database user ID by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true, jobTitle: true }
    })
    const actualUserId = dbUser?.id || user.id
    const isExecutive = isExecutiveTitle(dbUser?.jobTitle)
    const isWeightManager = isWeightManagerTitle(dbUser?.jobTitle)

    // Get active performance period
    const activePeriod = await getActivePeriod()

    // Check if all performance agreements are approved
    const agreements = await prisma.performanceAgreement.findMany({
      where: { userId: actualUserId, isAdhocContainer: false },
      select: { approvalStatus: true }
    })
    const allAgreementsApproved = agreements.length > 0 && agreements.every(a => a.approvalStatus === 'APPROVED')

    // Check if there's a pending unlock request
    const pendingUnlockNotif = await prisma.pmsNotification.findFirst({
      where: {
        senderId: actualUserId,
        entityType: 'UserTaskWeight',
        type: 'APPROVAL_REQUESTED',
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })
    const hasUnlockRequest = !!pendingUnlockNotif

    // Get user's task weights
    let userWeights = null
    try {
      userWeights = await prisma.userTaskWeight.findFirst({
        where: {
          userId: actualUserId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    } catch (weightError: any) {
      console.error('[user-task-weights GET] Error fetching weights:', weightError.message)
    }

    if (userWeights) {
      const categories = JSON.parse(userWeights.categories) as TaskCategory[]
      // Cast to our extended type that includes pendingCategories
      const weightRecord = userWeights as UserTaskWeightWithPending
      const pendingCategories = weightRecord.pendingCategories 
        ? JSON.parse(weightRecord.pendingCategories) as TaskCategory[] 
        : null
      return NextResponse.json({
        categories,
        pendingCategories,
        isApproved: userWeights.isApproved,
        allAgreementsApproved,
        isExecutive,
        isWeightManager,
        hasUnlockRequest,
        weightId: userWeights.id
      })
    }

    // Return default categories if no user-specific weights exist
    const defaultCategories: TaskCategory[] = [
      { id: 'perf', name: 'Performance Agreement Tasks', weight: 75 },
      { id: 'adhoc', name: 'Ad-Hoc', weight: 0 },
      { id: 'risk', name: 'Risk Tasks', weight: 0 },
      { id: 'project', name: 'Project Tasks', weight: 0 },
      { id: 'audit', name: 'Audit Tasks', weight: 0 },
      { id: 'rating360', name: '360 Degree Rating', weight: 25 }
    ]

    return NextResponse.json({
      categories: defaultCategories,
      pendingCategories: null,
      isApproved: false,
      allAgreementsApproved,
      isExecutive,
      isWeightManager,
      hasUnlockRequest: false,
      weightId: null
    })

  } catch (error: any) {
    console.error('[user-task-weights GET] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch task weights', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Save user's task weights (or submit for approval if already approved)
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual database user ID by email
    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: { id: true }
    })
    const actualUserId = dbUser?.id || user.id

    const body = await request.json()
    const { categories, action, weightId } = body as { 
      categories: TaskCategory[]
      action?: 'approve' | 'reject' | 'request-unlock' | 'unlock' // all possible actions
      weightId?: string // for supervisor approval
    }

    // Handle request-unlock: user requests executive to unlock weight allocation
    if (action === 'request-unlock' as any) {
      const requestingUser = await prisma.user.findUnique({
        where: { id: actualUserId },
        select: { id: true, firstName: true, lastName: true, departmentName: true, managerId: true, jobTitle: true }
      })
      if (!requestingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Executives can unlock themselves directly — no approval needed
      if (isExecutiveTitle(requestingUser.jobTitle)) {
        // Find their weight record and unlock it
        const weightRecord = await prisma.userTaskWeight.findFirst({
          where: { userId: actualUserId },
          orderBy: { createdAt: 'desc' }
        })
        if (weightRecord) {
          // Use type assertion to work around Prisma type limitations
          await prisma.userTaskWeight.update({
            where: { id: weightRecord.id },
            data: { 
              isApproved: false,
              // Set to null in the database using 'any' to bypass type checking
              // since Prisma doesn't know about our pendingCategories field
            } as any
          })
        }
        return NextResponse.json({ success: true, message: 'Weight allocation unlocked (executive self-unlock)', selfUnlocked: true })
      }

      // Check if there's already a pending unlock request (with transaction to prevent race conditions)
      try {
        const existingRequest = await prisma.$transaction(async (tx) => {
          return await tx.pmsNotification.findFirst({
            where: {
              senderId: actualUserId,
              entityType: 'UserTaskWeight',
              type: 'APPROVAL_REQUESTED',
              status: 'PENDING'
            }
          })
        })
        if (existingRequest) {
          return NextResponse.json({ success: true, message: 'Unlock request already pending', alreadyPending: true })
        }
      } catch (checkErr: any) {
        console.warn('[user-task-weights] Could not check existing requests:', checkErr.message)
      }

      // Walk up the manager chain to find the department executive
      let executiveId: string | null = null
      let currentManagerId = requestingUser.managerId
      const visited = new Set<string>()
      let iterations = 0
      const MAX_ITERATIONS = 10 // Safety limit to prevent infinite loops
      
      while (currentManagerId && !visited.has(currentManagerId) && iterations < MAX_ITERATIONS) {
        visited.add(currentManagerId)
        iterations++
        
        const mgr = await prisma.user.findUnique({
          where: { id: currentManagerId },
          select: { id: true, jobTitle: true, managerId: true }
        })
        if (!mgr) break
        if (isExecutiveTitle(mgr.jobTitle)) {
          executiveId = mgr.id
          break
        }
        currentManagerId = mgr.managerId
      }

      // If no executive found in the management chain, try direct manager
      if (!executiveId && requestingUser.managerId) {
        executiveId = requestingUser.managerId
      }

      // If still no executive found, look for executives in the same department
      if (!executiveId && requestingUser.departmentName) {
        const departmentExecutives = await prisma.user.findMany({
          where: {
            departmentName: requestingUser.departmentName,
            status: 'ACTIVE',
            jobTitle: {
              not: null
            }
          }
        })
        
        // Find an executive in the same department
        for (const deptUser of departmentExecutives) {
          if (deptUser.id !== actualUserId && isExecutiveTitle(deptUser.jobTitle)) {
            executiveId = deptUser.id
            break
          }
        }
      }

      if (!executiveId) {
        return NextResponse.json({ error: 'No executive found in your reporting chain or department' }, { status: 404 })
      }

      // Find the weight record ID to include in metadata
      const weightRecord = await prisma.userTaskWeight.findFirst({
        where: { userId: actualUserId },
        orderBy: { createdAt: 'desc' }
      })

      // Create notification with real-time SSE delivery
      try {
        const { createNotification } = await import('@/lib/pms/create-notification')
        await createNotification({
          type: 'APPROVAL_REQUESTED',
          senderId: actualUserId,
          receiverId: executiveId,
          entityType: 'UserTaskWeight',
          entityId: weightRecord?.id || actualUserId,
          message: `${requestingUser.firstName} ${requestingUser.lastName} is requesting to unlock their weight allocation for modification.`,
          metadata: {
            requestType: 'WEIGHT_UNLOCK',
            weightId: weightRecord?.id,
            requesterId: actualUserId,
            requesterName: `${requestingUser.firstName} ${requestingUser.lastName}`,
            department: requestingUser.departmentName
          }
        })
      } catch (notifError: any) {
        console.error('[user-task-weights] Failed to create notification:', notifError.message)
      }

      return NextResponse.json({ success: true, message: 'Unlock request sent to your department executive' })
    }

    // Handle executive unlock approval
    if (action === 'unlock' as any && weightId) {
      const weightRecord = await prisma.userTaskWeight.findUnique({ where: { id: weightId } })
      if (!weightRecord) {
        return NextResponse.json({ error: 'Weight record not found' }, { status: 404 })
      }
      await prisma.userTaskWeight.update({
        where: { id: weightId },
        data: { 
          isApproved: false,
          // Use type assertion to bypass Prisma type checking
        } as any
      })
      return NextResponse.json({ success: true, message: 'Weight allocation unlocked' })
    }

    // Handle supervisor approval/rejection
    if (action === 'approve' && weightId) {
      const weightRecord = await prisma.userTaskWeight.findUnique({ where: { id: weightId } })
      // Cast to our extended type to access pendingCategories
      const typedWeightRecord = weightRecord as UserTaskWeightWithPending
      if (!weightRecord || !typedWeightRecord.pendingCategories) {
        return NextResponse.json({ error: 'No pending weight change found' }, { status: 404 })
      }
      // Store the pendingCategories value for use after update
      const pendingCategoriesValue = typedWeightRecord.pendingCategories
      const updated = await prisma.userTaskWeight.update({
        where: { id: weightId },
        data: {
          categories: pendingCategoriesValue,
          // pendingCategories is set to null and other fields are updated
          isApproved: true,
          approvedById: actualUserId,
          approvedAt: new Date()
        } as any // Use type assertion to bypass Prisma type checking
      })

      // Update related notifications to approved status
      try {
        await prisma.pmsNotification.updateMany({
          where: {
            entityType: 'UserTaskWeight',
            entityId: weightId,
            status: 'PENDING' as any
          },
          data: {
            status: 'APPROVED' as any
          }
        })
      } catch (notifError: any) {
        console.error('[user-task-weights] Failed to update notification status:', notifError.message)
      }

      return NextResponse.json({
        success: true,
        categories: JSON.parse(updated.categories),
        isApproved: true,
        pendingCategories: null
      })
    }

    if (action === 'reject' && weightId) {
      await prisma.userTaskWeight.update({
        where: { id: weightId },
        data: { 
          pendingCategories: null 
        }
      })

      // Update related notifications to rejected status
      try {
        await prisma.pmsNotification.updateMany({
          where: {
            entityType: 'UserTaskWeight',
            entityId: weightId,
            status: 'PENDING' as any
          },
          data: {
            status: 'REJECTED' as any
          }
        })
      } catch (notifError: any) {
        console.error('[user-task-weights] Failed to update notification status:', notifError.message)
      }

      return NextResponse.json({ success: true, message: 'Weight change rejected' })
    }

    // Normal save flow
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Invalid categories data' }, { status: 400 })
    }

    // Validate that each category has a valid numeric weight
    if (!categories.every(c => typeof c.weight === 'number' && !isNaN(c.weight))) {
      return NextResponse.json({ error: 'All categories must have valid numeric weights' }, { status: 400 })
    }

    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0)
    if (totalWeight !== 100) {
      return NextResponse.json({ error: 'Weights must sum to 100%' }, { status: 400 })
    }

    let existing = null
    try {
      existing = await prisma.userTaskWeight.findFirst({
        where: { userId: actualUserId },
        orderBy: { createdAt: 'desc' }
      })
    } catch (findError: any) {
      console.error('[user-task-weights POST] Error finding existing:', findError.message)
    }

    // Check if weights are already approved — new changes go to pendingCategories
    const isCurrentlyApproved = existing?.isApproved || false

    let userWeights
    if (existing) {
      if (isCurrentlyApproved) {
        // Weights already approved: save as pending (needs supervisor approval)
        // Using type assertion to work around Prisma type limitations
        const pendingCategoriesJson = JSON.stringify(categories)
        userWeights = await prisma.userTaskWeight.update({
          where: { id: existing.id },
          data: {
            pendingCategories: pendingCategoriesJson,
            updatedAt: new Date()
          } as any // Using type assertion
        })
        return NextResponse.json({
          success: true,
          message: 'Weight change submitted for supervisor approval',
          categories: JSON.parse(userWeights.categories),
          pendingCategories: categories,
          isApproved: true,
          needsApproval: true
        })
      } else {
        // Not yet approved: save directly and lock
        userWeights = await prisma.userTaskWeight.update({
          where: { id: existing.id },
          data: {
            categories: JSON.stringify(categories),
            isApproved: true,
            updatedAt: new Date()
          }
        })
      }
    } else {
      // First time saving — save and lock
      userWeights = await prisma.userTaskWeight.create({
        data: {
          userId: actualUserId,
          categories: JSON.stringify(categories),
          isApproved: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      categories: JSON.parse(userWeights.categories),
      isApproved: userWeights.isApproved,
      pendingCategories: null
    })

  } catch (error: any) {
    console.error('[user-task-weights POST] Error:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to save task weights', details: error.message },
      { status: 500 }
    )
  }
}
