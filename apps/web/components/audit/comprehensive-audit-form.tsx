'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, User, Search } from 'lucide-react'

interface BusinessObjective {
  objective: string
  controlAssessment: 'Satisfactory' | 'Needs Improvement'
}

interface DetailedObservation {
  finding: string
  riskRanking: string
  recommendation: string
  responsibleParty: string
  estimatedCompletionDate: string
  impact: string
}

interface TeamUser {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

interface ComprehensiveAuditFormProps {
  users: TeamUser[]
  onUserSearch: (search: string) => void
  onSubmit: (data: any) => void
  onCancel: () => void
  loading?: boolean
}

export function ComprehensiveAuditForm({ users, onUserSearch, onSubmit, onCancel, loading }: ComprehensiveAuditFormProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [userSearch, setUserSearch] = useState('')
  
  // Basic info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  
  // Business Objectives
  const [businessObjectives, setBusinessObjectives] = useState<BusinessObjective[]>([
    { objective: '', controlAssessment: 'Satisfactory' }
  ])
  
  // Text sections
  const [legislation, setLegislation] = useState('')
  const [objectiveAndScope, setObjectiveAndScope] = useState('')
  const [conclusion, setConclusion] = useState('')
  
  // Detailed Observations
  const [detailedObservations, setDetailedObservations] = useState<DetailedObservation[]>([
    { finding: '', riskRanking: 'Medium', recommendation: '', responsibleParty: '', estimatedCompletionDate: '', impact: '' }
  ])

  const addBusinessObjective = () => {
    setBusinessObjectives([...businessObjectives, { objective: '', controlAssessment: 'Satisfactory' }])
  }

  const removeBusinessObjective = (index: number) => {
    setBusinessObjectives(businessObjectives.filter((_, i) => i !== index))
  }

  const updateBusinessObjective = (index: number, field: keyof BusinessObjective, value: any) => {
    const updated = [...businessObjectives]
    updated[index] = { ...updated[index], [field]: value }
    setBusinessObjectives(updated)
  }

  const addDetailedObservation = () => {
    setDetailedObservations([...detailedObservations, { finding: '', riskRanking: 'Medium', recommendation: '', responsibleParty: '', estimatedCompletionDate: '', impact: '' }])
  }

  const removeDetailedObservation = (index: number) => {
    setDetailedObservations(detailedObservations.filter((_, i) => i !== index))
  }

  const updateDetailedObservation = (index: number, field: keyof DetailedObservation, value: string) => {
    const updated = [...detailedObservations]
    updated[index] = { ...updated[index], [field]: value }
    setDetailedObservations(updated)
  }

  const handleSubmit = () => {
    const data = {
      title,
      description,
      priority,
      dueDate,
      assignedToId,
      businessObjectives: businessObjectives.filter(bo => bo.objective.trim()),
      legislation,
      objectiveAndScope,
      conclusion,
      detailedObservations: detailedObservations.filter(obs => obs.finding.trim())
    }
    onSubmit(data)
  }

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value)
    onUserSearch(value)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="objectives">Objectives</TabsTrigger>
          <TabsTrigger value="scope">Scope & Legislation</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="conclusion">Conclusion</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <div>
            <Label>Audit Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Asset Management Process Audit" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the audit..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Assign To (leave empty for self)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search team members..." value={userSearch} onChange={e => handleUserSearchChange(e.target.value)} />
            </div>
            {users.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto border rounded-md">
                {users.map(u => (
                  <button key={u.id} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${assignedToId === u.id ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => setAssignedToId(u.id)}>
                    <User className="w-3 h-3" />
                    {u.firstName} {u.lastName} <span className="text-gray-400 text-xs">({u.email})</span>
                  </button>
                ))}
              </div>
            )}
            {assignedToId && (
              <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setAssignedToId('')}>
                Clear assignment (assign to self)
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Business Objectives Tab */}
        <TabsContent value="objectives" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Business Objectives & Control Assessment</Label>
            <Button size="sm" onClick={addBusinessObjective}>
              <Plus className="w-4 h-4 mr-1" />
              Add Objective
            </Button>
          </div>
          {businessObjectives.map((obj, index) => (
            <Card key={index}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Label className="text-sm">Business Objective</Label>
                    <Textarea
                      value={obj.objective}
                      onChange={e => updateBusinessObjective(index, 'objective', e.target.value)}
                      placeholder="e.g., To assess adequacy, compliance, and alignment of asset management policies..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  {businessObjectives.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeBusinessObjective(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Control Assessment</Label>
                  <Select value={obj.controlAssessment} onValueChange={v => updateBusinessObjective(index, 'controlAssessment', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Satisfactory">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-green-500"></span>
                          Satisfactory
                        </span>
                      </SelectItem>
                      <SelectItem value="Needs Improvement">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-yellow-500"></span>
                          Needs Improvement
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Scope & Legislation Tab */}
        <TabsContent value="scope" className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Legislation</Label>
            <Textarea
              value={legislation}
              onChange={e => setLegislation(e.target.value)}
              placeholder="e.g., The State-Owned Enterprises Governance Act, Act No. 2, 2006 requires..."
              rows={4}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-base font-semibold">Objective and Scope</Label>
            <Textarea
              value={objectiveAndScope}
              onChange={e => setObjectiveAndScope(e.target.value)}
              placeholder="The objective is to determine how asset management processes are managed..."
              rows={6}
              className="mt-2"
            />
          </div>
        </TabsContent>

        {/* Detailed Observations Tab */}
        <TabsContent value="observations" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Detailed Observations and Action Plan</Label>
            <Button size="sm" onClick={addDetailedObservation}>
              <Plus className="w-4 h-4 mr-1" />
              Add Observation
            </Button>
          </div>
          {detailedObservations.map((obs, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Observation #{index + 1}</CardTitle>
                  {detailedObservations.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeDetailedObservation(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Finding</Label>
                  <Textarea
                    value={obs.finding}
                    onChange={e => updateDetailedObservation(index, 'finding', e.target.value)}
                    placeholder="Describe the finding..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Risk Ranking</Label>
                    <Select value={obs.riskRanking} onValueChange={v => updateDetailedObservation(index, 'riskRanking', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Estimated Completion Date</Label>
                    <Input type="date" value={obs.estimatedCompletionDate} onChange={e => updateDetailedObservation(index, 'estimatedCompletionDate', e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Recommendation</Label>
                  <Textarea
                    value={obs.recommendation}
                    onChange={e => updateDetailedObservation(index, 'recommendation', e.target.value)}
                    placeholder="Recommended action..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Responsible Party</Label>
                  <Input
                    value={obs.responsibleParty}
                    onChange={e => updateDetailedObservation(index, 'responsibleParty', e.target.value)}
                    placeholder="e.g., Executive: Finance and Administration"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Impact</Label>
                  <Textarea
                    value={obs.impact}
                    onChange={e => updateDetailedObservation(index, 'impact', e.target.value)}
                    placeholder="Describe the impact..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Conclusion Tab */}
        <TabsContent value="conclusion" className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Conclusion</Label>
            <Textarea
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              placeholder="The audit results provide substantial assurance that the controls, processes, and governance structures..."
              rows={8}
              className="mt-2"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-500">
          {activeTab === 'basic' && 'Step 1 of 5: Basic Information'}
          {activeTab === 'objectives' && 'Step 2 of 5: Business Objectives'}
          {activeTab === 'scope' && 'Step 3 of 5: Scope & Legislation'}
          {activeTab === 'observations' && 'Step 4 of 5: Detailed Observations'}
          {activeTab === 'conclusion' && 'Step 5 of 5: Conclusion'}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {activeTab !== 'conclusion' ? (
            <Button onClick={() => {
              const tabs = ['basic', 'objectives', 'scope', 'observations', 'conclusion']
              const currentIndex = tabs.indexOf(activeTab)
              if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1])
            }}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create Audit Task'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
