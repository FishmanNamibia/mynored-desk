import { prisma } from './prisma'
import { AuditAction } from '@prisma/client'

export interface PmsAuditLogData {
  action: string
  entityType: string
  entityId?: string
  beforeData?: any
  afterData?: any
  reason?: string
  userId: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Creates an audit log entry in the PmsAuditLog table
 * Use this for all performance management system actions
 */
export async function createPmsAuditLog(data: PmsAuditLogData) {
  try {
    // Map string action to enum value if needed
    let action: AuditAction;
    
    // Handle string to enum conversion
    switch (data.action.toUpperCase()) {
      case 'CREATE':
        action = 'CREATE';
        break;
      case 'UPDATE':
        action = 'UPDATE';
        break;
      case 'DELETE':
        action = 'DELETE';
        break;
      case 'APPROVE':
        action = 'APPROVE';
        break;
      case 'REJECT':
        action = 'REJECT';
        break;
      case 'SUBMIT':
        action = 'SUBMIT';
        break;
      case 'COMPLETE':
        action = 'COMPLETE';
        break;
      case 'LOGIN':
        action = 'LOGIN';
        break;
      case 'LOGOUT':
        action = 'LOGOUT';
        break;
      default:
        action = 'UPDATE'; // Default fallback
    }
    
    return await prisma.pmsAuditLog.create({
      data: {
        actorId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId || '',
        action,
        beforeData: data.beforeData || null,
        afterData: data.afterData || null,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Failed to create PMS audit log:', error)
    return null
  }
}
