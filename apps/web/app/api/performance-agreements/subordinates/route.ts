import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/pms/auth'
import { prisma } from '@/lib/pms/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== Fetching Subordinates ===')
    console.log('Supervisor ID:', session.user.id)

    // Find all users where this user is their manager
    const subordinates = await prisma.user.findMany({
      where: {
        managerId: session.user.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true
      }
    })

    console.log(`Found ${subordinates.length} subordinates`)

    // Format the response
    const formattedSubordinates = subordinates.map(sub => ({
      id: sub.id,
      name: `${sub.firstName || ''} ${sub.lastName || ''}`.trim() || sub.email,
      email: sub.email,
      jobTitle: sub.jobTitle,
      department: sub.departmentName,
      division: sub.divisionName
    }))

    return NextResponse.json(formattedSubordinates)

  } catch (error: any) {
    console.error('❌ Error fetching subordinates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subordinates: ' + error.message },
      { status: 500 }
    )
  }
}
