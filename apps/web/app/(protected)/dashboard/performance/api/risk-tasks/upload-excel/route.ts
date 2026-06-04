import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { parse } from 'exceljs'
import * as ExcelJS from 'exceljs'

// Helper to calculate risk score based on likelihood and impact
function calculateRiskScore(likelihood: string, impactLevel: string): number {
  const likelihoodMap: { [key: string]: number } = {
    'UNLIKELY': 1,
    'POSSIBLE': 2,
    'PROBABLE': 3
  }
  
  const impactMap: { [key: string]: number } = {
    'MINOR': 1,
    'MODERATE': 2,
    'SIGNIFICANT': 3
  }
  
  const likelihoodScore = likelihoodMap[likelihood] || 2
  const impactScore = impactMap[impactLevel] || 2
  return likelihoodScore * impactScore
}

// Normalize risk values
function normalizeLikelihood(value: string): string {
  const val = value.trim().toUpperCase()
  if (val.includes('UNLIKELY') || val === '1' || val === 'LOW') return 'UNLIKELY'
  if (val.includes('PROB') || val === '3' || val === 'HIGH') return 'PROBABLE'
  return 'POSSIBLE' // Default
}

function normalizeImpact(value: string): string {
  const val = value.trim().toUpperCase()
  if (val.includes('MINOR') || val === '1' || val === 'LOW') return 'MINOR'
  if (val.includes('SIGNIF') || val === '3' || val === 'HIGH') return 'SIGNIFICANT'
  return 'MODERATE' // Default
}

function normalizePriority(value: string): string {
  const val = value.trim().toUpperCase()
  if (val.includes('LOW') || val === '1') return 'LOW'
  if (val.includes('HIGH') || val === '3') return 'HIGH'
  return 'MEDIUM' // Default
}

// Handle Excel file upload and convert to Risk Tasks
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth ID !== DB ID)
    let actualUserId = user.id
    if (user.email) {
      const dbUser = await prisma.user.findFirst({ 
        where: { email: user.email }, 
        select: { id: true, departmentName: true } 
      })
      if (dbUser) {
        actualUserId = dbUser.id
      }
    }
    
    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Verify file type
    const fileType = file.name.split('.').pop()?.toLowerCase()
    if (!fileType || !['xlsx', 'xls'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file format. Only Excel files are supported.' }, { status: 400 })
    }
    
    // Get department members for assignee matching
    const dbUser = await prisma.user.findFirst({
      where: { id: actualUserId },
      select: { departmentName: true }
    })
    
    const departmentUsers = await prisma.user.findMany({
      where: {
        departmentName: dbUser?.departmentName,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true, 
        lastName: true,
        email: true
      }
    })
    
    // Load Excel file
    const fileArrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(fileArrayBuffer)
    
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1)
    
    if (!worksheet || worksheet.rowCount < 2) {
      return NextResponse.json({ error: 'Invalid Excel file or no data found' }, { status: 400 })
    }
    
    const riskTasks: any[] = []
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    
    // Skip header row and process each row
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      
      // Skip empty rows
      if (!row.getCell(1).value && !row.getCell(2).value) continue
      
      try {
        // Extract data from cells
        const riskCategory = String(row.getCell(1).value || '').trim()
        const riskDescription = String(row.getCell(2).value || '').trim()
        
        // Skip if required fields are empty
        if (!riskCategory || !riskDescription) {
          errorCount++
          errors.push(`Row ${i}: Missing required field (Risk Category or Risk Description)`)
          continue
        }
        
        const cause = String(row.getCell(3).value || '').trim()
        const impact = String(row.getCell(4).value || '').trim()
        const likelihood = normalizeLikelihood(String(row.getCell(5).value || 'POSSIBLE'))
        const impactLevel = normalizeImpact(String(row.getCell(6).value || 'MODERATE'))
        const mitigations = String(row.getCell(8).value || '').trim()
        const furtherActions = String(row.getCell(9).value || '').trim()
        
        // Look for the risk champion by name in cell 10
        let assignedToId = actualUserId // Default to creator
        const riskChampionName = String(row.getCell(10).value || '').trim()
        if (riskChampionName) {
          // Try to find a matching user by name
          const nameParts = riskChampionName.toLowerCase().split(/\s+/)
          for (const user of departmentUsers) {
            const firstName = user.firstName?.toLowerCase() || ''
            const lastName = user.lastName?.toLowerCase() || ''
            const fullName = `${firstName} ${lastName}`.trim()
            
            // Check if the name parts match
            if (nameParts.some(part => 
                firstName.includes(part) || 
                lastName.includes(part) || 
                fullName.includes(part))) {
              assignedToId = user.id
              break
            }
          }
        }
        
        // Extract due date
        let dueDate: Date | null = null
        const dueDateValue = row.getCell(11).value
        if (dueDateValue) {
          // Try to parse as Excel date
          if (typeof dueDateValue === 'number') {
            // Excel stores dates as days since 1900-01-01
            const excelBaseDate = new Date(1900, 0, 1)
            dueDate = new Date(excelBaseDate.getTime() + (dueDateValue - 1) * 24 * 60 * 60 * 1000)
          } else {
            // Try to parse as string date
            try {
              dueDate = new Date(String(dueDateValue))
            } catch (e) {
              // Ignore date parsing errors
            }
          }
        }
        
        // Calculate risk score
        const riskScore = calculateRiskScore(likelihood, impactLevel)
        
        // Determine priority based on risk score
        let priority = 'MEDIUM'
        if (riskScore <= 2) priority = 'LOW'
        else if (riskScore >= 6) priority = 'HIGH'
        
        // Create the risk task object
        const riskTask = {
          title: `${riskCategory}: ${riskDescription.substring(0, 50)}${riskDescription.length > 50 ? '...' : ''}`,
          description: riskDescription.length > 50 ? riskDescription : undefined,
          riskCategory,
          riskDescription,
          cause: cause || undefined,
          impact: impact || undefined,
          likelihood,
          impactLevel,
          riskScore,
          mitigations: mitigations || undefined,
          furtherActions: furtherActions || undefined,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          assignedToId,
          createdById: actualUserId,
          status: 'NOT_STARTED',
          documentId: documentId || undefined
        }
        
        riskTasks.push(riskTask)
        successCount++
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError)
        errorCount++
        errors.push(`Row ${i}: ${(rowError as Error).message || 'Unknown error'}`)
      }
    }
    
    if (riskTasks.length === 0) {
      return NextResponse.json({ 
        error: 'No valid risk tasks found in the file',
        errors
      }, { status: 400 })
    }
    
    // Create risk tasks in the database
    const createdTasks = await prisma.$transaction(
      riskTasks.map(task => 
        prisma.riskTask.create({
          data: task,
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        })
      )
    )
    
    return NextResponse.json({
      success: true,
      tasks: createdTasks,
      summary: {
        total: successCount + errorCount,
        success: successCount,
        errors: errorCount,
        errorDetails: errors
      }
    })
    
  } catch (error) {
    console.error('Error processing Excel upload:', error)
    return NextResponse.json({ 
      error: 'Failed to process Excel file', 
      details: (error as Error).message 
    }, { status: 500 })
  }
}
