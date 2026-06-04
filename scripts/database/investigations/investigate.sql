-- ============================================================
-- INVESTIGATION: Henok Immanuel ghost accounts & agreement inflation
-- ============================================================

-- 1. All user records matching Henok Immanuel (any variation)
\echo '=== HENOK IMMANUEL USER RECORDS ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId", "createdAt"
FROM "User"
WHERE "firstName" ILIKE '%henok%'
   OR "lastName" ILIKE '%immanuel%'
   OR email ILIKE '%henok%'
   OR email ILIKE '%immanuel%'
ORDER BY "createdAt";

-- 2. All executives in IT & Data Management
\echo '=== IT & DATA MANAGEMENT EXECUTIVES/USERS ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId"
FROM "User"
WHERE "departmentName" ILIKE '%IT%'
   OR "departmentName" ILIKE '%Data Management%'
ORDER BY "jobTitle";

-- 3. Count performance agreements per Henok user ID
\echo '=== PERFORMANCE AGREEMENTS COUNT PER HENOK USER ID ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle",
       COUNT(pa.id) AS total_agreements,
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular_agreements,
       COUNT(CASE WHEN pa."isAdhocContainer" = true THEN 1 END) AS container_agreements
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE u."firstName" ILIKE '%henok%'
   OR u."lastName" ILIKE '%immanuel%'
   OR u.email ILIKE '%henok%'
GROUP BY u.id, u."firstName", u."lastName", u.email, u."jobTitle"
ORDER BY total_agreements DESC;

-- 4. Agreements owned by any Henok user ID - with creation dates
\echo '=== ALL AGREEMENTS FOR HENOK (most recent 30) ==='
SELECT pa.id, pa.title, pa."customAction", pa."approvalStatus", pa."isAdhocContainer",
       pa."createdAt", pa."userId", pa."supervisorId",
       u."firstName" || ' ' || u."lastName" AS owner_name
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE u."firstName" ILIKE '%henok%'
   OR u."lastName" ILIKE '%immanuel%'
   OR u.email ILIKE '%henok%'
ORDER BY pa."createdAt" DESC
LIMIT 30;

-- 5. Check if any other user IDs have supervisorId pointing to Henok
\echo '=== AGREEMENTS WHERE HENOK IS SUPERVISOR ==='
SELECT pa.id, pa.title, pa."approvalStatus", pa."createdAt", pa."userId",
       u."firstName" || ' ' || u."lastName" AS employee_name, u.email
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."supervisorId" IN (
    SELECT id FROM "User"
    WHERE "firstName" ILIKE '%henok%' OR "lastName" ILIKE '%immanuel%' OR email ILIKE '%henok%'
)
ORDER BY pa."createdAt" DESC
LIMIT 20;

-- 6. Check the import route logic: agreements where userId matches IT department users
-- and supervisorId points to executive
\echo '=== IT DEPT USERS AND THEIR SUPERVISORS ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle", u."managerId",
       m."firstName" || ' ' || m."lastName" AS manager_name, m.email AS manager_email
FROM "User" u
LEFT JOIN "User" m ON m.id = u."managerId"
WHERE u."departmentName" ILIKE '%IT%'
   OR u."departmentName" ILIKE '%Data Management%'
ORDER BY u."jobTitle";

-- 7. Check recently created agreements for IT dept to see who they're assigned to
\echo '=== RECENT PA IMPORTS FOR IT DEPT (last 50 regular agreements) ==='
SELECT pa."createdAt", pa."userId", pa."supervisorId",
       u."firstName" || ' ' || u."lastName" AS employee,
       u.email AS employee_email,
       s."firstName" || ' ' || s."lastName" AS supervisor,
       pa.title, pa."isAdhocContainer", pa."approvalStatus"
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
LEFT JOIN "User" s ON s.id = pa."supervisorId"
WHERE (u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%')
  AND pa."isAdhocContainer" = false
ORDER BY pa."createdAt" DESC
LIMIT 50;

-- 8. Agreements created for executive's OWN user ID (not supervisor) - grouped by day
\echo '=== AGREEMENT CREATION SPIKES FOR HENOK USER IDs ==='
SELECT DATE(pa."createdAt") AS creation_date,
       pa."userId",
       u.email,
       COUNT(*) AS agreements_created
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE u."firstName" ILIKE '%henok%'
   OR u."lastName" ILIKE '%immanuel%'
   OR u.email ILIKE '%henok%'
GROUP BY DATE(pa."createdAt"), pa."userId", u.email
ORDER BY creation_date DESC;

-- 9. Check if workplan auto-assign is incorrectly assigning to executive
\echo '=== SYSTEM GENERATED AGREEMENTS FOR HENOK ==='
SELECT pa.id, pa.title, pa."isSystemGenerated", pa."supervisorId", pa."userId",
       pa."createdAt", pa."approvalStatus"
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE (u."firstName" ILIKE '%henok%' OR u."lastName" ILIKE '%immanuel%' OR u.email ILIKE '%henok%')
  AND pa."isSystemGenerated" = true
ORDER BY pa."createdAt" DESC;
