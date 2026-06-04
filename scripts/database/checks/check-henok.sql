-- Check Henok's agreements and approval status
SELECT pa."userId", u.email, pa."approvalStatus", COUNT(*) as cnt
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE pa."userId" IN ('abd5aed7-0efc-4509-9c4c-eb8c2f10c6c1','63e921e8-0d3d-4d9a-b268-b1ab86795c76')
  AND pa."isAdhocContainer" = false
GROUP BY pa."userId", u.email, pa."approvalStatus"
ORDER BY pa."userId";

-- Check all users with email like himmanuel
SELECT id, email, "jobTitle", "departmentName", "departmentId" FROM "User" WHERE email ILIKE '%himmanuel%';
