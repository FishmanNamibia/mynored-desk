import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'
import { getAuthenticatedUser } from '@/lib/server-auth'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { user } = await getAuthenticatedUser(req)
    
    // Only admins can undo actions
    if (!user?.user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const auditLogId = id

    // Fetch the audit log entry
    const auditLog = await prisma.auditLog.findUnique({
      where: { id: auditLogId },
    })

    if (!auditLog) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 })
    }

    const { action, entityType, entityId, beforeData, afterData } = auditLog

    // Perform undo based on action type
    let undoResult: any

    switch (action) {
      case 'CREATE':
        // Undo CREATE by deleting the entity
        undoResult = await undoCreate(entityType, entityId, user.id)
        break

      case 'UPDATE':
        // Undo UPDATE by restoring to beforeData
        undoResult = await undoUpdate(entityType, entityId, beforeData, user.id)
        break

      case 'DELETE':
        // Undo DELETE by recreating the entity
        undoResult = await undoDelete(entityType, beforeData, user.id)
        break

      case 'DEADLINE_OVERRIDE':
        // Undo DEADLINE_OVERRIDE by restoring original deadline
        undoResult = await undoUpdate(entityType, entityId, beforeData, user.id)
        break

      default:
        return NextResponse.json(
          { error: `Cannot undo action type: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: 'Action undone successfully',
      result: undoResult,
    })
  } catch (error) {
    console.error('Error undoing action:', error)
    return NextResponse.json(
      { error: 'Failed to undo action' },
      { status: 500 }
    )
  }
}

// Undo CREATE by deleting the entity
async function undoCreate(entityType: string, entityId: string, actorId: string) {
  const model = getModel(entityType)
  if (!model) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  const entity = await model.findUnique({ where: { id: entityId } })
  if (!entity) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`)
  }

  await model.delete({ where: { id: entityId } })

  await createAuditLog({
    actorId,
    entityType,
    entityId,
    action: 'DELETE',
    beforeData: entity,
    afterData: null,
    reason: `Undo CREATE action`,
  })

  return { deleted: true, entityId }
}

// Undo UPDATE by restoring to previous state
async function undoUpdate(
  entityType: string,
  entityId: string,
  beforeData: any,
  actorId: string
) {
  const model = getModel(entityType)
  if (!model) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  if (!beforeData) {
    throw new Error('No beforeData available to restore')
  }

  const currentEntity = await model.findUnique({ where: { id: entityId } })
  if (!currentEntity) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`)
  }

  // Remove metadata fields that shouldn't be updated
  const { id, createdAt, updatedAt, ...restoreData } = beforeData

  const updatedEntity = await model.update({
    where: { id: entityId },
    data: restoreData,
  })

  await createAuditLog({
    actorId,
    entityType,
    entityId,
    action: 'UPDATE',
    beforeData: currentEntity,
    afterData: updatedEntity,
    reason: `Undo UPDATE action`,
  })

  return { updated: true, entityId }
}

// Undo DELETE by recreating the entity
async function undoDelete(entityType: string, beforeData: any, actorId: string) {
  const model = getModel(entityType)
  if (!model) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  if (!beforeData) {
    throw new Error('No beforeData available to recreate entity')
  }

  // Remove metadata fields to avoid conflicts
  const { createdAt, updatedAt, ...createData } = beforeData

  const recreatedEntity = await model.create({
    data: createData,
  })

  await createAuditLog({
    actorId,
    entityType,
    entityId: recreatedEntity.id,
    action: 'CREATE',
    beforeData: null,
    afterData: recreatedEntity,
    reason: `Undo DELETE action`,
  })

  return { recreated: true, entityId: recreatedEntity.id }
}

// Helper to get the Prisma model based on entity type
function getModel(entityType: string): any {
  const modelMap: Record<string, any> = {
    User: prisma.user,
    Department: prisma.department,
    Division: prisma.division,
    Goal: prisma.goal,
    Objective: prisma.objective,
    Initiative: prisma.initiative,
    PerformanceAgreement: prisma.performanceAgreement,
    Target: prisma.target,
    AdhocTask: prisma.adhocTask,
    IndependentPlan: prisma.independentPlan,
    IndependentPlanTask: prisma.independentPlanTask,
  }

  return modelMap[entityType]
}
