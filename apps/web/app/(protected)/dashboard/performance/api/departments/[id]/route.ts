import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const departmentUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
      },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Failed to fetch department:', error)
    return NextResponse.json({ error: 'Failed to fetch department' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id || !authUser.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    console.log('Update department request body:', body)
    
    const data = departmentUpdateSchema.parse(body)
    console.log('Parsed data:', data)

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    })

    if (!existingDepartment) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Only update fields that are provided
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description

    console.log('Update data:', updateData)

    const department = await prisma.department.update({
      where: { id },
      data: updateData,
      include: {
        children: true,
      },
    })

    // Try to create audit log, but don't fail the request if it errors
    try {
      await createAuditLog({
        userId: authUser.id,
        resourceType: 'Department',
        resourceId: department.id,
        action: 'UPDATE',
        details: {
          beforeData: existingDepartment,
          afterData: department,
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error('Failed to update department:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    if (!authUser?.id || !authUser.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        children: true,
      },
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Check if department has children
    if (department.children && department.children.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete department with sub-departments. Please delete or reassign sub-departments first.' },
        { status: 400 }
      )
    }

    await prisma.department.delete({
      where: { id },
    })

    // Try to create audit log, but don't fail the request if it errors
    try {
      await createAuditLog({
        userId: authUser.id,
        resourceType: 'Department',
        resourceId: id,
        action: 'DELETE',
        details: {
          beforeData: department,
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete department:', error)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }
}
