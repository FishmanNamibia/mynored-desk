import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getSafeSenderId } from '@/lib/notification-helper'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { sendEmail, fullName } from '@/lib/email'
import { buildRatingReviewedEmail } from '@/lib/email-templates'


export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, action, reason } = await req.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get all pending agreements for this user that this supervisor owns
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: userId,
        supervisorId: user.id,
        approvalStatus: 'PENDING'
      }
    })

    // Special case: Allow SG to approve DSG agreements and Board Chairperson to approve SG agreements
    if (agreements.length === 0) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { roles: { select: { role: { select: { name: true } } } } }
      })

      const dbUserRole = dbUser?.roles?.[0]?.role?.name

      // Check if current user can approve this user's agreements based on special rules
      let canApprove = false

      if (user?.roles?.includes('DEPUTY_SG') && dbUserRole === 'SG') {
        // SG can approve DSG agreements
        canApprove = true
      } else if (user?.roles?.includes('SG') && dbUserRole === 'BOARD_CHAIRPERSON') {
        // Board Chairperson can approve SG agreements
        canApprove = true
      }

      if (canApprove) {
        // Get agreements using the special approval relationship
        const specialAgreements = await prisma.performanceAgreement.findMany({
          where: {
            userId: userId,
            approvalStatus: 'PENDING'
          }
        })

        if (specialAgreements.length > 0) {
          // Update supervisorId for these agreements if needed
          await prisma.performanceAgreement.updateMany({
            where: {
              userId: userId,
              approvalStatus: 'PENDING',
              supervisorId: null // Only update if not already set
            },
            data: {
              supervisorId: user.id
            }
          })

          // Use the special agreements
          agreements.push(...specialAgreements)
        }
      }
    }

    if (agreements.length === 0) {
      return NextResponse.json({ error: 'No pending agreements found' }, { status: 404 })
    }

    // Update all agreements
    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const updateData: any = {
      approvalStatus: newStatus,
      approvedAt: new Date()
    }

    if (action === 'approve') {
      updateData.isLocked = true
    }

    await prisma.performanceAgreement.updateMany({
      where: {
        userId: userId,
        supervisorId: user.id,
        approvalStatus: 'PENDING'
      },
      data: updateData
    })

    // Fetch supervisor name for a personalised message
    const supervisorDb = await prisma.user.findFirst({
      where: { email: user.email },
      select: { firstName: true, lastName: true }
    })
    const supervisorName = `${supervisorDb?.firstName || ''} ${supervisorDb?.lastName || ''}`.trim() || 'Your supervisor'

    // Create notification for the user
    const safeSenderId = await getSafeSenderId(user.id)
    
    const approveNotif = await prisma.pmsNotification.create({
      data: {
        senderId: safeSenderId,
        receiverId: userId,
        message: action === 'approve'
          ? `${supervisorName} has approved your performance agreement (${agreements.length} initiative${agreements.length !== 1 ? 's' : ''}).`
          : `${supervisorName} has rejected your performance agreement. Reason: ${reason || 'No reason provided'}. Please revise and resubmit.`,
        type: action === 'approve' ? 'APPROVED' : 'REJECTED',
        status: 'PENDING',
        entityType: 'PerformanceAgreement',
        entityId: userId,
        metadata: { supervisorName, agreementsCount: agreements.length, ...(reason ? { reason } : {}) }
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })

    // Broadcast via SSE for real-time delivery
    try {
      const { broadcastToUser, mapNotifForBroadcast } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      const unreadCount = await prisma.pmsNotification.count({
        where: { receiverId: userId, status: { in: ['PENDING', 'SENT'] } },
      })
      broadcastToUser(userId, { type: 'notification', notification: mapNotifForBroadcast(approveNotif), unreadCount })
    } catch { /* SSE broadcast is best-effort */ }

    // ── Email notification to the employee (fire-and-forget) ────────────────
    try {
      const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      })
      const supervisorRecord = await prisma.user.findFirst({
        where: { email: user.email },
        orderBy: { createdAt: 'asc' },
        select: { firstName: true, lastName: true, jobTitle: true },
      })

      if (employee?.email) {
        const employeeName = fullName(employee.firstName, employee.lastName, employee.email)
        const supName = fullName(supervisorRecord?.firstName ?? null, supervisorRecord?.lastName ?? null, user.email)
        const supTitle = supervisorRecord?.jobTitle ?? null

        const agreementList = agreements.map(a => ({
          id: a.id,
          title: a.title || 'Untitled',
          rating: (a as any).rating ?? null,
          weight: (a as any).weight ?? null,
          status: newStatus,
          comment: reason || null,
        }))

        const approvedCount = action === 'approve' ? agreements.length : 0
        const rejectedCount = action === 'reject' ? agreements.length : 0

        const { subject, html } = buildRatingReviewedEmail({
          employeeName,
          supervisorName: supName,
          supervisorJobTitle: supTitle,
          action: action as 'approved' | 'rejected',
          periodName: null,
          agreements: agreementList,
          globalReason: reason || null,
          reviewedAt: new Date(),
          approvedCount,
          rejectedCount,
        })

        sendEmail(employee.email, subject, html).catch(err =>
          console.error('[EMAIL] approve notification failed:', err)
        )
        console.log(`[EMAIL] Approval email queued for employee: ${employee.email}`)
      }
    } catch (emailErr) {
      console.error('[EMAIL] Error building approval email:', emailErr)
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`Supervisor ${user.id} ${action}d ${agreements.length} agreements for user ${userId}`)

    return NextResponse.json({ 
      success: true, 
      action,
      agreementsUpdated: agreements.length
    })
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

