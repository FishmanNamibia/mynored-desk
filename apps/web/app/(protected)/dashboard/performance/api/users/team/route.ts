import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'


export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(request)
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve current user by email
    const currentUser = await prisma.user.findFirst({
      where: { email: user.email }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Support search query for filtering users
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const scope = searchParams.get('scope') || 'organization' // 'department' or 'organization'

    const whereClause: any = {
      id: { not: currentUser.id },
      status: 'ACTIVE'
    }

    // Filter by department if scope is 'department'
    if (scope === 'department' && currentUser.departmentName) {
      whereClause.departmentName = currentUser.departmentName
    }

    // Add search filter if provided
    if (search.trim()) {
      whereClause.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { departmentName: { contains: search, mode: 'insensitive' } },
            { jobTitle: { contains: search, mode: 'insensitive' } },
          ]
        }
      ]
    }

    let teamMembers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        roles: {
          select: {
            role: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ],
      take: 100
    })

    // Return with computed name field and additional client-side filtering for full name search
    let mapped = teamMembers.map(m => ({
      ...m,
      name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
    }))

    // Client-side filter for full name matches if search contains space (e.g., "Lukas Fillipus")
    if (search.trim() && search.includes(' ')) {
      const searchLower = search.toLowerCase()
      mapped = mapped.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower) ||
        (m.departmentName && m.departmentName.toLowerCase().includes(searchLower)) ||
        (m.jobTitle && m.jobTitle.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
