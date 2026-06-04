import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    // Authenticate the user
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In a real implementation, you would fetch from your user database
    // For now, return mock data that matches the expected format
    const mockColleagues = [
      {
        id: '1',
        displayName: 'Sarah Johnson',
        firstName: 'Sarah',
        lastName: 'Johnson',
        username: 'sarah.johnson',
        department: 'Statistics Division',
        jobTitle: 'Senior Statistician',
        profileImage: null,
        createdAt: '2026-01-05T00:00:00.000Z',
        hireDate: '2026-01-05'
      },
      {
        id: '2',
        displayName: 'Michael Chen',
        firstName: 'Michael', 
        lastName: 'Chen',
        username: 'michael.chen',
        department: 'IT Department',
        jobTitle: 'Systems Administrator',
        profileImage: null,
        createdAt: '2025-06-15T00:00:00.000Z',
        hireDate: '2025-06-15'
      },
      {
        id: '3',
        displayName: 'Emily Rodriguez',
        firstName: 'Emily',
        lastName: 'Rodriguez', 
        username: 'emily.rodriguez',
        department: 'Human Resources',
        jobTitle: 'HR Specialist',
        profileImage: null,
        createdAt: '2025-03-20T00:00:00.000Z',
        hireDate: '2025-03-20'
      },
      {
        id: '4',
        displayName: 'David Mbeki',
        firstName: 'David',
        lastName: 'Mbeki',
        username: 'david.mbeki',
        department: 'Census Operations', 
        jobTitle: 'Field Coordinator',
        profileImage: null,
        createdAt: '2025-09-10T00:00:00.000Z',
        hireDate: '2025-09-10'
      },
      {
        id: '5',
        displayName: 'Anna Schmidt',
        firstName: 'Anna',
        lastName: 'Schmidt',
        username: 'anna.schmidt',
        department: 'Data Analysis',
        jobTitle: 'Data Analyst', 
        profileImage: null,
        createdAt: '2026-01-10T00:00:00.000Z',
        hireDate: '2026-01-10'
      },
      {
        id: '6',
        displayName: 'James Mukuriri', 
        firstName: 'James',
        lastName: 'Mukuriri',
        username: 'james.mukuriri',
        department: 'Administration',
        jobTitle: 'Administrative Assistant',
        profileImage: null,
        createdAt: '2024-11-15T00:00:00.000Z',
        hireDate: '2024-11-15'
      },
      {
        id: '7',
        displayName: 'Lisa Williams',
        firstName: 'Lisa',
        lastName: 'Williams', 
        username: 'lisa.williams',
        department: 'Finance',
        jobTitle: 'Accountant',
        profileImage: null,
        createdAt: '2025-07-22T00:00:00.000Z',
        hireDate: '2025-07-22'
      },
      {
        id: '8',
        displayName: 'Peter Nakamura',
        firstName: 'Peter',
        lastName: 'Nakamura',
        username: 'peter.nakamura', 
        department: 'Research Division',
        jobTitle: 'Research Officer',
        profileImage: null,
        createdAt: '2025-08-05T00:00:00.000Z',
        hireDate: '2025-08-05'
      }
    ]

    // Filter out the current user
    const colleagues = mockColleagues.filter(colleague => colleague.id !== user.id)

    return NextResponse.json(colleagues)
  } catch (error: any) {
    console.error('colleagues API error:', error?.message)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}