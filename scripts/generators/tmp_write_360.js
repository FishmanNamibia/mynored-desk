const fs = require('fs');
const path = require('path');

const base = 'apps/web/app/(protected)/dashboard/performance';

const files = {};

// ─── 1. my-assignments ────────────────────────────────────────────────────────
files[`${base}/api/360-rating/my-assignments/route.ts`] = `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    const assignments: any[] = []

    // 1. Direct reports — I rate them as supervisor
    const directReports = await prisma.user.findMany({
      where: { managerId: myId },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, departmentName: true },
    })

    const activeCycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    for (const dr of directReports) {
      let hasRated = false
      if (activeCycle) {
        const r = await prisma.rating360.findUnique({
          where: { cycleId_userId: { cycleId: activeCycle.id, userId: dr.id } },
          select: { supervisorRating: true },
        })
        hasRated = r?.supervisorRating != null
      }
      assignments.push({
        id: dr.id,
        name: [dr.firstName, dr.lastName].filter(Boolean).join(' ') || dr.email,
        jobTitle: dr.jobTitle || '',
        department: dr.departmentName || '',
        raterType: 'supervisor',
        hasRated,
      })
    }

    // 2. PeerRating360 where I'm the assigned rater (org_random / dept_random)
    const peerAssignments = await prisma.peerRating360.findMany({
      where: { raterId: myId },
      include: {
        rating360: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                departmentName: true,
              },
            },
          },
        },
      },
    })

    for (const pa of peerAssignments) {
      let parsed: any = {}
      try { parsed = JSON.parse(pa.comments || '{}') } catch {}
      const raterType = parsed.raterType || 'dept_random'
      const ratee = pa.rating360.user
      // avoid duplicating direct reports
      if (assignments.find((a) => a.id === ratee.id && a.raterType === raterType)) continue
      assignments.push({
        id: ratee.id,
        name: [ratee.firstName, ratee.lastName].filter(Boolean).join(' ') || ratee.email,
        jobTitle: ratee.jobTitle || '',
        department: ratee.departmentName || '',
        raterType,
        hasRated: pa.rating != null,
        peerRating360Id: pa.id,
      })
    }

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
`;

