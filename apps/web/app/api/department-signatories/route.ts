import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

function isExecutiveTitle(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false
  const t = jobTitle.toLowerCase()
  return t.includes('executive') || t.includes('statistician general') || t.includes('deputy statistician')
}

/**
 * GET /api/department-signatories
 * Walks the reporting chain from the current user up to the executive.
 * Returns a `chain` array of unique signatories (supervisor, manager, executive)
 * with their role labels. Only returns people who actually exist in the chain.
 * Also returns legacy supervisor/manager/executive fields for backward compat.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(req)
    const user = authResult.user
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve actual DB user by email (auth token ID may differ) — orderBy asc = oldest (canonical) account first
    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })
    const actualUserId = dbUser?.id || user.id

    const currentUser = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: {
        id: true,
        departmentName: true,
        managerId: true,
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formatName = (u: any) => {
      if (!u) return ''
      return `${u.firstName || ''} ${u.lastName || ''}`.trim()
    }

    const userSelect = {
      id: true, firstName: true, lastName: true,
      jobTitle: true, position: true, signatureUrl: true, managerId: true,
    }

    // Determine the starting managerId for the chain walk.
    // Primary: User.managerId (set by AD sync on login)
    // Fallback: supervisorId from the user's most recent performance agreement
    let startManagerId = currentUser.managerId

    if (!startManagerId) {
      const recentAgreement = await prisma.performanceAgreement.findFirst({
        where: { userId: actualUserId, supervisorId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { supervisorId: true }
      })
      startManagerId = recentAgreement?.supervisorId || null
      console.log('[dept-signatories] managerId null, fallback supervisorId from agreement:', startManagerId)
    }

    console.log('[dept-signatories] User:', actualUserId, 'startManagerId:', startManagerId, 'dept:', currentUser.departmentName)

    // Walk the manager chain upward, collecting each person until we hit an executive
    const chain: { role: string; name: string; designation: string; signatureUrl: string | null }[] = []
    const visited = new Set<string>()
    let currentManagerId = startManagerId
    let foundExecutive = false

    while (currentManagerId && !visited.has(currentManagerId) && chain.length < 5) {
      visited.add(currentManagerId)
      const mgr = await prisma.user.findUnique({
        where: { id: currentManagerId },
        select: userSelect
      })
      if (!mgr) break

      const name = formatName(mgr)
      const designation = mgr.jobTitle || mgr.position || ''
      const signatureUrl = mgr.signatureUrl || null

      if (isExecutiveTitle(mgr.jobTitle)) {
        chain.push({ role: 'EXECUTIVE', name, designation, signatureUrl })
        foundExecutive = true
        break
      } else {
        const role = chain.length === 0 ? 'SUPERVISOR' : 'MANAGER'
        chain.push({ role, name, designation, signatureUrl })
      }

      currentManagerId = mgr.managerId
    }

    // If we didn't find an executive by walking the chain, try department lookup
    if (!foundExecutive && currentUser.departmentName) {
      const execByTitle = await prisma.user.findFirst({
        where: {
          departmentName: currentUser.departmentName,
          OR: [
            { jobTitle: { contains: 'Executive', mode: 'insensitive' } },
            { jobTitle: { contains: 'Statistician General', mode: 'insensitive' } },
          ]
        },
        select: userSelect
      })
      if (execByTitle && !visited.has(execByTitle.id)) {
        chain.push({
          role: 'EXECUTIVE',
          name: formatName(execByTitle),
          designation: execByTitle.jobTitle || execByTitle.position || '',
          signatureUrl: execByTitle.signatureUrl || null,
        })
      }
    }

    // Build legacy fields for backward compat
    const supervisor = chain.find(c => c.role === 'SUPERVISOR') || null
    const manager = chain.find(c => c.role === 'MANAGER') || null
    const executive = chain.find(c => c.role === 'EXECUTIVE') || null

    return NextResponse.json({
      chain,
      supervisor,
      manager,
      executive,
      departmentName: currentUser.departmentName
    })

  } catch (error: any) {
    console.error('Error fetching department signatories:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch department signatories' },
      { status: 500 }
    )
  }
}
