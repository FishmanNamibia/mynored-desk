import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

interface ImportRow {
  [key: string]: any // Allow any column name for flexibility
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface UserMatch {
  id: string
  name: string
  email: string
}

// No department mapping - accept Excel content as-is
// This allows the system to be flexible and not require hard-coded department names

// Helper function to clean department/responsibility names - no mapping, just trimming
function parseDepartmentAcronym(acronym: string): string {
  // Simply return the trimmed value without any transformation
  return acronym.trim()
}

// Helper to normalize goal numbers: strip prefixes like "GOAL-" and return just the number
// e.g. "GOAL-2" → "2", "GOAL-6" → "6", "1" → "1"
function normalizeGoalNumber(goalNumber: string): string {
  const trimmed = goalNumber.trim()
  // Remove common prefixes: GOAL-, Goal-, goal-
  const stripped = trimmed.replace(/^GOAL[\s\-_]*:?\s*/i, '')
  return stripped.trim()
}

// Helper to extract fiscal year dates
function getFiscalYearDates() {
  const currentYear = new Date().getFullYear()
  // Assuming April - March fiscal year
  return {
    startDate: new Date(`${currentYear}-04-01`),
    endDate: new Date(`${currentYear + 1}-03-31`)
  }
}

// Helper to find users by responsibility string
async function findUsersByResponsibility(responsibilityStr: string): Promise<string[]> {
  if (!responsibilityStr || !responsibilityStr.trim()) {
    return []
  }

  const trimmed = responsibilityStr.trim()
  
  // Handle "All" - return all active users
  if (trimmed.toLowerCase() === 'all') {
    const allUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: { id: true }
    })
    return allUsers.map(u => u.id)
  }

  // Split by comma for multiple responsibilities
  const responsibilities = trimmed.split(',').map(r => r.trim()).filter(r => r.length > 0)
  
  const userIds = new Set<string>()

  for (const resp of responsibilities) {
    // Search users in departments (case-insensitive partial match on departmentName)
    const usersInDepartment = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        departmentName: { contains: resp, mode: 'insensitive' }
      },
      select: { id: true }
    })
    usersInDepartment.forEach(user => userIds.add(user.id))

    // Also search users by divisionName (workaround for missing Division model)
    const usersInDivision = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        divisionName: { contains: resp, mode: 'insensitive' }
      },
      select: { id: true }
    })
    usersInDivision.forEach(user => userIds.add(user.id))

    // Also search by department relation
    const departments = await prisma.department.findMany({
      where: {
        name: { contains: resp, mode: 'insensitive' }
      },
      include: {
        users: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    })
    departments.forEach(dept => {
      dept.users.forEach(user => userIds.add(user.id))
    })
  }

  return Array.from(userIds)
}

