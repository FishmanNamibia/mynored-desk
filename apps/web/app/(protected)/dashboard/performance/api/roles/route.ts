import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'
import { z } from 'zod'

const roleSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z_]+$/, 'Role name must be uppercase with underscores'),
  displayName: z.string().min(1),
  description: z.string().optional(),
  level: z.number().min(1).max(10),
  canSupervise: z.boolean().default(false),
  permissions: z.any().optional(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    
    // Check role-based auth OR jobTitle-based HC Executive
    const jobTitleLower = authUser?.jobTitle?.toLowerCase() || ''
    const isHCExecutiveByJobTitle = jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')
    const hasRequiredRole = userHasAnyRole(authUser, ['ADMIN', 'EXECUTIVE', 'HUMAN_CAPITAL_EXECUTIVE', 'HC_EXECUTIVE'])
    
    if (!authUser || (!hasRequiredRole && !isHCExecutiveByJobTitle)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // Check if customRole model exists, fallback to Role model
    if (!prisma.customRole) {
      console.log('[Roles API] CustomRole model not available, using Role model')
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json({ 
        roles: roles.map(r => ({
          ...r,
          displayName: r.name,
          description: null,
          level: 5,
          canSupervise: false,
          isActive: true,
          isSystem: true
        }))
      })
    }

    const roles = await prisma.customRole.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ],
    })

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Failed to fetch roles:', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    
    // Only ADMIN can create roles
    const hasRequiredRole = userHasAnyRole(authUser, ['ADMIN'])
    
    if (!authUser || !hasRequiredRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = roleSchema.parse(body)

    // Check if role name already exists
    const existingRole = await prisma.customRole.findUnique({
      where: { name: validatedData.name }
    })

    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }

    const role = await prisma.customRole.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        description: validatedData.description,
        level: validatedData.level,
        canSupervise: validatedData.canSupervise,
        permissions: validatedData.permissions,
        isActive: validatedData.isActive,
        isSystem: false,
      }
    })

    return NextResponse.json({ role }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Failed to create role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
