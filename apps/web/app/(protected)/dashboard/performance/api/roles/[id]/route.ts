import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { z } from 'zod'

const roleUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  description: z.string().optional(),
  level: z.number().min(1).max(10).optional(),
  canSupervise: z.boolean().optional(),
  permissions: z.any().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = roleUpdateSchema.parse(body)

    // Check if role exists
    const existingRole = await prisma.customRole.findUnique({
      where: { id }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent editing system roles
    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'Cannot edit system roles' }, { status: 400 })
    }

    const role = await prisma.customRole.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json({ role })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Failed to update role:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await getAuthenticatedUser(req)
    if (!user || !userHasAnyRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if role exists
    const existingRole = await prisma.customRole.findUnique({
      where: { id }
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deleting system roles
    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 })
    }

    await prisma.customRole.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete role:', error)
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 })
  }
}
