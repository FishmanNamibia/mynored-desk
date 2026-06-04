import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

function getRatingLevel(score: number | null): string {
  if (score === null) return 'No Data'
  if (score >= 4.5) return 'Outstanding'
  if (score >= 4.0) return 'Excellent'
  if (score >= 3.5) return 'Very Good'
  if (score >= 3.0) return 'Good'
  if (score >= 2.5) return 'Satisfactory'
  if (score >= 2.0) return 'Needs Improvement'
  return 'Unacceptable'
}

function getTrend(score: number | null): 'up' | 'stable' | 'down' | 'none' {
  if (score === null) return 'none'
  if (score >= 3.5) return 'up'
  if (score >= 2.5) return 'stable'
  return 'down'
}

// Parse per-competency scores from stored JSON (NSA simple form)
function parseCompScores(s: string | null | undefined): Record<string, number> {
  if (!s) return {}
  try { return (JSON.parse(s) as any)?.scores || {} } catch { return {} }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build competency map from all available sources
    const competencyMap: Record<string, { scores: number[]; label: string }> = {}

    const addScore = (label: string, score: number) => {
      if (!competencyMap[label]) competencyMap[label] = { scores: [], label }
      competencyMap[label].scores.push(score)
    }

    // Source 1: QuestionnaireResponse (formal questionnaire path)
    try {
      const allResponses = await prisma.questionnaireResponse.findMany({
        include: { QuestionnaireQuestion: { include: { QuestionnaireSubsection: true } } }
      })
      allResponses.forEach((resp: any) => {
        const label =
          resp.QuestionnaireQuestion?.QuestionnaireSubsection?.institutionalValue ||
          resp.QuestionnaireQuestion?.QuestionnaireSubsection?.title ||
          'General'
        if (resp.rating != null) addScore(label, Number(resp.rating))
      })
    } catch (_e) { /* table may not exist */ }

    // Source 2: Rating360Answer (answer-based path)
    try {
      const allAnswers = await prisma.rating360Answer.findMany({ include: { question: true } })
      allAnswers.forEach((ans: any) => {
        const label = ans.question?.category || 'General'
        if (ans.rating != null) addScore(label, Number(ans.rating))
      })
    } catch (_e) { /* table may not exist */ }

    // Source 3: selfComments / supervisorComments / peer comments JSON (NSA simple form — primary path)
    // Only include records for ACTIVE users; only parse comments when the rating field is non-null (cleared ratings leave comments stale)
    const allRating360 = await prisma.rating360.findMany({
      where: { user: { status: 'ACTIVE' } },
      select: {
        selfRating: true,
        selfComments: true,
        supervisorRating: true,
        supervisorComments: true,
        peerRatings: { select: { comments: true, rating: true } }
      }
    })
    allRating360.forEach((r: any) => {
      if (r.selfRating != null) {
        Object.entries(parseCompScores(r.selfComments)).forEach(([comp, score]) => addScore(comp, score as number))
      }
      if (r.supervisorRating != null) {
        Object.entries(parseCompScores(r.supervisorComments)).forEach(([comp, score]) => addScore(comp, score as number))
      }
      r.peerRatings?.forEach((p: any) => {
        if (p.rating != null) {
          Object.entries(parseCompScores(p.comments)).forEach(([comp, score]) => addScore(comp, score as number))
        }
      })
    })

    const competencies = Object.values(competencyMap)
      .map(c => {
        const avg = c.scores.length > 0
          ? Math.round((c.scores.reduce((a, b) => a + b, 0) / c.scores.length) * 100) / 100
          : null
        const distribution = [1, 2, 3, 4, 5].map(n => ({
          rating: n,
          count: c.scores.filter(s => Math.round(s) === n).length
        }))
        return {
          competency: c.label,
          averageScore: avg,
          responseCount: c.scores.length,
          ratingLevel: getRatingLevel(avg),
          trend: getTrend(avg),
          distribution
        }
      })
      .filter(c => c.responseCount > 0)
      .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))

    // Overall org 360 average across all sources
    const allScores = Object.values(competencyMap).flatMap(c => c.scores)
    const orgAverage = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : null

    // Count employees with active 360 ratings — restrict to ACTIVE users only (no ghost accounts)
    const totalRatings = await prisma.rating360.count({ where: { user: { status: 'ACTIVE' } } as any })
    const completedRatings = await prisma.rating360.count({ where: { user: { status: 'ACTIVE' }, status: 'COMPLETED' } as any })
    const inProgressRatings = await prisma.rating360.count({ where: { user: { status: 'ACTIVE' }, status: 'IN_PROGRESS' } as any })

    // Employees who have submitted at least one rating (self or supervisor) — active users only, with user details
    const ratedUserRecords = await prisma.rating360.findMany({
      where: { user: { status: 'ACTIVE' }, OR: [{ selfRating: { not: null } }, { supervisorRating: { not: null } }] } as any,
      select: {
        selfRating: true,
        supervisorRating: true,
        status: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, status: true } as any }
      }
    })
    const ratedEmployees = ratedUserRecords.length
    const ratedUserList = ratedUserRecords.map((r: any) => ({
      name: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || r.user?.email || 'Unknown',
      email: r.user?.email || '',
      jobTitle: r.user?.jobTitle || '',
      userStatus: r.user?.status || '',
      selfRating: r.selfRating,
      supervisorRating: r.supervisorRating,
      rating360Status: r.status,
    }))

    // totalStaff: use the exact same filter logic as dashboard/stats/route.ts so the numbers match
    // Fetch all users (no DB-level filter), then apply in-memory ghost/dedup rules
    const allUsers = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, position: true, departmentName: true, departmentId: true, status: true }
    })
    const baseFiltered = allUsers.filter((u: any) => {
      const hasDept = !!(u.departmentName || u.departmentId)
      const hasJob = !!(u.jobTitle || u.position)
      if (!hasDept && !hasJob) return false
      const displayName = (`${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase()
      if (displayName.startsWith('test') || displayName.startsWith('demo')) return false
      return true
    })
    const emailBestMap = new Map<string, any>()
    for (const u of baseFiltered) {
      const key = (u.email || u.id).toLowerCase()
      const existing = emailBestMap.get(key)
      if (!existing) {
        emailBestMap.set(key, u)
      } else {
        const existScore = (existing.jobTitle ? 2 : 0) + (existing.departmentName ? 1 : 0)
        const newScore = (u.jobTitle ? 2 : 0) + (u.departmentName ? 1 : 0)
        if (newScore > existScore) emailBestMap.set(key, u)
      }
    }
    const totalStaff = emailBestMap.size
    const completionRate = totalStaff > 0
      ? Math.round((ratedEmployees / totalStaff) * 100)
      : 0

    return NextResponse.json({
      competencies,
      orgAverage,
      orgRatingLevel: getRatingLevel(orgAverage),
      orgTrend: getTrend(orgAverage),
      totalRatings,
      completedRatings,
      inProgressRatings,
      ratedEmployees,
      ratedUserList,
      totalResponses: allScores.length,
      totalStaff,
      completionRate
    })
  } catch (error: any) {
    console.error('[org-breakdown] Error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch org 360 breakdown' }, { status: 500 })
  }
}
