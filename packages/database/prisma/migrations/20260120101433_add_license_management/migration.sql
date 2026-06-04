-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('SOFTWARE_LICENSE', 'SUBSCRIPTION', 'SSL_CERTIFICATE', 'SUPPORT_CONTRACT', 'CLOUD_SERVICE', 'API_LICENSE');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RenewalFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BIENNIAL', 'TRIENNIAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('EXPIRY_WARNING', 'EXPIRY_CRITICAL', 'EXPIRED', 'RENEWAL_DUE', 'COST_THRESHOLD');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "System" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "managerId" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "adSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "vendorId" INTEGER NOT NULL,
    "systemId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "productName" TEXT NOT NULL,
    "version" TEXT,
    "edition" TEXT,
    "userCount" INTEGER,
    "description" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "lastRenewedDate" TIMESTAMP(3),
    "renewalFrequency" "RenewalFrequency" NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'NAD',
    "alertThreshold" INTEGER NOT NULL DEFAULT 30,
    "supportContact" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "documentationUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAlert" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "daysUntilExpiry" INTEGER NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "taskCreated" BOOLEAN NOT NULL DEFAULT false,
    "taskId" INTEGER,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseRenewal" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "previousExpiryDate" TIMESTAMP(3) NOT NULL,
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "cost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'NAD',
    "status" "RenewalStatus" NOT NULL DEFAULT 'PENDING',
    "workflowInstanceId" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "System_name_key" ON "System"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE INDEX "License_expiryDate_idx" ON "License"("expiryDate");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "License_licenseType_idx" ON "License"("licenseType");

-- CreateIndex
CREATE INDEX "LicenseAlert_licenseId_idx" ON "LicenseAlert"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseAlert_notificationSent_idx" ON "LicenseAlert"("notificationSent");

-- CreateIndex
CREATE INDEX "LicenseAlert_acknowledged_idx" ON "LicenseAlert"("acknowledged");

-- CreateIndex
CREATE INDEX "LicenseRenewal_licenseId_idx" ON "LicenseRenewal"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseRenewal_status_idx" ON "LicenseRenewal"("status");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAlert" ADD CONSTRAINT "LicenseAlert_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAlert" ADD CONSTRAINT "LicenseAlert_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseRenewal" ADD CONSTRAINT "LicenseRenewal_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseRenewal" ADD CONSTRAINT "LicenseRenewal_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "WorkflowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
