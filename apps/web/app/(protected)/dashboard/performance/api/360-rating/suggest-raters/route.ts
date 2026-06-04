import { NextResponse } from 'next/server'
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

// A rater can only rate someone at the same level or below
function canRate(raterRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  const raterLevel = getRoleLevel(raterRole)
  const targetLevel = getRoleLevel(targetRole)
  // Rater must be at same level or higher to rate the target
  // Exception: peers at the same level can always rate each other
  return raterLevel >= targetLevel
}

export async function GET(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const cycleId = searchParams.get('cycleId')
    const count = parseInt(searchParams.get('count') || '5')

    if (!userId || !cycleId) {
      return NextResponse.json({ 
        error: 'User ID and Cycle ID are required' 
      }, { status: 400 })
    }

    // Get the target user's information including role
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        divisionId: true,
        managerId: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get existing raters for this cycle
    const existingRating = await prisma.rating360.findFirst({
      where: {
        userId: userId,
        cycleId: cycleId
      },
      include: {
        peerRatings: {
          select: { raterId: true }
        },
        subordinateRatings: {
          select: { raterId: true }
        }
      }
    })

    const existingRaterIds = new Set<string>()
    if (existingRating) {
      existingRating.peerRatings.forEach((pr: typeof existingRating.peerRatings[number]) => existingRaterIds.add(pr.raterId))
      existingRating.subordinateRatings.forEach((sr: typeof existingRating.subordinateRatings[number]) => existingRaterIds.add(sr.raterId))
    }
    
    // Add the user themselves and their supervisor to exclusion list
    existingRaterIds.add(userId)
    if (targetUser.managerId) {
      existingRaterIds.add(targetUser.managerId)
    }

    // Find potential peer raters from the same department
    // These are colleagues who:
    // 1. Are in the same department
    // 2. Are NOT direct reports
    // 3. Are NOT already assigned as raters
    // 4. Are active users
    const potentialPeers = await prisma.user.findMany({
      where: {
        AND: [
          { departmentId: targetUser.departmentId },
          { id: { notIn: Array.from(existingRaterIds) } },
          { managerId: { not: userId } } // Not a direct report
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        division: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 50 // Get more than needed for randomization
    })

    // Filter by role level: only suggest raters who are at same level or above the target
    const levelFiltered = potentialPeers.filter((peer: typeof potentialPeers[number]) => 
      canRate(peer.role, targetUser.role)
    )

    // Shuffle and select random subset
    const shuffled = levelFiltered.sort(() => Math.random() - 0.5)
    const suggested = shuffled.slice(0, Math.min(count, shuffled.length))

    // Also get colleagues from the same division if available
    let divisionColleagues: any[] = []
    if (targetUser.divisionId) {
      divisionColleagues = await prisma.user.findMany({
        where: {
          AND: [
            { divisionId: targetUser.divisionId },
            { id: { notIn: Array.from(existingRaterIds) } },
            { managerId: { not: userId } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          division: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: 20
      })
    }

    // Filter division colleagues by role level too
    const levelFilteredDivision = divisionColleagues.filter((dc: typeof divisionColleagues[number]) =>
      canRate(dc.role, targetUser.role)
    )

    // Combine and deduplicate suggestions
    const allSuggestions = [...suggested]
    levelFilteredDivision.forEach((dc: typeof levelFilteredDivision[number]) => {
      if (!allSuggestions.find((s: typeof allSuggestions[number]) => s.id === dc.id)) {
        allSuggestions.push(dc)
      }
    })

    // Final shuffle and limit
    const finalSuggestions = allSuggestions
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((user: typeof allSuggestions[number]) => ({
        ...user,
        suggested: true,
        relationship: user.division?.id === targetUser.divisionId ? 'Same Division' : 'Same Department'
      }))

    return NextResponse.json({
      targetUser: {
        id: targetUser.id,
        name: targetUser.name
      },
      suggestions: finalSuggestions,
      totalAvailable: potentialPeers.length
    })

  } catch (error) {
    console.error('Error suggesting raters:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint to add suggested raters + send notifications
export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a supervisor or HC/Admin
    const allowedRoles = ['ADMIN', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'MANAGER']
    if (!user.user.role || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { ratingId, raterIds } = body

    if (!ratingId || !raterIds || !Array.isArray(raterIds)) {
      return NextResponse.json({ 
        error: 'Rating ID and rater IDs array are required' 
      }, { status: 400 })
    }

    // Verify the rating exists and get the target user info
    const rating = await prisma.rating360.findUnique({
      where: { id: ratingId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        },
        cycle: {
          select: { id: true, name: true }
        }
      }
    })

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    // Validate role levels: raters must be at same level or above the target
    const raterUsers = await prisma.user.findMany({
      where: { id: { in: raterIds } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true }
    })

    const invalidRaters = raterUsers.filter(
      (rater: typeof raterUsers[number]) => !canRate(rater.role, rating.user.role)
    )

    if (invalidRaters.length > 0) {
      const names = invalidRaters.map((r: typeof invalidRaters[number]) => r.name || r.email).join(', ')
      return NextResponse.json({ 
        error: `The following users cannot rate ${rating.user.name || rating.user.email} due to role level restrictions: ${names}` 
      }, { status: 400 })
    }

    // Add the suggested raters as peer raters
    const peerRatings = await Promise.all(
      raterIds.map((raterId: string) =>
        prisma.peerRating360.create({
          data: {
            rating360Id: rating.id,
            raterId: raterId
          }
        })
      )
    )

    // Create in-app notifications for each assigned rater
    const supervisorName = user.name || user.email || 'Your supervisor'
    const targetName = rating.user.name || rating.user.email || 'a colleague'
    const cycleName = rating.cycle.name || '360-Degree Review'

    const notificationPromises = raterUsers.map((rater: typeof raterUsers[number]) =>
      prisma.pmsNotification.create({
        data: {
          type: 'SYSTEM',
          status: 'PENDING',
          senderId: user!.id,
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
            assignedBy: user!.id,
            assignedByName: supervisorName,
          }
        }
      })
    )

    await Promise.all(notificationPromises)

    // Send email notifications (best-effort, don't fail if email fails)
    try {
      await sendRaterNotificationEmails(
        raterUsers,
        targetName,
        supervisorName,
        cycleName,
        rating.id
      )
    } catch (emailError) {
      console.warn('[suggest-raters] Email notification failed (non-critical):', emailError)
    }

    return NextResponse.json({
      success: true,
      added: peerRatings.length,
      notified: raterUsers.length,
      message: `${peerRatings.length} peer rater(s) added and notified successfully`
    })

  } catch (error) {
    console.error('Error adding suggested raters:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Send email notifications to assigned raters
async function sendRaterNotificationEmails(
  raters: Array<{ id: string; name: string | null; email: string }>,
  targetName: string,
  supervisorName: string,
  cycleName: string,
  ratingId: string
) {
  // Use nodemailer if available, otherwise log for manual follow-up
  try {
    const nodemailer = await import('nodemailer' as string) as any
    
    // Try to get SMTP config from environment
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || 'noreply@nsa.org.na'
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3080'

    if (!smtpHost) {
      console.log('[suggest-raters] SMTP not configured. Skipping email notifications.')
      console.log('[suggest-raters] To enable emails, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env')
      return
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    })

    for (const rater of raters) {
      const raterName = rater.name || rater.email.split('@')[0]
      
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
                <p style="margin: 4px 0;">1 = Strongly disagree / Very poor / Never</p>
                <p style="margin: 4px 0;">2 = Disagree / Poor / Rarely</p>
                <p style="margin: 4px 0;">3 = Neutral / Acceptable / Sometimes</p>
                <p style="margin: 4px 0;">4 = Agree / Good / Often</p>
                <p style="margin: 4px 0;">5 = Strongly agree / Excellent / Always</p>
              </div>
              <p>Please complete your assessment at your earliest convenience by logging into the NSA Performance Management System:</p>
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
    console.log('[suggest-raters] nodemailer not available. In-app notifications were created successfully.')
    console.log('[suggest-raters] To enable email: npm install nodemailer @types/nodemailer')
  }
}
