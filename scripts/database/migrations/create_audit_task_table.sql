CREATE TABLE IF NOT EXISTS "AuditTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "dueDate" TIMESTAMP(3),
  "assignedToId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "evidenceUrl" TEXT,
  "evidenceNotes" TEXT,
  "rating" INTEGER,
  "approvalStatus" TEXT DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "progressNotes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuditTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuditTask_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditTask_assignedToId_idx" ON "AuditTask"("assignedToId");
CREATE INDEX IF NOT EXISTS "AuditTask_createdById_idx" ON "AuditTask"("createdById");
CREATE INDEX IF NOT EXISTS "AuditTask_approvedById_idx" ON "AuditTask"("approvedById");
CREATE INDEX IF NOT EXISTS "AuditTask_status_idx" ON "AuditTask"("status");
