import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getSafeSenderId } from '@/lib/notification-helper'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { sendEmail, fullName } from '@/lib/email'
import { buildRatingReviewedEmail } from '@/lib/email-templates'


export async function POST(req: NextRequest) {
  console.log('=== APPROVE INDIVIDUAL ENDPOINT CALLED ===')
  try {
    const { user } = await getAuthenticatedUser(req)
    console.log('Session:', user?.id)
    if (!user?.id) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { userId, decisions } = body

    if (!userId || !decisions || !Array.isArray(decisions)) {
      console.log('Missing required fields:', { userId: !!userId, decisions: !!decisions, isArray: Array.isArray(decisions) })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('=== Individual Initiative Approval ===')
    console.log('Supervisor:', user.id)
    console.log('User:', userId)
    console.log('Decisions:', decisions.length)
    console.log('Decisions detail:', JSON.stringify(decisions, null, 2))

    // Update each agreement individually
    const results = await prisma.$transaction(async (tx) => {
      const updates = []

      for (const decision of decisions) {
        const { agreementId, status, comment } = decision

        // Verify ownership
        const agreement = await tx.performanceAgreement.findUnique({
          where: { id: agreementId },
          select: { 
            userId: true, 
            supervisorId: true,
            approvalStatus: true 
          }
        })

        console.log(`Agreement ${agreementId}:`, {
          found: !!agreement,
          userId: agreement?.userId,
          expectedUserId: userId,
          supervisorId: agreement?.supervisorId,
          currentUserId: user.id,
          approvalStatus: agreement?.approvalStatus
        })

        if (!agreement || agreement.userId !== userId) {
          throw new Error(`Agreement ${agreementId} not found or unauthorized`)
        }

        // If supervisorId is null, get it from the user record
        if (!agreement.supervisorId) {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { supervisorId: true }
          })
          
          if (user?.supervisorId !== user.id) {
            throw new Error(`You are not the supervisor for this user (user supervisorId: ${user?.supervisorId}, your id: ${user.id})`)
          }
        } else {
          if (agreement.supervisorId !== user.id) {
            throw new Error(`You are not the supervisor for this agreement (agreement supervisorId: ${agreement.supervisorId}, your id: ${user.id})`)
          }
        }

        if (agreement.approvalStatus !== 'PENDING') {
          console.log(`Skipping agreement ${agreementId} - already processed (status: ${agreement.approvalStatus})`)
          updates.push({ agreementId, status: 'skipped', message: `Already ${agreement.approvalStatus?.toLowerCase() || 'processed'}` })
          continue // Skip this one, move to next
        }

        // Validate weight and COMPLETED status before approving/rejecting
        const fullAgreement = await tx.performanceAgreement.findUnique({
          where: { id: agreementId },
          select: { weight: true, title: true, isAdhocContainer: true, status: true }
        })

        if (status === 'approved') {
          // Individual actions (not containers) must have weights for approval
          if (!fullAgreement?.isAdhocContainer && (fullAgreement?.weight === null || fullAgreement?.weight === undefined)) {
            throw new Error(`Cannot approve "${fullAgreement?.title}" - weight must be assigned before approval`)
          }

          // Supervisor can only approve/reject after the employee marks the action as COMPLETED
          if (!fullAgreement?.isAdhocContainer && fullAgreement?.status !== 'COMPLETED') {
            throw new Error(`Cannot approve "${fullAgreement?.title}" - the employee must mark this action as Completed before it can be approved`)
          }

          console.log(`Approving agreement "${fullAgreement?.title}" with weight: ${fullAgreement?.weight}%`)
        }

        if (status === 'rejected' && !fullAgreement?.isAdhocContainer && fullAgreement?.status !== 'COMPLETED') {
          throw new Error(`Cannot reject "${fullAgreement?.title}" - the employee must mark this action as Completed before it can be reviewed`)
        }

        // Update agreement
        const updateData: any = {
          approvalStatus: status === 'approved' ? 'APPROVED' : 'REJECTED',
          approvedAt: new Date()
        }

        if (status === 'approved') {
          updateData.isLocked = true
        }

        // Store rejection comment in progressNotes for now
        if (status === 'rejected' && comment) {
          updateData.progressNotes = `Rejected by supervisor: ${comment}`
        }

        await tx.performanceAgreement.update({
          where: { id: agreementId },
          data: updateData
        })

        updates.push({ agreementId, status })
      }

      return updates
    })

    // Fetch supervisor name for notification messages
    const supervisorDb = await prisma.user.findFirst({
      where: { email: user.email },
      select: { firstName: true, lastName: true }
    })
    const supervisorName = `${supervisorDb?.firstName || ''} ${supervisorDb?.lastName || ''}`.trim() || 'Your supervisor'

    const approvedCount = results.filter(r => r.status === 'approved').length
    const rejectedCount = results.filter(r => r.status === 'rejected').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    // Send one notification per decision so employee sees per-action detail
    if (approvedCount > 0 || rejectedCount > 0) {
      const safeSenderId = await getSafeSenderId(user.id)

      for (const decision of decisions) {
        if (decision.status === 'skipped') continue
        const isApproved = decision.status === 'approved'
        const commentPart = decision.comment ? ` Comment: ${decision.comment.trim()}` : ''
        const message = isApproved
          ? `${supervisorName} has approved your initiative.${commentPart}`
          : `${supervisorName} has rejected your initiative.${commentPart} Please revise and resubmit.`

        const reviewNotif = await prisma.pmsNotification.create({
          data: {
            senderId: safeSenderId,
            receiverId: userId,
            message,
            type: isApproved ? 'APPROVED' : 'REJECTED',
            status: 'PENDING',
            entityType: 'PerformanceAgreement',
            entityId: decision.agreementId,
            metadata: {
              agreementId: decision.agreementId,
              supervisorName,
              approvedCount,
              rejectedCount,
              ...(decision.comment ? { comment: decision.comment.trim() } : {})
            }
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
          broadcastToUser(userId, { type: 'notification', notification: mapNotifForBroadcast(reviewNotif), unreadCount })
        } catch { /* SSE broadcast is best-effort */ }
      }
    }

    // ── Email notification to employee with per-action decisions (fire-and-forget) ──
    if (approvedCount > 0 || rejectedCount > 0) {
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

          // Build agreement list with per-action decision + comment
          const agreementDetails = await prisma.performanceAgreement.findMany({
            where: { id: { in: decisions.map((d: any) => d.agreementId) } },
            select: { id: true, title: true, rating: true, weight: true, approvalStatus: true },
          })

          const agreementList = agreementDetails.map((a: any) => {
            const dec = decisions.find((d: any) => d.agreementId === a.id)
            return {
              id: a.id,
              title: a.title || 'Untitled',
              rating: a.rating ?? null,
              weight: a.weight ?? null,
              status: a.approvalStatus,
              comment: dec?.comment || null,
            }
          })

          // Determine overall action for subject line
          const overallAction = rejectedCount > 0 ? 'rejected' : 'approved'

          const { subject, html } = buildRatingReviewedEmail({
            employeeName,
            supervisorName: supName,
            supervisorJobTitle: supTitle,
            action: overallAction as 'approved' | 'rejected',
            periodName: null,
            agreements: agreementList,
            globalReason: null,
            reviewedAt: new Date(),
            approvedCount,
            rejectedCount,
          })

          sendEmail(employee.email, subject, html).catch(err =>
            console.error('[EMAIL] approve-individual notification failed:', err)
          )
          console.log(`[EMAIL] Per-action review email queued for employee: ${employee.email}`)
        }
      } catch (emailErr) {
        console.error('[EMAIL] Error building approve-individual email:', emailErr)
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`Reviewed ${results.length} initiatives: ${approvedCount} approved, ${rejectedCount} rejected, ${skippedCount} skipped`)

    return NextResponse.json({ 
      success: true,
      approvedCount,
      rejectedCount,
      skippedCount,
      total: results.length,
      message: skippedCount > 0 ? `${skippedCount} initiative${skippedCount > 1 ? 's were' : ' was'} already processed` : undefined
    })
  } catch (error) {
    console.error('=== ERROR processing individual approvals ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

