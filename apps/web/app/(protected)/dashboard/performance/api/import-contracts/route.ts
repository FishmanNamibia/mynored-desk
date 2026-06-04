import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getCurrentPerformanceCycle } from '@/lib/pms/performance-cycle'
import { createPmsAuditLog } from '@/lib/pms-audit'
import { getAuthenticatedUser } from '@/lib/server-auth'

interface PerformanceContractRow {
  Goal: string
  'Strategic Objective': string
  'Strategic Initiative': string
  Actions: string
  Measure: string
  Targets: string
  'Weight (%)': string
  ApprovalStatus: string
  SupervisorEmail: string
  'Created By': string
  Deadline: string
  Created: string
}

// Helper function to find user by name (matching AD display name)
async function findUserByName(tx: any, name: string) {
  if (!name) return null
  
  const nameTrimmed = name.trim()
  
  // Try to match by combining firstName and lastName
  const nameParts = nameTrimmed.split(' ')
  
  if (nameParts.length >= 2) {
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    
    // Try exact match first
    let user = await tx.user.findFirst({
      where: {
        AND: [
          { firstName: { equals: firstName, mode: 'insensitive' as any } },
          { lastName: { equals: lastName, mode: 'insensitive' as any } }
        ]
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    if (user) return user
  }
  
  // Try partial match on full name
  const user = await tx.user.findFirst({
    where: {
      OR: [
        {
          firstName: { contains: nameTrimmed, mode: 'insensitive' as any }
        },
        {
          lastName: { contains: nameTrimmed, mode: 'insensitive' as any }
        }
      ]
    },
    include: {
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
  
  return user
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user: authUser } = await getAuthenticatedUser(request)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data, importedBy } = await request.json()
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data array is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting import of', data.length, 'performance contracts...')

    const performanceYear = getCurrentPerformanceCycle()
    let goalsCreated = 0
    let objectivesCreated = 0
    let initiativesCreated = 0
    let agreementsCreated = 0
    const missingUsers = new Set<string>()
    const usersWithContracts = new Set<string>()

    // Group data by goals and objectives to avoid duplicates
    const goalMap = new Map<string, { 
      goal: PerformanceContractRow, 
      objectives: Map<string, { 
        objective: PerformanceContractRow, 
        initiatives: PerformanceContractRow[] 
      }> 
    }>()

    // Organize data by hierarchy
    for (const row of data) {
      const goalTitle = row.Goal.trim()
      const objectiveTitle = row['Strategic Objective'].trim()
      
      if (!goalMap.has(goalTitle)) {
        goalMap.set(goalTitle, {
          goal: row,
          objectives: new Map()
        })
      }

      const goalEntry = goalMap.get(goalTitle)!
      if (!goalEntry.objectives.has(objectiveTitle)) {
        goalEntry.objectives.set(objectiveTitle, {
          objective: row,
          initiatives: []
        })
      }

      goalEntry.objectives.get(objectiveTitle)!.initiatives.push(row)
    }

    console.log('📊 Organized into', goalMap.size, 'unique goals')

    // Get active performance period for linking agreements - REQUIRED
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!activePeriod) {
      console.error('❌ No active performance period found - cannot import agreements')
      return NextResponse.json(
        { 
          error: 'No active performance period found. Please create and activate a performance period before importing agreements.',
          code: 'NO_ACTIVE_PERIOD'
        },
        { status: 400 }
      )
    }
    
    console.log('📅 Using active performance period:', activePeriod.name, '(ID:', activePeriod.id, ')')

    // Start transaction with increased timeout for bulk imports (60 seconds)
    await prisma.$transaction(async (tx) => {
      for (const [goalTitle, goalEntry] of goalMap) {
        console.log('🎯 Processing goal:', goalTitle)

        // Check if goal already exists
        let existingGoal = await tx.goal.findFirst({
          where: {
            title: goalTitle,
            performanceYear: performanceYear
          }
        })

        let goalId: string
        if (existingGoal) {
          goalId = existingGoal.id
          console.log('📌 Using existing goal:', goalTitle)
        } else {
          // Create new goal
          const newGoal = await tx.goal.create({
            data: {
              goalNumber: `GOAL-${goalsCreated + 1}`,
              title: goalTitle,
              description: `Strategic goal imported from performance contract`,
              startDate: new Date(),
              endDate: goalEntry.goal.Deadline ? new Date(goalEntry.goal.Deadline) : new Date(new Date().getFullYear() + 1, 2, 31), // End of next March
              performanceYear: performanceYear,
              bscPerspective: 'INDIVIDUAL_CONTRACT'
            }
          })
          goalId = newGoal.id
          goalsCreated++
          console.log('✨ Created new goal:', goalTitle)
        }

        // Process objectives
        for (const [objectiveTitle, objectiveEntry] of goalEntry.objectives) {
          console.log('🎯 Processing objective:', objectiveTitle)

          // Check if objective already exists
          let existingObjective = await tx.objective.findFirst({
            where: {
              title: objectiveTitle,
              goalId: goalId
            }
          })

          let objectiveId: string
          if (existingObjective) {
            objectiveId = existingObjective.id
            console.log('📌 Using existing objective:', objectiveTitle)
          } else {
            // Create new objective
            const newObjective = await tx.objective.create({
              data: {
                title: objectiveTitle,
                description: `Strategic objective imported from performance contract`,
                goalId: goalId
              }
            })
            objectiveId = newObjective.id
            objectivesCreated++
            console.log('✨ Created new objective:', objectiveTitle)
          }

          // Process initiatives
          for (const initiative of objectiveEntry.initiatives) {
            const initiativeTitle = initiative['Strategic Initiative'].trim()
            console.log('🎯 Processing initiative:', initiativeTitle)

            // Check if initiative already exists
            const existingInitiative = await tx.initiative.findFirst({
              where: {
                title: initiativeTitle,
                objectiveId: objectiveId
              }
            })

            if (!existingInitiative) {
              // Parse weight percentage
              let weight = 0
              const weightStr = initiative['Weight (%)']?.replace('%', '').trim()
              if (weightStr) {
                weight = parseInt(weightStr) || 0
              }

              // Parse deadline
              let dueDate: Date | null = null
              if (initiative.Deadline) {
                try {
                  dueDate = new Date(initiative.Deadline)
                } catch (e) {
                  console.warn('⚠️ Could not parse deadline:', initiative.Deadline)
                }
              }

              // Create new initiative
              const newInitiative = await tx.initiative.create({
                data: {
                  title: initiativeTitle,
                  description: initiative.Actions || `Strategic initiative imported from performance contract`,
                  action: initiative.Actions || '',
                  measure: initiative.Measure || '',
                  target: initiative.Targets || '',
                  dueDate: dueDate,
                  status: 'NOT_STARTED',
                  percentComplete: 0,
                  objectiveId: objectiveId,
                  // Store metadata as JSON
                  quarterDates: {
                    weight: weight,
                    approvalStatus: initiative.ApprovalStatus || '',
                    supervisorEmail: initiative.SupervisorEmail || '',
                    createdBy: initiative['Created By'],
                    importedBy: importedBy,
                    importedAt: new Date().toISOString()
                  }
                }
              })
              initiativesCreated++
              console.log('✨ Created new initiative:', initiativeTitle)
              
              // Find user by name from "Created By" column
              const createdByName = initiative['Created By']?.trim()
              if (createdByName) {
                const user = await findUserByName(tx, createdByName)
                
                if (user) {
                  console.log('👤 Found user:', user.firstName, user.lastName, '(', user.email, ')')
                  
                  // Get supervisor from user's manager field (from AD)
                  const supervisorId = user.managerId || null
                  
                  if (supervisorId) {
                    console.log('👔 Supervisor assigned from AD manager field')
                  }
                  
                  // Check if performance agreement already exists for this user + initiative + action + period
                  // Check by action (not just initiative) - one strategic objective can have multiple actions
                  const actionText = initiative.Actions?.trim() || ''
                  const existingAgreement = await tx.performanceAgreement.findFirst({
                    where: {
                      userId: user.id,
                      initiativeId: newInitiative.id,
                      customAction: actionText || null,  // Check action for proper duplicate detection
                      performancePeriodId: activePeriod.id
                    }
                  })
                  
                  if (existingAgreement) {
                    console.log('📌 Performance agreement already exists for user:', user.email, '- skipping')
                  } else {
                    // Create performance agreement for this user
                    await tx.performanceAgreement.create({
                      data: {
                        title: initiativeTitle,
                        description: initiative.Actions || 'Imported from performance contract',
                        customAction: actionText || null,  // Store action for duplicate detection
                        kpi: initiative.Measure || '',
                        target: initiative.Targets || '',
                        weight: weight,
                        dueDate: dueDate || new Date(new Date().getFullYear() + 1, 2, 31),
                        userId: user.id,
                        supervisorId: supervisorId,
                        initiativeId: newInitiative.id,
                        performancePeriodId: activePeriod.id,
                        status: 'NOT_STARTED',
                        percentComplete: 0,
                        approvalStatus: supervisorId ? 'PENDING' : null,
                        isSystemGenerated: true
                      }
                    })
                    
                    agreementsCreated++
                    usersWithContracts.add(user.email)
                    console.log('✅ Created performance agreement for user:', user.email)
                  }
                } else {
                  console.warn('⚠️ User not found in database for name:', createdByName)
                  console.log('📝 This user may not have logged in yet. The initiative has been created and can be assigned later.')
                  missingUsers.add(createdByName)
                  
                  // Store the pending assignment information in the initiative's quarterDates JSON field
                  // This allows manual assignment later or automatic assignment when the user logs in
                  await tx.initiative.update({
                    where: { id: newInitiative.id },
                    data: {
                      quarterDates: {
                        ...newInitiative.quarterDates as any,
                        pendingAssignment: {
                          userName: createdByName,
                          weight: weight,
                          actions: initiative.Actions || '',
                          measure: initiative.Measure || '',
                          target: initiative.Targets || '',
                          status: 'PENDING_USER_LOGIN'
                        }
                      }
                    }
                  })
                  console.log('💾 Stored pending assignment for:', createdByName)
                }
              }
            } else {
              console.log('📌 Initiative already exists:', initiativeTitle)
              
              // Even if initiative exists, check if user needs a performance agreement
              const createdByName = initiative['Created By']?.trim()
              if (createdByName) {
                const user = await findUserByName(tx, createdByName)
                
                if (user) {
                  // Check if performance agreement already exists by action (not just initiative)
                  // One strategic objective can have multiple actions with different goals
                  const actionText = initiative.Actions?.trim() || null
                  const existingAgreement = await tx.performanceAgreement.findFirst({
                    where: {
                      userId: user.id,
                      initiativeId: existingInitiative.id,
                      customAction: actionText,  // Check action for proper duplicate detection
                      performancePeriodId: activePeriod.id
                    }
                  })
                  
                  if (!existingAgreement) {
                    // Parse weight
                    let weight = 0
                    const weightStr = initiative['Weight (%)']?.replace('%', '').trim()
                    if (weightStr) {
                      weight = parseInt(weightStr) || 0
                    }
                    
                    // Parse deadline
                    let dueDate: Date | null = null
                    if (initiative.Deadline) {
                      try {
                        dueDate = new Date(initiative.Deadline)
                      } catch (e) {}
                    }
                    
                    const supervisorId = user.managerId || null
                    
                    await tx.performanceAgreement.create({
                      data: {
                        title: initiativeTitle,
                        description: initiative.Actions || 'Imported from performance contract',
                        customAction: actionText,  // Store action for duplicate detection
                        kpi: initiative.Measure || '',
                        target: initiative.Targets || '',
                        weight: weight,
                        dueDate: dueDate || new Date(new Date().getFullYear() + 1, 2, 31),
                        userId: user.id,
                        supervisorId: supervisorId,
                        initiativeId: existingInitiative.id,
                        performancePeriodId: activePeriod.id,
                        status: 'NOT_STARTED',
                        percentComplete: 0,
                        approvalStatus: supervisorId ? 'PENDING' : null,
                        isSystemGenerated: true
                      }
                    })
                    
                    agreementsCreated++
                    usersWithContracts.add(user.email)
                    console.log('✅ Created performance agreement for existing initiative, user:', user.email)
                  } else {
                    console.log('📌 Performance agreement already exists for user:', user.email)
                  }
                }
              }
            }
          }
        }
      }
    }, {
      maxWait: 60000, // Maximum time to wait to start transaction (60 seconds)
      timeout: 60000, // Maximum time transaction can run (60 seconds)
    })

    console.log('✅ Import completed successfully!')
    console.log('📊 Summary:')
    console.log('  - Goals created:', goalsCreated)
    console.log('  - Objectives created:', objectivesCreated)
    console.log('  - Initiatives created:', initiativesCreated)
    console.log('  - Performance agreements created:', agreementsCreated)
    console.log('  - Users with contracts:', usersWithContracts.size)
    console.log('  - Users not yet in system:', missingUsers.size)
    
    if (missingUsers.size > 0) {
      console.log('📝 Note: Users not found in the database may not have logged in yet.')
      console.log('   Their initiatives have been created with pending assignments.')
      console.log('   Performance agreements will be created automatically when they log in,')
      console.log('   or they can be manually assigned by an administrator.')
    }
    
    // Create audit log for the import
    try {
      await createPmsAuditLog({
        action: 'CREATE',
        entityType: 'PerformanceContract',
        entityId: 'bulk-import',
        userId: authUser.id,
        afterData: {
          imported: data.length,
          goalsCreated,
          objectivesCreated,
          initiativesCreated,
          agreementsCreated,
          usersWithContracts: usersWithContracts.size,
          missingUsers: Array.from(missingUsers)
        },
        reason: 'Bulk import of performance contracts',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
      goalsCreated,
      objectivesCreated,
      initiativesCreated,
      agreementsCreated,
      usersWithContracts: usersWithContracts.size,
      missingUsers: Array.from(missingUsers),
      performanceYear
    })

  } catch (error: any) {
    console.error('❌ Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import performance contracts: ' + error.message },
      { status: 500 }
    )
  }
}
