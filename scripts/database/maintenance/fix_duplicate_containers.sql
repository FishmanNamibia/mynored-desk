-- Remove duplicate containers for Henok (6 -> 3)
-- Keep the OLDER container (lower createdAt) for each title, delete the newer duplicate

BEGIN;

\echo '=== Henok containers before dedup ==='
SELECT id, title, "createdAt", "isAdhocContainer", "isSystemGenerated", "userId"
FROM "PerformanceAgreement"
WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND "isAdhocContainer" = true
ORDER BY title, "createdAt";

DELETE FROM "PerformanceAgreement"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY "userId", title
        ORDER BY "createdAt" ASC   -- keep the first (older), delete the rest
      ) AS rn
    FROM "PerformanceAgreement"
    WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
      AND "isAdhocContainer" = true
  ) ranked
  WHERE rn > 1
);

\echo '=== Henok containers after dedup ==='
SELECT id, title, "createdAt", "isAdhocContainer", "userId"
FROM "PerformanceAgreement"
WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND "isAdhocContainer" = true
ORDER BY title;

\echo '=== Final Henok agreement summary ==='
SELECT COUNT(CASE WHEN "isAdhocContainer" = false THEN 1 END) AS regular,
       COUNT(CASE WHEN "isAdhocContainer" = true THEN 1 END) AS containers,
       COUNT(*) AS total
FROM "PerformanceAgreement"
WHERE "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4';

COMMIT;
