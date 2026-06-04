import { NextRequest, NextResponse } from 'next/server'
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
