import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

/**
 * POST /api/users/fix-merged-users
 *
 * Admin endpoint that rewires all ghost/duplicate user references in the DB
 * to point to the canonical (richest) record for each email address.
 *
 * For each group of accounts sharing the same email it:
 *   1. Picks the "canonical" record (most complete: has firstName + jobTitle + signatureUrl)
 *   2. Re-parents every other user's managerId that pointed at a ghost → canonical
 *   3. Migrates PerformanceAgreement.userId  from ghost IDs → canonical
 *   4. Migrates PerformanceAgreement.supervisorId from ghost IDs → canonical
 *
 * Safe to run multiple times (idempotent).
 */
export async function POST(req: NextRequest) {
  const { user } = await getAuthenticatedUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!userHasAnyRole(user, ['ADMIN', 'SG', 'DSG'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const report: string[] = []
  let managersFixed = 0
  let agreementsUserFixed = 0
  let agreementsSupervisorFixed = 0

  // 1. Load all users (id, email, and fields we use to score richness)
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      jobTitle: true,
      position: true,
      signatureUrl: true,
      managerId: true,
      departmentName: true,
      role: true,
    }
  })

  // 2. Group by email (lowercased)
  const byEmail = new Map<string, typeof allUsers>()
  for (const u of allUsers) {
    const key = (u.email || '').toLowerCase().trim()
    if (!key) continue
    if (!byEmail.has(key)) byEmail.set(key, [])
    byEmail.get(key)!.push(u)
  }

  // 3. For each duplicated email, identify canonical record
  const ghostToCanonical = new Map<string, string>() // ghostId -> canonicalId

  for (const [email, group] of byEmail.entries()) {
    if (group.length <= 1) continue

    const canonical = group.reduce((best, rec) => {
      const score = (r: typeof rec) =>
        (r.firstName ? 2 : 0) +
        (r.jobTitle ? 2 : 0) +
        (r.departmentName ? 1 : 0) +
        (r.signatureUrl ? 1 : 0) +
        (r.managerId ? 1 : 0) +
        (r.role && r.role !== 'USER' ? 1 : 0)
      return score(rec) > score(best) ? rec : best
    }, group[0])

    for (const ghost of group) {
      if (ghost.id !== canonical.id) {
        ghostToCanonical.set(ghost.id, canonical.id)
        report.push(`Ghost: ${ghost.id} (${email}) → Canonical: ${canonical.id}`)
      }
    }
  }

  if (ghostToCanonical.size === 0) {
    return NextResponse.json({ message: 'No ghost accounts found — nothing to fix.', report })
  }

  // 4. Fix User.managerId references
  for (const [ghostId, canonicalId] of ghostToCanonical.entries()) {
    const updated = await prisma.user.updateMany({
      where: { managerId: ghostId },
      data: { managerId: canonicalId }
    })
    if (updated.count > 0) {
      managersFixed += updated.count
      report.push(`  managerId: ${updated.count} users re-pointed from ${ghostId} → ${canonicalId}`)
    }
  }

  // 5. Fix PerformanceAgreement.userId references
  for (const [ghostId, canonicalId] of ghostToCanonical.entries()) {
    const updated = await prisma.performanceAgreement.updateMany({
      where: { userId: ghostId },
      data: { userId: canonicalId }
    })
    if (updated.count > 0) {
      agreementsUserFixed += updated.count
      report.push(`  agreement.userId: ${updated.count} agreements re-pointed from ${ghostId} → ${canonicalId}`)
    }
  }

  // 6. Fix PerformanceAgreement.supervisorId references
  for (const [ghostId, canonicalId] of ghostToCanonical.entries()) {
    const updated = await prisma.performanceAgreement.updateMany({
      where: { supervisorId: ghostId },
      data: { supervisorId: canonicalId }
    })
    if (updated.count > 0) {
      agreementsSupervisorFixed += updated.count
      report.push(`  agreement.supervisorId: ${updated.count} agreements re-pointed from ${ghostId} → ${canonicalId}`)
    }
  }

  return NextResponse.json({
    success: true,
    ghostAccountsFound: ghostToCanonical.size,
    managersFixed,
    agreementsUserFixed,
    agreementsSupervisorFixed,
    report
  })
}
