'use client'

import { toast } from "@/hooks/use-toast";
import React, { useState, useEffect, useRef } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings, Users, User, Target, Calendar, Plus, X, CheckCircle2, Search, RefreshCw,
} from 'lucide-react'
import { GoldSpinner } from '@/components/ui/gold-spinner'
import { gradients, shadows } from '@/app/ui-standards'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ─── NSA Behavioural Competencies (hardcoded — no DB setup required) ──────────
const NSA_COMPETENCIES = [
  { name: 'Integrity',            description: 'To maintain high ethical standards in everything we do, both in their work and their personal lives',                                                                                                                   colorClass: 'border-l-blue-500',   badgeClass: 'bg-blue-100 text-blue-800'   },
  { name: 'Excellent Performance', description: 'Geared towards promoting high quality work in the production of products and services',                                                                                                                               colorClass: 'border-l-green-500',  badgeClass: 'bg-green-100 text-green-800' },
  { name: 'Professionalism',       description: 'Portraying a high level of professionalism in all engagements and services offered by NSA',                                                                                                                           colorClass: 'border-l-purple-500', badgeClass: 'bg-purple-100 text-purple-800'},
  { name: 'Accountability',        description: 'Ability to take ownership and hold each other accountable in fulfilling the obligations to account for own actions',                                                                                                   colorClass: 'border-l-orange-500', badgeClass: 'bg-orange-100 text-orange-800'},
  { name: 'Partnership',           description: 'Ability to forge partnerships that build mutual respect and drive innovation and growth for the Agency and its partners',                                                                                              colorClass: 'border-l-teal-500',   badgeClass: 'bg-teal-100 text-teal-800'   },
  { name: 'Customer-focussed',     description: 'Ability to put customers needs first and foster a company culture dedicated to enhancing customer satisfaction and building strong customer relationships',                                                             colorClass: 'border-l-pink-500',   badgeClass: 'bg-pink-100 text-pink-800'   },
]

// ─── 4 rater perspectives ─────────────────────────────────────────────────────
const RATER_TYPES = [
  { key: 'self',        label: 'Self Assessment',                              shortLabel: 'Self',        color: 'text-blue-700',   description: 'You rate yourself'                                              },
  { key: 'supervisor',  label: 'Direct Supervisor',                            shortLabel: 'Supervisor',  color: 'text-green-700',  description: 'Your direct line manager rates you'                             },
  { key: 'dept_random', label: 'Random Colleague (Same Department)',           shortLabel: 'Dept. (Random)', color: 'text-orange-700', description: 'A randomly selected colleague from your own department'        },
  { key: 'org_random',  label: 'Random Employee (Organisation-wide)',          shortLabel: 'Org. (Random)',  color: 'text-teal-700',   description: 'A randomly selected employee from anywhere in the organisation' },
]

const raterLabel = (key: string) => RATER_TYPES.find((r) => r.key === key)?.label ?? key
const raterShort = (key: string) => RATER_TYPES.find((r) => r.key === key)?.shortLabel ?? key

function scoreLabel(v: number | null) {
  if (v === null) return null
  if (v >= 4.5) return 'Exceptional'
  if (v >= 3.5) return 'Excellent'
  if (v >= 2.5) return 'Good'
  if (v >= 1.5) return 'Fair'
  return 'Needs Improvement'
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400 italic">Pending</span>
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold text-sm">
      {score.toFixed(1)}<span className="text-xs text-gray-400 font-normal">/5</span>
    </span>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const d = hover || value
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s} type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${d >= s ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-300'}`}
        >★</button>
      ))}
      {value > 0 && <span className="ml-2 text-xs text-gray-500">{value}/5 · {scoreLabel(value)}</span>}
    </div>
  )
}

interface Assignment {
  id: string
  name: string
  jobTitle: string
  department: string
  raterType: string
  hasRated: boolean
  peerRating360Id?: string
  rating360Id?: string
  existingScores?: Record<string, number>
  existingComments?: string
}

interface CompScores {
  [competency: string]: {
    self: number | null
    supervisor: number | null
    dept_random: number | null
    org_random: number | null
    avg: number | null
  }
}

interface MyData {
  rating360Id: string | null
  competencyScores: CompScores
  overallAverage: number | null
}

