-- PART 3: Deep dive into Henok's 38 agreements and import pattern

-- 1. Full list of Henok's 38 agreements (main account)
\echo '=== ALL 38 AGREEMENTS FOR himmanuel (8323e773) ==='
SELECT ROW_NUMBER() OVER (ORDER BY pa."createdAt") AS "#",
       pa."createdAt"::timestamp(0) AS created,
       pa.title,
       pa."customAction",
       pa."isAdhocContainer",
       pa."isSystemGenerated",
       pa."approvalStatus",
       pa.weight,
       pa."supervisorId",
       s.email AS supervisor_email
FROM "PerformanceAgreement" pa
LEFT JOIN "User" s ON s.id = pa."supervisorId"
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
ORDER BY pa."createdAt";

-- 2. Compare Henok's agreements with dkandjii's agreements (same titles?)
\echo '=== OVERLAP: Does Henok have same titles as dkandjii? ==='
SELECT pa.title, pa."customAction", pa."createdAt"::date AS date, 'HENOK' AS owner
FROM "PerformanceAgreement" pa
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND pa."isAdhocContainer" = false
INTERSECT
SELECT pa2.title, pa2."customAction", pa2."createdAt"::date AS date, 'DKANDJII' AS owner
FROM "PerformanceAgreement" pa2
WHERE pa2."userId" = '3b6316d7-9848-4a96-8080-1904a8861ea0'
  AND pa2."isAdhocContainer" = false;

-- 3. dkandjii full profile
\echo '=== dkandjii USER PROFILE ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId",
       m."firstName" || ' ' || m."lastName" AS manager_name,
       m.email AS manager_email
FROM "User" u
LEFT JOIN "User" m ON m.id = u."managerId"
WHERE u.id = '3b6316d7-9848-4a96-8080-1904a8861ea0';

-- 4. Tshimhanda full profile
\echo '=== Tshimhanda USER PROFILE ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId",
       m."firstName" || ' ' || m."lastName" AS manager_name,
       m.email AS manager_email
FROM "User" u
LEFT JOIN "User" m ON m.id = u."managerId"
WHERE u.id = 'd90e752b-41fb-48ec-821d-82d24f02a3c4';

-- 5. All IT dept employees' agreement counts
\echo '=== ALL IT DEPT USERS - AGREEMENT COUNTS ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle",
       COUNT(pa.id) AS total,
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular,
       MIN(pa."createdAt")::date AS first_import,
       MAX(pa."createdAt")::date AS last_import
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%'
GROUP BY u.id, u."firstName", u."lastName", u.email, u."jobTitle"
ORDER BY total DESC;

-- 6. Check: are Henok's agreements a subset of what dkandjii has? (Same initiative titles)
\echo '=== Henok regular agreements titles ==='
SELECT pa."createdAt"::timestamp(0) AS created,
       pa.title,
       LEFT(pa."customAction", 80) AS action_preview,
       pa.weight,
       pa."approvalStatus"
FROM "PerformanceAgreement" pa
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND pa."isAdhocContainer" = false
ORDER BY pa."createdAt";

-- 7. Timeline: Who imported what and when (all IT dept, sorted by createdAt)
\echo '=== IT DEPT IMPORT TIMELINE ==='
SELECT pa."createdAt"::timestamp(0) AS import_time,
       u.email,
       u."firstName" || ' ' || u."lastName" AS name,
       COUNT(*) AS agreements_in_batch
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE (u."departmentName" ILIKE '%IT%' OR u."departmentName" ILIKE '%Data Management%'
       OR u."firstName" ILIKE '%henok%' OR u."lastName" ILIKE '%immanuel%')
  AND pa."isAdhocContainer" = false
GROUP BY pa."createdAt"::timestamp(0), u.email, u."firstName", u."lastName"
ORDER BY import_time;

-- 8. Check SG and DSG - do they have the same problem?
\echo '=== SG AND DSG USER RECORDS AND AGREEMENT COUNTS ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle", u."departmentName",
       COUNT(pa.id) AS total_agreements,
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE u."jobTitle" ILIKE '%statistician general%'
   OR u."jobTitle" ILIKE '% SG'
   OR u."jobTitle" = 'SG'
   OR u."jobTitle" ILIKE '%DSG%'
   OR u."jobTitle" ILIKE '%Deputy Statistician%'
GROUP BY u.id, u."firstName", u."lastName", u.email, u."jobTitle", u."departmentName"
ORDER BY total_agreements DESC;

-- 9. All ghost/duplicate accounts (email appears more than once case-insensitively)
\echo '=== ALL DUPLICATE/GHOST ACCOUNTS ==='
SELECT LOWER(email) AS email_lower,
       COUNT(*) AS duplicate_count,
       array_agg(id) AS user_ids,
       array_agg(email) AS emails,
       array_agg("firstName" || ' ' || "lastName") AS names,
       array_agg("jobTitle") AS job_titles,
       array_agg("createdAt"::date) AS created_dates
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
