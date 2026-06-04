-- PART 2: Focused investigation

-- 1. All user records for Henok
\echo '=== HENOK USER RECORDS ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId", "createdAt"
FROM "User"
WHERE "firstName" ILIKE '%henok%'
   OR "lastName" ILIKE '%immanuel%'
   OR email ILIKE '%henok%'
   OR email ILIKE '%immanuel%'
ORDER BY "createdAt";

-- 2. Total agreement counts per Henok userId
\echo '=== AGREEMENT COUNTS PER HENOK USER ID ==='
SELECT pa."userId",
       u.email,
       u."firstName", u."lastName",
       COUNT(*) AS total,
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular,
       COUNT(CASE WHEN pa."isAdhocContainer" = true THEN 1 END) AS containers,
       COUNT(CASE WHEN pa."isSystemGenerated" = true THEN 1 END) AS system_generated
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE u."firstName" ILIKE '%henok%'
   OR u."lastName" ILIKE '%immanuel%'
   OR u.email ILIKE '%henok%'
GROUP BY pa."userId", u.email, u."firstName", u."lastName"
ORDER BY total DESC;

-- 3. Show ALL 38 agreements for the main Henok account - titles and dates
\echo '=== ALL AGREEMENTS FOR himmanuel (8323e773) ==='
SELECT pa."createdAt"::date AS date,
       pa.title,
       pa."customAction",
       pa."isAdhocContainer",
       pa."isSystemGenerated",
       pa."approvalStatus",
       pa."supervisorId",
       s.email AS supervisor_email
FROM "PerformanceAgreement" pa
LEFT JOIN "User" s ON s.id = pa."supervisorId"
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
ORDER BY pa."createdAt";

-- 4. All IT dept users and their user IDs
\echo '=== ALL IT & DATA MANAGEMENT USERS ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName", "managerId", "createdAt"
FROM "User"
WHERE "departmentName" ILIKE '%IT%'
   OR "departmentName" ILIKE '%Data Management%'
ORDER BY "jobTitle", "lastName";

-- 5. Check if any agreements from IT dept users are being incorrectly put under Henok's userId
-- (i.e., agreements where userId = Henok but the titles clearly belong to other users)
\echo '=== AGREEMENTS ASSIGNED TO HENOK - grouping by import batch (same createdAt second) ==='
SELECT pa."createdAt"::timestamp(0) AS batch_time,
       COUNT(*) AS count_in_batch,
       MIN(pa.title) AS sample_title
FROM "PerformanceAgreement" pa
WHERE pa."userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND pa."isAdhocContainer" = false
GROUP BY pa."createdAt"::timestamp(0)
ORDER BY batch_time;

-- 6. Check managerId relationships - who does Henok manage?
\echo '=== USERS WHO REPORT TO HENOK ==='
SELECT id, "firstName", "lastName", email, "jobTitle", "departmentName"
FROM "User"
WHERE "managerId" IN (
    SELECT id FROM "User"
    WHERE "firstName" ILIKE '%henok%' OR "lastName" ILIKE '%immanuel%' OR email ILIKE '%henok%'
)
ORDER BY "lastName";

-- 7. Check the IMPORT route: look for any agreement where the performer's userId 
-- matches Henok but customAction comes from IT dept workplan initiatives
\echo '=== WORKPLAN INITIATIVES IN IT DEPT (to compare with Henok agreements) ==='
SELECT i.id, i.title, i."objectiveId",
       obj.title AS objective_title,
       g.title AS goal_title
FROM "Initiative" i
JOIN "Objective" obj ON obj.id = i."objectiveId"
JOIN "Goal" g ON g.id = obj."goalId"
WHERE i.title ILIKE '%IT%'
   OR i.title ILIKE '%data%'
   OR i.title ILIKE '%system%'
   OR i.title ILIKE '%software%'
   OR i.title ILIKE '%infrastructure%'
   OR i.title ILIKE '%network%'
   OR i.title ILIKE '%technology%'
LIMIT 20;

-- 8. Check other executives - SG, DSG, and other dept executives agreement counts
\echo '=== ALL EXECUTIVES/SG/DSG AGREEMENT COUNTS ==='
SELECT u.id, u."firstName", u."lastName", u.email, u."jobTitle", u."departmentName",
       COUNT(pa.id) AS total_agreements,
       COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular_agreements
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE u."jobTitle" ILIKE '%executive%'
   OR u."jobTitle" ILIKE '%statistician general%'
   OR u."jobTitle" ILIKE '%DSG%'
   OR u."jobTitle" ILIKE '%SG%'
GROUP BY u.id, u."firstName", u."lastName", u.email, u."jobTitle", u."departmentName"
ORDER BY total_agreements DESC;

-- 9. Check the pending-approval route logic: agreements where supervisorId = Henok's ID
-- (this would cause his count on approvals page to inflate)
\echo '=== ALL AGREEMENTS WHERE HENOK IS LISTED AS SUPERVISOR ==='
SELECT COUNT(*) AS count,
       pa."userId" AS employee_user_id,
       u.email AS employee_email,
       u."departmentName"
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."supervisorId" IN (
    SELECT id FROM "User"
    WHERE "firstName" ILIKE '%henok%' OR "lastName" ILIKE '%immanuel%' OR email ILIKE '%henok%'
)
GROUP BY pa."userId", u.email, u."departmentName"
ORDER BY count DESC;
