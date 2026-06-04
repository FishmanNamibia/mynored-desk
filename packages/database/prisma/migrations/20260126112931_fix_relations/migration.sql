/*
  Warnings:

  - The primary key for the `Department` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LeaveRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `License` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LicenseAlert` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LicenseRenewal` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Memo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PerformanceReview` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `System` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Task` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vendor` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('OPEN', 'CLOSED', 'FILLED');

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_parentId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "License" DROP CONSTRAINT "License_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "License" DROP CONSTRAINT "License_systemId_fkey";

-- DropForeignKey
ALTER TABLE "License" DROP CONSTRAINT "License_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "LicenseAlert" DROP CONSTRAINT "LicenseAlert_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "LicenseAlert" DROP CONSTRAINT "LicenseAlert_taskId_fkey";

-- DropForeignKey
ALTER TABLE "LicenseRenewal" DROP CONSTRAINT "LicenseRenewal_licenseId_fkey";

-- DropForeignKey
ALTER TABLE "Memo" DROP CONSTRAINT "Memo_createdById_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceReview" DROP CONSTRAINT "PerformanceReview_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceReview" DROP CONSTRAINT "PerformanceReview_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAction" DROP CONSTRAINT "WorkflowAction_performedBy_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowAssignment" DROP CONSTRAINT "WorkflowAssignment_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowInstance" DROP CONSTRAINT "WorkflowInstance_createdBy_fkey";

-- AlterTable
ALTER TABLE "Department" DROP CONSTRAINT "Department_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "parentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Department_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Department_id_seq";

-- AlterTable
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "LeaveRequest_id_seq";

-- AlterTable
ALTER TABLE "License" DROP CONSTRAINT "License_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vendorId" SET DATA TYPE TEXT,
ALTER COLUMN "systemId" SET DATA TYPE TEXT,
ALTER COLUMN "departmentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "License_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "License_id_seq";

-- AlterTable
ALTER TABLE "LicenseAlert" DROP CONSTRAINT "LicenseAlert_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "licenseId" SET DATA TYPE TEXT,
ALTER COLUMN "taskId" SET DATA TYPE TEXT,
ADD CONSTRAINT "LicenseAlert_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "LicenseAlert_id_seq";

-- AlterTable
ALTER TABLE "LicenseRenewal" DROP CONSTRAINT "LicenseRenewal_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "licenseId" SET DATA TYPE TEXT,
ADD CONSTRAINT "LicenseRenewal_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "LicenseRenewal_id_seq";

-- AlterTable
ALTER TABLE "Memo" DROP CONSTRAINT "Memo_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "createdById" SET DATA TYPE TEXT,
ADD CONSTRAINT "Memo_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Memo_id_seq";

-- AlterTable
ALTER TABLE "PerformanceReview" DROP CONSTRAINT "PerformanceReview_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "reviewerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PerformanceReview_id_seq";

-- AlterTable
ALTER TABLE "System" DROP CONSTRAINT "System_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "System_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "System_id_seq";

-- AlterTable
ALTER TABLE "Task" DROP CONSTRAINT "Task_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "assignedToId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Task_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Task_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Vendor_id_seq";

-- AlterTable
ALTER TABLE "WorkflowAction" ALTER COLUMN "performedBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkflowAssignment" ALTER COLUMN "assignedTo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WorkflowInstance" ALTER COLUMN "createdBy" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "requirements" TEXT,
    "salary" DOUBLE PRECISION,
    "closingDate" TIMESTAMP(3),
    "status" "VacancyStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "year" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "excerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vacancy_departmentId_idx" ON "Vacancy"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "News_authorId_idx" ON "News"("authorId");

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAssignment" ADD CONSTRAINT "WorkflowAssignment_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "News" ADD CONSTRAINT "News_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
