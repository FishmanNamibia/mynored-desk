import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active performance period weights
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        adhocWeight: true,
        projectsWeight: true,
        riskManagementWeight: true,
        rating360Weight: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updatedAt: true
      }
    })

    if (!activePeriod) {
      return NextResponse.json({ 
        error: 'No active performance period found' 
      }, { status: 404 })
    }

    const performanceAgreementWeight = 100 - (
      activePeriod.adhocWeight + 
      activePeriod.projectsWeight + 
      activePeriod.riskManagementWeight + 
      activePeriod.rating360Weight
    )

    // Check if any performance agreements have been approved
    const approvedAgreements = await prisma.performanceAgreement.count({
      where: {
        approvalStatus: 'APPROVED',
        isAdhocContainer: false
      }
    })

    return NextResponse.json({
      periodId: activePeriod.id,
      periodName: activePeriod.name,
      weights: {
        performanceAgreement: performanceAgreementWeight,
        adhoc: activePeriod.adhocWeight,
        projects: activePeriod.projectsWeight,
        riskManagement: activePeriod.riskManagementWeight,
        rating360: activePeriod.rating360Weight
      },
      createdBy: activePeriod.createdBy,
      updatedAt: activePeriod.updatedAt,
      isLocked: approvedAgreements > 0,
      approvedAgreementsCount: approvedAgreements
    })
  } catch (error) {
    console.error('Error fetching weights:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is HC Executive or Admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true
      }
    })

    const isAdmin = user?.role === 'ADMIN'
    const isHCExecutive = user?.role === 'EXECUTIVE' && 
      user?.department?.name?.toLowerCase().includes('human capital') ||
      user?.department?.name?.toLowerCase().includes('human resources') ||
      user?.department?.name?.toLowerCase().includes('hr')

    if (!isAdmin && !isHCExecutive) {
      return NextResponse.json({ 
        error: 'Only HC Executive and Admin can update weight thresholds' 
      }, { status: 403 })
    }

    // Check if any performance agreements have been approved and signed
    const approvedAgreements = await prisma.performanceAgreement.count({
      where: {
        approvalStatus: 'APPROVED',
        isAdhocContainer: false
      }
    })

    if (approvedAgreements > 0) {
      return NextResponse.json({ 
        error: `Cannot modify weight thresholds. ${approvedAgreements} performance agreement(s) have already been approved and signed. Weight thresholds can only be changed before any agreements are approved.`,
        isLocked: true,
        approvedCount: approvedAgreements
      }, { status: 403 })
    }

    const body = await request.json()
    const { adhocWeight, projectsWeight, riskManagementWeight, rating360Weight } = body

    // Validate weights
    if (
      typeof adhocWeight !== 'number' || 
      typeof projectsWeight !== 'number' || 
      typeof riskManagementWeight !== 'number' || 
      typeof rating360Weight !== 'number'
    ) {
      return NextResponse.json({ 
        error: 'All weights must be numbers' 
      }, { status: 400 })
    }

    // Validate weights are positive
    if (
      adhocWeight < 0 || 
      projectsWeight < 0 || 
      riskManagementWeight < 0 || 
      rating360Weight < 0
    ) {
      return NextResponse.json({ 
        error: 'Weights must be positive numbers' 
      }, { status: 400 })
    }

    // Calculate performance agreement weight
    const totalReserved = adhocWeight + projectsWeight + riskManagementWeight + rating360Weight
    const performanceAgreementWeight = 100 - totalReserved

    // Validate that performance agreement weight is positive
    if (performanceAgreementWeight <= 0) {
      return NextResponse.json({ 
        error: `Total reserved weight (${totalReserved}%) exceeds 100%. Performance Agreement must have at least 1%.` 
      }, { status: 400 })
    }

    // Validate total doesn't exceed 100%
    if (totalReserved >= 100) {
      return NextResponse.json({ 
        error: `Total weight cannot equal or exceed 100%. Current total: ${totalReserved}%` 
      }, { status: 400 })
    }

    // Update active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true }
    })

    if (!activePeriod) {
      return NextResponse.json({ 
        error: 'No active performance period found' 
      }, { status: 404 })
    }

    const updatedPeriod = await prisma.performancePeriod.update({
      where: { id: activePeriod.id },
      data: {
        adhocWeight,
        projectsWeight,
        riskManagementWeight,
        rating360Weight
      }
    })

    return NextResponse.json({
      message: 'Weight thresholds updated successfully',
      weights: {
        performanceAgreement: performanceAgreementWeight,
        adhoc: updatedPeriod.adhocWeight,
        projects: updatedPeriod.projectsWeight,
        riskManagement: updatedPeriod.riskManagementWeight,
        rating360: updatedPeriod.rating360Weight
      }
    })
  } catch (error) {
    console.error('Error updating weights:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
