-- Create Risk Document table
CREATE TABLE IF NOT EXISTS "RiskDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "description" TEXT,
  "departmentName" TEXT,
  "divisionName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "uploadedById" TEXT NOT NULL,
  "distributedToIds" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RiskDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RiskDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "RiskDocument_uploadedById_idx" ON "RiskDocument"("uploadedById");
CREATE INDEX "RiskDocument_status_idx" ON "RiskDocument"("status");

-- Create Risk Task table
CREATE TABLE IF NOT EXISTS "RiskTask" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "riskCategory" TEXT NOT NULL,
  "riskDescription" TEXT,
  "cause" TEXT,
  "impact" TEXT,
  "likelihood" TEXT NOT NULL DEFAULT 'POSSIBLE',
  "impactLevel" TEXT NOT NULL DEFAULT 'MODERATE',
  "riskScore" INTEGER,
  "mitigations" TEXT,
  "furtherActions" TEXT,
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
  "documentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RiskTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RiskTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RiskTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RiskTask_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RiskTask_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RiskDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RiskTask_assignedToId_idx" ON "RiskTask"("assignedToId");
CREATE INDEX "RiskTask_createdById_idx" ON "RiskTask"("createdById");
CREATE INDEX "RiskTask_approvedById_idx" ON "RiskTask"("approvedById");
CREATE INDEX "RiskTask_status_idx" ON "RiskTask"("status");
CREATE INDEX "RiskTask_documentId_idx" ON "RiskTask"("documentId");

-- Create join table for RiskDocument and User
CREATE TABLE IF NOT EXISTS "_DistributedRiskDocuments" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_DistributedRiskDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "RiskDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_DistributedRiskDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_DistributedRiskDocuments_AB_unique" ON "_DistributedRiskDocuments"("A", "B");
CREATE INDEX "_DistributedRiskDocuments_B_index" ON "_DistributedRiskDocuments"("B");
