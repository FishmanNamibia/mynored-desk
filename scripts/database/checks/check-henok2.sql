-- Find ALL user records that could be Henok (by name or email)
SELECT id, email, "firstName", "lastName", "jobTitle", "departmentName", "departmentId"
FROM "User"
WHERE email ILIKE '%immanuel%'
   OR ("firstName" ILIKE '%henok%')
   OR ("lastName" ILIKE '%immanuel%')
ORDER BY email;

-- Find where his agreements actually live - search by supervisorId too
SELECT pa."userId", COUNT(*) as cnt, pa."approvalStatus"
FROM "PerformanceAgreement" pa
WHERE pa."isAdhocContainer" = false
  AND pa."userId" IN (
    SELECT id FROM "User" WHERE email ILIKE '%immanuel%' OR "firstName" ILIKE '%henok%' OR "lastName" ILIKE '%immanuel%'
  )
GROUP BY pa."userId", pa."approvalStatus";
