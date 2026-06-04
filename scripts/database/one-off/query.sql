-- Check Salmon Uulenga
SELECT id, email, "jobTitle", "departmentName", "managerId" FROM "User" WHERE email ILIKE '%uulenga%';

-- Check agreements for Salmon
SELECT pa."userId", pa."approvalStatus", COUNT(*) as cnt
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE u.email ILIKE '%uulenga%'
GROUP BY pa."userId", pa."approvalStatus";

-- Check Henok (multiple records?)
SELECT id, email, "jobTitle", "departmentName", "managerId" FROM "User" WHERE email ILIKE '%himmanuel%';

-- Check all IT dept users with agreement counts
SELECT u.id, u.email, u."firstName", u."lastName", u."departmentName", u."managerId",
  (SELECT COUNT(*) FROM "PerformanceAgreement" WHERE "userId" = u.id) as total_agreements,
  (SELECT COUNT(*) FROM "PerformanceAgreement" WHERE "userId" = u.id AND "approvalStatus" = 'APPROVED') as approved
FROM "User" u
WHERE u."departmentName" ILIKE '%IT%Data%'
ORDER BY u."lastName";
