-- ============================================================
-- GHOST ACCOUNT CLEANUP
-- Merges ghost (duplicate) accounts into canonical accounts
-- Run: psql -f cleanup_ghost_accounts.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. HENOK IMMANUEL (himmanuel@nsa.org.na)
--    CANONICAL: 8323e773 (35 agreements, no job title yet)
--    GHOST:     63e921e8 (job title set, 3 containers, managerId = f790f8ed)
-- ============================================================

-- Copy job title, department, managerId, and signatureUrl from ghost to canonical
UPDATE "User"
SET
  "jobTitle"       = 'Executive:IT & Data Management',
  "departmentName" = 'IT & Data Management',
  "managerId"      = 'f790f8ed-a7f8-467d-b0bf-04832012ec07',  -- Henok's own manager (from ghost)
  "signatureUrl"   = '/dashboard/performance/api/uploads/signatures/63e921e8-0d3d-4d9a-b268-b1ab86795c76-1771521383369.png'
WHERE id = '8323e773-cdf0-4867-8738-038e1fd840e4';

-- Migrate ghost's 3 containers to canonical
UPDATE "PerformanceAgreement"
SET "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "userId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- Re-point all supervisorId references from ghost → canonical (149 rows)
UPDATE "PerformanceAgreement"
SET "supervisorId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "supervisorId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- Re-point all managerId references from ghost → canonical (e.g. Uulenga)
UPDATE "User"
SET "managerId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "managerId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- Re-point notifications from ghost → canonical
UPDATE "PmsNotification"
SET "receiverId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "receiverId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

UPDATE "PmsNotification"
SET "senderId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "senderId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- Move ghost UserRoles to canonical (re-point non-conflicting rows, delete conflicting ones)
UPDATE "UserRole" SET "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "userId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76'
  AND "roleId" NOT IN (
    SELECT "roleId" FROM "UserRole"
    WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  );
DELETE FROM "UserRole" WHERE "userId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- Delete ghost account
DELETE FROM "User" WHERE id = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- ============================================================
-- 2. SALMON UULENGA (suulenga@nsa.org.na)
--    CANONICAL: 1fc44f31 (28 agreements, job title set)
--    GHOST:     428066e4 (no agreements, no job title)
-- ============================================================

-- Migrate ghost containers (if any) to canonical
UPDATE "PerformanceAgreement"
SET "userId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "userId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- Re-point supervisorId references
UPDATE "PerformanceAgreement"
SET "supervisorId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "supervisorId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- Re-point managerId references
UPDATE "User"
SET "managerId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "managerId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- Re-point notifications
UPDATE "PmsNotification"
SET "receiverId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "receiverId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

UPDATE "PmsNotification"
SET "senderId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "senderId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- Move ghost UserRoles
UPDATE "UserRole" SET "userId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "userId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63'
  AND "roleId" NOT IN (
    SELECT "roleId" FROM "UserRole"
    WHERE "userId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
  );
DELETE FROM "UserRole" WHERE "userId" = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- Delete ghost
DELETE FROM "User" WHERE id = '428066e4-4bd2-47d0-9d63-d8e217fedf63';

-- ============================================================
-- 3. ABEL KALUNDUKA (akalunduka@nsa.org.na)
--    CANONICAL: 32a23f14 (40 agreements, job title set)
--    GHOST:     83ab2dda (no agreements, no job title)
-- ============================================================

-- Migrate ghost containers (if any) to canonical
UPDATE "PerformanceAgreement"
SET "userId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "userId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- Re-point supervisorId references
UPDATE "PerformanceAgreement"
SET "supervisorId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "supervisorId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- Re-point managerId references
UPDATE "User"
SET "managerId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "managerId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- Re-point notifications
UPDATE "PmsNotification"
SET "receiverId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "receiverId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

UPDATE "PmsNotification"
SET "senderId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "senderId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- Move ghost UserRoles
UPDATE "UserRole" SET "userId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
WHERE "userId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab'
  AND "roleId" NOT IN (
    SELECT "roleId" FROM "UserRole"
    WHERE "userId" = '32a23f14-670c-4d1d-8a3b-e517593b2314'
  );
DELETE FROM "UserRole" WHERE "userId" = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- Delete ghost
DELETE FROM "User" WHERE id = '83ab2dda-c3c9-486c-bacf-02168b00a3ab';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

\echo '=== VERIFY: Henok canonical account after cleanup ==='
SELECT id, email, "firstName", "lastName", "jobTitle", "departmentName", "managerId"
FROM "User" WHERE id = '8323e773-cdf0-4867-8738-038e1fd840e4';

\echo '=== VERIFY: Agreement counts after cleanup ==='
SELECT u.email, u."jobTitle",
  COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular,
  COUNT(CASE WHEN pa."isAdhocContainer" = true THEN 1 END) AS containers,
  COUNT(pa.id) AS total
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE LOWER(u.email) IN ('himmanuel@nsa.org.na','suulenga@nsa.org.na','akalunduka@nsa.org.na')
GROUP BY u.email, u."jobTitle";

\echo '=== VERIFY: No more duplicate emails ==='
SELECT LOWER(email) AS email_lower, COUNT(*) AS count
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

\echo '=== VERIFY: No dangling ghost IDs in PerformanceAgreement ==='
SELECT COUNT(*) AS dangling_userids
FROM "PerformanceAgreement" pa
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pa."userId");

COMMIT;
