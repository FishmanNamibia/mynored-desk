import { prisma } from './prisma'
import { AuditAction } from '@prisma/client'
import { logger } from './logger'

interface AuditLogData {
  actorId: string
  entityType: string
  entityId: string
  action: AuditAction
  beforeData?: any
  afterData?: any
  reason?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Safely gets a valid actor ID for audit logs.
 * Returns the actor ID if the user exists in the database, otherwise returns null.
 */
async function getSafeActorId(actorId: string | undefined | null): Promise<string | null> {
  if (!actorId) return null
  
  const actorExists = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true },
  })
  
  return actorExists ? actorId : null
}

export async function createAuditLog(data: AuditLogData) {
  try {
    // Verify actor exists before creating audit log
    const safeActorId = await getSafeActorId(data.actorId)
    
    await prisma.auditLog.create({
      data: {
        actorId: safeActorId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        beforeData: data.beforeData || null,
        afterData: data.afterData || null,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })
    
    logger.info({
      audit: true,
      actorId: safeActorId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
    }, 'Audit log created')
  } catch (error) {
    logger.error({ error }, 'Failed to create audit log')
    throw error
  }
}

export function shouldCreateDeadlineOverrideLog(
  dueDate: Date,
  userRole: string
): boolean {
  return userRole === 'ADMIN' && new Date() > dueDate
}
