import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { sendEmail } from '@/lib/email'

const IT_SUPPORT_EMAIL = process.env.IT_SUPPORT_EMAIL || 'itsupport@nsa.org.na'

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { category, subject, description, priority } = body

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 })
    }

    // Resolve sender info
    const canonicalUser = user.email ? await prisma.user.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { firstName: true, lastName: true, email: true, jobTitle: true, departmentName: true }
    }) : null

    const fromName =
      (canonicalUser ? `${canonicalUser.firstName || ''} ${canonicalUser.lastName || ''}`.trim() : null) ||
      user.email?.split('@')[0] || 'NSA Employee'
    const fromEmail = canonicalUser?.email || user.email || ''
    const fromJobTitle = canonicalUser?.jobTitle || 'Team Member'
    const fromDept = canonicalUser?.departmentName || 'NSA'
    const ticketRef = `IT-${Date.now().toString(36).toUpperCase()}`

    const priorityColor: Record<string, string> = {
      High: '#dc2626', Medium: '#d97706', Low: '#16a34a'
    }
    const pColor = priorityColor[priority || 'Medium'] || '#d97706'

    const submittedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Windhoek'
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f9fafb; padding: 20px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%); padding: 28px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #60a5fa; margin: 0; font-size: 20px; font-weight: bold;">🛠️ IT Support Request</h1>
          <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 13px;">
            Namibia Statistics Agency — Ref: <strong style="color:#93c5fd;">${ticketRef}</strong>
          </p>
        </div>
        <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear IT Support Team,</p>
          <p>A new support request has been submitted via NSA My Desk.</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:4px 0; color:#6b7280; width:120px;"><strong>Category:</strong></td>
                <td style="padding:4px 0; color:#111827;">${category || 'General'}</td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;"><strong>Priority:</strong></td>
                <td style="padding:4px 0;">
                  <span style="background:${pColor}; color:#fff; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:bold;">
                    ${priority || 'Medium'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0; color:#6b7280;"><strong>Subject:</strong></td>
                <td style="padding:4px 0; color:#111827; font-weight:bold;">${subject}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6;">${description.replace(/\n/g, '<br/>')}</p>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:13px;">
            <tr>
              <td style="padding:5px 0; color:#6b7280; width:140px;"><strong>Submitted By:</strong></td>
              <td style="padding:5px 0; color:#111827;">${fromName} (${fromEmail})</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#6b7280;"><strong>Job Title:</strong></td>
              <td style="padding:5px 0; color:#111827;">${fromJobTitle}</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#6b7280;"><strong>Department:</strong></td>
              <td style="padding:5px 0; color:#111827;">${fromDept}</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#6b7280;"><strong>Submitted At:</strong></td>
              <td style="padding:5px 0; color:#111827;">${submittedAt}</td>
            </tr>
            <tr>
              <td style="padding:5px 0; color:#6b7280;"><strong>Ticket Ref:</strong></td>
              <td style="padding:5px 0; color:#111827;">${ticketRef}</td>
            </tr>
          </table>

          <p style="color:#6b7280; font-size:12px; margin-top:24px; border-top:1px solid #f3f4f6; padding-top:16px;">
            This request was submitted through the NSA My Desk IT Support chatbot.
            Please respond directly to <a href="mailto:${fromEmail}">${fromEmail}</a>.
          </p>
        </div>
      </div>
    `

    await sendEmail(IT_SUPPORT_EMAIL, `[IT Support] ${subject} — ${ticketRef}`, html)

    // Also CC the sender a confirmation
    const confirmHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #60a5fa; margin: 0;">✅ IT Support Request Received</h2>
          <p style="color:rgba(255,255,255,0.7); margin:6px 0 0; font-size:13px;">Reference: ${ticketRef}</p>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${fromName},</p>
          <p>Your IT support request has been received and assigned reference number <strong>${ticketRef}</strong>.</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p>The IT Support team will review your request and respond as soon as possible.</p>
          <p style="color:#6b7280; font-size:12px; margin-top:20px;">NSA My Desk — Automated Confirmation</p>
        </div>
      </div>
    `
    sendEmail(fromEmail, `IT Support Request Confirmed — ${ticketRef}`, confirmHtml).catch(() => {})

    console.log(`[chatbot/it-support] Ticket ${ticketRef} sent to ${IT_SUPPORT_EMAIL} from ${fromEmail}`)

    return NextResponse.json({
      success: true,
      ticketRef,
      message: `Your request has been submitted. Ref: ${ticketRef}. A confirmation has been sent to your email.`,
    })
  } catch (error) {
    console.error('[chatbot/it-support] Error:', error)
    return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
  }
}
