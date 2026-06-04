-- Check if Salmon's agreements migrated to canonical record
SELECT pa."userId", u.email, pa."approvalStatus", COUNT(*) as cnt
FROM "PerformanceAgreement" pa
JOIN "User" u ON u.id = pa."userId"
WHERE u.email ILIKE '%uulenga%'
GROUP BY pa."userId", u.email, pa."approvalStatus"
ORDER BY u.email, pa."approvalStatus";
