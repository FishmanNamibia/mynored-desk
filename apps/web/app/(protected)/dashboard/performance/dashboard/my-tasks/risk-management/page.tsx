'use client'

import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShieldAlert, Plus, FileSpreadsheet, Edit3, Download, Users, Upload, FileText, CheckCircle, Clock, AlertTriangle, Trash2, ExternalLink } from 'lucide-react'
import { isRiskComplianceOfficer, isExecutive, isDepartmentManager } from '@/lib/pms/role-helpers'

interface User {
  id: string
  firstName?: string | null
  lastName?: string | null
  email: string
  jobTitle?: string | null
  departmentName?: string | null
  divisionName?: string | null
}

interface RiskDocument {
  id: string
  title: string
  filename: string
  fileUrl: string
  fileType: string
  fileSize: number
  description?: string | null
  departmentName?: string | null
  divisionName?: string | null
  status: string
  uploadedById: string
  uploadedBy: {
    id: string
    firstName?: string | null
    lastName?: string | null
    email: string
  }
  distributedTo: User[]
  createdAt: string
  updatedAt: string
}

interface RiskTask {
  id: string
  title: string
  description?: string | null
  riskCategory: string
  riskDescription?: string | null
  cause?: string | null
  impact?: string | null
  likelihood: string
  impactLevel: string
  riskScore?: number | null
  mitigations?: string | null
  furtherActions?: string | null
  priority: string
  dueDate?: string | null
  assignedToId: string
  assignedTo: User
  createdById: string
  createdBy: User
  status: string
  percentComplete: number
  evidenceUrl?: string | null
  evidenceNotes?: string | null
  rating?: number | null
  approvalStatus?: string | null
  approvedById?: string | null
  approvedBy?: User | null
  approvedAt?: string | null
  progressNotes?: string | null
  completedAt?: string | null
  documentId?: string | null
  document?: RiskDocument | null
  createdAt: string
  updatedAt: string
}

