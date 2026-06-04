import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// Role score map — higher = more senior
const ROLE_SCORE: Record<string, number> = {
  SG: 100,
  DEPUTY_SG: 90,
  EXECUTIVE: 80,
  HUMAN_CAPITAL_EXECUTIVE: 75,
}

const EXEC_TITLE_KEYWORDS = [
  'statistician general', 'deputy statistician', 'secretary general',
  'executive', 'director', 'head of', 'chief',
]

function normName(s: string): string {
  return s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
}

function scoreUser(roleNames: string[], jobTitle: string | null): number {
  for (const r of roleNames) {
    const s = ROLE_SCORE[r.toUpperCase()]
    if (s) return s
  }
  const t = (jobTitle || '').toLowerCase()
  if (EXEC_TITLE_KEYWORDS.some(kw => t.includes(kw))) return 50
  return 0
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Derive department list from the live User.departmentName values stored from Azure AD.
    // This is the real source of truth — the Department table may have stale seed data.
    const allDeptUsers = await prisma.user.findMany({
      where: { departmentName: { not: null } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentName: true,
        createdAt: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    })

    // Collect distinct department names (case-insensitive dedup — pick the most common casing)
    const nameCount = new Map<string, { canonical: string; count: number }>()
    for (const u of allDeptUsers) {
      if (!u.departmentName) continue
      const key = normName(u.departmentName)
      const existing = nameCount.get(key)
      if (!existing) {
        nameCount.set(key, { canonical: u.departmentName, count: 1 })
      } else {
        existing.count++
        // Keep the casing that appears most often (first-seen on tie)
      }
    }

    const deptNames = Array.from(nameCount.values())
      .map(v => v.canonical)
      .sort((a, b) => a.localeCompare(b))

    // For each department name, find the best matching executive
    const result = deptNames.map(deptName => {
      const depNorm = normName(deptName)

      // Match users whose normalised departmentName matches this department
      const candidates = allDeptUsers.filter(u => {
        if (!u.departmentName) return false
        const dn = normName(u.departmentName)
        return dn === depNorm
      })

      // Deduplicate by email (canonical = oldest createdAt)
      const emailMap = new Map<string, typeof candidates[0]>()
      for (const u of candidates) {
        if (!u.email) continue
        const key = u.email.toLowerCase()
        const existing = emailMap.get(key)
        if (!existing || u.createdAt < existing.createdAt) emailMap.set(key, u)
      }
      const unique = Array.from(emailMap.values())

      // Sort by role/title score (most senior first)
      unique.sort((a, b) => {
        const bRoles = b.roles.map((r: any) => r.role?.name ?? '')
        const aRoles = a.roles.map((r: any) => r.role?.name ?? '')
        const diff = scoreUser(bRoles, b.jobTitle) - scoreUser(aRoles, a.jobTitle)
        return diff !== 0 ? diff : a.createdAt.getTime() - b.createdAt.getTime()
      })

      const exec = unique[0] ?? null

      return {
        // Use department name as ID so the suggestion route can look up users by name directly
        id: deptName,
        name: deptName,
        executiveEmail: exec?.email ?? null,
        executiveName: exec
          ? (`${exec.firstName ?? ''} ${exec.lastName ?? ''}`).trim() || exec.email
          : null,
        executiveTitle: exec?.jobTitle ?? null,
        memberCount: unique.length,
      }
    })

    // Only return departments that have at least one member
    const nonEmpty = result.filter(d => d.memberCount > 0)
    console.log(`[chatbot/departments] Derived ${nonEmpty.length} departments from User.departmentName`)
    return NextResponse.json(nonEmpty)
  } catch (error) {
    console.error('[chatbot/departments] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
