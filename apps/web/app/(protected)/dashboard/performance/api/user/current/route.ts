import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser } = await getAuthenticatedUser(req)
    
    if (!authUser?.id) {
      console.log('[API user/current] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user from database with available fields
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        position: true,
        departmentId: true,
        departmentName: true,
        divisionName: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Combine auth user data with database data
    const name = dbUser 
      ? [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || dbUser.username
      : authUser.name

    // Derive role from authUser (which has jobTitle-based mapping)
    const role = authUser.roles?.[0] || 'STAFF'
    const isAdmin = role === 'ADMIN'
    const isExecutive = role.includes('EXECUTIVE') || authUser.jobTitle?.toLowerCase().includes('executive')

    // Fetch departments for executives/admins
    let allDepartments: any[] = []
    if (isAdmin || isExecutive) {
      allDepartments = await prisma.department.findMany({
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    }

    return NextResponse.json({
      id: authUser.id,
      name,
      email: authUser.email,
      role,
      jobTitle: authUser.jobTitle || dbUser?.jobTitle,
      position: dbUser?.position,
      departmentId: dbUser?.departmentId,
      department: dbUser?.department,
      departmentName: dbUser?.departmentName,
      divisionName: dbUser?.divisionName,
      allDepartments,
      departmentDivisions: [], // Not available in current schema
      isAdmin
    })
  } catch (error) {
    console.error('[API user/current] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