export default function RiskManagementPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'my-risks' | 'upload' | 'documents'>('my-risks')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isComplianceOfficer, setIsComplianceOfficer] = useState(false)
  const [isUserExecutive, setIsUserExecutive] = useState(false)
  const [isManager, setIsManager] = useState(false)
  const [addRiskDialogOpen, setAddRiskDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [excelUploadDialogOpen, setExcelUploadDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<RiskDocument | null>(null)
  const [riskDocuments, setRiskDocuments] = useState<RiskDocument[]>([])
  const [myRiskTasks, setMyRiskTasks] = useState<RiskTask[]>([])
  const [loading, setLoading] = useState(true)
  const [processingUpload, setProcessingUpload] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  
  // Document upload state
  const [documentTitle, setDocumentTitle] = useState('')
  const [documentDescription, setDocumentDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  
  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelUploadError, setExcelUploadError] = useState('')
  
  // Distribution state
  const [executives, setExecutives] = useState<User[]>([])
  const [selectedExecutives, setSelectedExecutives] = useState<string[]>([])

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        setLoading(true)
        // Fetch current user
        const userRes = await fetch('/dashboard/performance/api/user')
        if (userRes.ok) {
          const userData = await userRes.json()
          setCurrentUser(userData)
          setIsComplianceOfficer(isRiskComplianceOfficer(userData))
          setIsUserExecutive(isExecutive(userData))
          setIsManager(isDepartmentManager(userData))
          
          // Set appropriate starting tab based on user role
          if (isRiskComplianceOfficer(userData)) {
            setActiveTab('upload')
          } else {
            setActiveTab('my-risks')
          }
          
          // Fetch risk documents if compliance officer or executive
          if (isRiskComplianceOfficer(userData) || isExecutive(userData)) {
            const docsRes = await fetch('/dashboard/performance/api/risk-documents')
            if (docsRes.ok) {
              const docsData = await docsRes.json()
              setRiskDocuments(docsData)
            }
          }
          
          // Fetch my risk tasks
          const tasksRes = await fetch('/dashboard/performance/api/risk-tasks/my-tasks')
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json()
            setMyRiskTasks(tasksData)
          }
          
          // Fetch executives if compliance officer
          if (isRiskComplianceOfficer(userData)) {
            const execRes = await fetch('/dashboard/performance/api/users/executives')
            if (execRes.ok) {
              const execData = await execRes.json()
              setExecutives(execData)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserAndData()
  }, [])

  const handleDownloadTemplate = () => {
    // Create a risk register template URL
    // This will be a predefined Excel template as per the example shown
    const templateUrl = '/dashboard/performance/api/risk-documents/template'
    
    // Open in a new tab
    window.open(templateUrl, '_blank')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setUploadError('')
    }
  }

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0])
      setExcelUploadError('')
    }
  }

  const handleUploadDocument = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      return
    }
    
    if (!documentTitle) {
      setUploadError('Please enter a document title')
      return
    }
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', documentTitle)
      formData.append('description', documentDescription)
      
      const response = await fetch('/dashboard/performance/api/risk-documents/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const newDoc = await response.json()
        setRiskDocuments([newDoc, ...riskDocuments])
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setDocumentTitle('')
        setDocumentDescription('')
      } else {
        const error = await response.json()
        setUploadError(error.message || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      setUploadError('Error uploading document')
    }
  }

  const handleDistributeDocument = async () => {
    if (!selectedDocument || selectedExecutives.length === 0) {
      return
    }
    
    try {
      const response = await fetch(`/dashboard/performance/api/risk-documents/${selectedDocument.id}/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executiveIds: selectedExecutives,
        }),
      })
      
      if (response.ok) {
        // Refresh documents list
        const docsRes = await fetch('/dashboard/performance/api/risk-documents')
        if (docsRes.ok) {
          const docsData = await docsRes.json()
          setRiskDocuments(docsData)
        }
        
        setDistributeDialogOpen(false)
        setSelectedDocument(null)
        setSelectedExecutives([])
      }
    } catch (error) {
      console.error('Error distributing document:', error)
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">Risk Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 leading-tight">Identify, assess, and manage risks for your department</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isComplianceOfficer && (
            <Button 
              variant="outline" size="sm"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Upload Risk Document</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          )}
          <Button size="sm" onClick={() => setAddRiskDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Risk Task
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
          <TabsTrigger value="my-risks">My Risk Tasks</TabsTrigger>
          {(isComplianceOfficer || isUserExecutive) && (
            <TabsTrigger value="documents">Risk Documents</TabsTrigger>
          )}
          {isComplianceOfficer && (
            <TabsTrigger value="upload">Document Upload</TabsTrigger>
          )}
        </TabsList>
        
        {/* My Risk Tasks Tab */}
        <TabsContent value="my-risks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Risk Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : myRiskTasks.length > 0 ? (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Risk Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRiskTasks.map((risk) => (
                      <TableRow key={risk.id} className="cursor-pointer" onClick={() => {}}>
                        <TableCell className="font-medium min-w-[180px]">{risk.title}</TableCell>
                        <TableCell className="whitespace-nowrap">{risk.riskCategory}</TableCell>
                        <TableCell>
                          <Badge variant={risk.priority === 'HIGH' ? 'destructive' : risk.priority === 'MEDIUM' ? 'default' : 'outline'}>
                            {risk.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {risk.status === 'COMPLETED' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : risk.status === 'IN_PROGRESS' ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                            {risk.status.replace('_', ' ')}
                          </div>
                        </TableCell>
                        <TableCell>{risk.dueDate ? new Date(risk.dueDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell className="text-right font-bold">{risk.riskScore || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              ) : (
                <div className="text-center py-12">
                  <ShieldAlert className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Risk Tasks Assigned</h3>
                  <p className="text-gray-500 mb-4">You don't have any risk tasks assigned to you</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Risk Documents Tab */}
        {(isComplianceOfficer || isUserExecutive) && (
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Risk Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : riskDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Title</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{`${doc.uploadedBy.firstName || ''} ${doc.uploadedBy.lastName || ''}`}</TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{doc.departmentName || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                              
                              {isUserExecutive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Implement delegation for executives
                                    toast({ title: 'Delegation feature coming soon', variant: 'destructive' })
                                  }}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {isComplianceOfficer && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedDocument(doc)
                                    setDistributeDialogOpen(true)
                                  }}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Risk Documents</h3>
                    <p className="text-gray-500 mb-4">There are no risk documents available</p>
                    {isComplianceOfficer && (
                      <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Risk Document
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {/* Document Upload Tab */}
        {isComplianceOfficer && (
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-500" />
                  Upload Risk Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-6 rounded-md border border-dashed border-gray-300 text-center">
                  <div className="max-w-md mx-auto space-y-6">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700">Risk Register Upload</h3>
                      <p className="text-gray-500 mt-1 mb-4">
                        Upload a risk register document using the template format
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setUploadDialogOpen(true)}
                      className="w-full py-6"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Risk Document
                    </Button>
                    
                    <div className="text-center">
                      <Button 
                        variant="link" 
                        onClick={handleDownloadTemplate}
                        className="text-sm"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download Template Format
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Risk Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                placeholder="Enter document title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter document description"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file">Risk Document File</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
            </div>
            
            {uploadError && (
              <div className="text-red-500 text-sm">{uploadError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUploadDocument}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Document Dialog */}
      <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Distribute Risk Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            {selectedDocument && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="font-semibold">{selectedDocument.title}</div>
                <div className="text-sm text-gray-500">
                  {selectedDocument.description || 'No description'}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Select Department Executives</Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
                {executives.map((exec) => (
                  <div key={exec.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={exec.id}
                      checked={selectedExecutives.includes(exec.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExecutives([...selectedExecutives, exec.id])
                        } else {
                          setSelectedExecutives(selectedExecutives.filter(id => id !== exec.id))
                        }
                      }}
                    />
                    <Label htmlFor={exec.id} className="cursor-pointer">
                      {`${exec.firstName || ''} ${exec.lastName || ''} (${exec.jobTitle || 'Executive'})`}
                    </Label>
                  </div>
                ))}
                
                {executives.length === 0 && (
                  <div className="text-gray-500 text-sm py-2 text-center">
                    No executives found
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDistributeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleDistributeDocument}
              disabled={!selectedDocument || selectedExecutives.length === 0}
            >
              Distribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Risk Options Dialog */}
      <Dialog open={addRiskDialogOpen} onOpenChange={setAddRiskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Button 
              variant="outline" 
              className="w-full h-auto py-6 flex flex-col items-center gap-3 hover:bg-blue-50 hover:border-blue-500 transition-all"
              onClick={() => {
                setAddRiskDialogOpen(false)
                // Navigate to manual risk entry page
                router.push('/dashboard/performance/dashboard/my-tasks/risk-management/create')
              }}
            >
              <Edit3 className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <div className="font-semibold text-base">Add New Risk Manually</div>
                <div className="text-sm text-gray-500 mt-1">Create a single risk entry with detailed information</div>
              </div>
            </Button>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full h-auto py-6 flex flex-col items-center gap-3 hover:bg-green-50 hover:border-green-500 transition-all"
                onClick={() => {
                  setAddRiskDialogOpen(false)
                  setExcelUploadDialogOpen(true)
                }}
              >
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <div className="font-semibold text-base">Upload Excel File</div>
                  <div className="text-sm text-gray-500 mt-1">Import multiple risks from a spreadsheet</div>
                </div>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full text-xs text-gray-600 hover:text-green-600 hover:bg-green-50"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-3 w-3 mr-1" />
                Download Excel Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Excel Upload Dialog */}
      <Dialog open={excelUploadDialogOpen} onOpenChange={setExcelUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Risk Tasks from Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 text-sm">
              <p>Upload an Excel file containing risk tasks. Please use the template format.</p>
              <p className="mt-1">The file should have columns for Risk Category, Risk Description, Cause, Impact, Likelihood, etc.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excel-file">Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileChange}
              />
            </div>

            {selectedDocument && (
              <div className="space-y-2">
                <Label>Linked Risk Document</Label>
                <div className="bg-gray-50 p-2 rounded text-sm">
                  {selectedDocument.title}
                </div>
              </div>
            )}

            {excelUploadError && (
              <div className="text-red-500 text-sm">{excelUploadError}</div>
            )}

            {uploadResult && (
              <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Upload Result</span>
                  <Badge variant="outline" className="ml-2">
                    {uploadResult.summary.success} success / {uploadResult.summary.errors} errors
                  </Badge>
                </div>

                {uploadResult.summary.errors > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-500">Errors:</p>
                    <ul className="text-xs text-red-500 list-disc list-inside">
                      {uploadResult.summary.errorDetails.slice(0, 5).map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {uploadResult.summary.errorDetails.length > 5 && (
                        <li>...and {uploadResult.summary.errorDetails.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExcelUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={async () => {
                if (!excelFile) {
                  setExcelUploadError('Please select an Excel file')
                  return
                }

                setProcessingUpload(true)
                setExcelUploadError('')
                setUploadResult(null)

                try {
                  const formData = new FormData()
                  formData.append('file', excelFile)
                  if (selectedDocument?.id) {
                    formData.append('documentId', selectedDocument.id)
                  }

                  const response = await fetch('/dashboard/performance/api/risk-tasks/upload-excel', {
                    method: 'POST',
                    body: formData
                  })

                  const result = await response.json()
                  setProcessingUpload(false)

                  if (response.ok) {
                    setUploadResult(result)
                    // Refresh the risk tasks if any were created
                    const tasksRes = await fetch('/dashboard/performance/api/risk-tasks/my-tasks')
                    if (tasksRes.ok) {
                      const tasksData = await tasksRes.json()
                      setMyRiskTasks(tasksData)
                    }
                  } else {
                    setExcelUploadError(result.error || 'Failed to upload Excel file')
                    if (result.errors && Array.isArray(result.errors)) {
                      setUploadResult({ summary: { errors: result.errors.length, errorDetails: result.errors } })
                    }
                  }
                } catch (error) {
                  console.error('Error uploading Excel file:', error)
                  setExcelUploadError('Error uploading Excel file')
                  setProcessingUpload(false)
                }
              }}
              disabled={processingUpload || !excelFile}
            >
              {processingUpload ? 'Processing...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
