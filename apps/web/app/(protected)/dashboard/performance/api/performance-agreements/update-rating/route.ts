import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getSafeSenderId } from '@/lib/notification-helper'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { sendEmail, fullName } from '@/lib/email'

interface ChainMember {
  level: number
  userId: string
  name: string
  email: string
  jobTitle: string | null
}

interface ChainApproval {
  level: number
  userId: string
  name: string
  action: 'accept' | 'reject' | 'alter'
  approvedAt: string
  comment: string | null
  newRating?: number | null
}

interface RatingChainData {
  chain: ChainMember[]
  approvals: ChainApproval[]
}

interface ChainRow {
  agreementId: string
  ratingApprovalLevel: number
  ratingApprovalChain: RatingChainData | null
}

/** Returns true when a job title indicates a terminal approver level.
 * The chain stops AFTER including this person — they are the last approver.
 * Mapping:
 *   Regular employee  → chain ends at Executive
 *   Executive         → chain ends at DSG / SG
 *   DSG               → chain ends at SG
 *   SG                → chain ends at Board Chairperson
 */
function isTerminalApprover(jobTitle: string | null | undefined): boolean {
  if (!jobTitle) return false
  const jt = jobTitle.toLowerCase()
  return (
    jt.includes('executive') ||
    jt.includes('statistician') ||
    jt.includes('board chair') ||
    jt.includes('board member') ||
    jt.startsWith('dsg') ||
    jt === 'sg' ||
    jt.startsWith('sg ')
  )
}

/** Resolve the canonical (oldest) DB user ID for a given email.
 *  This handles duplicate/ghost accounts — always uses the same canonical record. */
async function canonicalUser(email: string): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string; jobTitle: string | null } | null> {
  if (!email) return null
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
  })
}

async function buildRatingChain(employeeId: string): Promise<ChainMember[]> {
  const chain: ChainMember[] = []
  const visited = new Set<string>()
  let currentId = employeeId
  let level = 1

  while (level <= 10) {
    const u = await prisma.user.findUnique({
      where: { id: currentId },
      select: {
        managerId: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } }
      }
    })
    if (!u?.manager || !u.managerId || visited.has(u.managerId)) break
    visited.add(u.managerId)

    // Always resolve to canonical account to avoid ghost/duplicate ID mismatches
    const mgr = (await canonicalUser(u.manager.email)) ?? u.manager

    chain.push({
      level,
      userId: mgr.id,
      name: `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim() || mgr.email || 'Unknown',
      email: mgr.email || '',
      jobTitle: mgr.jobTitle || null
    })

    // STOP after including a terminal approver (Executive / DSG / SG / Board).
    // Do not traverse to their manager — they are the last link in the chain.
    if (isTerminalApprover(mgr.jobTitle)) break

    // IMPORTANT: use canonical mgr.id (not u.managerId which may be a ghost/old account ID).
    // Ghost accounts often have managerId=null so traversal would stop prematurely.
    currentId = mgr.id
    level++
  }

  // Fallback: if the managerId traversal ran out without reaching a terminal approver
  // (e.g. supervisor has no managerId set in AD), look up the department executive
  // and append them as the next level so the chain still ends at the executive.
  if (chain.length > 0 && !isTerminalApprover(chain[chain.length - 1].jobTitle)) {
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { departmentName: true, divisionName: true }
    })
    const deptName = employee?.departmentName || employee?.divisionName
    if (deptName) {
      const existingIds = chain.map(c => c.userId)
      const exec = await prisma.user.findFirst({
        where: {
          jobTitle: { contains: 'EXECUTIVE', mode: 'insensitive' },
          id: { notIn: existingIds },
          OR: [
            { departmentName: { contains: deptName, mode: 'insensitive' } },
            { jobTitle: { contains: deptName, mode: 'insensitive' } }
          ]
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
      })
      if (exec) {
        const canonExec = (await canonicalUser(exec.email)) ?? exec
        if (!existingIds.includes(canonExec.id)) {
          chain.push({
            level: chain.length + 1,
            userId: canonExec.id,
            name: `${canonExec.firstName || ''} ${canonExec.lastName || ''}`.trim() || canonExec.email || 'Executive',
            email: canonExec.email || '',
            jobTitle: canonExec.jobTitle || null
          })
        }
      }
    }
  }

  return chain
}

async function loadChainRow(agreementId: string): Promise<{ level: number; chainData: RatingChainData }> {
  const rows = await prisma.$queryRawUnsafe<ChainRow[]>(
    `SELECT "agreementId", "ratingApprovalLevel", "ratingApprovalChain" FROM "PerformanceRatingChain" WHERE "agreementId" = $1`,
    agreementId
  )
  if (rows.length === 0) return { level: 0, chainData: { chain: [], approvals: [] } }
  const row = rows[0]
  return {
    level: row.ratingApprovalLevel ?? 0,
    chainData: (row.ratingApprovalChain as RatingChainData) ?? { chain: [], approvals: [] }
  }
}

async function saveChainRow(agreementId: string, level: number, chainData: RatingChainData): Promise<void> {
  const chainJson = JSON.stringify(chainData)
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PerformanceRatingChain" ("agreementId", "ratingApprovalLevel", "ratingApprovalChain", "updatedAt")
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT ("agreementId") DO UPDATE
     SET "ratingApprovalLevel" = EXCLUDED."ratingApprovalLevel",
         "ratingApprovalChain" = EXCLUDED."ratingApprovalChain",
         "updatedAt" = NOW()`,
    agreementId, level, chainJson
  )
}

