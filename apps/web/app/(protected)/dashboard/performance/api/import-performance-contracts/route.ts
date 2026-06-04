import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

// Helper to parse CSV content
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const records: Record<string, string>[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const record: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || ''
    })
    
    records.push(record)
  }
  
  return records
}

// Helper to parse date strings (handles various formats)
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr === '') {
    return new Date() // Default to today if no date
  }
  
  // Try parsing MM/DD/YYYY or M/D/YYYY format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1 // Month is 0-indexed
    const day = parseInt(parts[1])
    const year = parseInt(parts[2])
    return new Date(year, month, day)
  }
  
  // Fallback to default parsing
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

// Helper to parse weight percentage
function parseWeight(weightStr: string): number {
  const match = weightStr.match(/(\d+)%?/)
  return match ? parseInt(match[1]) : 0
}

export async function POST(request: NextRequest) {
  try {
    const { user, setCookieHeaders } = await getAuthenticatedUser(request)
    
    // Debug logging
    console.log('[IMPORT] Auth user:', JSON.stringify(user, null, 2))
    console.log('[IMPORT] User roles:', user?.roles)
    console.log('[IMPORT] User jobTitle:', user?.jobTitle)
    
    if (!user) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    // Check for executive role - include Human Capital Executive and similar variants
    const hasRequiredRole = userHasAnyRole(user, ['ADMIN', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'HC_EXECUTIVE'])
    
    // Also check jobTitle for executive positions (fallback for users without proper role assignments)
    const hasExecutiveJobTitle = user.jobTitle && (
      user.jobTitle.toLowerCase().includes('executive') ||
      user.jobTitle.toLowerCase().includes('admin')
    )
    
    console.log('[IMPORT] hasRequiredRole:', hasRequiredRole)
    console.log('[IMPORT] hasExecutiveJobTitle:', hasExecutiveJobTitle)
    
    if (!hasRequiredRole && !hasExecutiveJobTitle) {
      console.log('[IMPORT] Role check FAILED for user:', user.email, 'with roles:', user.roles, 'and jobTitle:', user.jobTitle)
      const res = NextResponse.json(
        { error: 'Forbidden: Only admins and executives can import data' },
        { status: 403 },
      )
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }
    
    console.log('[IMPORT] Role check PASSED for user:', user.email)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const content = await file.text()
    const records = parseCSV(content)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      goals: new Set<string>(),
      objectives: new Set<string>(),
      initiatives: new Set<string>(),
      agreements: 0
    }

    // Get or create performance period
    const activePeriod = await prisma.performancePeriod.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    const performancePeriod = activePeriod || await prisma.performancePeriod.create({
      data: {
        name: '2025/2026 Performance Agreement Period',
        submissionDeadline: new Date('2026-06-30'),
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        isActive: true,
        createdById: user.id
      }
    })

    // Process each record
    for (const record of records) {
      try {
        const goalNumber = record['Goal number'] || ''
        const goalName = record['Goal name'] || 'Untitled Goal'
        const strategicObjective = record['Strategic Objective'] || 'General Objective'
        const strategicInitiative = record['Strategic Initiative'] || 'General Initiative'
        const actions = record['Actions'] || ''
        const measure = record['Measure'] || ''
        const targets = record['Targets'] || ''
        const weight = parseWeight(record['Weight (%)'] || '0')
        const approvalStatus = record['ApprovalStatus'] || 'PENDING'
        const supervisorEmail = record['SupervisorEmail'] || ''
        const createdBy = record['Created By'] || ''
        const deadline = parseDate(record['Deadline'])

        // Skip if missing critical data
        if (!goalNumber || !createdBy) {
          results.failed++
          results.errors.push(`Skipped record: Missing goal number or created by email`)
          continue
        }

        // Find or create the user (Created By)
        const userEmail = createdBy.trim().toLowerCase()
        let user = await prisma.user.findUnique({
          where: { email: userEmail }
        })

        if (!user) {
          // Log but skip - don't create users automatically
          results.failed++
          results.errors.push(`User not found: ${userEmail}`)
          continue
        }

        // Find supervisor if provided
        let supervisor = null
        if (supervisorEmail) {
          supervisor = await prisma.user.findUnique({
            where: { email: supervisorEmail.trim().toLowerCase() }
          })
        }

        // Find or create Goal
        let goal = await prisma.goal.findFirst({
          where: { goalNumber: goalNumber.trim() }
        })

        if (!goal) {
          goal = await prisma.goal.create({
            data: {
              goalNumber: goalNumber.trim(),
              title: goalName.trim(),
              description: goalName.trim(),
              startDate: new Date('2025-04-01'),
              endDate: new Date('2026-03-31'),
              performanceYear: '2025/26'
            }
          })
          results.goals.add(goal.id)
        }

        // Find or create Objective
        let objective = await prisma.objective.findFirst({
          where: {
            title: strategicObjective.trim(),
            goalId: goal.id
          }
        })

        if (!objective) {
          objective = await prisma.objective.create({
            data: {
              title: strategicObjective.trim(),
              description: strategicObjective.trim(),
              goalId: goal.id
            }
          })
          results.objectives.add(objective.id)
        }

        // Find or create Initiative
        let initiative = await prisma.initiative.findFirst({
          where: {
            title: strategicInitiative.trim(),
            objectiveId: objective.id
          }
        })

        if (!initiative) {
          initiative = await prisma.initiative.create({
            data: {
              title: strategicInitiative.trim(),
              description: strategicInitiative.trim(),
              measure: measure.trim(),
              action: actions.trim(),
              target: targets.trim(),
              dueDate: deadline,
              objectiveId: objective.id,
              status: 'NOT_STARTED'
            }
          })
          results.initiatives.add(initiative.id)
        }

        // Create Performance Agreement
        const existingAgreement = await prisma.performanceAgreement.findFirst({
          where: {
            userId: user.id,
            initiativeId: initiative.id
          }
        })

        if (!existingAgreement) {
          await prisma.performanceAgreement.create({
            data: {
              title: strategicInitiative.trim(),
              description: actions.trim(),
              kpi: measure.trim(),
              target: targets.trim(),
              weight: weight,
              dueDate: deadline,
              userId: user.id,
              supervisorId: supervisor?.id,
              initiativeId: initiative.id,
              performancePeriodId: performancePeriod.id,
              approvalStatus: approvalStatus === 'Approved' ? 'APPROVED' : 'PENDING',
              status: 'NOT_STARTED'
            }
          })
          results.agreements++
        }

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`Error processing record: ${error.message}`)
      }
    }

    const res = NextResponse.json({
      message: 'Import completed',
      results: {
        totalRecords: records.length,
        successful: results.success,
        failed: results.failed,
        goalsCreated: results.goals.size,
        objectivesCreated: results.objectives.size,
        initiativesCreated: results.initiatives.size,
        agreementsCreated: results.agreements,
        errors: results.errors.slice(0, 10) // Return first 10 errors
      }
    })

    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error: any) {
    console.error('[Import Error]:', error)
    return NextResponse.json(
      { error: 'Failed to import data', details: error.message },
      { status: 500 }
    )
  }
}