// ─── 2. init-random-raters ────────────────────────────────────────────────────
files[`${base}/api/360-rating/init-random-raters/route.ts`] = `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobTitleLower = (user.jobTitle || '').toLowerCase()
    const isHC =
      userHasAnyRole(user, ['ADMIN', 'EXECUTIVE', 'SG', 'DEPUTY_SG']) ||
      (jobTitleLower.includes('executive') && jobTitleLower.includes('human capital'))
    if (!isHC) return NextResponse.json({ error: 'Forbidden — HC Executives only' }, { status: 403 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    // Get or create active cycle
    let cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) {
      const year = new Date().getFullYear()
      try {
        cycle = await prisma.rating360Cycle.create({
          data: {
            name: \`\${year} Behavioural Competency Review\`,
            startDate: new Date(\`\${year}-01-01\`),
            endDate: new Date(\`\${year}-12-31\`),
            isActive: true,
            createdById: myId,
          },
        })
      } catch {
        cycle = await prisma.rating360Cycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        if (!cycle) return NextResponse.json({ error: 'No active cycle found and could not create one' }, { status: 400 })
      }
    }

    const allUsers = await prisma.user.findMany({
      select: { id: true, managerId: true, departmentName: true },
    })

    let initialized = 0
    let skippedOrg = 0
    let skippedDept = 0

    for (const ratee of allUsers) {
      // Get or create Rating360
      let r360 = await prisma.rating360.findUnique({
        where: { cycleId_userId: { cycleId: cycle.id, userId: ratee.id } },
      })
      if (!r360) {
        r360 = await prisma.rating360.create({
          data: {
            cycleId: cycle.id,
            userId: ratee.id,
            supervisorId: ratee.managerId || null,
            status: 'PENDING',
          },
        })
      } else if (ratee.managerId && !r360.supervisorId) {
        await prisma.rating360.update({
          where: { id: r360.id },
          data: { supervisorId: ratee.managerId },
        })
      }

      // Check existing peer assignments
      const existingPeers = await prisma.peerRating360.findMany({
        where: { rating360Id: r360.id },
      })
      const existingTypes = existingPeers.map((p) => {
        try { return JSON.parse(p.comments || '{}').raterType } catch { return null }
      })

      // Assign org_random if not already done
      if (!existingTypes.includes('org_random')) {
        const excluded = new Set([ratee.id, ratee.managerId, ...existingPeers.map((p) => p.raterId)])
        const eligible = allUsers.filter((u) => !excluded.has(u.id))
        if (eligible.length > 0) {
          const pick = eligible[Math.floor(Math.random() * eligible.length)]
          await prisma.peerRating360.create({
            data: {
              rating360Id: r360.id,
              raterId: pick.id,
              comments: JSON.stringify({ raterType: 'org_random', scores: {} }),
            },
          })
        } else {
          skippedOrg++
        }
      }

      // Assign dept_random if not already done
      if (!existingTypes.includes('dept_random')) {
        const excluded = new Set([ratee.id, ratee.managerId, ...existingPeers.map((p) => p.raterId)])
        const sameDept = allUsers.filter(
          (u) => !excluded.has(u.id) && u.departmentName && u.departmentName === ratee.departmentName
        )
        if (sameDept.length > 0) {
          const pick = sameDept[Math.floor(Math.random() * sameDept.length)]
          await prisma.peerRating360.create({
            data: {
              rating360Id: r360.id,
              raterId: pick.id,
              comments: JSON.stringify({ raterType: 'dept_random', scores: {} }),
            },
          })
        } else {
          skippedDept++
        }
      }

      initialized++
    }

    return NextResponse.json({
      success: true,
      initialized,
      skippedOrg,
      skippedDept,
      message: \`Initialized random rater assignments for \${initialized} employees\`,
    })
  } catch (error) {
    console.error('Error initializing random raters:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 })
  }
}
`;