function buildChainLevelEmail(params: {
  nextApprover: ChainMember; prevApproverName: string; prevLevel: number
  empName: string; agreementTitle: string; rating: number; nextLevel: number
}): string {
  const { nextApprover, prevApproverName, prevLevel, empName, agreementTitle, rating, nextLevel } = params
  const APP_URL = process.env.NEXTAUTH_URL || 'https://pms.nsa.org.na'
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;padding:32px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
<tr><td style="background:#0B2D6B;padding:24px 32px;">
  <div style="font-size:20px;font-weight:700;color:#fff;">NSA Performance Management System</div>
  <div style="font-size:11px;color:#C8973A;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Multi-Level Rating Approval — Action Required</div>
</td></tr><tr><td style="background:#C8973A;height:3px;"></td></tr>
<tr><td style="padding:32px;">
  <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
    <strong style="color:#92400e;">⏳ Action Required — Level ${nextLevel} Approval</strong>
  </div>
  <p style="color:#475569;font-size:14px;">Dear ${nextApprover.name},</p>
  <p style="color:#475569;font-size:14px;">A performance rating has been approved at Level ${prevLevel} by <strong>${prevApproverName}</strong> and now awaits your review.</p>
  <table style="width:100%;border:1px solid #e8ecf4;border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <tr style="background:#f1f5fb;"><th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;">Field</th><th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;">Details</th></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #f0f2f7;">Employee</td><td style="padding:10px 14px;font-size:13px;font-weight:600;color:#1e293b;border-top:1px solid #f0f2f7;">${empName}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #f0f2f7;">Action / Initiative</td><td style="padding:10px 14px;font-size:13px;color:#1e293b;border-top:1px solid #f0f2f7;">${agreementTitle}</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #f0f2f7;">Employee Rating</td><td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1e293b;border-top:1px solid #f0f2f7;">${rating}/5</td></tr>
    <tr><td style="padding:10px 14px;font-size:13px;color:#475569;border-top:1px solid #f0f2f7;">Level ${prevLevel} Approved By</td><td style="padding:10px 14px;font-size:13px;color:#16a34a;font-weight:600;border-top:1px solid #f0f2f7;">✓ ${prevApproverName}</td></tr>
  </table>
  <div style="text-align:center;margin-bottom:8px;">
    <a href="${APP_URL}/dashboard/performance/approvals" style="display:inline-block;background:#0B2D6B;color:#fff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;">Review &amp; Approve in PMS</a>
  </div>
</td></tr>
<tr><td style="background:#f8f9fc;padding:16px 32px;border-top:1px solid #e8ecf4;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Automated notification from NSA Performance Management System. Do not reply.</p>
</td></tr></table></td></tr></table></body></html>`
}

function buildFinalApprovalEmail(params: {
  empName: string; supervisorName: string; agreementTitle: string
  rating: number; totalLevels: number; comment: string | null
}): string {
  const { empName, supervisorName, agreementTitle, rating, totalLevels, comment } = params
  const APP_URL = process.env.NEXTAUTH_URL || 'https://pms.nsa.org.na'
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;padding:32px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
<tr><td style="background:#0B2D6B;padding:24px 32px;">
  <div style="font-size:20px;font-weight:700;color:#fff;">NSA Performance Management System</div>
  <div style="font-size:11px;color:#C8973A;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Rating — Final Approval Complete</div>
</td></tr><tr><td style="background:#16a34a;height:3px;"></td></tr>
<tr><td style="padding:32px;">
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
    <strong style="color:#166534;">✅ Your rating has been fully approved through all ${totalLevels} approval level${totalLevels !== 1 ? 's' : ''}.</strong>
  </div>
  <p style="color:#475569;font-size:14px;">Dear ${empName},</p>
  <p style="color:#475569;font-size:14px;">Your rating of <strong>${rating}/5</strong> for "<strong>${agreementTitle}</strong>" has received final approval from <strong>${supervisorName}</strong>.</p>
  ${comment ? `<div style="background:#f8faff;border:1px solid #dbe4f7;border-radius:8px;padding:14px 18px;margin:20px 0;"><p style="margin:0;font-size:13px;color:#475569;"><strong>Comment:</strong> ${comment}</p></div>` : ''}
  <div style="text-align:center;margin:24px 0 8px;">
    <a href="${APP_URL}/dashboard/performance/my-tasks" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;">View Your Performance Record</a>
  </div>
</td></tr>
<tr><td style="background:#f8f9fc;padding:16px 32px;border-top:1px solid #e8ecf4;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Automated notification from NSA Performance Management System. Do not reply.</p>
</td></tr></table></td></tr></table></body></html>`
}

