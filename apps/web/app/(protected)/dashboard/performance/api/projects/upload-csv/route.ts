import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { parse } from 'csv-parse/sync'
import { getAuthenticatedUser } from '@/lib/server-auth'


// POST /api/projects/upload-csv - Upload and process CSV file for bulk project creation
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json({ error: 'File must be a CSV file' }, { status: 400 })
    }

    // Read file content
    const csvContent = await file.text()

    // Parse CSV
    let records: any[]
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    } catch (error) {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    // Validate CSV headers and data
    const validationResult = await validateCsvData(records, user.id)

    if (!validationResult.valid) {
      return NextResponse.json({
        error: 'CSV validation failed',
        details: validationResult.errors
      }, { status: 400 })
    }

    // Process valid records
    const results = await processCsvRecords(validationResult.validRecords, user.id)

    return NextResponse.json({
      message: `Successfully processed ${results.successful} projects`,
      results: {
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
        projects: results.projects
      }
    })

  } catch (error) {
    console.error('Error processing CSV upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validate CSV data and return validation results
async function validateCsvData(records: any[], userId: string) {
  const errors: string[] = []
  const validRecords: any[] = []

  // Required columns
  const requiredColumns = [
    'title',
    'description',
    'status',
    'priority',
    'planned_start_date',
    'planned_end_date',
    'budget',
    'currency',
    'department_name',
    'division_name'
  ]

  // Check if first record has required columns
  const firstRecord = records[0]
  const missingColumns = requiredColumns.filter(col => !(col in firstRecord))

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
    return { valid: false, errors, validRecords: [] }
  }

  // Get valid departments and divisions for validation
  const departments = await prisma.department.findMany({
    include: { divisions: true }
  })

  const departmentMap = new Map()
  const divisionMap = new Map()

  departments.forEach(dept => {
    departmentMap.set(dept.name.toLowerCase(), dept)
    dept.divisions.forEach(div => {
      divisionMap.set(`${dept.name.toLowerCase()}:${div.name.toLowerCase()}`, div)
    })
  })

  // Get valid users for team members
  const users = await prisma.user.findMany({
    where: { isApproved: true },
    select: { id: true, firstName: true, lastName: true, email: true }
  })

  const userMap = new Map()
  users.forEach(user => {
    userMap.set(user.email?.toLowerCase(), user)
    userMap.set(user.name?.toLowerCase(), user)
  })

  // Validate each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const rowNumber = i + 2 // +2 because CSV has header row and we're 0-indexed

    try {
      // Validate title
      if (!record.title?.trim()) {
        errors.push(`Row ${rowNumber}: Title is required`)
        continue
      }

      // Validate status
      const validStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
      if (!validStatuses.includes(record.status?.toUpperCase())) {
        errors.push(`Row ${rowNumber}: Invalid status '${record.status}'. Must be one of: ${validStatuses.join(', ')}`)
        continue
      }

      // Validate priority
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      if (!validPriorities.includes(record.priority?.toUpperCase())) {
        errors.push(`Row ${rowNumber}: Invalid priority '${record.priority}'. Must be one of: ${validPriorities.join(', ')}`)
        continue
      }

      // Validate dates
      let plannedStartDate = null
      let plannedEndDate = null

      if (record.planned_start_date) {
        plannedStartDate = new Date(record.planned_start_date)
        if (isNaN(plannedStartDate.getTime())) {
          errors.push(`Row ${rowNumber}: Invalid planned start date format`)
          continue
        }
      }

      if (record.planned_end_date) {
        plannedEndDate = new Date(record.planned_end_date)
        if (isNaN(plannedEndDate.getTime())) {
          errors.push(`Row ${rowNumber}: Invalid planned end date format`)
          continue
        }
      }

      if (plannedStartDate && plannedEndDate && plannedStartDate >= plannedEndDate) {
        errors.push(`Row ${rowNumber}: Planned end date must be after planned start date`)
        continue
      }

      // Validate budget
      let budget = null
      if (record.budget) {
        budget = parseFloat(record.budget)
        if (isNaN(budget) || budget < 0) {
          errors.push(`Row ${rowNumber}: Invalid budget. Must be a positive number`)
          continue
        }
      }

      // Validate currency
      const validCurrencies = ['NAD', 'USD', 'EUR', 'GBP', 'ZAR']
      if (record.currency && !validCurrencies.includes(record.currency.toUpperCase())) {
        errors.push(`Row ${rowNumber}: Invalid currency '${record.currency}'. Must be one of: ${validCurrencies.join(', ')}`)
        continue
      }

      // Validate department and division
      let departmentId = null
      let divisionId = null

      if (record.department_name?.trim()) {
        const deptKey = record.department_name.trim().toLowerCase()
        const department = departmentMap.get(deptKey)

        if (!department) {
          errors.push(`Row ${rowNumber}: Department '${record.department_name}' not found`)
          continue
        }

        departmentId = department.id

        if (record.division_name?.trim()) {
          const divKey = `${deptKey}:${record.division_name.trim().toLowerCase()}`
          const division = divisionMap.get(divKey)

          if (!division) {
            errors.push(`Row ${rowNumber}: Division '${record.division_name}' not found in department '${record.department_name}'`)
            continue
          }

          divisionId = division.id
        }
      }

      // Parse team members
      const teamMemberIds: string[] = []
      if (record.team_members?.trim()) {
        const memberEmails = record.team_members.split(',').map((email: string) => email.trim().toLowerCase())
        for (const email of memberEmails) {
          const user = userMap.get(email)
          if (!user) {
            errors.push(`Row ${rowNumber}: Team member '${email}' not found`)
            continue
          }
          if (!teamMemberIds.includes(user.id)) {
            teamMemberIds.push(user.id)
          }
        }
      }

      // Parse tasks
      const tasks: any[] = []
      if (record.tasks?.trim()) {
        const taskTitles = record.tasks.split(';').map((title: string) => title.trim())
        for (const title of taskTitles) {
          if (title) {
            tasks.push({
              title,
              status: 'NOT_STARTED',
              priority: record.priority?.toUpperCase() || 'MEDIUM'
            })
          }
        }
      }

      // If we got here, the record is valid
      validRecords.push({
        title: record.title.trim(),
        description: record.description?.trim() || null,
        status: record.status.toUpperCase(),
        priority: record.priority.toUpperCase(),
        plannedStartDate,
        plannedEndDate,
        budget,
        currency: record.currency?.toUpperCase() || 'NAD',
        departmentId,
        divisionId,
        teamMemberIds,
        tasks
      })

    } catch (error) {
      errors.push(`Row ${rowNumber}: Unexpected error processing record - ${error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validRecords
  }
}

// Process valid CSV records and create projects
async function processCsvRecords(records: any[], userId: string) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
    projects: [] as any[]
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]

    try {
      const project = await prisma.project.create({
        data: {
          title: record.title,
          description: record.description,
          status: record.status,
          priority: record.priority,
          plannedStartDate: record.plannedStartDate,
          plannedEndDate: record.plannedEndDate,
          budget: record.budget,
          currency: record.currency,
          departmentId: record.departmentId,
          divisionId: record.divisionId,
          ownerId: userId,
          createdById: userId,
          // Add team members
          teamMembers: {
            create: record.teamMemberIds.map((memberId: string) => ({
              userId: memberId
            }))
          },
          // Add tasks
          tasks: {
            create: record.tasks
          }
        },
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          department: {
            select: { id: true, firstName: true, lastName: true }
          },
          division: {
            select: { id: true, name: true }
          },
          teamMembers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          _count: {
            select: {
              tasks: true,
              risks: true,
              issues: true,
              documents: true
            }
          }
        }
      })

      results.successful++
      results.projects.push(project)

    } catch (error) {
      results.failed++
      results.errors.push(`Failed to create project "${record.title}": ${error}`)
    }
  }

  return results
}
