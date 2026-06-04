const NSA_NAVY = '#0B2D6B'
const NSA_GOLD = '#C8973A'
const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://pms.nsa.org.na'

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NSA Performance Management System</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${NSA_NAVY};padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                    Namibia Statistics Agency
                  </div>
                  <div style="font-size:12px;color:${NSA_GOLD};margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
                    Performance Management System
                  </div>
                </td>
                <td align="right">
                  <div style="background:${NSA_GOLD};border-radius:6px;padding:6px 14px;display:inline-block;">
                    <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;">PMS</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Gold accent line -->
        <tr><td style="background:${NSA_GOLD};height:4px;"></td></tr>

        <!-- Content -->
        <tr><td style="padding:36px 36px 28px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fc;padding:20px 36px;border-top:1px solid #e8ecf4;">
            <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
              This is an automated notification from the NSA Performance Management System.
              Please do not reply to this email.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Namibia Statistics Agency &bull; Private Bag 13356 &bull; Windhoek, Namibia
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function badge(text: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:${color};background:${bg};letter-spacing:0.3px;">${text}</span>`
}

function actionRow(title: string, rating: string | number | null, weight: string | number | null, status?: string | null): string {
  const statusColor = status === 'APPROVED' ? '#16a34a' : status === 'REJECTED' ? '#dc2626' : '#d97706'
  const statusBg = status === 'APPROVED' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#fef3c7'
  const statusLabel = status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Pending'
  return `
  <tr style="border-bottom:1px solid #f0f2f7;">
    <td style="padding:10px 12px;font-size:13px;color:#1e293b;max-width:300px;">${title}</td>
    <td style="padding:10px 12px;font-size:13px;color:#475569;text-align:center;">${rating !== null && rating !== undefined ? rating : '—'}</td>
    <td style="padding:10px 12px;font-size:13px;color:#475569;text-align:center;">${weight !== null && weight !== undefined ? `${weight}%` : '—'}</td>
    ${status !== undefined ? `<td style="padding:10px 12px;text-align:center;">${badge(statusLabel, statusColor, statusBg)}</td>` : ''}
  </tr>`
}

export interface AgreementSummary {
  id: string
  title: string
  rating: number | null
  weight: number | null
  status?: string | null
  comment?: string | null
}

export interface RatingSubmittedEmailData {
  employeeName: string
  employeeEmail: string
  employeeJobTitle: string | null
  employeeDepartment: string | null
  supervisorName: string
  quarterName: string | null
  periodName: string | null
  agreements: AgreementSummary[]
  submittedAt: Date
  totalWeight: number
}

