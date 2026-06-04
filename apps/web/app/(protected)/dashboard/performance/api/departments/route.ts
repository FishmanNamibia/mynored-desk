import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/server-auth'


const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    // Allow public access for registration form
    const departments = await prisma.department.findMany({
      include: {
        divisions: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = departmentSchema.parse(body)

    const department = await prisma.department.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
      },
      include: {
        divisions: true,
      },
    })

    await createAuditLog({
      actorId: user.id,
      entityType: 'Department',
      entityId: department.id,
      action: 'CREATE',
      afterData: department,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error('Failed to create department:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}
