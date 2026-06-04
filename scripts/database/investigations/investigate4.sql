-- PART 4: Confirm exact root cause

-- 1. Do Henok's agreements TITLE+ACTION overlap with dkandjii?
\echo '=== TITLE OVERLAP: Henok vs dkandjii ==='
SELECT h.title, LEFT(h."customAction",80) AS henok_action, LEFT(d."customAction",80) AS dkandjii_action
FROM "PerformanceAgreement" h
JOIN "PerformanceAgreement" d ON LOWER(h.title) = LOWER(d.title)
WHERE h."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND d."userId" = '3b6316d7-9848-4a96-8080-1904a8861ea0'
  AND h."isAdhocContainer" = false AND d."isAdhocContainer" = false;

-- 2. Do Henok's agreements overlap with Tshimhanda?
\echo '=== TITLE OVERLAP: Henok vs Tshimhanda ==='
SELECT h.title, LEFT(h."customAction",80) AS henok_action, LEFT(t."customAction",80) AS tshimhanda_action
FROM "PerformanceAgreement" h
JOIN "PerformanceAgreement" t ON LOWER(h.title) = LOWER(t.title)
WHERE h."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND t."userId" = 'd90e752b-41fb-48ec-821d-82d24f02a3c4'
  AND h."isAdhocContainer" = false AND t."isAdhocContainer" = false;

-- 3. managerId chain for IT dept users - who is listed as their manager?
\echo '=== IT DEPT - managerId DETAILS ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle",
       u."managerId",
       m.id AS manager_db_id,
       m.email AS manager_email,
       m."jobTitle" AS manager_job_title,
       m."firstName" || ' ' || m."lastName" AS manager_name
FROM "User" u
LEFT JOIN "User" m ON m.id = u."managerId"
WHERE u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%'
ORDER BY u."jobTitle";

-- 4. For each Henok userId, what managerId do IT users point to?
\echo '=== WHICH HENOK ID IS managerId FOR IT USERS? ==='
SELECT u."managerId",
       COUNT(*) AS users_pointing_here,
       hm.email AS manager_email,
       hm."firstName" || ' ' || hm."lastName" AS manager_name,
       hm."jobTitle"
FROM "User" u
JOIN "User" hm ON hm.id = u."managerId"
WHERE u."managerId" IN (
  '8323e773-cdf0-4867-8738-038e1fd840e4',
  '63e921e8-0d3d-4d9a-b268-b1ab86795c76'
)
GROUP BY u."managerId", hm.email, hm."firstName", hm."lastName", hm."jobTitle";

-- 5. Check SG and DSG - find their user IDs
\echo '=== SG AND DSG USER IDs (broader search) ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId", "createdAt"
FROM "User"
WHERE "jobTitle" ILIKE '%statistician%'
   OR "jobTitle" ILIKE '%SG%'
   OR "jobTitle" ILIKE '%Director%'
   OR "jobTitle" ILIKE '%director general%'
ORDER BY "jobTitle";

-- 6. Check assign-workplan: are there WorkPlan entries that trigger auto-assignment to executives?
\echo '=== WORKPLAN TABLE (check if any assigned to IT exec) ==='
SELECT * FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%workplan%';

-- 7. Full list of ALL Henok's regular agreements (35 of them) - with full customAction  
\echo '=== HENOK FULL 35 REGULAR AGREEMENTS ==='
SELECT ROW_NUMBER() OVER (ORDER BY pa."createdAt") AS "#",
       pa.title,
       pa."customAction",
       pa.weight,
       pa."approvalStatus"
FROM "PerformanceAgreement" pa
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND pa."isAdhocContainer" = false
ORDER BY pa."createdAt";

-- 8. How many agreements do OTHER executives and regular IT staff have for comparison
\echo '=== ALL IT DEPT USERS - FULL AGREEMENT BREAKDOWN ==='
SELECT u.email, u."firstName" || ' ' || u."lastName" AS name, u."jobTitle",
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular,
       COUNT(CASE WHEN pa."isAdhocContainer" = true THEN 1 END) AS containers,
       COUNT(pa.id) AS total,
       MIN(pa."createdAt")::date AS first_import,
       MAX(pa."createdAt")::date AS last_import,
       pa."supervisorId" IS NOT NULL AS has_supervisor
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%'
GROUP BY u.email, u."firstName", u."lastName", u."jobTitle", pa."supervisorId" IS NOT NULL
ORDER BY regular DESC;

-- 9. Check if there are any PerformanceAgreements whose userId is NOT a valid User ID
\echo '=== ORPHANED AGREEMENTS (userId not in User table) ==='
SELECT pa.id, pa."userId", pa.title, pa."createdAt"
FROM "PerformanceAgreement" pa
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pa."userId")
LIMIT 20;

-- 10. Check the actual import - was Henok's own import the only time agreements were created for him?
\echo '=== FULL CREATION TIMELINE FOR HENOK MAIN ACCOUNT ==='
SELECT pa."createdAt"::timestamp(0) AS ts, COUNT(*) AS cnt
FROM "PerformanceAgreement" pa
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
GROUP BY pa."createdAt"::timestamp(0)
ORDER BY ts;
