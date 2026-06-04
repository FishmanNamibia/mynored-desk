import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

export async function GET(req: NextRequest) {
  try {
    const { user: authUser, setCookieHeaders } = await getAuthenticatedUser(req)
    
    // Check role-based auth OR jobTitle-based HC Executive
    const jobTitleLower = authUser?.jobTitle?.toLowerCase() || ''
    const isHCExecutiveByJobTitle = jobTitleLower.includes('executive') && jobTitleLower.includes('human capital')
    const hasRequiredRole = userHasAnyRole(authUser, ['ADMIN', 'HUMAN_CAPITAL_EXECUTIVE', 'HC_EXECUTIVE'])
    
    if (!authUser || (!hasRequiredRole && !isHCExecutiveByJobTitle)) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    // Get pagination parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    // Count total logs for pagination
    const totalLogs = await prisma.pmsAuditLog.count()
    
    // Fetch logs with pagination and include actor details
    const logs = await prisma.pmsAuditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        },
      },
    })

    // Format logs for frontend
    const formattedLogs = logs.map(log => {
      // Format actor name and role
      const actorName = log.actor 
        ? [log.actor.firstName, log.actor.lastName].filter(Boolean).join(' ') || log.actor.email
        : 'System'
      
      const actorRole = log.actor?.roles?.[0]?.role?.name || 'N/A'

      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        reason: log.reason,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        actor: log.actor ? {
          name: actorName,
          email: log.actor.email,
          role: actorRole,
        } : null,
      }
    })

    // Create pagination object
    const pagination = {
      page,
      limit,
      total: totalLogs,
      totalPages: Math.ceil(totalLogs / limit),
    }

    const res = NextResponse.json({ logs: formattedLogs, pagination })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