export function buildRatingSubmittedEmail(data: RatingSubmittedEmailData): { subject: string; html: string } {
  const subject = `[Action Required] ${data.employeeName} has submitted rated workplan actions for review`
  const dateStr = data.submittedAt.toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const periodLabel = data.periodName || data.quarterName || 'Current Performance Period'
  const rows = data.agreements.map(a => actionRow(a.title, a.rating, a.weight)).join('')

  const content = `
    <!-- Alert banner -->
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>Action Required:</strong> A team member has submitted their self-rated workplan actions and is awaiting your review.
      </p>
    </div>

    <h2 style="margin:0 0 6px;font-size:20px;color:${NSA_NAVY};font-weight:700;">
      Performance Actions Submitted for Review
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">${periodLabel}</p>

    <!-- Employee details card -->
    <div style="background:#f8faff;border:1px solid #dbe4f7;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${NSA_NAVY};text-transform:uppercase;letter-spacing:0.5px;">Employee Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#475569;padding:3px 0;width:40%;">Full Name</td>
          <td style="font-size:13px;color:#1e293b;font-weight:600;">${data.employeeName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#475569;padding:3px 0;">Email</td>
          <td style="font-size:13px;color:#1e293b;">${data.employeeEmail}</td>
        </tr>
        ${data.employeeJobTitle ? `<tr><td style="font-size:13px;color:#475569;padding:3px 0;">Position</td><td style="font-size:13px;color:#1e293b;">${data.employeeJobTitle}</td></tr>` : ''}
        ${data.employeeDepartment ? `<tr><td style="font-size:13px;color:#475569;padding:3px 0;">Department</td><td style="font-size:13px;color:#1e293b;">${data.employeeDepartment}</td></tr>` : ''}
        <tr>
          <td style="font-size:13px;color:#475569;padding:3px 0;">Submitted On</td>
          <td style="font-size:13px;color:#1e293b;">${dateStr}</td>
        </tr>
      </table>
    </div>

    <!-- Summary stats -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:50%;padding-right:8px;">
          <div style="background:#f0f5ff;border-radius:8px;padding:14px 16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:${NSA_NAVY};">${data.agreements.length}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Actions Submitted</div>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;">
          <div style="background:#fffbeb;border-radius:8px;padding:14px 16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:${NSA_GOLD};">${data.totalWeight}%</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Total Weight</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Agreements table -->
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${NSA_NAVY};text-transform:uppercase;letter-spacing:0.5px;">Submitted Actions</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf4;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr style="background:#f1f5fb;">
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:left;font-weight:600;">Action / Initiative</th>
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">Self-Rating</th>
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">Weight</th>
      </tr>
      ${rows}
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${APP_URL}/dashboard/performance/my-tasks?tab=approvals"
         style="display:inline-block;background:${NSA_NAVY};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;letter-spacing:0.3px;">
        Review &amp; Approve in PMS
      </a>
    </div>
    <p style="text-align:center;margin:10px 0 0;font-size:12px;color:#9ca3af;">
      Log in and navigate to <em>Dashboard → Performance → Approvals</em> to take action.
    </p>
  `

  return { subject, html: baseTemplate(content) }
}


export interface RatingReviewedEmailData {
  employeeName: string
  supervisorName: string
  supervisorJobTitle: string | null
  action: 'approved' | 'rejected'
  periodName: string | null
  agreements: AgreementSummary[]
  globalReason?: string | null
  reviewedAt: Date
  approvedCount: number
  rejectedCount: number
}

