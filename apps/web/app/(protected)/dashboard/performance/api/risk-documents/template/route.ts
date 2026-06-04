import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
// @ts-ignore - ExcelJS types will be available after installation
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Risk Register')

    // Set up the headers and formatting
    worksheet.columns = [
      { header: 'Risk category', key: 'riskCategory', width: 15 },
      { header: 'Risk description', key: 'riskDescription', width: 25 },
      { header: 'Cause', key: 'cause', width: 20 },
      { header: 'Impact/Effect description', key: 'impact', width: 25 },
      { header: 'Likelihood', key: 'likelihood', width: 15 },
      { header: 'Impact Level', key: 'impactLevel', width: 15 },
      { header: 'Risk Score', key: 'riskScore', width: 10 },
      { header: 'Mitigation / current controls', key: 'mitigations', width: 25 },
      { header: 'Further action required', key: 'furtherActions', width: 25 },
      { header: 'Risk Champion', key: 'riskChampion', width: 15 },
      { header: 'Date of completion', key: 'dueDate', width: 15 },
      { header: 'Comment', key: 'comment', width: 20 }
    ]

    // Format headers
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A5F' } // Dark blue background
    }
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } } // White text
    headerRow.height = 25

    // Add instructions worksheet
    const instructionsSheet = workbook.addWorksheet('How to use this template')
    instructionsSheet.columns = [{ width: 100 }]
    
    // Add template usage information
    instructionsSheet.addRow(['How to use this template'])
    instructionsSheet.getCell('A1').font = { bold: true, size: 14 }
    instructionsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A5F' }
    }
    instructionsSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFF' } }
    
    instructionsSheet.addRow(['This risk register template provides some example risks and suggestions for mitigating them. In addition to the risks identified in the template, you should also identify any risks specific to your department.'])
    
    // Add risk evaluation guidance
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['Defining the level of impact and likelihood of risk'])
    instructionsSheet.getCell('A4').font = { bold: true, size: 12 }
    
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['Inherent risk evaluation'])
    instructionsSheet.getCell('A6').font = { bold: true, size: 12 }
    
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['How likely is it that the risk is going to happen?'])
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['- Unlikely – Likelihood of occurrence is relatively slim - <10% chance of occurrence'])
    instructionsSheet.addRow(['- Possible – Quite possible that the risk could occur especially if control measures are inadequate  - 10% - 50% chance of occurrence'])
    instructionsSheet.addRow(['- Probable – More likely to happen than not - >50% chance of occurrence'])
    
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['What would the impact be if the risk was to crystallise?'])
    instructionsSheet.addRow([''])
    instructionsSheet.addRow(['- Minor – Unlikely to have a permanent or significant effect'])
    instructionsSheet.addRow(['- Moderate – Potential impact on performance and service delivery. May be adequately managed through existing processes'])
    instructionsSheet.addRow(['- Significant – Severe impact on performance through a reduced ability to deliver.'])

    // Add 3x3 risk matrix
    const matrixSheet = workbook.addWorksheet('Risk Matrix')
    matrixSheet.addRow(['The 3x3 matrix below can be used to calculate the overall risk score:'])
    matrixSheet.addRow([''])
    
    // Create matrix headers
    matrixSheet.addRow(['', '', 'LIKELIHOOD', '', ''])
    matrixSheet.mergeCells('C3:E3')
    matrixSheet.getCell('C3').alignment = { horizontal: 'center' }
    matrixSheet.getCell('C3').font = { bold: true }
    
    // Matrix column headers
    matrixSheet.addRow(['', '', '1 - Unlikely', '2 - Possible', '3 - Probable'])
    
    // Impact header
    matrixSheet.addRow(['IMPACT', '', '', '', ''])
    matrixSheet.mergeCells('A5:A7')
    matrixSheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' }
    matrixSheet.getCell('A5').font = { bold: true }
    
    // Matrix content with risk scores
    matrixSheet.addRow(['3 - Significant', '', '3 (Significant & Unlikely)', '6 (Significant & Possible)', '9 (Significant & Probable)'])
    matrixSheet.addRow(['2 - Moderate', '', '2 (Moderate & Unlikely)', '4 (Moderate & Possible)', '6 (Moderate & Probable)'])
    matrixSheet.addRow(['1 - Minor', '', '1 (Minor & Unlikely)', '2 (Minor & Possible)', '3 (Minor & Probable)'])
    
    // Color cells based on risk severity
    // Green - low risk
    matrixSheet.getCell('C6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }
    matrixSheet.getCell('C7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }
    matrixSheet.getCell('C8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }
    matrixSheet.getCell('D8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }
    
    // Yellow - medium risk
    matrixSheet.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } }
    matrixSheet.getCell('D7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } }
    matrixSheet.getCell('E8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC000' } }
    
    // Red - high risk
    matrixSheet.getCell('E6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } }
    matrixSheet.getCell('E7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } }
    matrixSheet.getCell('C6').font = { bold: true, color: { argb: '000000' } }
    
    // Add some example risks
    worksheet.addRow({
      riskCategory: 'Operational',
      riskDescription: 'System downtime affecting service delivery',
      cause: 'Infrastructure failure, cyber attack, or power outage',
      impact: 'Disruption to critical services, reputation damage',
      likelihood: 'POSSIBLE',
      impactLevel: 'SIGNIFICANT',
      riskScore: 6,
      mitigations: 'Redundant systems, backup procedures, disaster recovery plan',
      furtherActions: 'Regular penetration testing, infrastructure review',
      riskChampion: '',
      dueDate: '',
      comment: 'Critical risk requiring immediate attention'
    })

    worksheet.addRow({
      riskCategory: 'Financial',
      riskDescription: 'Budget overruns on major projects',
      cause: 'Poor cost estimation, scope creep, unexpected expenses',
      impact: 'Financial strain, potential cuts to other services',
      likelihood: 'POSSIBLE',
      impactLevel: 'MODERATE',
      riskScore: 4,
      mitigations: 'Regular budget reviews, contingency funds',
      furtherActions: 'Implement improved cost tracking system',
      riskChampion: '',
      dueDate: '',
      comment: 'Monitor closely during quarterly reviews'
    })

    worksheet.addRow({
      riskCategory: 'Compliance',
      riskDescription: 'Non-compliance with data protection regulations',
      cause: 'Inadequate data handling procedures, staff training gaps',
      impact: 'Legal penalties, reputation damage, loss of public trust',
      likelihood: 'UNLIKELY',
      impactLevel: 'SIGNIFICANT',
      riskScore: 3,
      mitigations: 'Data protection policies, staff training',
      furtherActions: 'Regular compliance audits, update training materials',
      riskChampion: '',
      dueDate: '',
      comment: 'Annual compliance review scheduled'
    })

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Prepare headers for file download
    const headers = new Headers()
    headers.append('Content-Disposition', 'attachment; filename="Risk_Register_Template.xlsx"')
    headers.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return new NextResponse(buffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error generating risk template:', error)
    return NextResponse.json(
      { error: 'Failed to generate risk template' },
      { status: 500 }
    )
  }
}
