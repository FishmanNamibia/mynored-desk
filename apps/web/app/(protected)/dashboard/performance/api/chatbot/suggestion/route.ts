import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { sendEmail } from '@/lib/email'
import { getSafeSenderId } from '@/lib/pms/notification-helper'

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

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // departmentId is now the department name (the chatbot/departments API uses name as id)
    const { departmentId, departmentName, suggestion, senderName, senderEmail } = body

    if (!departmentId || !suggestion?.trim()) {
      return NextResponse.json({ error: 'Department and suggestion are required' }, { status: 400 })
    }

    // The department label to display — departmentId IS the name in the new flow
    const deptLabel = (departmentName || departmentId || 'Unknown Department').trim()

    // Resolve canonical sender info
    const canonicalSender = user.email ? await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, departmentName: true }
    }) : null

    const fromName = senderName ||
      (canonicalSender ? `${canonicalSender.firstName || ''} ${canonicalSender.lastName || ''}`.trim() : null) ||
      user.email?.split('@')[0] || 'NSA Employee'
    const fromEmail = canonicalSender?.email || senderEmail || user.email || ''
    const fromJobTitle = canonicalSender?.jobTitle || 'Team Member'
    const fromDept = canonicalSender?.departmentName || 'NSA'
    const senderId = canonicalSender?.id || user.id

    // Find all users in this department by matching User.departmentName (the AD source of truth)
    const depNorm = normName(deptLabel)
    const deptUsers = await prisma.user.findMany({
      where: { departmentName: { not: null } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        departmentName: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    })

    // Filter in-memory with normalised name (handles & vs 'and', case, whitespace)
    const matched = deptUsers.filter(u => {
      if (!u.departmentName) return false
      return normName(u.departmentName) === depNorm
    })

    // Deduplicate by email (keep oldest / canonical record)
    const emailMap = new Map<string, typeof deptUsers[0]>()
    for (const u of matched) {
      if (!u.email) continue
      const key = u.email.toLowerCase()
      const existing = emailMap.get(key)
      if (!existing || u.createdAt < existing.createdAt) emailMap.set(key, u)
    }
    const unique = Array.from(emailMap.values())

    // Sort by role/title score descending → most senior executive first
    unique.sort((a, b) => {
      const aRoles = a.roles.map((r: any) => r.role?.name ?? '')
      const bRoles = b.roles.map((r: any) => r.role?.name ?? '')
      const diff = scoreUser(bRoles, b.jobTitle) - scoreUser(aRoles, a.jobTitle)
      return diff !== 0 ? diff : a.createdAt.getTime() - b.createdAt.getTime()
    })

    console.log(`[chatbot/suggestion] deptLabel="${deptLabel}" depNorm="${depNorm}" matched=${matched.length} unique=${unique.length}`)
    if (unique.length > 0) {
      console.log(`[chatbot/suggestion] top exec: email=${unique[0].email} jobTitle="${unique[0].jobTitle}"`)
    }

    const topExec = unique.find(u => u.email) ?? null

    if (!topExec?.email) {
      return NextResponse.json({
        error: 'No executive found for this department. Please contact HR.'
      }, { status: 422 })
    }

    const execEmail = topExec.email
    const execName = (`${topExec.firstName || ''} ${topExec.lastName || ''}`).trim() || execEmail

    const submittedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Windhoek'
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f9fafb; padding: 20px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2550 100%); padding: 28px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #d4a855; margin: 0; font-size: 20px; font-weight: bold;">📬 New Department Suggestion</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 13px;">Namibia Statistics Agency — Internal Suggestion Box</p>
        </div>
        <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${execName}</strong>,</p>
          <p>A suggestion has been submitted to the <strong>${deptLabel}</strong> department via the NSA My Desk portal.</p>
          <div style="background: #f0f9ff; border-left: 4px solid #0a1628; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #1e293b; line-height: 1.6;">${suggestion.replace(/\n/g, '<br/>')}</p>
          </div>
          <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:13px;">
            <tr>
              <td style="padding:6px 0; color:#6b7280; width:140px;"><strong>Submitted By:</strong></td>
              <td style="padding:6px 0; color:#111827;">${fromName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#6b7280;"><strong>Job Title:</strong></td>
              <td style="padding:6px 0; color:#111827;">${fromJobTitle}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#6b7280;"><strong>Department:</strong></td>
              <td style="padding:6px 0; color:#111827;">${fromDept}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#6b7280;"><strong>Email:</strong></td>
              <td style="padding:6px 0; color:#111827;">${fromEmail}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#6b7280;"><strong>Submitted At:</strong></td>
              <td style="padding:6px 0; color:#111827;">${submittedAt}</td>
            </tr>
          </table>
          <p style="color:#6b7280; font-size:12px; margin-top:24px; border-top:1px solid #f3f4f6; padding-top:16px;">
            This suggestion was submitted through the NSA My Desk Suggestion Box.
            You may reply directly to the sender if you wish to follow up.
          </p>
        </div>
      </div>
    `

    // Fire email to executive in background (non-blocking to avoid 504 on slow SMTP)
    sendEmail(execEmail, `Suggestion for ${deptLabel} — NSA My Desk`, html)
      .then(() => console.log(`[chatbot/suggestion] Email sent to ${execEmail} (${deptLabel})`))
      .catch(err => console.error(`[chatbot/suggestion] Email failed to ${execEmail}:`, err))

    // In-app bell notification to executive (anonymous — sender is not exposed)
    try {
      const safeSenderId = await getSafeSenderId(topExec.id)
      const suggestionPreview = suggestion.trim().length > 180
        ? suggestion.trim().slice(0, 180) + '…'
        : suggestion.trim()
      const notif = await prisma.pmsNotification.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          senderId: safeSenderId,
          receiverId: topExec.id,
          message: `Anonymous suggestion for the ${deptLabel} department: "${suggestionPreview}"`,
          type: 'SYSTEM',
          status: 'PENDING',
          entityType: 'Suggestion',
          entityId: topExec.id,
          metadata: {
            action: 'suggestion_submitted',
            deptLabel,
            submittedAt,
            suggestion: suggestion.trim().slice(0, 300),
          }
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } }
      })
      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser, mapNotifForBroadcast } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: topExec.id, status: { in: ['PENDING', 'SENT'] } }
        })
        broadcastToUser(topExec.id, { type: 'notification', notification: mapNotifForBroadcast(notif), unreadCount })
      } catch { /* SSE best-effort */ }
    } catch (notifErr) {
      console.error('[chatbot/suggestion] In-app notification failed (non-critical):', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: `Your suggestion has been sent to the executive of ${deptLabel}.`,
      sentTo: execName,
    })
  } catch (error) {
    console.error('[chatbot/suggestion] Error:', error)
    return NextResponse.json({ error: 'Failed to send suggestion. Please try again.' }, { status: 500 })
  }
}
