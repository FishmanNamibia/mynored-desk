import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, userHasAnyRole } from '@/lib/server-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: authUser, setCookieHeaders } = await getAuthenticatedUser(req)
    
    // Only administrators can undo actions
    if (!authUser || !userHasAnyRole(authUser, ['ADMIN'])) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
      return res
    }

    const logId = params.id
    
    // Find the audit log entry
    const log = await prisma.pmsAuditLog.findUnique({
      where: { id: logId },
    })

    if (!log) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
    }

    // Implement undo logic based on action type
    // This is a simplified example - actual implementation would depend on entity types
    if (log.action === 'CREATE') {
      // Delete the created entity
      await handleUndoCreate(log.entityType, log.entityId)
    } else if (log.action === 'UPDATE') {
      // Revert to previous state
      await handleUndoUpdate(log.entityType, log.entityId, log.beforeData)
    } else if (log.action === 'DELETE') {
      // Restore deleted entity
      await handleUndoDelete(log.entityType, log.beforeData)
    } else {
      return NextResponse.json({ 
        error: `Cannot undo action of type ${log.action}` 
      }, { status: 400 })
    }

    // Create a new audit log for the undo action
    await prisma.pmsAuditLog.create({
      data: {
        actorId: authUser.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: 'UNDO',
        beforeData: log.afterData,
        afterData: log.beforeData,
        reason: `Undoing ${log.action} action from ${log.createdAt.toISOString()}`,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    })

    const res = NextResponse.json({ success: true })
    for (const sc of setCookieHeaders) res.headers.append('set-cookie', sc)
    return res
  } catch (error) {
    console.error('Failed to undo action:', error)
    return NextResponse.json({ error: 'Failed to undo action' }, { status: 500 })
  }
}

// Helper functions for undo operations
async function handleUndoCreate(entityType: string, entityId: string) {
  // Delete the created entity
  switch (entityType) {
    case 'User':
      await prisma.user.delete({ where: { id: entityId } })
      break
    case 'Target':
      await prisma.target.delete({ where: { id: entityId } })
      break
    // Add cases for other entity types
    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }
}

async function handleUndoUpdate(entityType: string, entityId: string, beforeData: any) {
  // Restore previous state
  switch (entityType) {
    case 'User':
      await prisma.user.update({
        where: { id: entityId },
        data: beforeData,
      })
      break
    case 'Target':
      await prisma.target.update({
        where: { id: entityId },
        data: beforeData,
      })
      break
    // Add cases for other entity types
    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }
}

async function handleUndoDelete(entityType: string, beforeData: any) {
  // Recreate deleted entity
  switch (entityType) {
    case 'User':
      await prisma.user.create({
        data: {
          ...beforeData,
          id: beforeData.id, // Preserve original ID
        },
      })
      break
    case 'Target':
      await prisma.target.create({
        data: {
          ...beforeData,
          id: beforeData.id, // Preserve original ID
        },
      })
      break
    // Add cases for other entity types
    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }
}
