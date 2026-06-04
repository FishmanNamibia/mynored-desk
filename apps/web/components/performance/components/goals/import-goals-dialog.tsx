'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getCurrentPerformanceCycle } from '@/lib/pms/performance-cycle'

interface ImportGoalsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
  defaultYear?: string // Optional default year to pre-fill
}

interface ImportRow {
  [key: string]: any // Allow any column name for flexibility
}

export function ImportGoalsDialog({ open, onOpenChange, onImportComplete, defaultYear }: ImportGoalsDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editableData, setEditableData] = useState<ImportRow[]>([])
  const [performanceYear, setPerformanceYear] = useState('')
  const [performancePeriods, setPerformancePeriods] = useState<any[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [parsedData, setParsedData] = useState<ImportRow[] | null>(null)
  
  // Fetch available performance periods
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const response = await fetch('/dashboard/performance/api/performance-period?includeHistory=true')
        if (response.ok) {
          const data = await response.json()
          setPerformancePeriods(data)
          // Auto-select active period if available
          const activePeriod = data.find((p: any) => p.isActive)
          if (activePeriod) {
            setSelectedPeriodId(activePeriod.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch performance periods:', error)
      }
    }
    if (open) {
      fetchPeriods()
    }
  }, [open])

  // Set default performance year
  useEffect(() => {
    if (defaultYear) {
      // Use provided default year if available
      setPerformanceYear(defaultYear)
    } else {
      // Otherwise use current performance cycle
      setPerformanceYear(getCurrentPerformanceCycle())
    }
  }, [defaultYear])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
      setParsedData(null)
      setShowPreview(false)
      
      // Automatically parse file and show editable preview
      try {
        console.log('📄 Parsing file for preview...')
        const data = await parseExcelFile(selectedFile)
        setEditableData(data)
        setShowEditDialog(true)
        console.log('✅ Preview ready:', data.length, 'rows')
      } catch (err: any) {
        console.error('❌ Parse error:', err)
        setError(err.message || 'Failed to parse file')
      }
    }
  }


  const parseExcelFile = async (file: File): Promise<ImportRow[]> => {
    console.log('🚀 STARTING EXCEL PARSE')
    console.log('📁 File name:', file.name)
    console.log('📏 File size:', file.size, 'bytes')
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        console.log('✅ File read complete, parsing Excel...')
        try {
          const data = e.target?.result
          console.log('📦 Data loaded, creating workbook...')
          const workbook = XLSX.read(data, { type: 'binary' })
          console.log('✅ Workbook created')
          
          console.log('📊 Total sheets found:', workbook.SheetNames.length)
          console.log('📋 Sheet names:', workbook.SheetNames)
          
          // Read ALL sheets in the workbook
          const allData: ImportRow[] = []
          
          workbook.SheetNames.forEach(sheetName => {
            console.log(`\n📖 Reading sheet: ${sheetName}`)
            const worksheet = workbook.Sheets[sheetName]
            
            // Skip empty sheets or legend sheets
            if (!worksheet) {
              console.log(`   ⏭️  Skipped: Empty worksheet`)
              return
            }
            if (sheetName.toLowerCase().includes('legend') || sheetName.toLowerCase().includes('summary')) {
              console.log(`   ⏭️  Skipped: Legend/Summary sheet`)
              return
            }
            
            // Read raw data with row numbers as headers to handle BSC structure
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) as any[][]
            console.log(`   📄 Total rows: ${rawData.length}`)
            
            if (rawData.length < 4) {
              console.log('   ⚠️  Not enough rows for BSC format')
              return
            }
            
            // Find header row dynamically
            let headerRowIndex = -1
            let headers: any[] = []
            
            // Scan first 10 rows to find the header row
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
              const row = rawData[i]
              const rowStr = row.join('|').toLowerCase()
              
              // Check if this row contains key column headers
              // Looking for: BSC, Goal Number, Goal Name, Strategic Objective/Initiative, Measure, Action
              if ((rowStr.includes('bsc') || rowStr.includes('perspective')) &&
                  (rowStr.includes('goal') || rowStr.includes('strategic objective')) &&
                  (rowStr.includes('measure') || rowStr.includes('action'))) {
                headerRowIndex = i
                headers = row
                console.log(`   📋 Headers found at Excel row ${i + 1} (array index ${i}):`, headers.slice(0, 8))
                console.log(`   📊 Data will start at Excel row ${i + 2} (array index ${i + 1})`)
                break
              }
            }
            
            if (headerRowIndex === -1) {
              console.warn(`   ⚠️  Could not find header row, skipping sheet`)
              return
            }
            
            // Use FIXED column positions (no dynamic detection)
            const colIndices: { [key: string]: number } = {
              bsc: 0,                    // Column A
              goalNumber: 1,             // Column B
              goalName: 2,               // Column C
              strategicObjective: 3,     // Column D
              strategicInitiative: 4,    // Column E
              measure: 5,                // Column F
              actions: 6,                // Column G
              reportingPeriod: 7,        // Column H
              annualTarget: 8,           // Column I
              q1: 9,                     // Column J
              q2: 10,                    // Column K
              q3: 11,                    // Column L
              q4: 12,                    // Column M
              primaryResp: 13,           // Column N
              secondaryResp: 14,         // Column O
              reportTo: 15               // Column P
            }
            
            console.log(`   🔍 Using FIXED column positions (matching Excel layout):`)
            console.log(`      📍 Column A (index 0): Balanced Score-card (BSC)`)
            console.log(`      📍 Column B (index 1): Goal number`)
            console.log(`      📍 Column C (index 2): Goal Name`)
            console.log(`      📍 Column D (index 3): Strategic Objective`)
            console.log(`      📍 Column E (index 4): Strategic Initiative`)
            console.log(`      📍 Column F (index 5): Measure`)
            console.log(`      📍 Column G (index 6): Actions`)
            console.log(`      📍 Column N (index 13): Primary Responsibility`)
            console.log(`      📍 Column O (index 14): Secondary Responsibility`)
            
            // Data rows start after header row
            const dataRows = rawData.slice(headerRowIndex + 1)
            console.log(`   📝 Data rows to process: ${dataRows.length}`)
            
            // Track last seen values for merged cells (hierarchical structure)
            let lastGoalNumber = ''
            let lastGoalName = ''
            let lastBscPerspective = sheetName
            let lastStrategicObjective = '' // Track SO for merged cells
            
            // Process each data row
            dataRows.forEach((row: any[], rowIndex: number) => {
              if (!row || row.length === 0) return
              
              // Extract data from columns
              let bscPerspective = String(row[colIndices.bsc] || '').trim()
              let goalNumber = String(row[colIndices.goalNumber] || '').trim()
              let goalName = String(row[colIndices.goalName] || '').trim()
              let strategicObjective = String(row[colIndices.strategicObjective] || '').trim()
              let strategicInit = String(row[colIndices.strategicInitiative] || '').trim()
              const measure = String(row[colIndices.measure] || '').trim()
              const actions = String(row[colIndices.actions] || '').trim()
              const reportingPeriod = String(row[colIndices.reportingPeriod] || 'Annual').trim()
              const annualTarget = String(row[colIndices.annualTarget] || '').trim()
              const q1 = String(row[colIndices.q1] || '').trim()
              const q2 = String(row[colIndices.q2] || '').trim()
              const q3 = String(row[colIndices.q3] || '').trim()
              const q4 = String(row[colIndices.q4] || '').trim()
              const primaryResp = String(row[colIndices.primaryResp] || '').trim()
              const secondaryResp = String(row[colIndices.secondaryResp] || '').trim()
              const reportTo = String(row[colIndices.reportTo] || '').trim()
              
              // Update last seen values FIRST when they exist (before using them)
              if (bscPerspective) lastBscPerspective = bscPerspective
              if (goalNumber) lastGoalNumber = goalNumber
              if (goalName) lastGoalName = goalName
              
              // Handle Strategic Objective hierarchy (merged cells)
              // SO format: Contains "SO" keyword → "SO : 1.2 Description..." or "SO: 1.2..." or "SO 1.2..."
              // SI format: Starts with numbers → "1.2.2 Description..." (no "SO" keyword)
              
              const hasSOKeyword = strategicObjective && /^SO\s*:?\s*/i.test(strategicObjective)
              const hasNumericSI = strategicInit && /^\d+\.\d+(\.\d+)?/.test(strategicInit)
              
              if (hasSOKeyword) {
                // This row has an SO header in the Strategic Objective column - store it
                lastStrategicObjective = strategicObjective
                console.log(`   📌 Found SO header: ${strategicObjective.substring(0, 50)}`)
              }
              // If current row has no SO but has numeric SI, use last seen SO
              else if (!strategicObjective && hasNumericSI && lastStrategicObjective) {
                strategicObjective = lastStrategicObjective
                console.log(`   🔗 Linking SI ${strategicInit.substring(0, 20)} → SO: ${lastStrategicObjective.substring(0, 30)}`)
              }
              
              // Skip rows that don't have valid SO (must contain "SO" keyword)
              if (strategicObjective && !/^SO\s*:?\s*/i.test(strategicObjective)) {
                console.log(`   ⏭️  Row ${rowIndex + 1} skipped: Strategic Objective doesn't contain "SO" - ${strategicObjective.substring(0, 40)}`)
                return
              }
              
              // Handle merged cells - carry forward last seen values AFTER updating
              if (!bscPerspective && lastBscPerspective) bscPerspective = lastBscPerspective
              if (!goalNumber && lastGoalNumber) goalNumber = lastGoalNumber
              if (!goalName && lastGoalName) goalName = lastGoalName
              
              // Skip if no SI and no measure/actions (truly empty row)
              if (!strategicInit && !measure && !actions) {
                console.log(`   ⏭️  Row ${rowIndex + 1} skipped: Empty row (no SI, measure, or actions)`)
                return
              }
              
              // Skip if no SO and no SI (but allow rows with just SO for logging)
              if (!strategicObjective && !strategicInit) {
                console.log(`   ⏭️  Row ${rowIndex + 1} skipped: No SO or SI`)
                return
              }
              
              // Debug: Log ALL rows being processed
              console.log(`   ✅ Row ${rowIndex + 1}: BSC: ${bscPerspective.substring(0, 15)} | Goal ${goalNumber} | SO: ${strategicObjective.substring(0, 25)} | SI: ${strategicInit.substring(0, 15) || 'N/A'}`)
              
              // Build the data structure
              // ONLY create initiatives when we have SI (Strategic Initiative)
              // Rows with only SO are merged cell headers and should not create initiatives
              if (strategicObjective && strategicInit) {
                // This is an initiative under an objective
                allData.push({
                  sheetName: sheetName,
                  bscPerspective: bscPerspective,
                  goalNumber: goalNumber,
                  goalTitle: goalName,
                  goalDescription: '',
                  goalStartDate: '',
                  goalEndDate: '',
                  objectiveTitle: strategicObjective,
                  objectiveDescription: measure,
                  initiativeNumber: strategicInit,
                  initiativeTitle: strategicInit,
                  initiativeDescription: actions,
                  initiativeMeasure: measure,
                  initiativeAction: actions,
                  initiativeTarget: annualTarget,
                  initiativeDueDate: '',
                  initiativeReportingPeriod: reportingPeriod,
                  initiativeQ1: q1,
                  initiativeQ2: q2,
                  initiativeQ3: q3,
                  initiativeQ4: q4,
                  initiativePrimaryResponsibility: primaryResp,
                  initiativeSecondaryResponsibility: secondaryResp,
                  initiativeReportingTo: reportTo
                })
              } 
              // If we only have Strategic Objective (no initiative) - this is a merged cell header row
              else if (hasSOKeyword && !strategicInit) {
                // Don't create an initiative - this is just the SO header due to merged cells
                // The subsequent rows with SI will use this SO
                console.log(`   📋 Row ${rowIndex + 1}: SO header row (no initiative created) - ${strategicObjective.substring(0, 40)}`)
              }
              // If we only have Strategic Initiative (no objective column value)
              else if (!strategicObjective && strategicInit) {
                // Treat this as both objective and initiative
                allData.push({
                  sheetName: sheetName,
                  bscPerspective: bscPerspective,
                  goalNumber: goalNumber,
                  goalTitle: goalName,
                  goalDescription: '',
                  goalStartDate: '',
                  goalEndDate: '',
                  objectiveTitle: strategicInit,
                  objectiveDescription: measure,
                  initiativeNumber: strategicInit,
                  initiativeTitle: actions || strategicInit,
                  initiativeDescription: actions,
                  initiativeMeasure: measure,
                  initiativeAction: actions,
                  initiativeTarget: annualTarget,
                  initiativeDueDate: '',
                  initiativeReportingPeriod: reportingPeriod,
                  initiativeQ1: q1,
                  initiativeQ2: q2,
                  initiativeQ3: q3,
                  initiativeQ4: q4,
                  initiativePrimaryResponsibility: primaryResp,
                  initiativeSecondaryResponsibility: secondaryResp,
                  initiativeReportingTo: reportTo
                })
              }
            })
          })
          
          console.log('\n📊 PARSING COMPLETE')
          console.log(`✅ Parsed ${allData.length} initiatives from ${workbook.SheetNames.length} sheets`)
          console.log(`📄 Total sheets processed: ${workbook.SheetNames.length}`)
          console.log(`📋 Sheets with data: ${workbook.SheetNames.filter(s => !s.toLowerCase().includes('legend') && !s.toLowerCase().includes('summary')).length}`)
          
          if (allData.length > 0) {
            console.log('📝 Sample parsed data (first 2 rows):')
            console.table(allData.slice(0, 2))
            
            // Show goal distribution
            const goalCounts = allData.reduce((acc: any, row: any) => {
              acc[row.goalNumber] = (acc[row.goalNumber] || 0) + 1
              return acc
            }, {})
            console.log('📊 Initiatives per Goal:', goalCounts)
            
            // Show unique objectives count
            const uniqueObjectives = new Set(allData.map((row: any) => row.objectiveTitle))
            console.log(`🎯 Unique Strategic Objectives: ${uniqueObjectives.size}`)
            
            // Show unique BSC perspectives
            const uniqueBSC = new Set(allData.map((row: any) => row.bscPerspective))
            console.log(`📋 BSC Perspectives Found:`, Array.from(uniqueBSC))
          } else {
            console.error('❌ NO DATA WAS PARSED!')
            console.warn('⚠️  Check if your Excel file has the expected column structure.')
            console.log('Expected columns: Strategic Initiative, Measure, Actions, Primary Responsibility, etc.')
          }
          
          resolve(allData)
        } catch (err) {
          console.error('Parse error:', err)
          reject(new Error('Failed to parse Excel file: ' + (err as Error).message))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsBinaryString(file)
    })
  }

  const handleImport = async () => {
    if (!file || !parsedData) {
      setError('Please select a file')
      return
    }

    setImporting(true)
    setProgress(10)
    setError(null)
    setResult(null)

    try {
      // Use already parsed data
      setProgress(30)
      
      if (parsedData.length === 0) {
        throw new Error('No data found in file. Please check the browser console for column names and ensure your file has a "Strategic Initiative" column with values like "SO 1.12" or "1.12.1".')
      }

      // Send to API
      setProgress(50)
      const response = await fetch('/dashboard/performance/api/goals/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          data: parsedData,
          performanceYear: performanceYear,
          performancePeriodId: selectedPeriodId
        })
      })

      setProgress(80)
      const data = await response.json()

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => 
            `Row ${err.row}: ${err.field} - ${err.message}`
          ).join('\n')
          throw new Error(`Validation errors:\n${errorMessages}`)
        }
        throw new Error(data.error || 'Import failed')
      }

      setProgress(100)
      setResult(data.results)
      
      // Only auto-close if import was 100% successful with no errors
      const hasErrors = data.results?.errors && data.results.errors.length > 0
      
      if (!hasErrors) {
        setTimeout(() => {
          onImportComplete()
          onOpenChange(false)
          // Reset state
          setFile(null)
          setProgress(0)
          setResult(null)
          setParsedData(null)
          setShowPreview(false)
        }, 3000)
      } else {
        // Keep dialog open if there are errors - user can review and manually close
        onImportComplete()
      }

    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import data')
      setProgress(0)
    } finally {
      setImporting(false)
    }
  }

  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    const newData = [...editableData]
    newData[rowIndex] = {
      ...newData[rowIndex],
      [field]: value
    }
    setEditableData(newData)
  }

  const handleConfirmEdit = () => {
    setParsedData(editableData)
    setShowEditDialog(false)
    setShowPreview(true)
  }

  const downloadTemplate = () => {
    // Create BSC template data
    const template = [
      {
        'BSC': 'Learning and Growth',
        'Goal number': '1',
        'Goal Name': 'STRENGTHEN THE CEO OF STATISTICS',
        'Strategic Objective': 'SO 1.1 Develop and implement a research',
        'Strategic Initiative': '',
        'Measure': '80% of IT&DM activities for 2025/26 implemented',
        'Actions': 'Implement the IT & Data Science Strategy initiative for 2025 to 2026 by 31 March 2026',
        'Reporting period': 'Annual',
        'Annual Target': '1',
        'Quarter 1': '',
        'Quarter 2': '',
        'Quarter 3': '',
        'Quarter 4': '1',
        'Primary Responsibility': 'Exec: IT&DP',
        'Secondary Responsibility': 'Exec: ES, Exec: DSS, Exec: GIS/NSDI',
        'To report to / to be informed': 'DSG'
      },
      {
        'BSC': '',
        'Goal number': '1',
        'Goal Name': '',
        'Strategic Objective': 'SO 1.2 Promote capacity development forms',
        'Strategic Initiative': '1.2.1',
        'Measure': 'Number of workshops and training interventions',
        'Actions': 'Report on number of capacity development initiatives provided to staff by 31 March 2026',
        'Reporting period': 'Annual',
        'Annual Target': '3',
        'Quarter 1': '',
        'Quarter 2': '1',
        'Quarter 3': '1',
        'Quarter 4': '1',
        'Primary Responsibility': 'Exec: IT&DP',
        'Secondary Responsibility': '',
        'To report to / to be informed': ''
      },
      {
        'BSC': '',
        'Goal number': '1',
        'Goal Name': '',
        'Strategic Objective': 'SO 1.3 Organization-wide initiative',
        'Strategic Initiative': '',
        'Measure': 'Completion status',
        'Actions': 'Complete annual organizational review',
        'Reporting period': 'Annual',
        'Annual Target': '100%',
        'Quarter 1': '25%',
        'Quarter 2': '50%',
        'Quarter 3': '75%',
        'Quarter 4': '100%',
        'Primary Responsibility': 'Exec: HC',
        'Secondary Responsibility': 'All',
        'To report to / to be informed': 'SG'
      }
    ]

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Goals Template')

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }
    ]

    // Download
    XLSX.writeFile(wb, 'goals-import-template.xlsx')
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import BSC Work Plan</DialogTitle>
          <DialogDescription>
            Upload your complete Balanced Scorecard work plan Excel file with all sheets. The system will automatically extract goals, objectives, initiatives, and assign tasks to departments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Need a template?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Download our Excel template to see the required format and column headers
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Performance Period Selection */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <Label className="text-blue-900 font-semibold">Performance Period *</Label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    disabled={importing}
                    className="mt-1 w-full border border-blue-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a performance period...</option>
                    {performancePeriods.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} {period.isActive ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-blue-700 mt-1">
                    Select the performance period this workplan belongs to. All performance agreements will be linked to this period.
                  </p>
                </div>
                <div>
                  <Label className="text-blue-900 font-semibold">Performance Year *</Label>
                  <Input
                    type="text"
                    value={performanceYear}
                    onChange={(e) => setPerformanceYear(e.target.value)}
                    disabled={importing}
                    className="mt-1 border-blue-300 focus:border-blue-500"
                    placeholder="e.g., 2025/26"
                  />
                  <p className="text-xs text-blue-700 mt-1">
                    This workplan will be saved under the <strong>{performanceYear}</strong> performance cycle. You can switch between years later to view different annual workplans.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div>
            <Label>Upload File</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={importing}
              className="mt-2"
            />
            {file && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Selected: {file.name}
              </p>
            )}
          </div>

          {/* Preview Parsed Data */}
          {showPreview && parsedData && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-3">📊 Preview: Data Found in File</h4>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold text-blue-600">{parsedData.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Unique Goals</p>
                    <p className="text-2xl font-bold text-green-600">
                      {new Set(parsedData.map(r => r.goalNumber).filter(Boolean)).size}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Objectives (SO)</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {parsedData.filter(r => r.objectiveTitle?.match(/^SO\s*\d+\.\d+/i)).length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-gray-600">Initiatives</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {parsedData.filter(r => r.initiativeNumber?.match(/^\d+\.\d+\.\d+/)).length}
                    </p>
                  </div>
                </div>
                
                {/* BSC Perspectives breakdown */}
                <div className="mt-3 bg-white p-3 rounded border">
                  <p className="font-semibold text-gray-700 mb-2">BSC Perspectives Found:</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(parsedData.map(r => r.bscPerspective).filter(Boolean))).map(perspective => (
                      <span key={perspective} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                        {perspective}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800">
                    <strong>✓ Ready to import:</strong> Review the numbers above. If they look correct, click "Import Work Plan" below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-500 text-center">{progress}%</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && (
            <Alert className={result.errors && result.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
              <CheckCircle2 className={result.errors && result.errors.length > 0 ? "h-4 w-4 text-yellow-600" : "h-4 w-4 text-green-600"} />
              <AlertDescription>
                <div className={result.errors && result.errors.length > 0 ? "text-yellow-900" : "text-green-800"}>
                  <p className="font-semibold mb-2">
                    {result.errors && result.errors.length > 0 ? '⚠️ Import Completed with Warnings' : '✅ Import Successful!'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>• {result.goalsCreated} goals created</li>
                    <li>• {result.objectivesCreated} objectives created</li>
                    <li>• {result.initiativesCreated} initiatives created</li>
                  </ul>
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-white rounded border border-orange-300">
                      <p className="font-semibold text-orange-800 mb-2">⚠️ Issues Found ({result.errors.length}):</p>
                      <ul className="text-xs space-y-1 text-orange-900 max-h-40 overflow-y-auto">
                        {result.errors.map((err: string, i: number) => (
                          <li key={i} className="border-b border-orange-100 pb-1">• {err}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-orange-700 mt-2 italic">
                        Review the issues above. Click "Cancel" to close this dialog.
                      </p>
                    </div>
                  )}
                  {(!result.errors || result.errors.length === 0) && (
                    <p className="text-xs mt-2 text-gray-600 italic">
                      Dialog will close automatically in 3 seconds...
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 BSC Work Plan Import:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>1. Upload Complete Workbook:</strong> System reads ALL sheets (Learning & Growth, Customer, Internal Process, Financial, etc.)</li>
              <li><strong>2. BSC Structure:</strong>
                <ul className="ml-4 mt-1">
                  <li>• Strategic Initiatives (SO x.x) → Goals</li>
                  <li>• Sub-initiatives (x.x.x) → Objectives</li>
                  <li>• Actions → Initiatives (with quarterly milestones)</li>
                </ul>
              </li>
              <li><strong>3. Department Assignment:</strong> Uses acronyms (Exec: IT&DP, DM, HR, HC, etc.)</li>
              <li><strong>4. "All" Responsibility:</strong> Automatically assigns to all executives</li>
              <li><strong>5. Quarterly Tracking:</strong> Q1-Q4 targets stored as milestones on initiatives</li>
              <li><strong>6. Auto Date:</strong> If dates missing, uses current fiscal year (Apr-Mar)</li>
            </ul>
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Sheet names like "Legend" and "Summary" are automatically skipped.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || !performanceYear || !selectedPeriodId || !parsedData || importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Work Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Edit Dialog */}
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>📝 Review & Edit Imported Data</DialogTitle>
            <p className="text-sm text-gray-600">Review and edit the data before importing. Click any cell to edit.</p>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left border font-semibold">#</th>
                  <th className="p-2 text-left border font-semibold">BSC</th>
                  <th className="p-2 text-left border font-semibold">Goal #</th>
                  <th className="p-2 text-left border font-semibold">Goal Name</th>
                  <th className="p-2 text-left border font-semibold">Strategic Objective</th>
                  <th className="p-2 text-left border font-semibold">Initiative</th>
                  <th className="p-2 text-left border font-semibold">Measure</th>
                  <th className="p-2 text-left border font-semibold">Actions</th>
                  <th className="p-2 text-left border font-semibold">Primary Resp</th>
                  <th className="p-2 text-left border font-semibold">Secondary Resp</th>
                </tr>
              </thead>
              <tbody>
                {editableData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="p-2 border text-gray-500">{rowIndex + 1}</td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.bscPerspective || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'bscPerspective', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.goalNumber || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'goalNumber', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.goalTitle || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'goalTitle', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.objectiveTitle || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'objectiveTitle', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.initiativeNumber || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'initiativeNumber', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.initiativeMeasure || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'initiativeMeasure', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.initiativeAction || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'initiativeAction', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.initiativePrimaryResponsibility || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'initiativePrimaryResponsibility', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                    <td className="p-1 border">
                      <input
                        type="text"
                        value={row.initiativeSecondaryResponsibility || ''}
                        onChange={(e) => handleCellEdit(rowIndex, 'initiativeSecondaryResponsibility', e.target.value)}
                        className="w-full p-1 border-0 focus:ring-1 focus:ring-blue-500 rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              📊 {editableData.length} rows loaded
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmEdit}>
                ✓ Confirm & Continue to Import
              </Button>
            </div>
          </div>
        </DialogContent>
    </Dialog>
    </>
  )
}
