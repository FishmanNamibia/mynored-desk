-- Manual migration: enrich User profile with canonical fields

ALTER TABLE "User"
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "departmentName" TEXT,
  ADD COLUMN "divisionName" TEXT,
  ADD COLUMN "companyName" TEXT;
