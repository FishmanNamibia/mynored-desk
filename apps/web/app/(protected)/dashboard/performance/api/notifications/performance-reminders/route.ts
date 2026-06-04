import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow Admin or HC Executive to trigger notifications
    const isAdmin = user.role === 'ADMIN'
    let isHCExecutive = false

    if (user.role === 'EXECUTIVE' && user.departmentId) {
      const userWithDept = await prisma.user.findUnique({
        where: { id: user.id },
        include: { department: true }
      })
      const deptName = userWithDept?.department?.name?.toLowerCase() || ''
      isHCExecutive = deptName.includes('human capital') || 
                     deptName.includes('human resources') || 
                     deptName.includes('hr')
    }

    if (!isAdmin && !isHCExecutive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get active performance period
    const period = await prisma.performancePeriod.findFirst({
      where: { isActive: true }
    })

    if (!period) {
      return NextResponse.json({ error: 'No active performance period found' }, { status: 404 })
    }

    const deadline = new Date(period.submissionDeadline)
    const today = new Date()
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Only send notifications if deadline is within 14 days and hasn't passed
    if (daysUntilDeadline < 0 || daysUntilDeadline > 14) {
      return NextResponse.json({ 
        message: 'No notifications needed at this time',
        daysUntilDeadline 
      })
    }

    // Get all users who haven't submitted their performance agreements
    const usersWithoutAgreements = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT', 'EXECUTIVE', 'DEPUTY_SG', 'SG']
        },
        OR: [
          {
            performanceAgreements: {
              none: {
                status: {
                  in: ['PENDING_APPROVAL', 'APPROVED']
                }
              }
            }
          },
          {
            performanceAgreements: {
              every: {
                status: 'DRAFT'
              }
            }
          }
        ]
      },
      select: {
        id: true,
        firstName: true, lastName: true,
        email: true
      }
    })

    // Create system sender (use HC Executive as sender)
    const hcExecutive = await prisma.user.findFirst({
      where: { 
        role: 'EXECUTIVE',
        department: {
          name: {
            contains: 'Human Capital',
            mode: 'insensitive'
          }
        }
      },
      include: {
        department: true
      }
    })

    if (!hcExecutive) {
      // Fallback to any HC department executive if exact match not found
      const hcExecAlt = await prisma.user.findFirst({
        where: { 
          role: 'EXECUTIVE',
          OR: [
            { department: { name: { contains: 'Human Resources', mode: 'insensitive' } } },
            { department: { name: { contains: 'HR', mode: 'insensitive' } } }
          ]
        },
        include: {
          department: true
        }
      })
      
      if (!hcExecAlt) {
        return NextResponse.json({ error: 'No Human Capital Executive found to send notifications' }, { status: 500 })
      }
      
      const systemUser = hcExecAlt
    } else {
      var systemUser = hcExecutive
    }

    // Determine notification urgency and message
    let notificationType: 'GENERAL' | 'DELETE_REQUEST' = 'GENERAL'
    let title = ''
    let message = ''

    if (daysUntilDeadline <= 3) {
      title = '🚨 URGENT: Performance Agreement Deadline Approaching!'
      message = `Only ${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'} left to submit your performance agreement for ${period.name}. Deadline: ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Please submit immediately!`
    } else if (daysUntilDeadline <= 7) {
      title = '⚠️ Reminder: Performance Agreement Deadline Soon'
      message = `You have ${daysUntilDeadline} days remaining to submit your performance agreement for ${period.name}. Deadline: ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Please complete and submit soon.`
    } else {
      title = '📋 Performance Agreement Submission Reminder'
      message = `Don't forget to submit your performance agreement for ${period.name}. You have ${daysUntilDeadline} days until the deadline on ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
    }

    // Create notifications for users without submitted agreements
    const notifications = await Promise.all(
      usersWithoutAgreements.map(user =>
        prisma.pmsNotification.create({
          data: {
            type: notificationType,
            message: message,
            entityType: 'PERFORMANCE_PERIOD',
            entityId: period.id,
            metadata: {
              periodName: period.name,
              deadline: period.submissionDeadline,
              daysRemaining: daysUntilDeadline
            },
            senderId: systemUser.id,
            receiverId: user.id,
            status: 'PENDING'
          },
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        })
      )
    )

    // Broadcast via SSE for real-time delivery to all recipients
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      for (const notif of notifications) {
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: notif.receiverId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(notif.receiverId, { type: 'notification', notification: notif, unreadCount })
      }
    } catch { /* SSE broadcast is best-effort */ }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      daysUntilDeadline,
      recipients: usersWithoutAgreements.map(u => ({ id: u.id, name: u.name, email: u.email }))
    })
  } catch (error) {
    console.error('Failed to send performance reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}

// GET endpoint to check who needs reminders (without sending)
export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active performance period
    const period = await prisma.performancePeriod.findFirst({
      where: { isActive: true }
    })

    if (!period) {
      return NextResponse.json({ error: 'No active performance period found' }, { status: 404 })
    }

    const deadline = new Date(period.submissionDeadline)
    const today = new Date()
    const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Get all users who haven't submitted their performance agreements
    const usersWithoutAgreements = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT', 'EXECUTIVE', 'DEPUTY_SG', 'SG']
        },
        OR: [
          {
            performanceAgreements: {
              none: {
                status: {
                  in: ['PENDING_APPROVAL', 'APPROVED']
                }
              }
            }
          },
          {
            performanceAgreements: {
              every: {
                status: 'DRAFT'
              }
            }
          }
        ]
      },
      select: {
        id: true,
        firstName: true, lastName: true,
        email: true,
        role: true
      }
    })

    return NextResponse.json({
      period: {
        name: period.name,
        deadline: period.submissionDeadline,
        daysUntilDeadline
      },
      usersNeedingReminder: usersWithoutAgreements.length,
      users: usersWithoutAgreements
    })
  } catch (error) {
    console.error('Failed to check reminder status:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

