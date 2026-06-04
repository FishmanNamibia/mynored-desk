import { prisma } from './pms/prisma'

export async function assignPerformanceAgreementsToUser(userId: string) {
  try {
    console.log(`Starting assignment of performance agreements to user: ${userId}`)
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        role: true,
        supervisorId: true,
        departmentId: true,
        divisionId: true
      }
    })

    if (!user) {
      console.error(`User not found: ${userId}`)
      return { success: false, message: 'User not found' }
    }

    // Get all initiatives from the workplan
    const initiatives = await prisma.initiative.findMany({
      include: {
        objective: {
          include: {
            goal: true
          }
        }
      }
    })

    if (initiatives.length === 0) {
      console.log('No workplan initiatives found')
      return { success: true, message: 'No initiatives to assign' }
    }

    let assignmentsCreated = 0

    // Get active performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      select: { id: true }
    })

    const currentYear = new Date().getFullYear()
    const fiscalYear = {
      endDate: new Date(`${currentYear + 1}-03-31`)
    }

    for (const initiative of initiatives) {
      try {
        let shouldAssign = false

        // Check 'All' assignment
        if (initiative.primaryResponsibility?.toLowerCase() === 'all' ||
            initiative.secondaryResponsibility?.toLowerCase() === 'all') {
          shouldAssign = true
        }

        // Check department/role specific assignments
        if (!shouldAssign) {
          const primaryResp = initiative.primaryResponsibility?.toLowerCase() || ''
          const secondaryResp = initiative.secondaryResponsibility?.toLowerCase() || ''

          if (user.role === 'SG' && (primaryResp.includes('secretary general') || primaryResp.includes('osg'))) {
            shouldAssign = true
          } else if (user.role === 'DEPUTY_SG' && (primaryResp.includes('deputy secretary general') || primaryResp.includes('odsg'))) {
            shouldAssign = true
          }

          if (user.role === 'SG' && (secondaryResp.includes('secretary general') || secondaryResp.includes('osg'))) {
            shouldAssign = true
          } else if (user.role === 'DEPUTY_SG' && (secondaryResp.includes('deputy secretary general') || secondaryResp.includes('odsg'))) {
            shouldAssign = true
          }
        }

        if (shouldAssign) {
          // Check if agreement already exists - check by action, not just initiative
          // One strategic objective (initiative) can have multiple actions with different goals
          const actionText = initiative.action || null
          const existingAgreement = await prisma.performanceAgreement.findFirst({
            where: {
              userId: userId,
              initiativeId: initiative.id,
              customAction: actionText  // Check action to allow same initiative with different actions
            }
          })

          if (!existingAgreement) {
            await prisma.performanceAgreement.create({
              data: {
                title: initiative.title,
                description: initiative.description,
                kpi: initiative.measure || null,
                target: initiative.target || null,
                customAction: initiative.action || null,
                dueDate: initiative.dueDate || fiscalYear.endDate,
                userId: userId,
                supervisorId: user.supervisorId,
                initiativeId: initiative.id,
                performancePeriodId: activePeriod?.id || null,
                status: 'NOT_STARTED',
                isSystemGenerated: true,
                weight: null
              }
            })
            assignmentsCreated++
          }
        }
      } catch (error: any) {
        console.error(`Error assigning initiative ${initiative.title} to user ${userId}:`, error)
      }
    }

    console.log(`Assigned ${assignmentsCreated} initiatives to user ${userId}`)
    return { 
      success: true, 
      message: `Successfully assigned ${assignmentsCreated} performance agreements`,
      assignmentsCreated 
    }

  } catch (error) {
    console.error('Error in assignPerformanceAgreementsToUser:', error)
    return { 
      success: false, 
      message: 'Failed to assign performance agreements',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}