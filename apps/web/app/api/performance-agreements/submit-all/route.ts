import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/pms/auth'
import { prisma } from '@/lib/pms/prisma'
import { sendEmail, getManagerChain, fullName } from '@/lib/email'
import { buildRatingSubmittedEmail, type AgreementSummary } from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { agreements: submittedAgreements } = body

    // Handle both old format (agreementIds) and new format (agreements with details)
    const agreementIds = submittedAgreements?.map((a: any) => a.id) || body.agreementIds || []

    console.log('=== Submitting All Performance Agreements ===')
    console.log('User ID:', session.user.id)
    console.log('Agreement IDs:', agreementIds)

    if (!agreementIds || !Array.isArray(agreementIds) || agreementIds.length === 0) {
      return NextResponse.json({ error: 'No agreements to submit' }, { status: 400 })
    }

    // Get user details including manager
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supervisorId = user.managerId
    const supervisorName = user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : 'Unknown'

    console.log('📧 Supervisor ID:', supervisorId)
    console.log('📧 Supervisor Name:', supervisorName)

    // Verify all agreements belong to the user
    const agreements = await prisma.performanceAgreement.findMany({
      where: {
        id: { in: agreementIds },
        userId: session.user.id
      },
      include: {
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

    if (agreements.length !== agreementIds.length) {
      return NextResponse.json({ error: 'Some agreements do not belong to you' }, { status: 403 })
    }

    // Update customAction and weight if provided, and set supervisor
    for (const submitted of (submittedAgreements || [])) {
      if (submitted.id && (submitted.customAction || submitted.weight)) {
        await prisma.performanceAgreement.update({
          where: { id: submitted.id },
          data: {
            customAction: submitted.customAction,
            weight: submitted.weight,
            supervisorId: supervisorId,
            approvalStatus: 'PENDING',
            updatedAt: new Date()
          }
        })
      }
    }

    // Update remaining agreements to submitted status with supervisor
    await prisma.performanceAgreement.updateMany({
      where: {
        id: { in: agreementIds },
        userId: session.user.id
      },
      data: {
        supervisorId: supervisorId,
        approvalStatus: 'PENDING',
        updatedAt: new Date()
      }
    })

    // Create notification for supervisor if exists
    if (supervisorId) {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      const totalWeight = agreements.reduce((sum, a) => sum + (a.weight || 0), 0)
      
      // Build detailed message with agreement summary
      const agreementSummary = agreements.slice(0, 5).map(a => {
        const goal = a.initiative?.objective?.goal?.title || 'N/A'
        return `• ${a.title} (Weight: ${a.weight}%)`
      }).join('\n')
      
      const moreText = agreements.length > 5 ? `\n... and ${agreements.length - 5} more` : ''
      
      const notificationMessage = `
📋 PERFORMANCE AGREEMENT SUBMISSION

${userName} has submitted ${agreements.length} performance agreement(s) for your review and approval.

👤 Employee: ${userName}
📧 Email: ${user.email}
🏢 Department: ${user.departmentName || 'Not specified'}
💼 Position: ${user.jobTitle || 'Not specified'}

📊 Submission Summary:
• Total Agreements: ${agreements.length}
• Total Weight: ${totalWeight}%
• Submitted: ${new Date().toLocaleDateString('en-ZA', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}

📝 Agreements Submitted:
${agreementSummary}${moreText}

🔗 Action Required:
Please review and approve/reject the performance agreements in the Performance Management System.
Navigate to: Dashboard > My Subordinates > Performance Agreements

Thank you.
      `.trim()

      await prisma.pmsNotification.create({
        data: {
          type: 'APPROVAL_REQUESTED',
          status: 'PENDING',
          senderId: session.user.id,
          receiverId: supervisorId,
          entityType: 'PerformanceAgreement',
          entityId: agreements[0].id, // Link to first agreement
          message: notificationMessage,
          metadata: {
            employeeId: session.user.id,
            employeeName: userName,
            employeeEmail: user.email,
            agreementCount: agreements.length,
            agreementIds: agreementIds,
            totalWeight: totalWeight,
            submittedAt: new Date().toISOString()
          }
        }
      })

      console.log(`📧 Notification sent to supervisor: ${supervisorName}`)
    } else {
      console.warn('⚠️ No supervisor (managerId) found for user - notification not sent')
    }

    // ── Email notifications to full manager chain (fire-and-forget) ─────────
    if (user.email) {
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      const totalWeight = agreements.reduce((sum, a) => sum + (a.weight || 0), 0)
      const managerChain = await getManagerChain(session.user.id)

      // Determine performance period label from the first agreement
      const firstPeriod = (agreements[0] as any)?.performancePeriod
      const periodName = firstPeriod?.name || null

      const agreementList: AgreementSummary[] = agreements.map(a => ({
        id: a.id,
        title: a.title || 'Untitled',
        rating: (a as any).rating ?? null,
        weight: a.weight ?? null,
      }))

      if (managerChain.length > 0) {
        const { subject, html } = buildRatingSubmittedEmail({
          employeeName: userName,
          employeeEmail: user.email,
          employeeJobTitle: user.jobTitle ?? null,
          employeeDepartment: user.departmentName ?? null,
          supervisorName: fullName(managerChain[0].firstName, managerChain[0].lastName, managerChain[0].email),
          quarterName: null,
          periodName,
          agreements: agreementList,
          submittedAt: new Date(),
          totalWeight,
        })

        const recipientEmails = managerChain.map(m => m.email).filter(Boolean)
        sendEmail(recipientEmails, subject, html).catch(err =>
          console.error('[EMAIL] submit-all notification failed:', err)
        )
        console.log(`[EMAIL] Rating submission email queued for chain: ${recipientEmails.join(', ')}`)
      } else {
        console.warn('[EMAIL] No manager chain found — email not sent')
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`✅ Successfully submitted ${agreementIds.length} agreements`)

    return NextResponse.json({
      success: true,
      count: agreementIds.length,
      supervisorId: supervisorId,
      supervisorName: supervisorName,
      notificationSent: !!supervisorId
    })

  } catch (error: any) {
    console.error('❌ Error submitting performance agreements:', error)
    return NextResponse.json(
      { error: 'Failed to submit performance agreements: ' + error.message },
      { status: 500 }
    )
  }
}
