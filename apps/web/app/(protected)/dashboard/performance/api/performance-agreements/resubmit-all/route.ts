import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(request: Request) {
  try {
    console.log('[Resubmit All] Starting resubmit process')
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.id) {
      console.log('[Resubmit All] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Resubmit All] User ID:', user.id)

    // Resolve canonical user ID (oldest DB record by email)
    const canonicalDbUser = user.email ? await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    }) : null
    const canonicalUserId = canonicalDbUser?.id || user.id

    // Fetch all rejected agreements for this user
    const rejectedAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: canonicalUserId,
        approvalStatus: 'REJECTED',
        NOT: {
          isAdhocContainer: true
        }
      },
      include: {
        user: true,
        supervisor: true,
        initiative: {
          include: {
            objective: {
              include: {
                goal: true
              }
            }
          }
        }
      }
    })

    console.log('[Resubmit All] Found rejected agreements:', rejectedAgreements.length)

    if (rejectedAgreements.length === 0) {
      console.log('[Resubmit All] No rejected items found')
      return NextResponse.json({ error: 'No rejected items to resubmit' }, { status: 400 })
    }

    // Validate all items are ready for resubmission
    const invalidItems = rejectedAgreements.filter(agreement => 
      !agreement.customAction || 
      agreement.customAction.length < 10 || 
      !agreement.weight || 
      agreement.weight <= 0
    )

    console.log('[Resubmit All] Invalid items:', invalidItems.length)

    if (invalidItems.length > 0) {
      console.log('[Resubmit All] Items not ready:', invalidItems.map(i => i.id))
      return NextResponse.json({ 
        error: `${invalidItems.length} item(s) are not ready for resubmission. Please ensure all rejected items have action (min 10 chars) and weight set.` 
      }, { status: 400 })
    }

    console.log('[Resubmit All] Updating agreements to PENDING...')
    // Update all rejected items to PENDING and clear rejection comments
    await prisma.performanceAgreement.updateMany({
      where: {
        userId: canonicalUserId,
        approvalStatus: 'REJECTED',
        NOT: {
          isAdhocContainer: true
        }
      },
      data: {
        approvalStatus: 'PENDING',
        progressNotes: null, // Clear rejection comments
        updatedAt: new Date()
      }
    })

    // Reset PerformanceRatingChain for all resubmitted agreements from -1 back to 0.
    // Without this the chain stays in 'rejected' state and the supervisor can't re-review.
    if (rejectedAgreements.length > 0) {
      const rejectedIds = rejectedAgreements.map(a => a.id)
      try {
        for (const agreementId of rejectedIds) {
          await prisma.$executeRawUnsafe(
            `UPDATE "PerformanceRatingChain"
             SET "ratingApprovalLevel" = 0,
                 "ratingApprovalChain" = NULL,
                 "updatedAt" = NOW()
             WHERE "agreementId" = $1 AND "ratingApprovalLevel" = -1`,
            agreementId
          )
        }
        console.log(`[Resubmit All] Reset PerformanceRatingChain for ${rejectedIds.length} agreement(s)`)
      } catch (chainErr) {
        console.error('[Resubmit All] Chain reset failed (non-critical):', chainErr)
      }
    }

    console.log('[Resubmit All] Update complete')

    // Create a single consolidated notification for the supervisor
    if (rejectedAgreements[0]?.supervisorId) {
      console.log('[Resubmit All] Creating notification for supervisor:', rejectedAgreements[0].supervisorId)
      const count = rejectedAgreements.length
      const supervisorId = rejectedAgreements[0].supervisorId
      const empUser = rejectedAgreements[0].user
      const empName = (empUser as any)?.firstName && (empUser as any)?.lastName
        ? `${(empUser as any).firstName} ${(empUser as any).lastName}`.trim()
        : (empUser as any)?.name || 'Employee'
      
      const resubmitAllNotif = await prisma.pmsNotification.create({
        data: {
          type: 'APPROVAL_REQUESTED',
          status: 'PENDING',
          message: `${empName} has resubmitted ${count} revised performance agreement initiative${count > 1 ? 's' : ''} for your review.`,
          senderId: canonicalUserId,
          receiverId: supervisorId,
          entityType: 'PerformanceAgreement',
          entityId: rejectedAgreements[0].id // Link to first item
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
      })

      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: supervisorId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(supervisorId, { type: 'notification', notification: resubmitAllNotif, unreadCount })
      } catch { /* SSE broadcast is best-effort */ }
      console.log('[Resubmit All] Notification created')
    } else {
      console.log('[Resubmit All] No supervisor ID found, skipping notification')
    }

    console.log('[Resubmit All] Success!')
    return NextResponse.json({ 
      success: true, 
      count: rejectedAgreements.length,
      message: `Successfully resubmitted ${rejectedAgreements.length} initiative(s) for approval`
    })

  } catch (error) {
    console.error('Error resubmitting all performance agreements:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: `Failed to resubmit performance agreements: ${errorMessage}`,
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 })
  }
}

