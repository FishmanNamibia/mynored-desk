import { prisma } from '@/lib/pms/prisma'

/**
 * Assigns performance agreements to a user based on their department/division
 * This function searches for initiatives where the user's department or division
 * matches the primary or secondary responsibility
 */
export async function assignPerformanceAgreementsToUser(userId: string): Promise<{
  created: number
  skipped: number
  errors: string[]
}> {
  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[]
  }

  try {
    // Get user with department/division info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        division: {
          include: {
            department: true
          }
        }
      }
    })

    if (!user || !user.isApproved) {
      results.errors.push('User not found or not approved')
      return results
    }

    // Determine search terms based on user's department/division
    const searchTerms: string[] = []
    
    if (user.department) {
      searchTerms.push(user.department.name)
    }
    
    if (user.division) {
      searchTerms.push(user.division.name)
      // Also include the parent department of the division
      if (user.division.department) {
        searchTerms.push(user.division.department.name)
      }
    }

    if (searchTerms.length === 0) {
      results.errors.push('User has no department or division assigned')
      return results
    }

    console.log(`Searching for initiatives matching: ${searchTerms.join(', ')}`)

    // Find all initiatives where responsibility matches user's department/division
    const initiatives = await prisma.initiative.findMany({
      where: {
        OR: searchTerms.flatMap(term => [
          { primaryResponsibility: { contains: term, mode: 'insensitive' } },
          { secondaryResponsibility: { contains: term, mode: 'insensitive' } }
        ])
      }
    })

    console.log(`Found ${initiatives.length} matching initiatives for user ${user.name}`)

    if (initiatives.length === 0) {
      return results
    }

    // Get fiscal year dates
    const currentYear = new Date().getFullYear()
    const fiscalYear = {
      endDate: new Date(`${currentYear + 1}-03-31`)
    }

    // OPTIMIZATION: Check all existing agreements at once instead of one-by-one
    // Check by both initiativeId AND customAction - one strategic objective can have multiple actions
    const initiativeIds = initiatives.map(i => i.id)
    const existingAgreements = await prisma.performanceAgreement.findMany({
      where: {
        userId: userId,
        initiativeId: { in: initiativeIds }
      },
      select: {
        initiativeId: true,
        customAction: true  // Also track action for duplicate detection
      }
    })

    // Create a composite key of initiativeId + action to detect duplicates properly
    const existingKeys = new Set(
      existingAgreements.map(a => `${a.initiativeId}|${a.customAction || ''}`)
    )

    // Filter out initiatives that already have agreements with the same action
    const newInitiatives = initiatives.filter(i => {
      const key = `${i.id}|${i.action || ''}`
      return !existingKeys.has(key)
    })
    results.skipped = existingAgreements.length

    if (newInitiatives.length === 0) {
      console.log('All initiatives already have agreements, nothing to create')
      return results
    }

    // OPTIMIZATION: Bulk create all agreements in a single transaction
    try {
      await prisma.$transaction(
        newInitiatives.map(initiative =>
          prisma.performanceAgreement.create({
            data: {
              title: initiative.title,
              description: initiative.description || '',
              kpi: initiative.measure || null,
              target: initiative.target || null,
              customAction: initiative.action || null,
              dueDate: initiative.dueDate || fiscalYear.endDate,
              userId: userId,
              supervisorId: user.supervisorId || null,
              initiativeId: initiative.id,
              status: 'NOT_STARTED',
              isSystemGenerated: true,
              weight: null
            }
          })
        )
      )
      results.created = newInitiatives.length
    } catch (error: any) {
      results.errors.push(`Failed to create agreements: ${error.message}`)
    }

    console.log(`✅ Created ${results.created} agreements for ${user.name}`)
    
    return results
  } catch (error: any) {
    results.errors.push(`Error assigning agreements: ${error.message}`)
    return results
  }
}

/**
 * Assigns performance agreements to multiple users
 */
export async function assignPerformanceAgreementsToUsers(userIds: string[]): Promise<{
  totalCreated: number
  totalSkipped: number
  errors: string[]
}> {
  const results = {
    totalCreated: 0,
    totalSkipped: 0,
    errors: [] as string[]
  }

  for (const userId of userIds) {
    const userResult = await assignPerformanceAgreementsToUser(userId)
    results.totalCreated += userResult.created
    results.totalSkipped += userResult.skipped
    results.errors.push(...userResult.errors)
  }

  return results
}
