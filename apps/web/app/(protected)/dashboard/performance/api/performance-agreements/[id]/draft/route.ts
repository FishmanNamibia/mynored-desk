import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    console.log('=== Draft Save API Called ===')
    console.log('Agreement ID:', params.id)
    
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      console.log('Unauthorized: No session')
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
    const { customAction, weight } = body
    console.log('Saving:', { customAction: customAction?.substring(0, 50), weight })

    // Verify user owns this agreement OR is the supervisor
    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id: params.id },
      select: { 
        userId: true,
        supervisorId: true,
        user: {
          select: {
            managerId: true
          }
        },
        approvalStatus: true,
        isLocked: true 
      }
    })

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    // Allow if user owns the agreement OR is the supervisor
    const isOwner = agreement.userId === user.id
    const isSupervisor = agreement.supervisorId === user.id || agreement.user.managerId === user.id

    if (!isOwner && !isSupervisor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Owner can only edit if not locked/approved/pending
    // Supervisor can edit rejected items to help subordinate fix them
    if (isOwner) {
      if (agreement.isLocked || agreement.approvalStatus === 'APPROVED' || agreement.approvalStatus === 'PENDING') {
        return NextResponse.json({ error: 'Cannot modify locked or submitted agreement' }, { status: 403 })
      }
    } else if (isSupervisor) {
      // Supervisor can only edit rejected items
      if (agreement.approvalStatus !== 'REJECTED') {
        return NextResponse.json({ error: 'Supervisors can only edit rejected items' }, { status: 403 })
      }
    }

    // Build update data - only include provided fields
    const updateData: any = {}
    if (customAction !== undefined) {
      updateData.customAction = customAction
    }
    if (weight !== undefined) {
      updateData.weight = weight
    }

    // Update agreement (draft save - doesn't change approval status)
    const updated = await prisma.performanceAgreement.update({
      where: { id: params.id },
      data: updateData
    })

    console.log('Successfully saved draft for agreement:', params.id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
