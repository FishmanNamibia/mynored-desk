-- PART 6: Get exact IDs for all duplicate pairs and which has agreements

\echo '=== DUPLICATE PAIRS: which ID has regular agreements? ==='
SELECT
  LOWER(u.email) AS email,
  u.id,
  u.email AS email_exact,
  u."firstName", u."lastName",
  u."jobTitle",
  u."departmentName",
  u."managerId",
  u."createdAt"::date,
  COUNT(CASE WHEN pa."isAdhocContainer" = false AND pa."isSystemGenerated" = false THEN 1 END) AS imported_agreements,
  COUNT(CASE WHEN pa."isAdhocContainer" = false AND pa."isSystemGenerated" = true THEN 1 END) AS workplan_agreements,
  COUNT(CASE WHEN pa."isAdhocContainer" = true THEN 1 END) AS containers
FROM "User" u
LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
WHERE LOWER(u.email) IN (
  SELECT LOWER(email) FROM "User"
  GROUP BY LOWER(email)
  HAVING COUNT(*) > 1
)
GROUP BY u.id, u.email, u."firstName", u."lastName", u."jobTitle", u."departmentName", u."managerId", u."createdAt"
ORDER BY LOWER(u.email), u."createdAt";

-- For each duplicate pair, which ID should be canonical (has agreements OR has job title)?
\echo '=== CANONICAL SELECTION: prefer job title + agreements ==='
WITH ranked AS (
  SELECT
    u.id,
    LOWER(u.email) AS email_lower,
    u.email,
    u."firstName", u."lastName", u."jobTitle", u."departmentName",
    u."createdAt",
    COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) AS regular_count,
    CASE WHEN u."jobTitle" IS NOT NULL AND u."jobTitle" != '' THEN 1 ELSE 0 END AS has_job_title,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(u.email)
      ORDER BY
        COUNT(CASE WHEN pa."isAdhocContainer" = false THEN 1 END) DESC,  -- most agreements first
        CASE WHEN u."jobTitle" IS NOT NULL AND u."jobTitle" != '' THEN 0 ELSE 1 END ASC,  -- job title first
        u."createdAt" ASC  -- then oldest
    ) AS rn
  FROM "User" u
  LEFT JOIN "PerformanceAgreement" pa ON pa."userId" = u.id
  WHERE LOWER(u.email) IN (
    SELECT LOWER(email) FROM "User"
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  )
  GROUP BY u.id, u.email, u."firstName", u."lastName", u."jobTitle", u."departmentName", u."createdAt"
)
SELECT
  email_lower,
  CASE WHEN rn = 1 THEN 'KEEP (canonical)' ELSE 'DELETE (ghost)' END AS action,
  id,
  email,
  "jobTitle",
  regular_count,
  "createdAt"
FROM ranked
ORDER BY email_lower, rn;

-- Check what other tables reference the ghost user IDs
\echo '=== OTHER TABLE REFERENCES TO GHOST ACCOUNTS ==='
-- Check PmsNotification
SELECT 'PmsNotification.receiverId' AS ref, COUNT(*) AS cnt
FROM "PmsNotification"
WHERE "receiverId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab')
UNION ALL
SELECT 'PmsNotification.senderId', COUNT(*)
FROM "PmsNotification"
WHERE "senderId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab')
UNION ALL
SELECT 'User.managerId (any user has ghost as manager)', COUNT(*)
FROM "User"
WHERE "managerId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab')
UNION ALL
SELECT 'PerformanceAgreement.userId pointing to ghost', COUNT(*)
FROM "PerformanceAgreement"
WHERE "userId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab')
UNION ALL
SELECT 'PerformanceAgreement.supervisorId pointing to ghost', COUNT(*)
FROM "PerformanceAgreement"
WHERE "supervisorId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab')
UNION ALL
SELECT 'UserRole.userId pointing to ghost', COUNT(*)
FROM "UserRole"
WHERE "userId" IN ('63e921e8-0d3d-4d9a-b268-b1ab86795c76', '428066e4-4bd2-47d0-9d63-d8e217fedf63', '83ab2dda-c3c9-486c-bacf-02168b00a3ab');
