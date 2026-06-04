import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

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

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Preview - Reading CSV file from:', filePath)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath)
      return NextResponse.json(
        { error: `File not found at path: ${filePath}` },
        { status: 404 }
      )
    }

    // Read the CSV file
    const csvContent = fs.readFileSync(filePath, 'utf-8')
    console.log('📄 File size:', csvContent.length, 'characters')

    // Parse CSV
    const parseResult = Papa.parse<PerformanceContractRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Clean up header names
        return header.trim()
      },
      transform: (value: string) => {
        // Clean up cell values
        return value.trim()
      }
    })

    if (parseResult.errors.length > 0) {
      console.error('❌ CSV parsing errors:', parseResult.errors)
      return NextResponse.json(
        { error: 'CSV parsing failed: ' + parseResult.errors[0].message },
        { status: 400 }
      )
    }

    const data = parseResult.data
    console.log('📊 Parsed', data.length, 'performance contract records')

    // Validate required columns
    const requiredColumns = ['Goal', 'Strategic Objective', 'Strategic Initiative', 'Created By']
    const firstRow = data[0] || {}
    const missingColumns = requiredColumns.filter(col => !(col in firstRow))
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing required columns:', missingColumns)
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Filter out empty rows
    const validData = data.filter(row => 
      row.Goal && 
      row['Strategic Objective'] && 
      row['Strategic Initiative'] &&
      row['Created By']
    )

    console.log('✅ Valid records:', validData.length)

    // Get unique creators for preview info
    const creators = [...new Set(validData.map(row => row['Created By']))]
    console.log('👥 Creators found:', creators)

    return NextResponse.json({
      success: true,
      data: validData,
      summary: {
        totalRecords: validData.length,
        creators: creators,
        uniqueGoals: [...new Set(validData.map(row => row.Goal))].length,
        uniqueObjectives: [...new Set(validData.map(row => row['Strategic Objective']))].length,
        uniqueInitiatives: [...new Set(validData.map(row => row['Strategic Initiative']))].length
      }
    })

  } catch (error: any) {
    console.error('❌ Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to preview performance contracts: ' + error.message },
      { status: 500 }
    )
  }
}
