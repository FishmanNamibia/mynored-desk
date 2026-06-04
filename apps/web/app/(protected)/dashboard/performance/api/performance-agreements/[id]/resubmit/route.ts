import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agreementId } = await params
    const { user } = await getAuthenticatedUser(req)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the agreement
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id: agreementId },
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

    if (!agreement) {
      return NextResponse.json({ error: 'Performance agreement not found' }, { status: 404 })
    }

    // Verify this is the staff member's own agreement
    if (agreement.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - not your agreement' }, { status: 403 })
    }

    // Verify it's currently rejected
    if (agreement.approvalStatus !== 'REJECTED') {
      return NextResponse.json({ error: 'Can only resubmit rejected items' }, { status: 400 })
    }

    // Validate that action and weight are set
    if (!agreement.customAction || agreement.customAction.length < 10) {
      return NextResponse.json({ error: 'Action must be at least 10 characters' }, { status: 400 })
    }

    if (!agreement.weight || agreement.weight <= 0) {
      return NextResponse.json({ error: 'Weight must be set' }, { status: 400 })
    }

    // Update to PENDING status and clear rejection comment
    await prisma.performanceAgreement.update({
      where: { id: agreementId },
      data: {
        approvalStatus: 'PENDING',
        progressNotes: null, // Clear the rejection comment
        updatedAt: new Date()
      }
    })

    // Create notification for supervisor
    if (agreement.supervisorId) {
      const initiativeTitle = agreement.customAction || agreement.initiative?.title || 'Initiative'
      
      const resubmitNotif = await prisma.pmsNotification.create({
        data: {
          type: 'GENERAL',
          status: 'PENDING',
          message: `${agreement.user.name} has resubmitted a revised performance agreement initiative: "${initiativeTitle}".`,
          senderId: user.id,
          receiverId: agreement.supervisorId,
          entityType: 'PerformanceAgreement',
          entityId: agreementId
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
      })

      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: agreement.supervisorId!, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(agreement.supervisorId!, { type: 'notification', notification: resubmitNotif, unreadCount })
      } catch { /* SSE broadcast is best-effort */ }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully resubmitted for approval'
    })

  } catch (error) {
    console.error('Error resubmitting performance agreement:', error)
    return NextResponse.json({ 
      error: 'Failed to resubmit performance agreement' 
    }, { status: 500 })
  }
}