// ─── 3. rate-person (rewrite) ─────────────────────────────────────────────────
files[`${base}/api/360-rating/rate-person/route.ts`] = `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

const NSA_COMPETENCY_NAMES = [
  'Integrity',
  'Excellent Performance',
  'Professionalism',
  'Accountability',
  'Partnership',
  'Customer-focussed',
]

function avgScores(scores: Record<string, number>): number | null {
  const vals = Object.values(scores).filter((v) => typeof v === 'number' && v >= 1 && v <= 5)
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { rateeId, raterType, competencyScores, comments, peerRating360Id } = body

    if (!rateeId || !raterType || !competencyScores) {
      return NextResponse.json({ error: 'rateeId, raterType, and competencyScores required' }, { status: 400 })
    }
    const valid = ['self', 'supervisor', 'dept_random', 'org_random']
    if (!valid.includes(raterType)) {
      return NextResponse.json({ error: 'Invalid raterType' }, { status: 400 })
    }

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const raterId = meDb?.id ?? user.id

    // Get or create active cycle
    let cycle = await prisma.rating360Cycle.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!cycle) {
      const year = new Date().getFullYear()
      try {
        cycle = await prisma.rating360Cycle.create({
          data: {
            name: \`\${year} Behavioural Competency Review\`,
            startDate: new Date(\`\${year}-01-01\`),
            endDate: new Date(\`\${year}-12-31\`),
            isActive: true,
            createdById: raterId,
          },
        })
      } catch {
        cycle = await prisma.rating360Cycle.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
        if (!cycle) return NextResponse.json({ error: 'No active cycle' }, { status: 400 })
      }
    }

    const effectiveRateeId = raterType === 'self' ? raterId : rateeId
    const scoresJson = JSON.stringify({ raterType, scores: competencyScores, comments: comments || '' })
    const avg = avgScores(competencyScores)

    if (raterType === 'self') {
      // Upsert Rating360 for self
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { cycleId: cycle.id, userId: effectiveRateeId, status: 'PENDING' },
        update: {},
      })
      await prisma.rating360.update({
        where: { id: r360.id },
        data: { selfRating: avg, selfComments: scoresJson, selfCompletedAt: new Date() },
      })
    } else if (raterType === 'supervisor') {
      // Upsert Rating360 for ratee, set supervisorId + supervisorRating
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { cycleId: cycle.id, userId: effectiveRateeId, supervisorId: raterId, status: 'PENDING' },
        update: {},
      })
      await prisma.rating360.update({
        where: { id: r360.id },
        data: {
          supervisorId: raterId,
          supervisorRating: avg,
          supervisorComments: scoresJson,
          supervisorCompletedAt: new Date(),
        },
      })
    } else {
      // org_random or dept_random — update existing PeerRating360 or create
      const r360 = await prisma.rating360.upsert({
        where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
        create: { cycleId: cycle.id, userId: effectiveRateeId, status: 'PENDING' },
        update: {},
      })

      // Prefer updating an existing assignment (by peerRating360Id or raterId+rating360Id)
      const existing = peerRating360Id
        ? await prisma.peerRating360.findUnique({ where: { id: peerRating360Id } })
        : await prisma.peerRating360.findFirst({ where: { rating360Id: r360.id, raterId } })

      if (existing) {
        await prisma.peerRating360.update({
          where: { id: existing.id },
          data: { rating: avg, comments: scoresJson, completedAt: new Date() },
        })
      } else {
        await prisma.peerRating360.create({
          data: {
            rating360Id: r360.id,
            raterId,
            rating: avg,
            comments: scoresJson,
            completedAt: new Date(),
          },
        })
      }
    }

    // Recalculate overall average for ratee's Rating360
    const r360final = await prisma.rating360.findUnique({
      where: { cycleId_userId: { cycleId: cycle.id, userId: effectiveRateeId } },
      include: { peerRatings: true },
    })
    if (r360final) {
      const allRatings: number[] = []
      if (r360final.selfRating != null) allRatings.push(r360final.selfRating)
      if (r360final.supervisorRating != null) allRatings.push(r360final.supervisorRating)
      const peerAvgs = r360final.peerRatings
        .filter((p) => p.rating != null)
        .map((p) => p.rating as number)
      if (peerAvgs.length > 0) allRatings.push(peerAvgs.reduce((a, b) => a + b, 0) / peerAvgs.length)
      const overall = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null
      await prisma.rating360.update({
        where: { id: r360final.id },
        data: { averageRating: overall, status: overall != null ? 'IN_PROGRESS' : 'PENDING' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting rating:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown',
    }, { status: 500 })
  }
}
`;