export function buildRatingReviewedEmail(data: RatingReviewedEmailData): { subject: string; html: string } {
  const isFullyApproved = data.rejectedCount === 0 && data.approvedCount > 0
  const isFullyRejected = data.approvedCount === 0 && data.rejectedCount > 0
  const isMixed = data.approvedCount > 0 && data.rejectedCount > 0

  const subject = isFullyApproved
    ? `[PMS] Your performance actions have been approved by ${data.supervisorName}`
    : isFullyRejected
      ? `[PMS] Your performance actions require revision — feedback from ${data.supervisorName}`
      : `[PMS] Performance actions reviewed by ${data.supervisorName} — action required`

  const dateStr = data.reviewedAt.toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  const periodLabel = data.periodName || 'Current Performance Period'

  const bannerBg = isFullyApproved ? '#f0fdf4' : isFullyRejected ? '#fff1f2' : '#fffbeb'
  const bannerBorder = isFullyApproved ? '#86efac' : isFullyRejected ? '#fca5a5' : '#fcd34d'
  const bannerColor = isFullyApproved ? '#166534' : isFullyRejected ? '#991b1b' : '#92400e'
  const bannerIcon = isFullyApproved ? '✅' : isFullyRejected ? '❌' : '⚠️'
  const bannerMessage = isFullyApproved
    ? `All ${data.approvedCount} of your submitted action${data.approvedCount !== 1 ? 's have' : ' has'} been <strong>approved</strong>. Your performance record has been confirmed.`
    : isFullyRejected
      ? `Your submitted action${data.rejectedCount !== 1 ? 's have' : ' has'} been <strong>returned for revision</strong>. Please review the feedback below, make the necessary corrections, and resubmit.`
      : `${data.approvedCount} action${data.approvedCount !== 1 ? 's were' : ' was'} <strong>approved</strong> and ${data.rejectedCount} ${data.rejectedCount !== 1 ? 'require' : 'requires'} <strong>revision</strong>. Please review the details below.`

  const rows = data.agreements.map(a => {
    let rowHtml = actionRow(a.title, a.rating, a.weight, a.status)
    if ((a.status === 'REJECTED' || a.status === 'rejected') && a.comment) {
      rowHtml += `<tr style="background:#fff8f8;"><td colspan="4" style="padding:8px 12px 12px 12px;font-size:12px;color:#991b1b;border-bottom:1px solid #f0f2f7;">
        <strong>Supervisor's Comment:</strong> ${a.comment}
      </td></tr>`
    }
    return rowHtml
  }).join('')

  const content = `
    <!-- Status banner -->
    <div style="background:${bannerBg};border:1px solid ${bannerBorder};border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:${bannerColor};">
        ${bannerIcon} &nbsp;${bannerMessage}
      </p>
    </div>

    <h2 style="margin:0 0 6px;font-size:20px;color:${NSA_NAVY};font-weight:700;">
      Performance Actions Review Outcome
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;">${periodLabel}</p>

    <!-- Reviewer card -->
    <div style="background:#f8faff;border:1px solid #dbe4f7;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${NSA_NAVY};text-transform:uppercase;letter-spacing:0.5px;">Reviewed By</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#475569;padding:3px 0;width:40%;">Name</td>
          <td style="font-size:13px;color:#1e293b;font-weight:600;">${data.supervisorName}</td>
        </tr>
        ${data.supervisorJobTitle ? `<tr><td style="font-size:13px;color:#475569;padding:3px 0;">Position</td><td style="font-size:13px;color:#1e293b;">${data.supervisorJobTitle}</td></tr>` : ''}
        <tr>
          <td style="font-size:13px;color:#475569;padding:3px 0;">Reviewed On</td>
          <td style="font-size:13px;color:#1e293b;">${dateStr}</td>
        </tr>
      </table>
    </div>

    <!-- Summary stats -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="width:50%;padding-right:8px;">
          <div style="background:#f0fdf4;border-radius:8px;padding:14px 16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#16a34a;">${data.approvedCount}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Approved</div>
          </div>
        </td>
        <td style="width:50%;padding-left:8px;">
          <div style="background:#fff1f2;border-radius:8px;padding:14px 16px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#dc2626;">${data.rejectedCount}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Returned for Revision</div>
          </div>
        </td>
      </tr>
    </table>

    ${data.globalReason ? `
    <!-- Global rejection reason -->
    <div style="background:#fff8f8;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#991b1b;">Supervisor's Reason</p>
      <p style="margin:0;font-size:13px;color:#7f1d1d;">${data.globalReason}</p>
    </div>` : ''}

    <!-- Actions table -->
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${NSA_NAVY};text-transform:uppercase;letter-spacing:0.5px;">Action Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8ecf4;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr style="background:#f1f5fb;">
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:left;font-weight:600;">Action / Initiative</th>
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">Rating</th>
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">Weight</th>
        <th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">Decision</th>
      </tr>
      ${rows}
    </table>

    ${!isFullyApproved ? `
    <!-- Resubmit CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${APP_URL}/dashboard/performance/my-tasks"
         style="display:inline-block;background:${NSA_NAVY};color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;letter-spacing:0.3px;">
        View &amp; Resubmit in PMS
      </a>
    </div>
    <p style="text-align:center;margin:10px 0 0;font-size:12px;color:#9ca3af;">
      Log in and navigate to <em>Dashboard → My Tasks → Workplan Actions</em> to review and resubmit.
    </p>` : `
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${APP_URL}/dashboard/performance/my-tasks"
         style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:7px;font-size:14px;font-weight:700;letter-spacing:0.3px;">
        View Your Performance Record
      </a>
    </div>`}
  `

  return { subject, html: baseTemplate(content) }
}
