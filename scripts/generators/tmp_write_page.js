const fs = require('fs');

const page = `'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Target, Users, User, Eye, Settings, Calendar, Plus, X, CheckCircle2, AlertCircle, Search, Star } from 'lucide-react'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { gradients, shadows } from '@/app/ui-standards'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const NSA_COMPETENCIES = [
  {
    name: 'Integrity',
    description: 'To maintain high ethical standards in everything we do, both in their work and their personal lives',
    color: 'blue',
  },
  {
    name: 'Excellent Performance',
    description: 'Geared towards promoting high quality work in the production of products and services',
    color: 'green',
  },
  {
    name: 'Professionalism',
    description: 'Portraying a high level of professionalism in all engagements and services offered by NSA',
    color: 'purple',
  },
  {
    name: 'Accountability',
    description: 'Ability to take ownership and hold each other accountable in fulfilling the obligations to account for own actions',
    color: 'orange',
  },
  {
    name: 'Partnership',
    description: 'Ability to forge partnerships that build mutual respect and drive innovation and growth for the Agency and its partners',
    color: 'teal',
    hasRandomRater: true,
  },
  {
    name: 'Customer-focussed',
    description: 'Ability to put customers needs first and foster a company culture dedicated to enhancing customer satisfaction and building strong customer relationships',
    color: 'pink',
  },
]

const RATER_TYPES = [
  { key: 'self',        label: 'Self',                      color: 'blue' },
  { key: 'peer',        label: 'Peer',                      color: 'purple' },
  { key: 'supervisor',  label: 'Supervisor',                color: 'green' },
  { key: 'dept_random', label: 'Dept. Colleague (Random)',  color: 'orange' },
  { key: 'org_random',  label: 'Org. Random (Partnership)', color: 'teal' },
]

function ratingLabel(score: number | null) {
  if (score === null) return null
  if (score >= 4.5) return 'Exceptional'
  if (score >= 3.5) return 'Excellent'
  if (score >= 2.5) return 'Good'
  if (score >= 1.5) return 'Fair'
  return 'Poor'
}

function ScoreBox({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400 italic">Pending</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-bold text-sm">{score.toFixed(1)}</span>
      <span className="text-xs text-gray-500">/ 5</span>
    </span>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={\`text-2xl transition-colors \${display >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}\`}
          aria-label={\`\${star} stars\`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {value}/5 — {ratingLabel(value)}
        </span>
      )}
    </div>
  )
}

interface Colleague {
  id: string
  name: string
  email: string
  jobTitle: string
  department: string
  isSubordinate: boolean
  sameDepartment: boolean
}

interface MyScores {
  rating360Id: string | null
  hasRating: boolean
  competencyScores: Record<string, Record<string, number | null>>
  overallAverage: number | null
}

export default function Rating360Page() {
  const { data: session } = useSession()
  const userId = session?.user?.id || ''
  const userRole = session?.user?.role || ''
  const isHCOrAdmin = ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE'].includes(userRole)

  const [activeTab, setActiveTab] = useState('my-rating')
  const [loading, setLoading] = useState(true)
  const [myScores, setMyScores] = useState<MyScores | null>(null)
  const [colleagues, setColleagues] = useState<Colleague[]>([])
  const [search, setSearch] = useState('')
  const [cycles, setCycles] = useState<any[]>([])
  const [cycleForm, setCycleForm] = useState({ name: '', description: '', startDate: '', endDate: '' })
  const [savingCycle, setSavingCycle] = useState(false)
  const [deleteCycleDialog, setDeleteCycleDialog] = useState<{ open: boolean; cycle: any }>({ open: false, cycle: null })

  // Rating dialog
  const [ratingDialog, setRatingDialog] = useState<{ open: boolean; person: Colleague | null; raterType: string }>({
    open: false, person: null, raterType: 'peer',
  })
  const [competencyScores, setCompetencyScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true
      fetchAll()
    }
  }, [userId])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [scoresRes, colleaguesRes] = await Promise.all([
        fetch('/dashboard/performance/api/360-rating/my-competency-scores'),
        fetch('/dashboard/performance/api/360-rating/colleagues'),
      ])
      if (scoresRes.ok) setMyScores(await scoresRes.json())
      if (colleaguesRes.ok) setColleagues(await colleaguesRes.json())

      if (isHCOrAdmin) {
        const cyclesRes = await fetch('/dashboard/performance/api/360-rating/cycles')
        if (cyclesRes.ok) setCycles(await cyclesRes.json())
      }
    } finally {
      setLoading(false)
    }
  }

  const openRatingDialog = (person: Colleague) => {
    const raterType = person.isSubordinate ? 'supervisor' : person.sameDepartment ? 'dept_random' : 'peer'
    setRatingDialog({ open: true, person, raterType })
    setCompetencyScores({})
    setComments('')
  }

  const openSelfAssessment = () => {
    setRatingDialog({
      open: true,
      person: { id: userId, name: 'Yourself', email: session?.user?.email || '', jobTitle: '', department: '', isSubordinate: false, sameDepartment: true },
      raterType: 'self',
    })
    setCompetencyScores({})
    setComments('')
  }

  const submitRating = async () => {
    if (!ratingDialog.person) return

    // Validate all required competencies have scores
    const required = NSA_COMPETENCIES.filter(c => ratingDialog.raterType !== 'org_random' || c.name === 'Partnership')
    const missing = required.filter(c => !competencyScores[c.name])
    if (missing.length > 0) {
      alert(\`Please rate all competencies. Missing: \${missing.map(c => c.name).join(', ')}\`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/rate-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateeId: ratingDialog.raterType === 'self' ? userId : ratingDialog.person.id,
          raterType: ratingDialog.raterType,
          competencyScores,
          comments,
        }),
      })
      if (res.ok) {
        setRatingDialog({ open: false, person: null, raterType: 'peer' })
        fetchAll()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to submit rating')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCycle = async () => {
    if (!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate) {
      alert('Please fill in all required fields')
      return
    }
    setSavingCycle(true)
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycleForm),
      })
      if (res.ok) {
        const cycle = await res.json()
        setCycles([cycle, ...cycles])
        setCycleForm({ name: '', description: '', startDate: '', endDate: '' })
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to create cycle')
      }
    } finally {
      setSavingCycle(false)
    }
  }

  const handleActivateCycle = async (cycleId: string) => {
    const res = await fetch(\`/dashboard/performance/api/360-rating/cycles/\${cycleId}/activate\`, { method: 'POST' })
    if (res.ok) fetchAll()
    else { const e = await res.json(); alert(e.error || 'Failed to activate') }
  }

  const handleDeleteCycle = async () => {
    if (!deleteCycleDialog.cycle) return
    const res = await fetch(\`/dashboard/performance/api/360-rating/cycles/\${deleteCycleDialog.cycle.id}\`, { method: 'DELETE' })
    if (res.ok) { setDeleteCycleDialog({ open: false, cycle: null }); fetchAll() }
    else { const e = await res.json(); alert(e.error || 'Failed to delete') }
  }

  const filteredColleagues = colleagues.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department.toLowerCase().includes(search.toLowerCase()) ||
      c.jobTitle.toLowerCase().includes(search.toLowerCase())
  )
  const subordinates = filteredColleagues.filter((c) => c.isSubordinate)
  const otherColleagues = filteredColleagues.filter((c) => !c.isSubordinate)

  const selfDone = NSA_COMPETENCIES.every(c => myScores?.competencyScores?.[c.name]?.self != null)
  const overallSelfAvg = myScores?.competencyScores
    ? (() => {
        const vals = NSA_COMPETENCIES.map(c => myScores!.competencyScores[c.name]?.self).filter(v => v != null) as number[]
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      })()
    : null

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <GoldSpinner size="lg" message="Loading 360-degree ratings..." />
      </div>
    )
  }

  const ratingDialogCompetencies =
    ratingDialog.raterType === 'org_random'
      ? NSA_COMPETENCIES.filter(c => c.name === 'Partnership')
      : NSA_COMPETENCIES

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold leading-tight">360-Degree Performance Rating</h1>
        <p className="text-sm text-gray-500">Comprehensive behavioural competency evaluation from multiple perspectives</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={\`grid w-full \${isHCOrAdmin ? 'grid-cols-3' : 'grid-cols-2'}\`}>
          <TabsTrigger value="my-rating">
            <User className="w-4 h-4 mr-2" /> My Rating
          </TabsTrigger>
          <TabsTrigger value="rate-others">
            <Users className="w-4 h-4 mr-2" /> Rate Others
          </TabsTrigger>
          {isHCOrAdmin && (
            <TabsTrigger value="manage-cycles">
              <Settings className="w-4 h-4 mr-2" /> Manage Cycles
            </TabsTrigger>
          )}
        </TabsList>

        {/* ═══════════════════════════ MY RATING TAB ═══════════════════════════ */}
        <TabsContent value="my-rating" className="space-y-4 mt-4">
          {/* Overall score card */}
          <Card>
            <CardHeader style={{ background: gradients.navyHeader, boxShadow: shadows.header }} className="rounded-t-md">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5" /> My 360° Behavioural Competency Rating
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    NSA's 6 core behavioural competencies — rated by self, peers, supervisor, and colleagues
                  </CardDescription>
                </div>
                {overallSelfAvg !== null && (
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">{overallSelfAvg.toFixed(1)}</div>
                    <div className="text-white/70 text-xs">Self average / 5</div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!selfDone ? (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-blue-900">Complete your Self Assessment</p>
                    <p className="text-sm text-blue-700 mt-0.5">Rate yourself on all 6 NSA behavioural competencies</p>
                  </div>
                  <Button onClick={openSelfAssessment} className="bg-blue-600 hover:bg-blue-700">
                    Start Self Assessment
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Self assessment completed</span>
                  </div>
                  <Button variant="outline" onClick={openSelfAssessment} size="sm" className="border-green-300 text-green-700">
                    Update Self Assessment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {NSA_COMPETENCIES.map((comp, idx) => {
              const scores = myScores?.competencyScores?.[comp.name] ?? {}
              const raterTypes = comp.hasRandomRater
                ? RATER_TYPES
                : RATER_TYPES.filter(r => r.key !== 'org_random')

              return (
                <Card key={comp.name} className="border-l-4" style={{ borderLeftColor: \`var(--color-\${comp.color}-500, #6366f1)\` }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                      <div>
                        <CardTitle className="text-base">{comp.name}</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{comp.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      {raterTypes.map(rt => (
                        <div key={rt.key} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 text-xs">{rt.label}</span>
                          <ScoreBox score={scores[rt.key] ?? null} />
                        </div>
                      ))}
                    </div>
                    {comp.hasRandomRater && (
                      <p className="text-xs text-purple-600 mt-2 italic">Partnership includes an organisation-wide random rater</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Rater type legend */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">How ratings are collected:</p>
              <div className="flex flex-wrap gap-2">
                {RATER_TYPES.map(rt => (
                  <Badge key={rt.key} variant="outline" className="text-xs">
                    {rt.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your supervisor rates you as a supervisor. Colleagues in your department rate you as a department colleague. Colleagues from other departments rate you as a peer. For Partnership, one additional organisation-wide random rater is included.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════ RATE OTHERS TAB ═══════════════════════════ */}
        <TabsContent value="rate-others" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, department or job title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Subordinates */}
          {subordinates.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                My Direct Reports
                <Badge className="bg-green-100 text-green-800">{subordinates.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subordinates.map(person => (
                  <ColleagueCard key={person.id} person={person} onRate={() => openRatingDialog(person)} />
                ))}
              </div>
            </div>
          )}

          {/* All other colleagues */}
          <div>
            {subordinates.length > 0 && (
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Other Colleagues
                <Badge className="bg-blue-100 text-blue-800">{otherColleagues.length}</Badge>
              </h3>
            )}
            {filteredColleagues.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No colleagues found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {otherColleagues.map(person => (
                  <ColleagueCard key={person.id} person={person} onRate={() => openRatingDialog(person)} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════════════════ MANAGE CYCLES TAB (HC only) ═══════════════════════════ */}
        {isHCOrAdmin && (
          <TabsContent value="manage-cycles" className="space-y-4 mt-4">
            <Card className="border-2 border-purple-200">
              <CardHeader style={{ background: gradients.navyHeader, boxShadow: shadows.header }} className="rounded-t-md">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5" /> Create New Rating Cycle
                </CardTitle>
                <CardDescription className="text-white/70">Set the evaluation period dates for the organisation</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Cycle Name *</Label>
                    <Input placeholder="e.g. 2025/26 Annual Review" value={cycleForm.name} onChange={e => setCycleForm({ ...cycleForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input placeholder="Optional" value={cycleForm.description} onChange={e => setCycleForm({ ...cycleForm, description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input type="date" value={cycleForm.startDate} onChange={e => setCycleForm({ ...cycleForm, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date *</Label>
                    <Input type="date" value={cycleForm.endDate} onChange={e => setCycleForm({ ...cycleForm, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateCycle} disabled={savingCycle} className="bg-purple-600 hover:bg-purple-700">
                    {savingCycle ? 'Creating...' : 'Create Cycle'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Existing Cycles</CardTitle>
              </CardHeader>
              <CardContent>
                {cycles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>No cycles created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cycles.map(cycle => (
                      <div key={cycle.id} className={\`p-4 border rounded-lg \${cycle.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{cycle.name}</span>
                              {cycle.isActive && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!cycle.isActive && (
                              <Button variant="outline" size="sm" onClick={() => handleActivateCycle(cycle.id)}>Activate</Button>
                            )}
                            <Button
                              variant="outline" size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteCycleDialog({ open: true, cycle })}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ═══════════════════════════ RATING DIALOG ═══════════════════════════ */}
      <Dialog open={ratingDialog.open} onOpenChange={open => !open && setRatingDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {ratingDialog.raterType === 'self'
                ? 'Self Assessment'
                : \`Rate \${ratingDialog.person?.name}\`}
            </DialogTitle>
            <DialogDescription>
              {ratingDialog.raterType === 'self'
                ? 'Rate yourself on each of the 6 NSA behavioural competencies (1 = Poor, 5 = Exceptional)'
                : ratingDialog.raterType === 'supervisor'
                ? \`You are rating as \${ratingDialog.person?.name}'s Supervisor — rate all 6 competencies\`
                : ratingDialog.raterType === 'dept_random'
                ? \`You are a department colleague of \${ratingDialog.person?.name} — rate all 6 competencies\`
                : ratingDialog.raterType === 'org_random'
                ? \`Organisation-wide rating for \${ratingDialog.person?.name} — rate Partnership competency only\`
                : \`You are a peer of \${ratingDialog.person?.name} — rate all 6 competencies\`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {ratingDialogCompetencies.map(comp => (
              <div key={comp.name} className="border rounded-lg p-4">
                <div className="mb-2">
                  <p className="font-semibold text-gray-900">{comp.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{comp.description}</p>
                </div>
                <StarInput
                  value={competencyScores[comp.name] ?? 0}
                  onChange={v => setCompetencyScores(prev => ({ ...prev, [comp.name]: v }))}
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label>Additional Comments (optional)</Label>
              <Textarea
                placeholder="Any additional feedback..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog(d => ({ ...d, open: false }))} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitRating} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cycle Confirmation */}
      <AlertDialog open={deleteCycleDialog.open} onOpenChange={open => !open && setDeleteCycleDialog(d => ({ ...d, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteCycleDialog.cycle?.name}</strong>? This will permanently remove all ratings in this cycle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCycle} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ColleagueCard({ person, onRate }: { person: Colleague; onRate: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 truncate">{person.name}</p>
          {person.isSubordinate && <Badge className="bg-green-100 text-green-800 text-xs">Direct Report</Badge>}
          {person.sameDepartment && !person.isSubordinate && <Badge className="bg-blue-100 text-blue-800 text-xs">Same Dept.</Badge>}
        </div>
        {person.jobTitle && <p className="text-sm text-gray-500 truncate">{person.jobTitle}</p>}
        {person.department && <p className="text-xs text-gray-400 truncate">{person.department}</p>}
      </div>
      <Button size="sm" onClick={onRate} className="ml-3 flex-shrink-0">
        <Star className="w-3 h-3 mr-1" /> Rate
      </Button>
    </div>
  )
}
`;

fs.writeFileSync(
  'apps/web/app/(protected)/dashboard/performance/dashboard/360-degree/page.tsx',
  page,
  'utf8'
);
console.log('Written OK - lines:', page.split('\n').length);
