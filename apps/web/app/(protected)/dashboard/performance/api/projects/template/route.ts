import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'

// GET /api/projects/template - Download CSV template
export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CSV template with sample data and instructions
    const csvTemplate = `title,description,status,priority,planned_start_date,planned_end_date,budget,currency,department_name,division_name,team_members,tasks
Project Alpha,A comprehensive digital transformation initiative,PLANNING,HIGH,2025-01-15,2025-06-30,500000,NAD,Information Technology,Software Development,john.doe@nsa.gov.na;jane.smith@nsa.gov.na,Requirements Gathering;System Design;Development Phase 1;Testing and QA
Project Beta,Infrastructure modernization project,PLANNING,MEDIUM,2025-02-01,2025-08-15,750000,NAD,Human Capital,Administration,mary.johnson@nsa.gov.na,Planning and Analysis;Vendor Selection;Implementation;Training
Project Gamma,Data analytics enhancement,ACTIVE,HIGH,2025-01-01,2025-12-31,300000,NAD,Statistics,Research Division,alex.brown@nsa.gov.na;bob.wilson@nsa.gov.na,Data Collection Framework;Analytics Dashboard;Reporting System;User Training`

    // Create response with CSV content
    const response = new NextResponse(csvTemplate, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="project-template.csv"'
      }
    })

    return response

  } catch (error) {
    console.error('Error generating CSV template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
