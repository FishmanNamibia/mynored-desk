CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNING',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "plannedStartDate" TIMESTAMP(3),
  "plannedEndDate" TIMESTAMP(3),
  "actualStartDate" TIMESTAMP(3),
  "actualEndDate" TIMESTAMP(3),
  "budget" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'NAD',
  "ownerId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "departmentId" TEXT,
  "divisionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");

CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");

CREATE INDEX IF NOT EXISTS "Project_departmentId_idx" ON "Project"("departmentId");

CREATE TABLE IF NOT EXISTS "ProjectTeamMember" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTeamMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  CONSTRAINT "ProjectTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "ProjectTeamMember_projectId_userId_key" UNIQUE ("projectId", "userId")
);

CREATE INDEX IF NOT EXISTS "ProjectTeamMember_userId_idx" ON "ProjectTeamMember"("userId");

CREATE TABLE IF NOT EXISTS "ProjectTask" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "percentComplete" INTEGER NOT NULL DEFAULT 0,
  "plannedStartDate" TIMESTAMP(3),
  "plannedEndDate" TIMESTAMP(3),
  "estimatedHours" DOUBLE PRECISION,
  "assignedToId" TEXT,
  "phaseId" TEXT,
  "phaseName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  CONSTRAINT "ProjectTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");

CREATE INDEX IF NOT EXISTS "ProjectTask_assignedToId_idx" ON "ProjectTask"("assignedToId");

CREATE TABLE IF NOT EXISTS "ProjectRisk" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRisk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectRisk_projectId_idx" ON "ProjectRisk"("projectId");

CREATE TABLE IF NOT EXISTS "ProjectIssue" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectIssue_projectId_idx" ON "ProjectIssue"("projectId");

CREATE TABLE IF NOT EXISTS "ProjectDocument" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT,
  "fileType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");
