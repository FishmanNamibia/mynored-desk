import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { getSafeSenderId } from '@/lib/notification-helper'
import { assignPerformanceAgreementsToUser } from '@/lib/assign-performance-agreements'
import { z } from 'zod'

const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  role: z.enum(['ADMIN', 'BOARD_CHAIRPERSON', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER', 'SENIOR', 'CHIEF', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER']).optional(),
  departmentId: z.string().optional(),
  divisionId: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN', 'SG', 'DEPUTY_SG'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const data = approvalSchema.parse(body)

    const dbUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (data.action === 'APPROVE') {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          isApproved: true,
          approvedBy: user.id,
          approvedAt: new Date(),
          role: data.role ?? dbUser.role,
          departmentId: data.departmentId !== undefined ? data.departmentId : dbUser.departmentId,
          divisionId: data.divisionId !== undefined ? data.divisionId : dbUser.divisionId,
        },
      })

      // Create notification for the user
      const safeSenderId = await getSafeSenderId(user.id)

      const approveUserNotif = await prisma.pmsNotification.create({
        data: {
          type: 'GENERAL',
          status: 'PENDING',
          senderId: safeSenderId,
          receiverId: user.id,
          message: `Your account has been approved! You can now log in to the system.`,
          entityType: 'User',
          entityId: user.id,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
      })

      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: user.id, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(user.id, { type: 'notification', notification: approveUserNotif, unreadCount })
      } catch { /* SSE broadcast is best-effort */ }

      // Automatically assign performance agreements based on user's department/division
      try {
        console.log(`Auto-assigning performance agreements to newly approved user: ${updatedUser.email}`)
        const assignmentResult = await assignPerformanceAgreementsToUser(updatedUser.id)
        console.log(`✅ Assigned ${assignmentResult.created} agreements, skipped ${assignmentResult.skipped}`)
        
        if (assignmentResult.errors.length > 0) {
          console.warn('Assignment errors:', assignmentResult.errors)
        }
      } catch (error) {
        // Don't fail the approval if assignment fails
        console.error('Failed to auto-assign performance agreements:', error)
      }

      return NextResponse.json(updatedUser)
    } else {
      // REJECT
      await prisma.user.update({
        where: { id },
        data: {
          rejectedBy: user.id,
          rejectedAt: new Date(),
          rejectionReason: data.rejectionReason,
        },
      })

      // Create notification for the user
      const safeSenderId = await getSafeSenderId(user.id)

      const rejectUserNotif = await prisma.pmsNotification.create({
        data: {
          type: 'GENERAL',
          status: 'PENDING',
          senderId: safeSenderId,
          receiverId: user.id,
          message: `Your account registration was not approved. ${data.rejectionReason ? `Reason: ${data.rejectionReason}` : ''}`,
          entityType: 'User',
          entityId: user.id,
        },
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
      })

      // Broadcast via SSE for real-time delivery
      try {
        const { broadcastToUser } = await import(
          '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
        )
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: user.id, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(user.id, { type: 'notification', notification: rejectUserNotif, unreadCount })
      } catch { /* SSE broadcast is best-effort */ }

      // Delete the user
      await prisma.user.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'User rejected and deleted' })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Failed to process user approval:', error)
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}