// ─── 4. my-competency-scores (rewrite) ────────────────────────────────────────
files[`${base}/api/360-rating/my-competency-scores/route.ts`] = `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

const COMPETENCIES = [
  'Integrity',
  'Excellent Performance',
  'Professionalism',
  'Accountability',
  'Partnership',
  'Customer-focussed',
]
const RATER_TYPES = ['self', 'supervisor', 'dept_random', 'org_random']

function parseScores(json: string | null): { raterType: string; scores: Record<string, number> } | null {
  if (!json) return null
  try {
    const p = JSON.parse(json)
    if (p?.scores && typeof p.scores === 'object') return p
  } catch {}
  return null
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meDb = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { id: true },
    })
    const myId = meDb?.id ?? user.id

    const rating360 = await prisma.rating360.findFirst({
      where: { userId: myId },
      orderBy: { createdAt: 'desc' },
      include: { peerRatings: true },
    })

    // Initialize result structure
    const raw: Record<string, Record<string, number[]>> = {}
    for (const comp of COMPETENCIES) {
      raw[comp] = { self: [], supervisor: [], dept_random: [], org_random: [] }
    }

    if (rating360) {
      const selfData = parseScores(rating360.selfComments)
      if (selfData) {
        for (const [comp, score] of Object.entries(selfData.scores)) {
          if (raw[comp]) raw[comp].self.push(score as number)
        }
      }

      const supData = parseScores(rating360.supervisorComments)
      if (supData) {
        for (const [comp, score] of Object.entries(supData.scores)) {
          if (raw[comp]) raw[comp].supervisor.push(score as number)
        }
      }

      for (const peer of rating360.peerRatings) {
        const peerData = parseScores(peer.comments)
        if (!peerData || peer.rating == null) continue
        const rt = peerData.raterType || 'org_random'
        if (!RATER_TYPES.includes(rt)) continue
        for (const [comp, score] of Object.entries(peerData.scores)) {
          if (raw[comp] && raw[comp][rt]) raw[comp][rt].push(score as number)
        }
      }
    }

    // Average each rater type per competency
    const competencyScores: Record<string, Record<string, number | null>> = {}
    for (const comp of COMPETENCIES) {
      competencyScores[comp] = {}
      for (const rt of RATER_TYPES) {
        const vals = raw[comp][rt]
        competencyScores[comp][rt] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }
      // Per-competency average across all rater types that have scores
      const allVals = RATER_TYPES.map((rt) => competencyScores[comp][rt]).filter((v) => v != null) as number[]
      competencyScores[comp].avg = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null
    }

    // Overall average = average of all competency averages
    const compAvgs = COMPETENCIES.map((c) => competencyScores[c].avg).filter((v) => v != null) as number[]
    const overallAverage = compAvgs.length > 0 ? compAvgs.reduce((a, b) => a + b, 0) / compAvgs.length : null

    return NextResponse.json({
      rating360Id: rating360?.id ?? null,
      competencyScores,
      overallAverage,
    })
  } catch (error) {
    console.error('Error fetching competency scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
`;

