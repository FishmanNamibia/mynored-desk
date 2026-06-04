import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { getCurrentPerformanceCycle } from '@/lib/pms/performance-cycle'
import { v4 as uuidv4 } from 'uuid'

interface AgreementRow {
  'Goal number': string
  'Goal name': string
  'Strategic Objective': string
  'Strategic Initiative': string
  'Actions': string
  'Measure': string
  'Targets': string
  'Weight (%)': string
  'ApprovalStatus': string
  'SupervisorEmail': string
  'Created By': string
  'Deadline': string
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
    
    const { data } = await request.json()
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data array is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting self-import of', data.length, 'performance agreements for user:', authUser.email)

    // Resolve actual DB user ID by email (insensitive) — session ID may differ from DB ID.
    // orderBy desc = newest (main) account wins — deterministic when duplicates exist.
    let actualUserId = authUser.id
    if (authUser.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: authUser.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })
      if (dbUser) actualUserId = dbUser.id
    }
    console.log('🔑 Resolved DB userId:', actualUserId)

    // Get active performance period - REQUIRED
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (!activePeriod) {
      return NextResponse.json(
        { 
          error: 'No active performance period found. Please contact HR to activate a performance period.',
          code: 'NO_ACTIVE_PERIOD'
        },
        { status: 400 }
      )
    }

    console.log('📅 Using active performance period:', activePeriod.name)

    // Validate total weight across all rows must not exceed 100%
    const totalImportWeight = data.reduce((sum: number, row: AgreementRow) => {
      const w = parseInt((row['Weight (%)']?.toString() || '0').replace('%', '').trim()) || 0
      return sum + w
    }, 0)
    if (totalImportWeight > 100) {
      return NextResponse.json({
        error: `Total weight of all rows is ${totalImportWeight}%, which exceeds 100%. Please correct your weights so they sum to 100% or less and re-import.`,
        code: 'WEIGHT_EXCEEDS_100',
        totalWeight: totalImportWeight
      }, { status: 400 })
    }
    console.log(`✅ Weight total validated: ${totalImportWeight}%`)

    const performanceYear = getCurrentPerformanceCycle()

    // Get user's supervisor from their manager field
    const userWithManager = await prisma.user.findUnique({
      where: { id: actualUserId },
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

    const supervisorId = userWithManager?.manager?.id || null
    if (supervisorId) {
      console.log('👔 Supervisor:', userWithManager?.manager?.firstName, userWithManager?.manager?.lastName)
    } else {
      console.log('⚠️ No supervisor assigned to user')
    }

    let goalsCreated = 0
    let objectivesCreated = 0
    let initiativesCreated = 0
    let agreementsCreated = 0
    let duplicatesSkipped = 0
    let rowsWithEmptyInitiative = 0
    let zeroWeightSkipped = 0
    const skippedDuplicates: { title: string; action: string }[] = []
    const errors: { row: number; error: string }[] = []

    // Process each row within a transaction
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const rowNumber = i + 1
        
        try {
          const goalNumber = row['Goal number']?.toString().trim()
          // Handle both "Goal" and "Goal name" column names
          const goalName = (row['Goal name'] || row['Goal'])?.trim()
          const objectiveTitle = (row['Strategic Objective'] || row['Strategic objective'])?.trim()
          const initiativeTitle = (row['Strategic Initiative'] || row['Strategic initiative'] || row['Initiative'])?.trim()
          
          // Instead of skipping, use a fallback title
          const effectiveTitle = initiativeTitle || row.Actions?.trim() || `Agreement ${rowNumber}`
          
          if (!initiativeTitle) {
            console.warn(`⚠️ Row ${rowNumber}: No Strategic Initiative, using fallback: "${effectiveTitle}"`)
            rowsWithEmptyInitiative++
          }
        
        console.log('📝 Processing row:', { goalNumber, goalName, objectiveTitle, initiativeTitle })

        // Parse weight
        let weight = 0
        const weightStr = row['Weight (%)']?.toString().replace('%', '').trim()
        if (weightStr) {
          weight = parseInt(weightStr) || 0
        }

        // Skip rows with no weight or zero weight — they add no value and bloat the DB
        if (!weightStr || weight <= 0) {
          console.warn(`⚠️ Row ${rowNumber}: Skipping — weight is empty or 0%. Action: "${row.Actions?.trim()?.substring(0, 50) || 'N/A'}"`)
          zeroWeightSkipped++
          continue
        }

        // Parse deadline - handle various date formats
        let dueDate: Date | null = null
        if (row.Deadline) {
          try {
            const deadlineStr = row.Deadline.toString().trim()
            // Handle M/D/YYYY format
            if (deadlineStr.includes('/')) {
              const parts = deadlineStr.split('/')
              if (parts.length === 3) {
                const month = parseInt(parts[0]) - 1
                const day = parseInt(parts[1])
                const year = parseInt(parts[2])
                dueDate = new Date(year, month, day)
              }
            } else {
              dueDate = new Date(deadlineStr)
            }
            if (isNaN(dueDate.getTime())) {
              dueDate = null
            }
          } catch (e) {
            console.warn('⚠️ Could not parse deadline:', row.Deadline)
          }
        }

        // Find or create Goal - use goalNumber as primary key to prevent duplicates
        let goalId: string | null = null
        const formattedGoalNumber = goalNumber ? `GOAL-${goalNumber}` : null
        
        if (goalName || formattedGoalNumber) {
          // First try to find by goal number (more reliable for preventing duplicates)
          let existingGoal = formattedGoalNumber 
            ? await tx.goal.findFirst({
                where: {
                  goalNumber: formattedGoalNumber,
                  performanceYear: performanceYear
                }
              })
            : null
          
          // If not found by number, try by title
          if (!existingGoal && goalName) {
            existingGoal = await tx.goal.findFirst({
              where: {
                title: goalName,
                performanceYear: performanceYear
              }
            })
          }

          if (existingGoal) {
            goalId = existingGoal.id
            console.log('📌 Using existing goal:', existingGoal.goalNumber, existingGoal.title)
          } else if (goalName) {
            const newGoal = await tx.goal.create({
              data: {
                id: uuidv4(),
                goalNumber: formattedGoalNumber || `GOAL-${goalsCreated + 1}`,
                title: goalName,
                description: `Strategic goal for ${performanceYear}`,
                startDate: new Date(activePeriod.startDate),
                endDate: new Date(activePeriod.endDate),
                performanceYear: performanceYear,
                bscPerspective: 'Strategic',
                updatedAt: new Date()
              }
            })
            goalId = newGoal.id
            goalsCreated++
            console.log('✨ Created goal:', newGoal.goalNumber, goalName)
          }
        }

        // Find or create Objective
        let objectiveId: string | null = null
        if (objectiveTitle && goalId) {
          let existingObjective = await tx.objective.findFirst({
            where: {
              title: objectiveTitle,
              goalId: goalId
            }
          })

          if (existingObjective) {
            objectiveId = existingObjective.id
          } else {
            const newObjective = await tx.objective.create({
              data: {
                id: uuidv4(),
                title: objectiveTitle,
                description: `Strategic objective for ${performanceYear}`,
                goalId: goalId,
                updatedAt: new Date()
              }
            })
            objectiveId = newObjective.id
            objectivesCreated++
            console.log('✨ Created objective:', objectiveTitle)
          }
        }

        // Find or create Initiative
        let initiativeId: string | null = null
        if (initiativeTitle && objectiveId) {
          let existingInitiative = await tx.initiative.findFirst({
            where: {
              title: initiativeTitle,
              objectiveId: objectiveId
            }
          })

          if (existingInitiative) {
            initiativeId = existingInitiative.id
          } else {
            const newInitiative = await tx.initiative.create({
              data: {
                id: uuidv4(),
                title: initiativeTitle,
                description: row.Actions || `Strategic initiative for ${performanceYear}`,
                action: row.Actions || '',
                measure: row.Measure || '',
                target: row.Targets || '',
                dueDate: dueDate ?? undefined,
                status: 'NOT_STARTED',
                percentComplete: 0,
                objectiveId: objectiveId,
                updatedAt: new Date(),
                quarterDates: {
                  weight: weight,
                  approvalStatus: row.ApprovalStatus || '',
                  supervisorEmail: row.SupervisorEmail || '',
                  createdBy: row['Created By'] || authUser.email,
                  importedAt: new Date().toISOString()
                }
              }
            })
            initiativeId = newInitiative.id
            initiativesCreated++
            console.log('✨ Created initiative:', initiativeTitle)
          }
        }

          // Get action text first for duplicate check
          const actionText = row.Actions?.trim() || row['Action']?.trim() || ''
          
          // Check for duplicate agreement - only skip if EXACT match of title AND action
          // This is more lenient to avoid false positives
          const existingAgreement = await tx.performanceAgreement.findFirst({
            where: {
              title: effectiveTitle,
              customAction: actionText,
              userId: actualUserId,
              performancePeriodId: activePeriod.id
            }
          })

          if (existingAgreement) {
            console.log(`📌 Row ${rowNumber}: Agreement already exists: "${effectiveTitle}" with action: "${actionText.substring(0, 30)}" - skipping`)
            duplicatesSkipped++
            skippedDuplicates.push({
              title: effectiveTitle.substring(0, 60),
              action: actionText.substring(0, 40) || 'No action'
            })
            continue
          }

        // Parse ApprovalStatus from CSV
        // NOTE: 'REJECTED' is intentionally NOT imported — REJECTED can only be set by a supervisor action.
        // Importing 'Rejected' from CSV would incorrectly flag the employee's own agreements as rejected.
        const csvApprovalStatus = row['ApprovalStatus']?.toString().trim().toUpperCase() || ''
        let approvalStatus: string | null = null
        
        // Map CSV approval status to database enum (REJECTED is excluded — supervisor-only)
        if (csvApprovalStatus === 'APPROVED' || csvApprovalStatus.includes('APPROVED')) {
          approvalStatus = 'APPROVED'
        } else if (csvApprovalStatus === 'PENDING' || csvApprovalStatus.includes('PENDING')) {
          approvalStatus = 'PENDING'
        }
        // REJECTED from CSV is treated as null (not yet submitted) — only supervisors can reject
        
          console.log('📋 Approval status from CSV:', csvApprovalStatus, '-> Database:', approvalStatus)

          // Create new performance agreement
          await tx.performanceAgreement.create({
            data: {
              id: uuidv4(),
              title: effectiveTitle,
              description: actionText,
              customAction: actionText, // Store action in customAction field for display
              kpi: row.Measure || '',
              target: row.Targets || '',
              weight: weight,
              dueDate: dueDate || new Date(activePeriod.endDate),
              userId: actualUserId,
              supervisorId: supervisorId,
              initiativeId: initiativeId,
              performancePeriodId: activePeriod.id,
              status: 'NOT_STARTED',
              percentComplete: 0,
              approvalStatus: approvalStatus,
              isSystemGenerated: false,
              updatedAt: new Date()
            }
          })

          agreementsCreated++
          console.log(`✅ Row ${rowNumber}: Created agreement: "${effectiveTitle}"`)
        } catch (rowError: any) {
          console.error(`❌ Row ${rowNumber}: Failed to process:`, rowError.message)
          errors.push({
            row: rowNumber,
            error: rowError.message
          })
        }
      }
    }, {
      maxWait: 60000,
      timeout: 60000
    })

    console.log('✅ Self-import completed!')
    console.log('📊 Summary:')
    console.log('  - Goals created:', goalsCreated)
    console.log('  - Objectives created:', objectivesCreated)
    console.log('  - Initiatives created:', initiativesCreated)
    console.log('  - Agreements created:', agreementsCreated)
    console.log('  - Duplicates skipped:', duplicatesSkipped)
    console.log('  - Zero/empty weight skipped:', zeroWeightSkipped)
    console.log('  - Rows with errors:', errors.length)
    console.log('  - Rows with empty initiative:', rowsWithEmptyInitiative)

    return NextResponse.json({
      success: true,
      goalsCreated,
      objectivesCreated,
      initiativesCreated,
      agreementsCreated,
      duplicatesSkipped,
      zeroWeightSkipped,
      rowsWithEmptyInitiative,
      errors: errors.slice(0, 10), // Return first 10 errors for display
      skippedDuplicates: skippedDuplicates.slice(0, 10), // Return first 10 skipped for display
      total: data.length,
      performancePeriod: activePeriod.name
    })

  } catch (error: any) {
    console.error('❌ Self-import error:', error)
    return NextResponse.json(
      { error: 'Failed to import performance agreements: ' + error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to download template
export async function GET() {
  const template = [
    {
      'Goal number': '5',
      'Goal': 'STRENGTHEN ORGANISATIONAL CAPACITY',
      'Strategic Objective': 'SO 1.15 – Improve compliance',
      'Strategic Initiative': '1.15.3 Enforce compliance',
      'Actions': 'Adhere to and comply with regulations',
      'Measure': 'Percentage compliance',
      'Targets': 'Zero non compliance',
      'Weight (%)': '2%',
      'ApprovalStatus': 'Approved',
      'Created By': 'Employee Name',
      'Deadline': '3/31/2026'
    },
    {
      'Goal number': '3',
      'Goal': 'REALISE SUSTAINABLE GROWTH',
      'Strategic Objective': 'SO 1.11 – Increase revenue',
      'Strategic Initiative': '1.11.3 Establish a business case',
      'Actions': 'Align data monetisation strategy',
      'Measure': 'Established and implemented',
      'Targets': '1',
      'Weight (%)': '5%',
      'ApprovalStatus': 'Approved',
      'Created By': 'Employee Name',
      'Deadline': '3/31/2026'
    }
  ]

  // Convert to CSV
  const headers = [
    'Goal number',
    'Goal', 
    'Strategic Objective',
    'Strategic Initiative',
    'Actions',
    'Measure',
    'Targets',
    'Weight (%)',
    'ApprovalStatus',
    'Created By',
    'Deadline'
  ]
  const csvRows = [
    headers.join(','),
    ...template.map(row => 
      headers.map(h => `"${(row as any)[h]?.toString().replace(/"/g, '""') || ''}"`)
        .join(',')
    )
  ]
  const csvContent = csvRows.join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="performance_agreement_template.csv"'
    }
  })
}
