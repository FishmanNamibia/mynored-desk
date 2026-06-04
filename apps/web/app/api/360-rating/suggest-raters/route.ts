import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'

// Role hierarchy levels (higher number = higher level)
const ROLE_LEVELS: Record<string, number> = {
  'STAFF': 1,
  'ADMINISTRATIVE_ASSISTANT': 1,
  'VIEWER': 1,
  'MANAGER': 2,
  'HUMAN_CAPITAL_EXECUTIVE': 3,
  'EXECUTIVE': 3,
  'DEPUTY_SG': 4,
  'SG': 5,
  'ADMIN': 5,
}

function getRoleLevel(role: string | null | undefined): number {
  if (!role) return 1
  return ROLE_LEVELS[role] || 1
}

function canRate(raterRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  return getRoleLevel(raterRole) >= getRoleLevel(targetRole)
}

// Helper to get user's effective role from UserRole join table
async function getUserRole(userId: string): Promise<string | null> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId },
    // @ts-ignore
    include: { role: true },
    orderBy: { assignedAt: 'desc' }
  })
  return userRole?.role?.name || null
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const cycleId = searchParams.get('cycleId')
    const count = parseInt(searchParams.get('count') || '5')

    if (!userId || !cycleId) {
      return NextResponse.json({ error: 'User ID and Cycle ID are required' }, { status: 400 })
    }

    // Get the target user's information
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentId: true,
        managerId: true,
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetRole = await getUserRole(userId)

    // Get existing raters for this cycle
    const existingRating = await prisma.rating360.findFirst({
      where: { userId, cycleId },
      include: {
        peerRatings: { select: { raterId: true } },
        subordinateRatings: { select: { raterId: true } }
      }
    })

    const existingRaterIds = new Set<string>()
    if (existingRating) {
      existingRating.peerRatings.forEach(pr => existingRaterIds.add(pr.raterId))
      existingRating.subordinateRatings.forEach(sr => existingRaterIds.add(sr.raterId))
    }
    existingRaterIds.add(userId)
    if (targetUser.managerId) existingRaterIds.add(targetUser.managerId)

    // Find potential peer raters from the same department
    const potentialPeers = await prisma.user.findMany({
      where: {
        AND: [
          { departmentId: targetUser.departmentId },
          { id: { notIn: Array.from(existingRaterIds) } },
          { managerId: { not: userId } }, // Not a direct report
          { status: 'ACTIVE' }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        departmentName: true,
      },
      take: 50
    })

    // Filter by role level
    const levelFiltered: typeof potentialPeers = []
    for (const peer of potentialPeers) {
      const peerRole = await getUserRole(peer.id)
      if (canRate(peerRole, targetRole)) {
        levelFiltered.push(peer)
      }
    }

    // Shuffle and select
    const shuffled = levelFiltered.sort(() => Math.random() - 0.5)
    const suggested = shuffled.slice(0, Math.min(count, shuffled.length))

    const targetName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email

    const finalSuggestions = suggested.map(u => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      department: u.departmentName,
      suggested: true,
      relationship: 'Same Department'
    }))

    return NextResponse.json({
      targetUser: { id: targetUser.id, name: targetName },
      suggestions: finalSuggestions,
      totalAvailable: levelFiltered.length
    })

  } catch (error: any) {
    console.error('[360 suggest-raters GET] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// POST - Add suggested raters + send notifications
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ratingId, raterIds } = body

    if (!ratingId || !raterIds || !Array.isArray(raterIds)) {
      return NextResponse.json({ error: 'Rating ID and rater IDs array are required' }, { status: 400 })
    }

    // Verify the rating exists and get the target user info
    const rating = await prisma.rating360.findUnique({
      where: { id: ratingId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        cycle: { select: { id: true, name: true } }
      }
    })

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    const targetRole = await getUserRole(rating.user.id)

    // Validate role levels
    const raterUsers = await prisma.user.findMany({
      where: { id: { in: raterIds } },
      select: { id: true, firstName: true, lastName: true, email: true }
    })

    for (const rater of raterUsers) {
      const raterRole = await getUserRole(rater.id)
      if (!canRate(raterRole, targetRole)) {
        const raterName = `${rater.firstName || ''} ${rater.lastName || ''}`.trim() || rater.email
        const targetName = `${rating.user.firstName || ''} ${rating.user.lastName || ''}`.trim() || rating.user.email
        return NextResponse.json({
          error: `${raterName} cannot rate ${targetName} due to role level restrictions`
        }, { status: 400 })
      }
    }

    // Add the suggested raters as peer raters
    const peerRatings = await Promise.all(
      raterIds.map((raterId: string) =>
        prisma.peerRating360.create({
          data: { rating360Id: rating.id, raterId }
        })
      )
    )

    // Create in-app notifications for each assigned rater
    const senderUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true }
    })
    const supervisorName = senderUser
      ? (`${senderUser.firstName || ''} ${senderUser.lastName || ''}`.trim() || senderUser.email)
      : 'Your supervisor'
    const targetName = `${rating.user.firstName || ''} ${rating.user.lastName || ''}`.trim() || rating.user.email
    const cycleName = rating.cycle.name || '360-Degree Review'

    const notificationPromises = raterUsers.map(rater =>
      prisma.pmsNotification.create({
        data: {
          type: 'SYSTEM',
          status: 'PENDING',
          senderId: user.id,
          receiverId: rater.id,
          entityType: 'Rating360',
          entityId: rating.id,
          message: `You have been selected by ${supervisorName} to provide a 360-degree performance rating for ${targetName} as part of the "${cycleName}" cycle. Please complete your assessment at your earliest convenience.`,
          metadata: {
            subType: 'RATING_360_ASSIGNED',
            ratingId: rating.id,
            cycleId: rating.cycle.id,
            targetUserId: rating.user.id,
            targetUserName: targetName,
            assignedBy: user.id,
            assignedByName: supervisorName,
          }
        }
      })
    )

    await Promise.all(notificationPromises)

    // Attempt email notifications (best-effort)
    try {
      await sendRaterNotificationEmails(raterUsers, targetName, supervisorName, cycleName)
    } catch (emailError) {
      console.warn('[suggest-raters] Email notification failed (non-critical):', emailError)
    }

    return NextResponse.json({
      success: true,
      added: peerRatings.length,
      notified: raterUsers.length,
      message: `${peerRatings.length} peer rater(s) added and notified successfully`
    })

  } catch (error: any) {
    console.error('[360 suggest-raters POST] Error:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

async function sendRaterNotificationEmails(
  raters: Array<{ id: string; firstName: string | null; lastName: string | null; email: string }>,
  targetName: string,
  supervisorName: string,
  cycleName: string
) {
  try {
    const nodemailer = await import('nodemailer' as string) as any
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || 'noreply@nsa.org.na'
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'

    if (!smtpHost) {
      console.log('[suggest-raters] SMTP not configured. Skipping email. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env')
      return
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    })

    for (const rater of raters) {
      const raterName = `${rater.firstName || ''} ${rater.lastName || ''}`.trim() || rater.email.split('@')[0]
      await transporter.sendMail({
        from: `"NSA Performance Management" <${smtpFrom}>`,
        to: rater.email,
        subject: `360-Degree Rating Assignment – ${cycleName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">360-Degree Performance Rating</h1>
              <p style="color: #dbeafe; margin: 8px 0 0 0;">Namibia Statistics Agency</p>
            </div>
            <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Dear ${raterName},</p>
              <p>You have been selected by <strong>${supervisorName}</strong> to provide a 360-degree performance rating for <strong>${targetName}</strong> as part of the <strong>"${cycleName}"</strong> cycle.</p>
              <p>Your honest and constructive feedback is valuable and will contribute to the professional development of your colleague.</p>
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>Rating Scale:</strong></p>
                <p style="margin: 4px 0;">1 = Strongly disagree &nbsp;|&nbsp; 2 = Disagree &nbsp;|&nbsp; 3 = Neutral &nbsp;|&nbsp; 4 = Agree &nbsp;|&nbsp; 5 = Strongly agree</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${appUrl}/dashboard/performance/dashboard/360-degree"
                   style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Complete Your Rating
                </a>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                This is an automated notification from the NSA Performance Management System.
                Your responses are confidential and will be aggregated with other feedback.
              </p>
            </div>
          </div>
        `,
        text: `Dear ${raterName},\n\nYou have been selected by ${supervisorName} to provide a 360-degree performance rating for ${targetName} as part of the "${cycleName}" cycle.\n\nPlease log in to complete your assessment: ${appUrl}/dashboard/performance/dashboard/360-degree\n\nThank you.`
      })
      console.log(`[suggest-raters] Email sent to ${rater.email}`)
    }
  } catch (importError) {
    console.log('[suggest-raters] nodemailer not available. In-app notifications were created. Install nodemailer for email support.')
  }
}