// Helper to find executive-level users whose department matches a responsibility string.
// Responsibility strings look like "Exec: IT&DP", "Exec: HC", "Exec: ES, Exec: DSS, Exec: GIS/NSDI", or "All".
// This function extracts the department acronym/name after "Exec:" and matches it against
// the user's departmentName, department.name, or department.code.
async function findExecutivesByResponsibility(
  responsibilityStr: string
): Promise<Array<{ id: string; managerId: string | null }>> {
  if (!responsibilityStr || !responsibilityStr.trim()) {
    return []
  }

  const trimmed = responsibilityStr.trim()

  // Handle "All" — return all active executives (users whose jobTitle contains 'executive')
  if (trimmed.toLowerCase() === 'all') {
    const allExecs = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        jobTitle: { contains: 'executive', mode: 'insensitive' }
      },
      select: { id: true, managerId: true }
    })
    return allExecs
  }

  // Split by comma for multiple responsibilities
  const parts = trimmed.split(',').map(r => r.trim()).filter(r => r.length > 0)
  const results = new Map<string, { id: string; managerId: string | null }>()

  // Check if any part is "All" — if so, return all executives
  if (parts.some(p => p.toLowerCase() === 'all')) {
    const allExecs = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        jobTitle: { contains: 'executive', mode: 'insensitive' }
      },
      select: { id: true, managerId: true }
    })
    return allExecs
  }

  for (const part of parts) {
    // Extract the department identifier after "Exec:" if present
    // e.g. "Exec: IT&DP" → "IT&DP", "Exec: HC" → "HC", "DSG" → "DSG"
    let deptSearch = part
    const execMatch = part.match(/^Exec\s*:\s*(.+)$/i)
    if (execMatch) {
      deptSearch = execMatch[1].trim()
    }

    if (!deptSearch) continue

    // Strategy 1: Match by user's departmentName field (case-insensitive partial match)
    const usersByDeptName = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        jobTitle: { contains: 'executive', mode: 'insensitive' },
        departmentName: { contains: deptSearch, mode: 'insensitive' }
      },
      select: { id: true, managerId: true }
    })
    usersByDeptName.forEach(u => results.set(u.id, u))

    // Strategy 2: Match by Department relation name or code
    const departments = await prisma.department.findMany({
      where: {
        OR: [
          { name: { contains: deptSearch, mode: 'insensitive' } },
          { code: { contains: deptSearch, mode: 'insensitive' } }
        ]
      },
      include: {
        users: {
          where: {
            status: 'ACTIVE',
            jobTitle: { contains: 'executive', mode: 'insensitive' }
          },
          select: { id: true, managerId: true }
        }
      }
    })
    departments.forEach(dept => {
      dept.users.forEach(u => results.set(u.id, u))
    })

    // Strategy 3: Match by user's divisionName field
    const usersByDivision = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        jobTitle: { contains: 'executive', mode: 'insensitive' },
        divisionName: { contains: deptSearch, mode: 'insensitive' }
      },
      select: { id: true, managerId: true }
    })
    usersByDivision.forEach(u => results.set(u.id, u))
  }

  return Array.from(results.values())
}

// Auto-assign performance agreements to executives based on initiative responsibility fields
async function autoAssignInitiativeToExecutives(
  initiative: { id: string; title: string; description: string | null; measure: string | null; action: string | null; target: string | null; dueDate: Date | null; primaryResponsibility: string | null; secondaryResponsibility: string | null },
  performanceYear: string
): Promise<{ assigned: number; errors: string[] }> {
  const result = { assigned: 0, errors: [] as string[] }

  try {
    // Find executives matching primary responsibility
    const primaryExecs = await findExecutivesByResponsibility(initiative.primaryResponsibility || '')
    // Find executives matching secondary responsibility
    const secondaryExecs = await findExecutivesByResponsibility(initiative.secondaryResponsibility || '')

    // Combine and deduplicate
    const allExecs = new Map<string, { id: string; managerId: string | null }>()
    primaryExecs.forEach(e => allExecs.set(e.id, e))
    secondaryExecs.forEach(e => allExecs.set(e.id, e))

    if (allExecs.size === 0) {
      return result
    }

    const currentYear = new Date().getFullYear()
    const defaultDueDate = new Date(`${currentYear + 1}-03-31`)

    for (const [execId, exec] of allExecs) {
      try {
        // Check if agreement already exists for this user + initiative
        const existing = await prisma.performanceAgreement.findFirst({
          where: {
            userId: execId,
            initiativeId: initiative.id
          }
        })

        if (!existing) {
          await prisma.performanceAgreement.create({
            data: {
              title: initiative.title,
              description: initiative.description || initiative.action || 'From annual work plan',
              kpi: initiative.measure || null,
              target: initiative.target || null,
              customAction: initiative.action || null,
              dueDate: initiative.dueDate || defaultDueDate,
              userId: execId,
              supervisorId: exec.managerId || null,
              initiativeId: initiative.id,
              status: 'NOT_STARTED',
              percentComplete: 0,
              isSystemGenerated: true,
              weight: null, // Executive will set weights during confirmation
            }
          })
          result.assigned++
          console.log(`  ✅ Auto-assigned initiative "${initiative.title.substring(0, 40)}" to executive ${execId}`)
        }
      } catch (err: any) {
        result.errors.push(`Failed to assign initiative "${initiative.title}" to executive ${execId}: ${err.message}`)
      }
    }
  } catch (err: any) {
    result.errors.push(`Error in auto-assignment for initiative "${initiative.title}": ${err.message}`)
  }

  return result
}

