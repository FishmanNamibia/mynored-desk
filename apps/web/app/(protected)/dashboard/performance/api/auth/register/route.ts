import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getSafeSenderId } from '@/lib/notification-helper'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  departmentId: z.string().optional(),
  divisionId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user with pending approval
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: 'STAFF', // Default role for self-registration
        position: 'Staff Member',
        isApproved: false, // Requires admin approval
        departmentId: data.departmentId || null,
        divisionId: data.divisionId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isApproved: true,
        createdAt: true,
      },
    })

    // Notify all admins about new registration
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SG', 'DEPUTY_SG'] },
        isApproved: true,
      },
    })

    // Create notifications for all admins
    const safeSenderId = await getSafeSenderId(user.id)
    
    const registerNotifs = await Promise.all(
      admins.map((admin) =>
        prisma.pmsNotification.create({
          data: {
            type: 'GENERAL',
            status: 'PENDING',
            senderId: safeSenderId,
            receiverId: admin.id,
            message: `New user registration: ${user.name} (${user.email}) is waiting for approval.`,
            entityType: 'User',
            entityId: user.id,
          },
          include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        })
      )
    )

    // Broadcast via SSE for real-time delivery to all admins
    try {
      const { broadcastToUser } = await import(
        '@/app/(protected)/dashboard/performance/api/notifications/stream/route'
      )
      for (const notif of registerNotifs) {
        const unreadCount = await prisma.pmsNotification.count({
          where: { receiverId: notif.receiverId, status: { in: ['PENDING', 'SENT'] } },
        })
        broadcastToUser(notif.receiverId, { type: 'notification', notification: notif, unreadCount })
      }
    } catch { /* SSE broadcast is best-effort */ }

    return NextResponse.json({ 
      message: 'Registration successful! Your account is pending approval by an administrator.',
      user 
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Failed to register user:', error)
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 })
  }
}

