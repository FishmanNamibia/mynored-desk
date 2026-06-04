'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, Download, CheckCircle2, AlertCircle, FileText, Info } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useSession } from '@/lib/pms-auth-adapter'

interface ImportPerformanceContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface PerformanceContractRow {
  'Goal number': string
  'Goal name': string
  'Strategic Objective': string
  'Strategic Initiative': string
  Actions: string
  Measure: string
  Targets: string
  'Weight (%)': string
  ApprovalStatus: string
  SupervisorEmail: string
  'Created By': string
  'Supervisor Comment': string
  'Subordinate Comment': string
  Deadline: string
  Created?: string
}

export function ImportPerformanceContractDialog({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: ImportPerformanceContractDialogProps) {
  const { data: session } = useSession()
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [parsedData, setParsedData] = useState<PerformanceContractRow[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const resetState = () => {
    setImporting(false)
    setProgress(0)
    setError(null)
    setResult(null)
    setShowPreview(false)
    setParsedData([])
    setSelectedFile(null)
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        'Goal number': '1',
        'Goal name': 'STRATEGIC GOAL 1',
        'Strategic Objective': 'SO 1.1 – Strategic Objective Description',
        'Strategic Initiative': '1.1.1 Strategic Initiative Description',
        'Actions': 'Specific actions to be taken to achieve this initiative',
        'Measure': 'Key Performance Indicator or measurement criteria',
        'Targets': 'Specific quantifiable target to achieve',
        'Weight (%)': '10%',
        'ApprovalStatus': 'Pending',
        'SupervisorEmail': 'supervisor@nsa.org.na',
        'Created By': 'staff@nsa.org.na',
        'Supervisor Comment': 'Optional supervisor feedback',
        'Subordinate Comment': 'Optional staff comments',
        'Deadline': '3/31/2026'
      },
      {
        'Goal number': '2',
        'Goal name': 'STRATEGIC Goal 2',
        'Strategic Objective': 'SO 2.1 – Another Strategic Objective',
        'Strategic Initiative': '2.1.1 Another Initiative',
        'Actions': 'Different set of actions for this initiative',
        'Measure': 'Another KPI or measurement',
        'Targets': 'Another specific target',
        'Weight (%)': '15%',
        'ApprovalStatus': 'Approved',
        'SupervisorEmail': 'manager@nsa.org.na',
        'Created By': 'employee@nsa.org.na',
        'Supervisor Comment': '',
        'Subordinate Comment': '',
        'Deadline': '6/30/2026'
      }
    ]

    const csv = Papa.unparse(templateData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', 'performance-contracts-template.csv')
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    const isCSV = file.type === 'text/csv' || name.endsWith('.csv')
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel'
    if (isCSV || isExcel) {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('Please select a valid CSV or Excel (.xlsx/.xls) file')
    }
  }

  const loadAndPreviewData = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file first')
      return
    }

    setError(null)
    setImporting(true)
    setProgress(10)

    try {
      console.log('🚀 Starting performance contract import...')
      
      const fileName = selectedFile.name.toLowerCase()
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
      let data: PerformanceContractRow[]

      if (isExcel) {
        // Parse Excel file using SheetJS
        const arrayBuffer = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })
        
        // Normalize headers: trim whitespace
        data = jsonData.map(row => {
          const normalized: any = {}
          for (const [key, value] of Object.entries(row)) {
            normalized[key.trim()] = typeof value === 'string' ? value.trim() : String(value ?? '')
          }
          return normalized as PerformanceContractRow
        })
        console.log('📊 Parsed Excel:', data.length, 'rows from sheet:', sheetName)
      } else {
        // Parse CSV using Papa Parse
        const fileContent = await selectedFile.text()
        const parseResult = Papa.parse<PerformanceContractRow>(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value.trim()
        })

        if (parseResult.errors.length > 0) {
          console.error('❌ CSV parsing errors:', parseResult.errors)
          throw new Error('CSV parsing failed: ' + parseResult.errors[0].message)
        }
        data = parseResult.data
      }
      setProgress(30)
      console.log('📊 Parsed', data.length, 'performance contract records')

      // Validate required columns - match actual CSV format
      const requiredColumns = ['Goal number', 'Goal name', 'Strategic Objective', 'Strategic Initiative', 'Created By']
      const firstRow = data[0] || {}
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
      }

      // Filter out empty rows
      const validData = data.filter(row => 
        row['Goal number'] && 
        row['Goal name'] &&
        row['Strategic Objective'] && 
        row['Strategic Initiative'] &&
        row['Created By']
      )

      setParsedData(validData)
      setShowPreview(true)
      setProgress(100)
      console.log('✅ Valid records:', validData.length)

    } catch (err: any) {
      console.error('❌ Preview error:', err)
      setError(err.message || 'Failed to preview performance contracts')
    } finally {
      setImporting(false)
    }
  }

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      setError('No data to import')
      return
    }

    setError(null)
    setImporting(true)
    setProgress(0)

    try {
      console.log('📤 Starting import of', parsedData.length, 'contracts...')
      
      // Transform data to match API expectations
      const transformedData = parsedData.map(row => ({
        Goal: row['Goal name'],
        'Strategic Objective': row['Strategic Objective'],
        'Strategic Initiative': row['Strategic Initiative'],
        Actions: row.Actions,
        Measure: row.Measure,
        Targets: row.Targets,
        'Weight (%)': row['Weight (%)'],
        ApprovalStatus: row.ApprovalStatus,
        SupervisorEmail: row.SupervisorEmail,
        'Created By': row['Created By'],
        Deadline: row.Deadline,
        Created: row.Created || new Date().toISOString()
      }))
      
      setProgress(20)
      
      const response = await fetch('/dashboard/performance/api/import-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: transformedData,
          importedBy: session?.user?.email || 'Unknown'
        }),
        credentials: 'include'
      })

      setProgress(60)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Import failed')
      }

      const data = await response.json()
      setProgress(100)
      setResult(data)
      
      console.log('✅ Import complete:', data)

      // Auto-close after success
      setTimeout(() => {
        handleClose()
        onImportComplete()
      }, 5000)

    } catch (err: any) {
      console.error('❌ Import error:', err)
      setError(err.message || 'Failed to import performance contracts')
      setProgress(0)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Import Performance Contracts
          </DialogTitle>
          <DialogDescription>
            Import performance contract data from a CSV or Excel (.xlsx/.xls) file. This will create goals, objectives, and initiatives based on the contract structure.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 p-1">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV or Excel File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-green-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* File Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Expected Format (CSV or Excel):</strong> Goal number, Goal name, Strategic Objective, Strategic Initiative, Actions, Measure, Targets, Weight (%), ApprovalStatus, SupervisorEmail, Created By, Deadline, Created
              <br />
              Select a CSV or Excel (.xlsx/.xls) file with performance contract data to import into the system.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Successfully imported {result.imported} performance contracts!
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Goals created: {result.goalsCreated}</li>
                    <li>• Objectives created: {result.objectivesCreated}</li>
                    <li>• Initiatives created: {result.initiativesCreated}</li>
                    <li className="font-semibold text-green-700">• Performance agreements created: {result.agreementsCreated}</li>
                    <li className="font-semibold text-blue-700">• Users with assigned contracts: {result.usersWithContracts}</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              {result.missingUsers && result.missingUsers.length > 0 && (
                <Alert className="bg-amber-50 border-amber-300">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Note:</strong> {result.missingUsers.length} user(s) not yet in the system:
                    <ul className="mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                      {result.missingUsers.map((userName: string, index: number) => (
                        <li key={index}>• {userName}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs space-y-1">
                      <p><strong>What this means:</strong></p>
                      <p>• These users exist in Active Directory but haven't logged into the system yet</p>
                      <p>• Their initiatives have been created with pending assignments</p>
                      <p>• Performance agreements will be automatically created when they first log in</p>
                      <p>• Alternatively, an administrator can manually assign these initiatives once the users log in</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {importing && (
            <div className="space-y-2">
              <Label>Processing...</Label>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {showPreview && parsedData.length > 0 && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Data Preview</h3>
                </div>
                <span className="text-sm font-medium text-blue-700 bg-blue-100 px-4 py-2 rounded-full">
                  {parsedData.length} contracts ready to import
                </span>
              </div>
              
              <div className="flex-1 border rounded-md overflow-hidden shadow-lg bg-white">
                <div className="overflow-auto h-full">
                  <table className="w-full text-sm">
                    <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800 w-[25%] min-w-62.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Goal
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800 w-[20%] min-w-50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Strategic Objective
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800 w-[20%] min-w-50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Strategic Initiative
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800 w-[25%] min-w-62.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            Actions
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800 w-[7%] min-w-30">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            Created By
                          </div>
                        </th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-800 w-[3%] min-w-20">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Weight
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 8).map((row, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-gray-900 font-medium leading-relaxed">
                              {row['Goal name']}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-800 leading-relaxed">
                              {row['Strategic Objective']}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-800 leading-relaxed">
                              {row['Strategic Initiative']}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-800 leading-relaxed">
                              {row.Actions}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded-full text-center">
                              {row['Created By']}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-gray-900 bg-yellow-100 px-3 py-1 rounded-full inline-block">
                              {row['Weight (%)']}%
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 8 && (
                  <div className="p-6 text-center bg-linear-to-r from-gray-50 to-blue-50 border-t">
                    <div className="inline-flex items-center gap-3 text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">
                        Showing first 8 of {parsedData.length} contracts
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        +{parsedData.length - 8} more
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 shrink-0 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={downloadTemplate} 
            disabled={importing}
            className="mr-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          
          {!showPreview ? (
            <Button 
              onClick={loadAndPreviewData}
              disabled={importing || !selectedFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {importing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Load & Preview Data
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleImport}
              disabled={importing || parsedData.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedData.length} Contracts
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}