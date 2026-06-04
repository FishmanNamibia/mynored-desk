import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { createAuditLog } from '@/lib/audit'
import { createPmsAuditLog } from '@/lib/pms-audit'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'BOARD_CHAIRPERSON', 'SG', 'DEPUTY_SG', 'EXECUTIVE', 'MANAGER', 'SENIOR', 'CHIEF', 'STAFF', 'ADMINISTRATIVE_ASSISTANT', 'VIEWER']),
  position: z.string().optional(),
  jobTitle: z.string().optional(),
  departmentName: z.string().nullable().optional(),
  divisionName: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, setCookieHeaders } = await getAuthenticatedUser(req)
    
    // Access restricted to HC Executive (by job title) or AFanuel by email
    const jobTitleLower = authUser?.jobTitle?.toLowerCase() || ''
    const isHCExecutive = jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')
    const userEmail = authUser?.email?.toLowerCase() || ''
    const isAllowedByEmail = userEmail === 'afanuel@nsa.org.na'
    
    if (!authUser || (!isHCExecutive && !isAllowedByEmail)) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }
    
    // Log the access to users data (after auth check)
    try {
      await createPmsAuditLog({
        action: 'UPDATE', // Using UPDATE as a generic action for data access
        entityType: 'UsersData',
        entityId: 'all',
        userId: authUser.id,
        reason: 'User management data accessed',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const roleFilter = searchParams.get('role')

    const canonicalize = (value: string) =>
      value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')

    const derivePrimaryRole = (roleNames: string[]) => {
      const normalized = roleNames.map(r => canonicalize(r))

      const has = (required: string) => {
        const req = canonicalize(required)
        if (req === 'EXECUTIVE') return normalized.some(r => r.includes('EXECUTIVE') || r.endsWith('_EXEC'))
        if (req === 'ADMIN') return normalized.some(r => r.includes('ADMIN'))
        if (req === 'SG') return normalized.includes('SG') || normalized.includes('SECRETARY_GENERAL')
        if (req === 'DEPUTY_SG') return normalized.includes('DEPUTY_SG') || normalized.includes('DEPUTY_SECRETARY_GENERAL')
        return normalized.includes(req)
      }

      // Priority order for a single badge/label.
      if (has('ADMIN')) return 'ADMIN'
      if (has('SG')) return 'SG'
      if (has('DEPUTY_SG')) return 'DEPUTY_SG'
      if (has('EXECUTIVE')) return 'EXECUTIVE'
      if (has('MANAGER')) return 'MANAGER'
      if (has('STAFF')) return 'STAFF'
      if (has('ADMINISTRATIVE_ASSISTANT')) return 'ADMINISTRATIVE_ASSISTANT'
      if (has('VIEWER')) return 'VIEWER'
      return roleNames[0] ? canonicalize(roleNames[0]) : 'STAFF'
    }

    const toDisplayName = (u: { firstName: string | null; lastName: string | null; username: string; email: string }) => {
      const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
      return full || u.username || u.email
    }

    // Build where clause against RBAC join tables.
    const whereClause: any = {}
    if (roleFilter) {
      const rf = canonicalize(roleFilter)
      // Allow filtering EXECUTIVE to include department-specific executive roles.
      const roleNameFilter =
        rf === 'EXECUTIVE'
          ? { contains: 'EXECUTIVE', mode: 'insensitive' as const }
          : rf === 'ADMIN'
            ? { contains: 'ADMIN', mode: 'insensitive' as const }
            : { equals: roleFilter, mode: 'insensitive' as const }

      whereClause.roles = {
        some: {
          role: {
            name: roleNameFilter,
          },
        },
      }
    }

    const dbUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        departmentName: true,
        divisionName: true,
        jobTitle: true,
        position: true,
        lastLoginAt: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = dbUsers.map(u => {
      const roleNames = (u.roles || []).map((ur: any) => ur?.role?.name).filter(Boolean) as string[]
      const managerName = u.manager 
        ? [u.manager.firstName, u.manager.lastName].filter(Boolean).join(' ') || u.manager.username || u.manager.email
        : null
      return {
        id: u.id,
        email: u.email,
        name: toDisplayName(u),
        role: derivePrimaryRole(roleNames),
        roles: roleNames,
        jobTitle: u.jobTitle ?? null,
        position: u.position ?? u.jobTitle ?? null,
        department: u.departmentName ? { name: u.departmentName } : null,
        division: u.divisionName ? { name: u.divisionName } : null,
        supervisor: u.manager ? { id: u.manager.id, name: managerName } : null,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        isApproved: true, // All users from DB are considered approved (auto-provisioned via AD)
      }
    })

    const res = NextResponse.json(users)
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, setCookieHeaders } = await getAuthenticatedUser(req)
    const postJobTitle = authUser?.jobTitle?.toLowerCase() || ''
    const isPostHCExecutive = postJobTitle.includes('executive') && postJobTitle.includes('human capital')
    const postEmail = authUser?.email?.toLowerCase() || ''
    if (!authUser || (!isPostHCExecutive && postEmail !== 'afanuel@nsa.org.na')) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    const body = await req.json()
    console.log('Create user request body:', body)
    
    const data = userSchema.parse(body)
    console.log('Parsed user data:', data)

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Find role in Role table to link via UserRole
    const role = await prisma.role.findFirst({
      where: { name: { equals: data.role, mode: 'insensitive' } }
    })

    const createdUser = await prisma.user.create({
      data: {
        email: data.email,
        username: data.email, // Use email as username
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName || null,
        position: data.position || null,
        jobTitle: data.jobTitle || null,
        departmentName: data.departmentName || null,
        divisionName: data.divisionName || null,
        departmentId: data.departmentId || null,
        managerId: data.managerId || null,
        status: 'ACTIVE',
        roles: role ? {
          create: { roleId: role.id }
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        position: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        department: {
          select: {
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Format response
    const response = {
      id: createdUser.id,
      email: createdUser.email,
      name: [createdUser.firstName, createdUser.lastName].filter(Boolean).join(' ') || createdUser.username,
      role: createdUser.roles[0]?.role?.name || data.role,
      department: createdUser.departmentName ? { name: createdUser.departmentName } : createdUser.department,
      division: createdUser.divisionName ? { name: createdUser.divisionName } : null,
      supervisor: createdUser.manager ? {
        id: createdUser.manager.id,
        name: [createdUser.manager.firstName, createdUser.manager.lastName].filter(Boolean).join(' '),
      } : null,
    }

    // Create audit logs in both systems for backward compatibility
    try {
      // Legacy audit log
      await createAuditLog({
        action: 'CREATE',
        resourceType: 'User',
        resourceId: createdUser.id,
        userId: authUser.id,
        details: { email: createdUser.email, role: data.role },
      })
      
      // PMS audit log with more details
      await createPmsAuditLog({
        action: 'CREATE',
        entityType: 'User',
        entityId: createdUser.id,
        userId: authUser.id,
        afterData: { ...createdUser, password: '[REDACTED]' },
        reason: 'User created by administrator',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      })
    } catch (auditError) {
      console.error('Failed to create audit log (non-fatal):', auditError)
    }

    const res = NextResponse.json(response, { status: 201 })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error: any) {
    console.error('Failed to create user:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    
    // Handle duplicate email error
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json({ 
        error: 'A user with this email address already exists. Please use a different email.' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