// ─── 5. page.tsx (full rewrite) ───────────────────────────────────────────────
files[`${base}/dashboard/360-degree/page.tsx`] = `'use client'

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
  { key: 'self',        label: 'Self Assessment',        shortLabel: 'Self',       color: 'text-blue-700'   },
  { key: 'supervisor',  label: 'Direct Supervisor',      shortLabel: 'Supervisor', color: 'text-green-700'  },
  { key: 'dept_random', label: 'Dept. Colleague (Random)',shortLabel: 'Dept. Random',color: 'text-orange-700'},
  { key: 'org_random',  label: 'Org. Random Employee',   shortLabel: 'Org. Random',color: 'text-teal-700'   },
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
          className={\`text-2xl transition-colors \${d >= s ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}\`}
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
  const isHCOrAdmin = ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE'].includes(userRole) ||
    (session?.user?.jobTitle || '').toLowerCase().includes('human capital')

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

      if (isHCOrAdmin) {
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
    setCompScores({})
    setComments('')
  }

  async function submitRating() {
    const missing = NSA_COMPETENCIES.filter((c) => !compScores[c.name])
    if (missing.length > 0) {
      alert('Please rate all 6 competencies before submitting.')
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
        alert(e.error || 'Failed to submit rating')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateCycle() {
    if (!cycleForm.name || !cycleForm.startDate || !cycleForm.endDate) {
      alert('Name, start date and end date are required')
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
        const e = await res.json(); alert(e.error || 'Failed')
      }
    } finally { setSavingCycle(false) }
  }

  async function handleInitRaters() {
    setInitializingRaters(true)
    setInitResult('')
    try {
      const res = await fetch('/dashboard/performance/api/360-rating/init-random-raters', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInitResult(data.message || 'Done')
        fetchAll()
      } else {
        setInitResult(data.error || 'Failed')
      }
    } finally { setInitializingRaters(false) }
  }

  async function handleActivate(id: string) {
    const res = await fetch(\`/dashboard/performance/api/360-rating/cycles/\${id}/activate\`, { method: 'POST' })
    if (res.ok) fetchAll(); else { const e = await res.json(); alert(e.error || 'Failed') }
  }

  async function handleDeleteCycle() {
    if (!deleteCycle) return
    const res = await fetch(\`/dashboard/performance/api/360-rating/cycles/\${deleteCycle.id}\`, { method: 'DELETE' })
    if (res.ok) { setDeleteCycle(null); fetchAll() }
    else { const e = await res.json(); alert(e.error || 'Failed') }
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
        <TabsList className={\`grid w-full \${isHCOrAdmin ? 'grid-cols-3' : 'grid-cols-2'}\`}>
          <TabsTrigger value="my-rating"><User className="w-4 h-4 mr-2" />My Rating</TabsTrigger>
          <TabsTrigger value="rate-others"><Users className="w-4 h-4 mr-2" />Rate Others</TabsTrigger>
          {isHCOrAdmin && (
            <TabsTrigger value="manage-cycles"><Settings className="w-4 h-4 mr-2" />Manage Cycles</TabsTrigger>
          )}
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
                  <Button variant="outline" size="sm" onClick={openSelf} className="border-green-300 text-green-700 flex-shrink-0">
                    Update
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competency Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {NSA_COMPETENCIES.map((comp, idx) => {
              const cs = myData?.competencyScores?.[comp.name]
              return (
                <Card key={comp.name} className={\`border-l-4 \${comp.colorClass}\`}>
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
                          <span className={\`text-xs \${rt.color}\`}>{rt.shortLabel}</span>
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
                          <Badge className={\`\${comp.badgeClass} text-xs\`}>{scoreLabel(cs.avg as number)}</Badge>
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
                      <AssignmentCard key={a.id + a.raterType} assignment={a} onRate={() => openRate(a)} />
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
                      <AssignmentCard key={a.id + a.raterType} assignment={a} onRate={() => openRate(a)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ══════════ MANAGE CYCLES (HC) ══════════ */}
        {isHCOrAdmin && (
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
                    onClick={handleInitRaters}
                    disabled={initializingRaters}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {initializingRaters ? 'Initializing...' : 'Initialize Random Raters'}
                  </Button>
                  {initResult && (
                    <p className={\`text-sm font-medium \${initResult.includes('error') || initResult.includes('Failed') ? 'text-red-600' : 'text-green-700'}\`}>
                      {initResult}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  This is safe to run multiple times — existing assignments are preserved.
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
                      <div key={c.id} className={\`p-4 border rounded-lg \${c.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`}>
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
              {ratingDialog.isSelf ? 'Self Assessment' : \`Rate \${ratingDialog.person?.name}\`}
            </DialogTitle>
            <DialogDescription>
              {ratingDialog.isSelf
                ? 'Rate yourself on each of the 6 NSA Behavioural Competencies (1 = Poor, 5 = Exceptional)'
                : \`Rating as: \${raterLabel(ratingDialog.person?.raterType ?? '')} · Rate all 6 competencies\`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {NSA_COMPETENCIES.map((comp) => (
              <div key={comp.name} className={\`border rounded-lg p-4 border-l-4 \${comp.colorClass}\`}>
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

function AssignmentCard({ assignment, onRate }: { assignment: Assignment; onRate: () => void }) {
  const rt = RATER_TYPES.find((r) => r.key === assignment.raterType)
  return (
    <div className={\`flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors \${
      assignment.hasRated ? 'border-green-200 bg-green-50/40' : 'hover:border-blue-300 hover:bg-blue-50/30'
    }\`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-900 truncate">{assignment.name}</p>
          {assignment.hasRated && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
        </div>
        {assignment.jobTitle && <p className="text-xs text-gray-500 truncate">{assignment.jobTitle}</p>}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {assignment.department && <span className="text-xs text-gray-400">{assignment.department}</span>}
          {rt && (
            <Badge variant="outline" className={\`text-xs \${rt.color}\`}>{rt.shortLabel}</Badge>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={assignment.hasRated ? 'outline' : 'default'}
        onClick={onRate}
        className="flex-shrink-0"
      >
        {assignment.hasRated ? 'Update' : 'Rate'}
      </Button>
    </div>
  )
}
`;

// Write all files
let written = 0;
for (const [filePath, content] of Object.entries(files)) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  written++;
  console.log('Written:', filePath);
}
console.log(`\nDone — ${written} files written.`);