function buildRejectionEmail(params: {
  empName: string; supervisorName: string; supervisorLevel: number
  agreementTitle: string; comment: string
}): string {
  const { empName, supervisorName, supervisorLevel, agreementTitle, comment } = params
  const APP_URL = process.env.NEXTAUTH_URL || 'https://pms.nsa.org.na'
  return `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;padding:32px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);">
<tr><td style="background:#0B2D6B;padding:24px 32px;">
  <div style="font-size:20px;font-weight:700;color:#fff;">NSA Performance Management System</div>
  <div style="font-size:11px;color:#C8973A;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">Rating — Revision Required</div>
</td></tr><tr><td style="background:#dc2626;height:3px;"></td></tr>
<tr><td style="padding:32px;">
  <div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
    <strong style="color:#991b1b;">❌ Revision Required</strong>
  </div>
  <p style="color:#475569;font-size:14px;">Dear ${empName},</p>
  <p style="color:#475569;font-size:14px;"><strong>${supervisorName}</strong> (Level ${supervisorLevel}) has returned your rating for "<strong>${agreementTitle}</strong>" for revision.</p>
  ${comment ? `<div style="background:#fff8f8;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin:20px 0;"><p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#991b1b;">Reason:</p><p style="margin:0;font-size:13px;color:#7f1d1d;">${comment}</p></div>` : ''}
  <p style="color:#475569;font-size:14px;">Please review the feedback and resubmit your rating.</p>
  <div style="text-align:center;margin:24px 0 8px;">
    <a href="${APP_URL}/dashboard/performance/my-tasks" style="display:inline-block;background:#0B2D6B;color:#fff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;">Review &amp; Revise Your Rating</a>
  </div>
</td></tr>
<tr><td style="background:#f8f9fc;padding:16px 32px;border-top:1px solid #e8ecf4;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Automated notification from NSA Performance Management System. Do not reply.</p>
</td></tr></table></td></tr></table></body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agreementId, action, newRating, comment } = await req.json()

    if (!agreementId || !action) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!['accept', 'reject', 'alter'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    if (action === 'alter' && (!newRating || newRating < 1 || newRating > 5)) return NextResponse.json({ error: 'Invalid rating (1-5)' }, { status: 400 })
    if ((action === 'reject' || action === 'alter') && (!comment || !comment.trim())) return NextResponse.json({ error: 'A comment is required when rejecting or altering a rating' }, { status: 400 })

    const agreement = await prisma.performanceAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, title: true, rating: true, userId: true, supervisorId: true, progressNotes: true }
    })
    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })

    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, jobTitle: true }
    })
    const actualUserId = dbUser?.id || user.id
    const supervisorName = `${dbUser?.firstName || ''} ${dbUser?.lastName || ''}`.trim() || 'Supervisor'
    const dateStr = new Date().toLocaleDateString('en-GB')

    // Load or initialise chain
    let { level: currentLevel, chainData } = await loadChainRow(agreementId)

    // Trim chain in-memory to stop at first terminal approver.
    // Handles chains that were stored before the terminal-cap rule was enforced.
    if (chainData.chain && chainData.chain.length > 0) {
      const termIdx = chainData.chain.findIndex(c => isTerminalApprover(c.jobTitle))
      if (termIdx !== -1 && termIdx < chainData.chain.length - 1) {
        chainData.chain = chainData.chain.slice(0, termIdx + 1)
      }
    }

    // Already fully approved
    if (currentLevel === 99) {
      return NextResponse.json({ error: 'Rating is already fully approved through all levels' }, { status: 400 })
    }

    // Build chain if not yet initialised
    if (!chainData.chain || chainData.chain.length === 0) {
      const built = await buildRatingChain(agreement.userId)
      if (built.length === 0 && agreement.supervisorId) {
        const sup = await prisma.user.findUnique({
          where: { id: agreement.supervisorId },
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true }
        })
        if (sup) {
          // Canonicalise the supervisor too
          const canonSup = (await canonicalUser(sup.email)) ?? sup
          built.push({ level: 1, userId: canonSup.id, name: `${canonSup.firstName || ''} ${canonSup.lastName || ''}`.trim() || 'Supervisor', email: canonSup.email || '', jobTitle: canonSup.jobTitle || null })
        }
      }
      chainData = { chain: built, approvals: chainData.approvals || [] }
    }

    // Set initial level if not started
    if (currentLevel <= 0) currentLevel = 1

    // Reject re-action if previously rejected
    if (currentLevel === -1) {
      return NextResponse.json({ error: 'Rating was rejected. The employee must revise and resubmit their rating.' }, { status: 400 })
    }

    // Find expected approver at current level
    const expectedApprover = chainData.chain.find(c => c.level === currentLevel)
    if (!expectedApprover) {
      // Chain exhausted — auto-finalize
      await saveChainRow(agreementId, 99, chainData)
      return NextResponse.json({ success: true, action: 'auto_finalized', ratingApprovalLevel: 99 })
    }

    // Enforce: only the correct level approver may act
    // Also accept an email match as fallback — handles chains built before ghost-account dedup was applied
    const currentUserEmail = (user.email || '').toLowerCase()
    const approverEmail = (expectedApprover.email || '').toLowerCase()
    const idMatch = actualUserId === expectedApprover.userId
    const emailMatch = currentUserEmail && approverEmail && currentUserEmail === approverEmail

    if (!idMatch && !emailMatch) {
      return NextResponse.json({
        error: `Not your turn. This rating is awaiting approval from ${expectedApprover.name} (Level ${currentLevel} in the approval chain).`,
        awaitingApproverName: expectedApprover.name,
        awaitingLevel: currentLevel
      }, { status: 403 })
    }

    // Self-heal: if we matched by email but the stored userId is wrong, fix it now
    if (!idMatch && emailMatch) {
      chainData.chain = chainData.chain.map(c =>
        c.level === currentLevel ? { ...c, userId: actualUserId } : c
      )
    }

    const updateData: any = {}
    let notificationMessage = ''
    let newLevel = currentLevel

    if (action === 'accept' || action === 'alter') {
      if (action === 'alter') {
        updateData.rating = newRating
        // Add the alteration comment to progressNotes so it shows up in stats
        const alterationMarker = `\n\n--- ${supervisorName} adjusted your rating to ${newRating}/5 (${dateStr}) ---${comment?.trim() ? '\n' + comment.trim() : ''}`
        updateData.progressNotes = (agreement.progressNotes || '') + alterationMarker
      }

      chainData.approvals.push({
        level: currentLevel, userId: actualUserId, name: supervisorName,
        action: action === 'alter' ? 'alter' : 'accept',
        approvedAt: new Date().toISOString(),
        comment: comment?.trim() || null,
        ...(action === 'alter' ? { newRating } : {})
      })

      const nextLevel = currentLevel + 1
      const hasNext = chainData.chain.some(c => c.level === nextLevel)

      // If the current approver is a terminal level (Executive / DSG / SG / Board) finalise now.
      // This also self-heals chains that were built before this rule was enforced
      // (e.g. chains stored with an extra level beyond the executive).
      const currentApproverIsTerminal = isTerminalApprover(expectedApprover.jobTitle)

      if (hasNext && !currentApproverIsTerminal) {
        newLevel = nextLevel
        const next = chainData.chain.find(c => c.level === nextLevel)!
        notificationMessage = `${supervisorName} (Level ${currentLevel}) ${action === 'alter' ? 'adjusted your rating to ' + newRating + '/5 and' : 'approved your rating for'} "${agreement.title}". Awaiting Level ${nextLevel} approval from ${next.name}.`

        // Email + in-app bell notification to next approver
        try {
          const emp = await prisma.user.findUnique({ where: { id: agreement.userId }, select: { firstName: true, lastName: true, email: true } })
          const empName = fullName(emp?.firstName ?? null, emp?.lastName ?? null, emp?.email)
          sendEmail(next.email, `[Action Required] Level ${nextLevel} rating approval — ${empName}`,
            buildChainLevelEmail({ nextApprover: next, prevApproverName: supervisorName, prevLevel: currentLevel, empName, agreementTitle: agreement.title || 'Untitled', rating: action === 'alter' ? newRating! : (agreement.rating || 0), nextLevel })
          ).catch(e => console.error('[EMAIL] chain level email failed:', e))
        } catch {}

        // In-app bell notification to next approver (manager / executive)
        try {
          const nextApproverId = next.userId
          const safeSenderForNext = await getSafeSenderId(actualUserId)
          const emp2 = await prisma.user.findUnique({ where: { id: agreement.userId }, select: { firstName: true, lastName: true } })
          const emp2Name = `${emp2?.firstName || ''} ${emp2?.lastName || ''}`.trim() || 'Employee'
          const nextApproverNotif = await prisma.pmsNotification.create({
            data: {
              senderId: safeSenderForNext,
              receiverId: nextApproverId,
              message: `${supervisorName} (Level ${currentLevel}) has reviewed ${emp2Name}'s rating for "${agreement.title || 'Untitled'}" and it now requires your Level ${nextLevel} approval.`,
              type: 'APPROVAL_REQUESTED',
              status: 'PENDING',
              entityType: 'PerformanceAgreement',
              entityId: agreementId,
              metadata: {
                action: 'rating_chain_advanced',
                approvalLevel: nextLevel,
                prevApproverName: supervisorName,
                employeeId: agreement.userId,
                agreementTitle: agreement.title
              }
            },
            include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } }
          })
          try {
            const { broadcastToUser, mapNotifForBroadcast } = await import('@/app/(protected)/dashboard/performance/api/notifications/stream/route')
            const unreadCount = await prisma.pmsNotification.count({ where: { receiverId: nextApproverId, status: { in: ['PENDING', 'SENT'] } } })
            broadcastToUser(nextApproverId, { type: 'notification', notification: mapNotifForBroadcast(nextApproverNotif), unreadCount })
          } catch { /* SSE best-effort */ }
        } catch (nextNotifError) {
          console.error('[CHAIN] Failed to send bell notification to next approver (non-critical):', nextNotifError)
        }

      } else {
        // Final approval
        newLevel = 99
        
        if (action === 'alter') {
          // For final approval of altered rating, add both alteration and acceptance markers
          const alterationMarker = `\n\n--- ${supervisorName} adjusted your rating to ${newRating}/5 (${dateStr}) ---${comment?.trim() ? '\n' + comment.trim() : ''}`
          const acceptMarker = `\n\n--- Rating Accepted (${supervisorName}, ${dateStr}) ---`
          updateData.progressNotes = (agreement.progressNotes || '') + alterationMarker + acceptMarker
          notificationMessage = `${supervisorName} adjusted your rating for "${agreement.title}" to ${newRating}/5 and gave final approval.`
        } else {
          const acceptMarker = `\n\n--- Rating Accepted (${supervisorName}, ${dateStr}) ---${comment?.trim() ? '\n' + comment.trim() : ''}`
          updateData.progressNotes = (agreement.progressNotes || '') + acceptMarker
          notificationMessage = `${supervisorName} gave final approval for your rating of ${agreement.rating}/5 on "${agreement.title}". All ${chainData.chain.length} approval level${chainData.chain.length !== 1 ? 's' : ''} completed.`
        }

        // Email employee — final approval
        try {
          const emp = await prisma.user.findUnique({ where: { id: agreement.userId }, select: { firstName: true, lastName: true, email: true } })
          if (emp?.email) {
            const empName = fullName(emp.firstName ?? null, emp.lastName ?? null, emp.email)
            sendEmail(emp.email, `[PMS] Your rating is fully approved — "${agreement.title}"`,
              buildFinalApprovalEmail({ empName, supervisorName, agreementTitle: agreement.title || 'Untitled', rating: action === 'alter' ? newRating! : (agreement.rating || 0), totalLevels: chainData.chain.length, comment: comment?.trim() || null })
            ).catch(e => console.error('[EMAIL] final approval email failed:', e))
          }
        } catch {}
      }

    } else if (action === 'reject') {
      newLevel = -1
      updateData.rating = 0
      if (comment?.trim()) {
        updateData.progressNotes = (agreement.progressNotes || '') + `\n\n--- Supervisor Feedback (${supervisorName}, ${dateStr}) ---\n${comment.trim()}`
      }
      chainData.approvals.push({
        level: currentLevel, userId: actualUserId, name: supervisorName,
        action: 'reject', approvedAt: new Date().toISOString(), comment: comment?.trim() || null
      })
      notificationMessage = `${supervisorName} (Level ${currentLevel}) rejected your rating for "${agreement.title}". Comment: ${comment?.trim() || ''}. Please revise and resubmit.`

      // Email employee — rejection
      try {
        const emp = await prisma.user.findUnique({ where: { id: agreement.userId }, select: { firstName: true, lastName: true, email: true } })
        if (emp?.email) {
          const empName = fullName(emp.firstName ?? null, emp.lastName ?? null, emp.email)
          sendEmail(emp.email, `[PMS] Rating revision required — "${agreement.title}"`,
            buildRejectionEmail({ empName, supervisorName, supervisorLevel: currentLevel, agreementTitle: agreement.title || 'Untitled', comment: comment?.trim() || '' })
          ).catch(e => console.error('[EMAIL] rejection email failed:', e))
        }
      } catch {}
    }

    // Persist chain state
    await saveChainRow(agreementId, newLevel, chainData)

    // Apply agreement field updates
    if (Object.keys(updateData).length > 0) {
      await prisma.performanceAgreement.update({ where: { id: agreementId }, data: updateData })
    }

    // In-app notification
    try {
      const safeSenderId = await getSafeSenderId(actualUserId)
      const notifType = newLevel === 99 ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'GENERAL'
      const ratingNotif = await prisma.pmsNotification.create({
        data: {
          senderId: safeSenderId, receiverId: agreement.userId,
          message: notificationMessage, type: notifType, status: 'PENDING',
          entityType: 'PerformanceAgreement', entityId: agreementId,
          metadata: { action, agreementTitle: agreement.title, supervisorName, approvalLevel: currentLevel, totalLevels: chainData.chain.length, ratingApprovalLevel: newLevel, ...(action === 'alter' ? { oldRating: agreement.rating, newRating } : {}), ...(comment ? { comment: comment.trim() } : {}) }
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } }
      })
      try {
        const { broadcastToUser, mapNotifForBroadcast } = await import('@/app/(protected)/dashboard/performance/api/notifications/stream/route')
        const unreadCount = await prisma.pmsNotification.count({ where: { receiverId: agreement.userId, status: { in: ['PENDING', 'SENT'] } } })
        broadcastToUser(agreement.userId, { type: 'notification', notification: mapNotifForBroadcast(ratingNotif), unreadCount })
      } catch { /* SSE best-effort */ }
    } catch (notifError) {
      console.error('Failed to create notification (non-critical):', notifError)
    }

    console.log(`[CHAIN] ${actualUserId} ${action}d at level ${currentLevel}/${chainData.chain.length} for ${agreementId} → newLevel: ${newLevel}`)
    return NextResponse.json({
      success: true, action, agreementId, ratingApprovalLevel: newLevel,
      currentLevel, totalLevels: chainData.chain.length, isFinalApproval: newLevel === 99,
      newRating: action === 'alter' ? newRating : (action === 'accept' ? agreement.rating : null)
    })

  } catch (error) {
    console.error('Error updating rating:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