export default function Rating360Page() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || ''
  const jobTitleLower = (session?.user?.jobTitle || '').toLowerCase()
  // Only HC Executive and OD Specialist can manage cycles (+ ADMIN/SG superusers)
  const canManageCycles =
    jobTitleLower.includes('human capital') ||
    jobTitleLower.includes('od specialist') ||
    ['ADMIN', 'SG'].includes(userRole)

  const [activeTab, setActiveTab] = useState('my-rating')
  const [loading, setLoading] = useState(true)
  const [myData, setMyData] = useState<MyData | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [search, setSearch] = useState('')
  const [cycles, setCycles] = useState<any[]>([])
  const [cycleForm, setCycleForm] = useState({ name: '', description: '', startDate: '', endDate: '' })
  const [savingCycle, setSavingCycle] = useState(false)
  const [initializingRaters, setInitializingRaters] = useState(false)
  const [initResult, setInitResult] = useState<string>('')
  const [deleteCycle, setDeleteCycle] = useState<any>(null)
  const [clearingAssignments, setClearingAssignments] = useState(false)
  const [resettingSelf, setResettingSelf] = useState(false)
  const [clearingPerson, setClearingPerson] = useState<string | null>(null)

  const [ratingDialog, setRatingDialog] = useState<{
    open: boolean; person: Assignment | null; isSelf: boolean
  }>({ open: false, person: null, isSelf: false })
  const [compScores, setCompScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetched = useRef(false)

  useEffect(() => {
    if (!fetched.current) { fetched.current = true; fetchAll() }
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [scoreRes, assignRes] = await Promise.all([
        fetch('/dashboard/performance/api/360-rating/my-competency-scores'),
        fetch('/dashboard/performance/api/360-rating/my-assignments'),
      ])
      if (scoreRes.ok) setMyData(await scoreRes.json())
      if (assignRes.ok) setAssignments(await assignRes.json())

      if (canManageCycles) {
        const cycRes = await fetch('/dashboard/performance/api/360-rating/cycles')
        if (cycRes.ok) setCycles(await cycRes.json())
      }
    } finally {
      setLoading(false)
    }
  }

  function openSelf() {
    setRatingDialog({ open: true, person: null, isSelf: true })
    setCompScores({})
    setComments('')
  }

  function openRate(person: Assignment) {
    setRatingDialog({ open: true, person, isSelf: false })
    // Pre-populate with existing scores if this is an update
    setCompScores(person.existingScores && Object.keys(person.existingScores).length > 0 ? { ...person.existingScores } : {})
    setComments(person.existingComments || '')
  }

  async function clearPersonRating(assignment: Assignment) {
    setClearingPerson(assignment.peerRating360Id ?? assignment.id + assignment.raterType)
    try {
      const body: any = {}
      if (assignment.peerRating360Id) {
        body.peerRating360Id = assignment.peerRating360Id
      } else if (assignment.rating360Id && assignment.raterType === 'supervisor') {
        body.rating360Id = assignment.rating360Id
        body.raterType = 'supervisor'
      } else {
        toast({ title: 'Cannot determine which rating to clear', variant: 'destructive' })
        return
      }
      const res = await fetch('/dashboard/performance/api/360-rating/clear-person-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) fetchAll()
      else { const e = await res.json(); toast({ title: e.error || 'Failed to clear', variant: 'destructive' }) }
    } finally {
      setClearingPerson(null)
    }
  }

  async function submitRating() {
    const missing = NSA_COMPETENCIES.filter((c) => !compScores[c.name])
    if (missing.length > 0) {
      toast({ title: 'Please rate all 6 competencies before submitting.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const body: any = {
        rateeId: ratingDialog.person?.id ?? '',
        raterType: ratingDialog.isSelf ? 'self' : ratingDialog.person!.raterType,
        competencyScores: compScores,
        comments,
      }
      if (ratingDialog.person?.peerRating360Id) body.peerRating360Id = ratingDialog.person.peerRating360Id

      const res = await fetch('/dashboard/performance/api/360-rating/rate-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setRatingDialog({ open: false, person: null, isSelf: false })
        fetchAll()
      } else {
        const e = await res.json()
        toast({ title: e.error || 'Failed to submit rating', variant: 'destructive' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateCycle() {
    if (!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate) {
      toast({ title: 'Name, start date and end date are required', variant: 'destructive' })
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
        const c = await res.json()
        setCycles((prev) => [c, ...prev])
        setCycleForm({ name: '', description: '', startDate: '', endDate: '' })
      } else {
        const e = await res.json(); toast({ title: e.error || 'Failed', variant: 'destructive' })
      }
    } finally { setSavingCycle(false) }
  }

  async function handleInitRaters(force = false) {
    setInitializingRaters(true)
    setInitResult('')
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/init-random-raters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (res.ok) {
        setInitResult(data.message || 'Done')
        fetchAll()
      } else {
        setInitResult(data.error || 'Failed')
      }
    } finally { setInitializingRaters(false) }
  }

  async function handleClearAssignments() {
    setClearingAssignments(true)
    setInitResult('')
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/clear-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRated: false }),
      })
      const data = await res.json()
      if (res.ok) { setInitResult(data.message || 'Cleared'); fetchAll() }
      else setInitResult(data.error || 'Failed to clear')
    } finally { setClearingAssignments(false) }
  }

  async function handleResetSelf() {
    setResettingSelf(true)
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/reset-self', { method: 'POST' })
      const data = await res.json()
      if (res.ok) fetchAll()
      else toast({ title: data.error || 'Failed to reset', variant: 'destructive' })
    } finally { setResettingSelf(false) }
  }

  async function handleActivate(id: string) {
    const res = await fetch(`/dashboard/performance/api/360-rating/cycles/${id}/activate`, { method: 'POST' })
    if (res.ok) fetchAll(); else { const e = await res.json(); toast({ title: e.error || 'Failed', variant: 'destructive' }) }
  }

  async function handleDeleteCycle() {
    if (!deleteCycle) return
    const res = await fetch(`/dashboard/performance/api/360-rating/cycles/${deleteCycle.id}`, { method: 'DELETE' })
    if (res.ok) { setDeleteCycle(null); fetchAll() }
    else { const e = await res.json(); toast({ title: e.error || 'Failed', variant: 'destructive' }) }
  }

  const selfDone = myData
    ? NSA_COMPETENCIES.every((c) => myData.competencyScores?.[c.name]?.self != null)
    : false

  const filteredAssignments = assignments.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.department.toLowerCase().includes(search.toLowerCase())
  )
  const superviseeAssignments = filteredAssignments.filter((a) => a.raterType === 'supervisor')
  const randomAssignments = filteredAssignments.filter((a) => a.raterType !== 'supervisor')

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <GoldSpinner size="lg" message="Loading 360-degree ratings..." />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">360-Degree Performance Rating</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          NSA Behavioural Competency evaluation — rated by 4 perspectives: Self, Supervisor, Dept. Colleague (random) &amp; Org. Random Employee
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-rating"><User className="w-4 h-4 mr-2" />My Rating</TabsTrigger>
          <TabsTrigger value="rate-others"><Users className="w-4 h-4 mr-2" />Rate Others</TabsTrigger>
        </TabsList>

        {/* ══════════ MY RATING ══════════ */}
        <TabsContent value="my-rating" className="space-y-4 mt-4">
          {/* Header summary */}
          <Card>
            <CardHeader style={{ background: gradients.navyHeader, boxShadow: shadows.header }} className="rounded-t-md">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5" /> My 360° Behavioural Competency Rating
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Rated by 4 perspectives across all 6 NSA core competencies
                  </CardDescription>
                </div>
                {myData?.overallAverage != null && (
                  <div className="text-right">
                    <p className="text-4xl font-bold text-white">{myData.overallAverage.toFixed(1)}</p>
                    <p className="text-white/60 text-xs">Overall average / 5</p>
                    <p className="text-white/80 text-xs font-medium">{scoreLabel(myData.overallAverage)}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!selfDone ? (
                <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-blue-900">Complete your Self Assessment</p>
                    <p className="text-sm text-blue-700 mt-0.5">Rate yourself on all 6 NSA behavioural competencies (1–5 scale)</p>
                  </div>
                  <Button onClick={openSelf} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                    Start Self Assessment
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Self assessment completed</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={openSelf} className="border-green-300 text-green-700">
                      Update
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={resettingSelf}
                      onClick={() => {
                        if (confirm('Clear your self-assessment? All your self-scores will be removed.')) handleResetSelf()
                      }}
                    >
                      {resettingSelf ? 'Clearing...' : 'Clear'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {NSA_COMPETENCIES.map((comp, idx) => {
              const cs = myData?.competencyScores?.[comp.name]
              return (
                <Card key={comp.name} className={`border-l-4 ${comp.colorClass}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <CardTitle className="text-sm leading-tight">{comp.name}</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{comp.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-1 pb-3">
                    <div className="space-y-1.5 mb-3">
                      {RATER_TYPES.map((rt) => (
                        <div key={rt.key} className="flex items-center justify-between">
                          <span className={`text-xs ${rt.color}`}>{rt.shortLabel}</span>
                          <ScorePill score={cs?.[rt.key as keyof typeof cs] as number | null ?? null} />
                        </div>
                      ))}
                    </div>
                    {/* Average divider */}
                    <div className="border-t pt-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Average</span>
                      {cs?.avg != null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-gray-900">{(cs.avg as number).toFixed(1)}</span>
                          <Badge className={`${comp.badgeClass} text-xs`}>{scoreLabel(cs.avg as number)}</Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No ratings yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ══════════ RATE OTHERS ══════════ */}
        <TabsContent value="rate-others" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search name or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No rating assignments yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your assignments will appear here once the HC Executive initialises the rating cycle.
                  {superviseeAssignments.length === 0 && ' If you are a supervisor, your direct reports will also appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Direct Reports */}
              {superviseeAssignments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    My Direct Reports
                    <Badge className="bg-green-100 text-green-700">{superviseeAssignments.length}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {superviseeAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id + a.raterType}
                        assignment={a}
                        onRate={() => openRate(a)}
                        onClear={() => clearPersonRating(a)}
                        clearingId={clearingPerson}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Random assignments */}
              {randomAssignments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    My Random Assignments
                    <Badge className="bg-blue-100 text-blue-700">{randomAssignments.length}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {randomAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id + a.raterType}
                        assignment={a}
                        onRate={() => openRate(a)}
                        onClear={() => clearPersonRating(a)}
                        clearingId={clearingPerson}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Manage Cycles moved to Task Management page (/dashboard/performance/dashboard/tasks) */}
        {false && (
          <TabsContent value="manage-cycles" className="space-y-4 mt-4">
            {/* Initialize random raters */}
            <Card className="border-2 border-teal-200">
              <CardHeader style={{ background: gradients.navyHeader, boxShadow: shadows.header }} className="rounded-t-md">
                <CardTitle className="text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" /> Initialize Random Rater Assignments
                </CardTitle>
                <CardDescription className="text-white/70">
                  Auto-assigns one org-wide random rater and one department random rater for every employee in the active cycle.
                  Supervisors are assigned automatically from the reporting line.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    onClick={() => handleInitRaters(false)}
                    disabled={initializingRaters}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {initializingRaters ? 'Initializing...' : 'Initialize Random Raters'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('Force re-initialize will clear all PENDING (unrated) assignments and reassign correctly. Completed ratings are preserved. Continue?')) {
                        handleInitRaters(true)
                      }
                    }}
                    disabled={initializingRaters}
                    className="border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    Force Re-initialize
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm('This will PERMANENTLY delete all current random assignments (both pending and completed). Use this to start completely fresh. Continue?')) {
                        handleClearAssignments()
                      }
                    }}
                    disabled={clearingAssignments || initializingRaters}
                    className="border-red-400 text-red-700 hover:bg-red-50"
                  >
                    {clearingAssignments ? 'Clearing...' : 'Clear All Assignments'}
                  </Button>
                  {initResult && (
                    <p className={`text-sm font-medium ${initResult.includes('error') || initResult.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
                      {initResult}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  <strong>Initialize Random Raters</strong> — adds assignments if not yet done.<br />
                  <strong>Force Re-initialize</strong> — clears unrated assignments and reassigns.<br />
                  <strong>Clear All Assignments</strong> — wipes everything for a completely fresh start, then use Initialize.
                </p>
              </CardContent>
            </Card>

            {/* Create new cycle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create New Rating Cycle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Cycle Name *</Label>
                    <Input placeholder="e.g. 2025/26 Annual Review" value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input placeholder="Optional" value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input type="date" value={cycleForm.startDate} onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>End Date *</Label>
                    <Input type="date" value={cycleForm.endDate} onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateCycle} disabled={savingCycle}>
                    {savingCycle ? 'Creating...' : 'Create Cycle'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing cycles */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Existing Cycles</CardTitle></CardHeader>
              <CardContent>
                {cycles.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2" />
                    <p>No cycles yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cycles.map((c) => (
                      <div key={c.id} className={`p-4 border rounded-lg ${c.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{c.name}</span>
                              {c.isActive && <Badge className="bg-green-100 text-green-800">Active</Badge>}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!c.isActive && (
                              <Button variant="outline" size="sm" onClick={() => handleActivate(c.id)}>Activate</Button>
                            )}
                            <Button
                              variant="outline" size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteCycle(c)}
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

      {/* ══════════ RATING DIALOG ══════════ */}
      <Dialog open={ratingDialog.open} onOpenChange={(o) => !o && setRatingDialog((d) => ({ ...d, open: false }))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {ratingDialog.isSelf ? 'Self Assessment' : `Rate ${ratingDialog.person?.name}`}
            </DialogTitle>
            <DialogDescription>
              {ratingDialog.isSelf
                ? 'Rate yourself on each of the 6 NSA Behavioural Competencies (1 = Poor, 5 = Exceptional)'
                : (() => {
                    const rt = RATER_TYPES.find((r) => r.key === ratingDialog.person?.raterType)
                    return rt ? `You are rating as: ${rt.label} — ${rt.description}` : 'Rate all 6 competencies'
                  })()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {NSA_COMPETENCIES.map((comp) => (
              <div key={comp.name} className={`border rounded-lg p-4 border-l-4 ${comp.colorClass}`}>
                <p className="font-semibold text-gray-900 text-sm">{comp.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">{comp.description}</p>
                <StarRating
                  value={compScores[comp.name] ?? 0}
                  onChange={(v) => setCompScores((prev) => ({ ...prev, [comp.name]: v }))}
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label>Additional Comments (optional)</Label>
              <Textarea
                placeholder="Any additional feedback..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog((d) => ({ ...d, open: false }))} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitRating} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete cycle confirm */}
      <AlertDialog open={!!deleteCycle} onOpenChange={(o) => !o && setDeleteCycle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteCycle?.name}</strong>? All ratings in this cycle will be permanently removed.
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

function AssignmentCard({
  assignment, onRate, onClear, clearingId,
}: {
  assignment: Assignment
  onRate: () => void
  onClear: () => void
  clearingId: string | null
}) {
  const rt = RATER_TYPES.find((r) => r.key === assignment.raterType)
  const isClearing = clearingId === (assignment.peerRating360Id ?? assignment.id + assignment.raterType)
  return (
    <div className={`flex items-start justify-between gap-3 p-4 border rounded-lg transition-colors ${
      assignment.hasRated ? 'border-green-200 bg-green-50/40' : 'hover:border-blue-300 hover:bg-blue-50/30'
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-900 truncate">{assignment.name}</p>
          {assignment.hasRated && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
        </div>
        {assignment.jobTitle && <p className="text-xs text-gray-500 truncate">{assignment.jobTitle}</p>}
        <div className="flex flex-col gap-0.5 mt-1">
          {assignment.department && <span className="text-xs text-gray-400">{assignment.department}</span>}
          {rt && <span className={`text-xs font-medium ${rt.color}`}>{rt.label}</span>}
        </div>
        {/* Show existing scores as a compact row when rated */}
        {assignment.hasRated && assignment.existingScores && Object.keys(assignment.existingScores).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(assignment.existingScores).map(([comp, score]) => (
              <span key={comp} className="text-xs text-gray-600">
                <span className="font-medium text-gray-800">{comp.split(' ')[0]}:</span> {score}/5
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Button size="sm" variant={assignment.hasRated ? 'outline' : 'default'} onClick={onRate}>
          {assignment.hasRated ? 'Update' : 'Rate'}
        </Button>
        {assignment.hasRated && (
          <Button
            size="sm" variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
            disabled={isClearing}
            onClick={() => {
              if (confirm(`Clear your rating for ${assignment.name}? This cannot be undone.`)) onClear()
            }}
          >
            {isClearing ? '...' : 'Clear'}
          </Button>
        )}
      </div>
    </div>
  )
}
