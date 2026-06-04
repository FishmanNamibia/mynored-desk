import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there's an active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { submissionDeadline: true }
    })

    if (!activePeriod) {
      return NextResponse.json({ 
        error: 'No active performance agreement period. Please contact Human Capital.' 
      }, { status: 400 })
    }

    // Check if submission deadline has passed
    const submissionDeadline = new Date(activePeriod.submissionDeadline)
    const today = new Date()
    // Set time to start of day for fair comparison
    today.setHours(0, 0, 0, 0)
    submissionDeadline.setHours(23, 59, 59, 999)

    if (today > submissionDeadline) {
      return NextResponse.json({ 
        error: 'Performance agreement submission period has ended. The deadline was ' + submissionDeadline.toLocaleDateString() 
      }, { status: 400 })
    }

    const body = await req.json()
    const { agreements, userId: requestedUserId } = body

    if (!agreements || !Array.isArray(agreements) || agreements.length === 0) {
      return NextResponse.json({ error: 'No agreements provided' }, { status: 400 })
    }

    // Determine which user's agreements to submit
    // If userId is provided, verify the current user is their supervisor
    let targetUserId = user.id
    if (requestedUserId && requestedUserId !== user.id) {
      // Verify current user is the supervisor of the requested user
      const subordinate = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { managerId: true }
      })

      if (!subordinate || subordinate.managerId !== user.id) {
        return NextResponse.json({ 
          error: 'You are not authorized to submit for this user' 
        }, { status: 403 })
      }

      targetUserId = requestedUserId
    }

    // Validate all have actions
    const missingActions = agreements.filter((a: any) => !a.customAction || a.customAction.trim().length < 10)
    if (missingActions.length > 0) {
      return NextResponse.json({ 
        error: `All initiatives must have actions (minimum 10 characters). Missing: ${missingActions.length}` 
      }, { status: 400 })
    }

    // Get all agreements for this user to validate total weight
    // Exclude ad-hoc container from weight validation
    const allUserAgreements = await prisma.performanceAgreement.findMany({
      where: { 
        userId: targetUserId,
        isAdhocContainer: false  // Exclude ad-hoc container
      },
      select: { id: true, weight: true, approvalStatus: true, isAdhocContainer: true }
    })

    console.log('=== Weight Validation ===')
    console.log('All user agreements from DB:', allUserAgreements.map(a => ({ id: a.id.substring(0, 8), weight: a.weight, status: a.approvalStatus })))
    console.log('Agreements being submitted:', agreements.map((a: any) => ({ id: a.id.substring(0, 8), weight: a.weight })))

    // Calculate total weight including both submitted and already approved/pending
    // Only regular agreements, excluding ad-hoc container (which is always 10%)
    const agreementIdsBeingSubmitted = agreements.map((a: any) => a.id)
    const totalWeight = allUserAgreements.reduce((sum, existing) => {
      // If this agreement is being submitted, use the new weight from submission
      const submittedAgreement = agreements.find((a: any) => a.id === existing.id)
      if (submittedAgreement) {
        console.log(`Using NEW weight for ${existing.id.substring(0, 8)}: ${submittedAgreement.weight}`)
        return sum + (submittedAgreement.weight || 0)
      }
      // Otherwise use the existing weight from database
      console.log(`Using EXISTING weight for ${existing.id.substring(0, 8)}: ${existing.weight}`)
      return sum + (existing.weight || 0)
    }, 0)

    console.log('Total weight calculated:', totalWeight)

    // Get active performance period to check configured weight thresholds
    const activePeriodWeights = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { 
        adhocWeight: true,
        projectsWeight: true,
        riskManagementWeight: true,
        rating360Weight: true
      }
    })

    // Calculate required strategic goals weight
    const adhocWeight = activePeriodWeights?.adhocWeight || 0
    const projectsWeight = activePeriodWeights?.projectsWeight || 0
    const riskManagementWeight = activePeriodWeights?.riskManagementWeight || 0
    const rating360Weight = activePeriodWeights?.rating360Weight || 10
    const reservedWeight = adhocWeight + projectsWeight + riskManagementWeight + rating360Weight
    const requiredStrategicGoalsWeight = 100 - reservedWeight

    console.log('Weight Configuration:')
    console.log('- Adhoc:', adhocWeight + '%')
    console.log('- Projects:', projectsWeight + '%')
    console.log('- Risk Management:', riskManagementWeight + '%')
    console.log('- 360-Degree:', rating360Weight + '%')
    console.log('- Reserved Total:', reservedWeight + '%')
    console.log('- Required Strategic Goals:', requiredStrategicGoalsWeight + '%')

    // Get user's supervisor first
    const dbUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { managerId: true, firstName: true, lastName: true }
    })

    if (!dbUser?.managerId) {
      return NextResponse.json({ 
        error: 'This user does not have a supervisor assigned. Cannot submit for approval.' 
      }, { status: 400 })
    }

    // Update all agreements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const agreement of agreements) {
        // Verify ownership
        const existing = await tx.performanceAgreement.findUnique({
          where: { id: agreement.id },
          select: { userId: true, isLocked: true, approvalStatus: true }
        })

        if (!existing || existing.userId !== targetUserId) {
          throw new Error('Unauthorized agreement found')
        }

        // Don't allow resubmission of approved items
        if (existing.isLocked && existing.approvalStatus === 'APPROVED') {
          throw new Error('One or more agreements are already approved and cannot be modified')
        }

        // Update agreement with supervisorId (clear rejection comments on resubmission)
        await tx.performanceAgreement.update({
          where: { id: agreement.id },
          data: {
            customAction: agreement.customAction,
            weight: agreement.weight,
            approvalStatus: 'PENDING',
            supervisorId: dbUser.managerId, // Set supervisor for approval workflow
            confirmedAt: new Date(),
            progressNotes: null, // Clear any previous rejection comments
            isLocked: false // Unlock for review
          }
        })
      }

      // Auto-approve all containers (adhoc, projects, risk management)
      await tx.performanceAgreement.updateMany({
        where: {
          userId: targetUserId,
          isAdhocContainer: true,
          title: {
            in: ['Ad-hoc Tasks', 'Projects', 'Risk Management']
          }
        },
        data: {
          approvalStatus: 'APPROVED',
          supervisorId: dbUser.managerId,
          confirmedAt: new Date(),
          isLocked: true
        }
      })
    })

    // Create notification for supervisor
    if (dbUser?.managerId) {
      try {
        const submitterName = targetUserId === user.id 
          ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() 
          : `${`${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim()} (via supervisor)`

        const submitNotif = await prisma.pmsNotification.create({
          data: {
            type: 'GENERAL',
            status: 'PENDING',
            receiverId: dbUser.managerId,
            senderId: targetUserId,
            message: `${submitterName} has submitted their performance agreement (${agreements.length} initiatives) for approval`,
            entityType: 'PerformanceAgreement',
            entityId: targetUserId
          },
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        })

        // Broadcast via SSE for real-time delivery
        try {
          const { broadcastToUser } = await import(
            '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
          )
          const unreadCount = await prisma.pmsNotification.count({
            where: { receiverId: dbUser.managerId!, status: { in: ['PENDING', 'SENT'] } },
          })
          broadcastToUser(dbUser.managerId!, { type: 'notification', notification: submitNotif, unreadCount })
        } catch { /* SSE broadcast is best-effort */ }
      } catch (notifError) {
        console.error('Failed to create notification:', notifError)
        // Don't fail the whole request
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All agreements submitted for approval',
      count: agreements.length 
    })
  } catch (error) {
    console.error('Error submitting agreements:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

