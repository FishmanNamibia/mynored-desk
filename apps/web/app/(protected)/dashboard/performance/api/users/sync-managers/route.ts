import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

/**
 * GET /api/users/sync-managers
 * Returns current manager relationships for all active users.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        departmentName: true,
        divisionName: true,
        managerId: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { firstName: 'asc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/users/sync-managers
 * 
 * Bulk sync manager relationships using the caller's delegated Graph token.
 * Body: { graphAccessToken: string }
 * 
 * For each active user with an adGuid, fetches their manager from
 * Microsoft Graph using /users/{adGuid}/manager and sets managerId.
 * Requires User.Read.All delegated permission.
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req)
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { graphAccessToken } = body

    if (!graphAccessToken) {
      return NextResponse.json({ 
        error: 'Required: graphAccessToken (delegated Graph token with User.Read.All)' 
      }, { status: 400 })
    }

    // Get all active users with adGuid
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', adGuid: { not: null } },
      select: { id: true, email: true, adGuid: true, managerId: true }
    })

    console.log(`[SYNC MANAGERS] Starting bulk sync for ${users.length} users`)

    const results = {
      total: users.length,
      synced: 0,
      skipped: 0,
      noManager: 0,
      errors: 0,
      details: [] as string[]
    }

    for (const u of users) {
      try {
        const managerRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${u.adGuid}/manager`,
          { headers: { Authorization: `Bearer ${graphAccessToken}` } }
        )

        if (!managerRes.ok) {
          if (managerRes.status === 404) {
            results.noManager++
            continue
          }
          results.errors++
          results.details.push(`${u.email}: Graph ${managerRes.status}`)
          continue
        }

        const managerJson: any = await managerRes.json()
        const managerEmail = (managerJson.mail || managerJson.userPrincipalName || '').toLowerCase()

        if (!managerEmail) {
          results.noManager++
          continue
        }

        // Find canonical (richest) manager record in our database
        const managerCandidates = await prisma.user.findMany({
          where: { email: { equals: managerEmail, mode: 'insensitive' } }
        })
        let manager = managerCandidates.length > 1
          ? managerCandidates.reduce((b, r) => {
              const s = (r.firstName ? 2 : 0) + (r.jobTitle ? 2 : 0) + (r.signatureUrl ? 1 : 0) + (r.managerId ? 1 : 0)
              const bs = (b.firstName ? 2 : 0) + (b.jobTitle ? 2 : 0) + (b.signatureUrl ? 1 : 0) + (b.managerId ? 1 : 0)
              return s > bs ? r : b
            }, managerCandidates[0])
          : managerCandidates[0] || null

        if (!manager) {
          const displayName = managerJson.displayName || managerEmail
          const [firstName, ...rest] = displayName.trim().split(' ')
          manager = await prisma.user.create({
            data: {
              email: managerEmail,
              username: managerEmail,
              password: '',
              firstName: firstName || managerEmail,
              lastName: rest.join(' ') || undefined,
              status: 'ACTIVE'
            }
          })
          results.details.push(`Created placeholder: ${managerEmail}`)
        }

        if (u.managerId === manager.id) {
          results.skipped++
          continue
        }

        await prisma.user.update({
          where: { id: u.id },
          data: { managerId: manager.id }
        })
        results.synced++
        results.details.push(`${u.email} -> ${managerEmail}`)
      } catch (err: any) {
        results.errors++
        results.details.push(`${u.email}: ${err?.message}`)
      }
    }

    const totalWithManagers = await prisma.user.count({
      where: { managerId: { not: null }, status: 'ACTIVE' }
    })

    console.log(`[SYNC MANAGERS] Complete: synced=${results.synced}, skipped=${results.skipped}, errors=${results.errors}`)

    return NextResponse.json({
      success: true,
      results,
      totalUsersWithManagers: totalWithManagers
    })
  } catch (error) {
    console.error('Error syncing managers:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
