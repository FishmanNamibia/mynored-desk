import { prisma } from './prisma'

export interface AuditLogData {
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, any>
  userId: string
  metadata?: Record<string, any>
}

export async function createAuditLog(data: AuditLogData) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        details: data.details || {},
        userId: data.userId,
        metadata: data.metadata || {},
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    return null
  }
}

export function shouldCreateDeadlineOverrideLog(oldDeadline: Date | null, newDeadline: Date | null): boolean {
  if (!oldDeadline && !newDeadline) return false
  if (!oldDeadline && newDeadline) return true
  if (oldDeadline && !newDeadline) return true
  if (oldDeadline && newDeadline) {
    return oldDeadline.getTime() !== newDeadline.getTime()
  }
  return false
}