// Helper function to normalize column names
function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Helper function to find column value with flexible matching
function getColumnValue(row: ImportRow, ...possibleNames: string[]): string {
  for (const name of possibleNames) {
    const normalized = normalizeColumnName(name)
    for (const key in row) {
      if (normalizeColumnName(key) === normalized) {
        return String(row[key] || '').trim()
      }
    }
  }
  return ''
}

// Helper to parse responsibility field (handles comma-separated values and "All")
function parseResponsibility(responsibilityStr: string): string {
  if (!responsibilityStr || !responsibilityStr.trim()) {
    return ''
  }

  const trimmed = responsibilityStr.trim()
  
  // Check if it's "All" (case-insensitive)
  if (trimmed.toLowerCase() === 'all') {
    return 'All'
  }

  // Split by comma, trim each part - no mapping
  const parts = trimmed.split(',').map(part => part.trim()).filter(part => part.length > 0)
  
  // Join back with comma and space - return as-is from Excel
  return parts.join(', ')
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission - Only Human Capital Executive can import annual workplan
    let isHCExecutive = false
    const jobTitle = (user.jobTitle || '').toLowerCase()
    const department = (user.department || '').toLowerCase()
    
    // Check job title and department for Human Capital Executive
    if (jobTitle.includes('executive')) {
      isHCExecutive = department.includes('human capital') || 
                     department.includes('human resources') || 
                     department.includes('hr')
    }
    
    // Also check database for department info
    if (!isHCExecutive) {
      const userWithDept = await prisma.user.findUnique({
        where: { id: user.id },
        include: { department: true }
      })
      
      if (userWithDept?.department?.name) {
        const deptName = userWithDept.department.name.toLowerCase()
        isHCExecutive = jobTitle.includes('executive') && (
          deptName.includes('human capital') || 
          deptName.includes('human resources') || 
          deptName.includes('hr')
        )
      }
    }
    
    // Check user roles array
    const userRoles = user.roles || []
    const isAdmin = userRoles.some((r: string) => r.toLowerCase().includes('admin'))
    const isSG = userRoles.some((r: string) => r.toLowerCase().includes('sg') || r.toLowerCase().includes('secretary'))
    
    if (!isHCExecutive && !isAdmin && !isSG) {
      return NextResponse.json({ 
        error: 'Unauthorized: Only the Human Capital Executive can import the annual workplan' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { data, performanceYear, performancePeriodId } = body as { data: ImportRow[], performanceYear: string, performancePeriodId?: string }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 })
    }

    if (!performanceYear || !performanceYear.trim()) {
      return NextResponse.json({ error: 'Performance year is required' }, { status: 400 })
    }

    if (!performancePeriodId || !performancePeriodId.trim()) {
      return NextResponse.json({ error: 'Performance period is required' }, { status: 400 })
    }

    // Validate and build data structure
    const errors: ValidationError[] = []
    const validatedData: Map<string, any> = new Map()

    data.forEach((row, index) => {
      const rowNum = index + 2 // +2 for header row and 0-indexing

      // Extract all fields using flexible column matching
      const goalNumber = normalizeGoalNumber(row.goalNumber || '')
      const goalTitle = row.goalTitle || ''
      const goalDescription = row.goalDescription || ''
      const goalStartDate = row.goalStartDate || ''
      const goalEndDate = row.goalEndDate || ''
      
      const objectiveTitle = row.objectiveTitle || ''
      const objectiveDescription = row.objectiveDescription || ''
      
      const initiativeNumber = row.initiativeNumber || ''
      const initiativeTitle = row.initiativeTitle || ''
      const initiativeDescription = row.initiativeDescription || ''
      const initiativeMeasure = row.initiativeMeasure || ''
      const initiativeAction = row.initiativeAction || ''
      const initiativeTarget = row.initiativeTarget || ''
      const initiativeDueDate = row.initiativeDueDate || null
      const initiativeReportingPeriod = row.initiativeReportingPeriod || 'Annual'
      
      // Quarterly targets
      const initiativeQ1 = row.initiativeQ1 || ''
      const initiativeQ2 = row.initiativeQ2 || ''
      const initiativeQ3 = row.initiativeQ3 || ''
      const initiativeQ4 = row.initiativeQ4 || ''
      
      const primaryResponsibility = row.initiativePrimaryResponsibility || ''
      const secondaryResponsibility = row.initiativeSecondaryResponsibility || ''
      const reportingTo = row.initiativeReportingTo || ''

      // BSC structure: Build hierarchy
      if (goalNumber) {
        const goalKey = goalNumber
        if (!validatedData.has(goalKey)) {
          validatedData.set(goalKey, {
            goalNumber: goalNumber,
            title: goalTitle || goalNumber,
            description: goalDescription || '',
            startDate: goalStartDate || '',
            endDate: goalEndDate || '',
            objectives: new Map()
          })
        }

        const goal = validatedData.get(goalKey)

        if (objectiveTitle) {
          const objKey = objectiveTitle
          if (!goal.objectives.has(objKey)) {
            goal.objectives.set(objKey, {
              title: objectiveTitle,
              description: objectiveDescription || '',
              initiatives: []
            })
          }

          const objective = goal.objectives.get(objKey)

          if (initiativeTitle) {
            objective.initiatives.push({
              number: initiativeNumber || '',
              title: initiativeTitle,
              description: initiativeDescription || '',
              measure: initiativeMeasure || '',
              action: initiativeAction || '',
              target: initiativeTarget || '',
              dueDate: initiativeDueDate || null,
              reportingPeriod: initiativeReportingPeriod || 'Annual',
              quarterlyTargets: {
                Q1: initiativeQ1 || '',
                Q2: initiativeQ2 || '',
                Q3: initiativeQ3 || '',
                Q4: initiativeQ4 || ''
              },
              primaryResponsibility: primaryResponsibility || '',
              secondaryResponsibility: secondaryResponsibility || '',
              reportingTo: reportingTo || ''
            })
          }
        }
      }
    })

    // Return validation errors if any
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        errors 
      }, { status: 400 })
    }

    // Import data into database
    const results = {
      goalsCreated: 0,
      objectivesCreated: 0,
      initiativesCreated: 0,
      executivesAssigned: 0,
      errors: [] as string[]
    }

    for (const [_, goalData] of validatedData) {
      try {
        // Check if goal already exists — also check for "GOAL-X" variant to merge duplicates
        const normalizedNum = normalizeGoalNumber(goalData.goalNumber)
        let existingGoal = await prisma.goal.findFirst({
          where: { goalNumber: normalizedNum }
        })
        // Also check for legacy "GOAL-X" format
        if (!existingGoal) {
          existingGoal = await prisma.goal.findFirst({
            where: { goalNumber: { in: [`GOAL-${normalizedNum}`, `Goal-${normalizedNum}`, `goal-${normalizedNum}`] } }
          })
          // If found with old format, update the goalNumber to the normalized version
          if (existingGoal) {
            await prisma.goal.update({
              where: { id: existingGoal.id },
              data: { goalNumber: normalizedNum }
            })
            console.log(`📝 Normalized goal number from "${existingGoal.goalNumber}" to "${normalizedNum}"`)
          }
        }

        let goal
        // Use fiscal year dates as default
        const fiscalYear = getFiscalYearDates()
        const startDate = goalData.startDate && goalData.startDate.trim() 
          ? new Date(goalData.startDate) 
          : fiscalYear.startDate
        const endDate = goalData.endDate && goalData.endDate.trim() 
          ? new Date(goalData.endDate) 
          : fiscalYear.endDate
        
        if (existingGoal) {
          // Update existing goal
          goal = await prisma.goal.update({
            where: { id: existingGoal.id },
            data: {
              title: goalData.title,
              description: goalData.description,
              startDate: startDate,
              endDate: endDate,
              performanceYear: performanceYear,
              bscPerspective: goalData.bscPerspective || null
            }
          })
          
          // Before deleting objectives/initiatives, disconnect any linked
          // performance agreements so they are NOT cascade-deleted.
          // This preserves every employee's imported agreements.
          const existingInitiativeIds = await prisma.initiative.findMany({
            where: { objective: { goalId: existingGoal.id } },
            select: { id: true }
          })
          if (existingInitiativeIds.length > 0) {
            await prisma.performanceAgreement.updateMany({
              where: { initiativeId: { in: existingInitiativeIds.map(i => i.id) } },
              data: { initiativeId: null }
            })
            console.log(`🔗 Disconnected ${existingInitiativeIds.length} initiative(s) from performance agreements before cleanup`)
          }

          // Now safe to delete objectives — cascade will only remove initiatives & targets,
          // not performance agreements (they've been disconnected above).
          await prisma.objective.deleteMany({
            where: { goalId: existingGoal.id }
          })
        } else {
          // Create new goal
          goal = await prisma.goal.create({
            data: {
              goalNumber: normalizedNum,
              title: goalData.title,
              description: goalData.description,
              startDate: startDate,
              endDate: endDate,
              performanceYear: performanceYear,
              bscPerspective: goalData.bscPerspective || null
            }
          })
          results.goalsCreated++
        }

        // Create objectives (fresh data, no duplicates)
        for (const [_, objectiveData] of goalData.objectives) {
          const objective = await prisma.objective.create({
            data: {
              title: objectiveData.title,
              description: objectiveData.description,
              goalId: goal.id
            }
          })
          results.objectivesCreated++

          // Create initiatives with quarterly milestones
          for (const initiativeData of objectiveData.initiatives) {
            // Determine reporting periods
            const reportingPeriods: string[] = []
            if (initiativeData.reportingPeriod?.toLowerCase().includes('annual')) {
              reportingPeriods.push('Annual')
            }
            if (initiativeData.quarterlyTargets?.Q1) reportingPeriods.push('Q1')
            if (initiativeData.quarterlyTargets?.Q2) reportingPeriods.push('Q2')
            if (initiativeData.quarterlyTargets?.Q3) reportingPeriods.push('Q3')
            if (initiativeData.quarterlyTargets?.Q4) reportingPeriods.push('Q4')
            
            // Store quarterly data
            const quarterDates = initiativeData.quarterlyTargets ? {
              Q1: initiativeData.quarterlyTargets.Q1,
              Q2: initiativeData.quarterlyTargets.Q2,
              Q3: initiativeData.quarterlyTargets.Q3,
              Q4: initiativeData.quarterlyTargets.Q4
            } : undefined

            // Parse and normalize responsibilities
            const parsedPrimary = parseResponsibility(initiativeData.primaryResponsibility)
            const parsedSecondary = parseResponsibility(initiativeData.secondaryResponsibility)
            
            const initiative = await prisma.initiative.create({
              data: {
                number: initiativeData.number,
                title: initiativeData.title,
                description: initiativeData.description,
                measure: initiativeData.measure,
                action: initiativeData.action,
                target: initiativeData.target,
                dueDate: initiativeData.dueDate ? new Date(initiativeData.dueDate) : null,
                status: 'NOT_STARTED',
                reportingPeriods: reportingPeriods.length > 0 ? reportingPeriods : ['Annual'],
                ...(quarterDates && { quarterDates: quarterDates }),
                primaryResponsibility: parsedPrimary,
                secondaryResponsibility: parsedSecondary,
                objectiveId: objective.id
              }
            })
            results.initiativesCreated++

            // Re-link any orphaned performance agreements (initiativeId = null)
            // back to this newly created initiative by matching on title.
            const relinked = await prisma.performanceAgreement.updateMany({
              where: {
                initiativeId: null,
                title: initiativeData.title
              },
              data: { initiativeId: initiative.id }
            })
            if (relinked.count > 0) {
              console.log(`🔗 Re-linked ${relinked.count} performance agreement(s) to initiative "${initiativeData.title.substring(0, 40)}"`)
            }

            // Auto-assign this initiative to executives whose department matches
            // the primaryResponsibility or secondaryResponsibility fields
            const assignResult = await autoAssignInitiativeToExecutives(
              initiative,
              performanceYear
            )
            results.executivesAssigned = (results.executivesAssigned || 0) + assignResult.assigned
            if (assignResult.errors.length > 0) {
              results.errors.push(...assignResult.errors)
            }
          }
        }
      } catch (error: any) {
        console.error('Error importing goal:', error)
        results.errors.push(`Failed to import goal ${goalData.goalNumber}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.executivesAssigned} performance agreement(s) auto-assigned to executives.`,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Failed to import data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
