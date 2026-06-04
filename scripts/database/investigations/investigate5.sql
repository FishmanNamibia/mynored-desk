-- PART 5: Confirm the overlap and managerId chain (key missing pieces)

-- 1. managerId for IT users - KEY QUERY
\echo '=== WHICH HENOK ID IS managerId FOR IT USERS? ==='
SELECT u.email AS it_user_email, u."jobTitle",
       u."managerId",
       m.email AS manager_email, m."jobTitle" AS manager_title, m.id AS manager_id
FROM "User" u
LEFT JOIN "User" m ON m.id = u."managerId"
WHERE u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%'
ORDER BY u."jobTitle", u."lastName";

-- 2. What ID does the IMPORT ROUTE find for Henok via findFirst?
-- (findFirst is non-deterministic - we check which appears first in pg_class ordering)
\echo '=== ORDER THAT POSTGRES RETURNS HENOK ACCOUNTS (simulates findFirst) ==='
SELECT id, email, "firstName", "lastName", "jobTitle", "createdAt"
FROM "User"
WHERE LOWER(email) = 'himmanuel@nsa.org.na'
ORDER BY "createdAt";

-- 3. Agreements where customAction overlap between Henok and any IT dept user
\echo '=== EXACT DUPLICATE customAction: Henok vs ALL IT dept ==='
SELECT 'HENOK' AS account, pa."userId", u.email, pa.title, LEFT(pa."customAction",100) AS action
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND pa."isAdhocContainer" = false
  AND EXISTS (
    SELECT 1 FROM "PerformanceAgreement" pa2
    JOIN "User" u2 ON u2.id = pa2."userId"
    WHERE LOWER(pa2."customAction") = LOWER(pa."customAction")
      AND (u2."departmentName" ILIKE '%IT%' OR u2."departmentName" ILIKE '%Data Management%')
      AND pa2."userId" != '8323e773-cdf0-4867-8738-038e1fd840e4'
      AND pa2."userId" != '63e921e8-0d3d-4d9a-b268-b1ab86795c76'
  )
ORDER BY pa.title;

-- 4. How many total agreements does Henok have TODAY (as of now)?
\echo '=== HENOK CURRENT TOTAL ==='
SELECT 'main (himmanuel)' AS account, COUNT(*) AS total,
       COUNT(CASE WHEN "isAdhocContainer" = false THEN 1 END) AS regular,
       COUNT(CASE WHEN "isAdhocContainer" = true THEN 1 END) AS containers
FROM "PerformanceAgreement"
WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
UNION ALL
SELECT 'ghost (Himmanuel)' AS account, COUNT(*) AS total,
       COUNT(CASE WHEN "isAdhocContainer" = false THEN 1 END) AS regular,
       COUNT(CASE WHEN "isAdhocContainer" = true THEN 1 END) AS containers
FROM "PerformanceAgreement"
WHERE "userId" = '63e921e8-0d3d-4d9a-b268-b1ab86795c76';

-- 5. Check what happens in the import route: does ANY code path create agreements for supervisorId?
-- Look at all agreements that were recently created (last 3 days) with supervisorId = either Henok ID
\echo '=== RECENT AGREEMENTS (last 3 days) WITH HENOK AS SUPERVISOR ==='
SELECT pa."createdAt"::timestamp(0) AS created, pa."userId",
       u.email AS employee_email, u."jobTitle" AS employee_title,
       pa.title, LEFT(pa."customAction",60) AS action,
       pa."supervisorId", pa."approvalStatus"
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."supervisorId" IN (
  '8323e773-cdf0-4867-8738-038e1fd840e4',
  '63e921e8-0d3d-4d9a-b268-b1ab86795c76'
)
AND pa."createdAt" > NOW() - INTERVAL '7 days'
ORDER BY pa."createdAt" DESC
LIMIT 30;

-- 6. Check autoAssignWorkplan: is there a WorkPlanAssignment or similar table?
\echo '=== ALL TABLES IN SCHEMA ==='
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 7. Check WHICH accounts get auto-created by the system (isSystemGenerated containers)
-- Are containers created for executives when anyone imports?
\echo '=== WHEN WERE EXECUTIVE GHOST CONTAINERS CREATED? ==='
SELECT pa."createdAt"::timestamp(0) AS created, pa."userId",
       u.email, u."jobTitle", pa.title
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."isSystemGenerated" = true
  AND (u."jobTitle" ILIKE '%executive%' OR u."jobTitle" ILIKE '%SG%' OR u."jobTitle" ILIKE '%statistician general%')
ORDER BY pa."createdAt";

-- 8. Check the assign-workplan route: PerformancePeriod and related tables
\echo '=== PERFORMANCE PERIOD AND WORKPLAN SETUP ==='
SELECT id, name, "startDate", "endDate", "isActive", "submissionDeadline"
FROM "PerformancePeriod"
ORDER BY "createdAt" DESC;
