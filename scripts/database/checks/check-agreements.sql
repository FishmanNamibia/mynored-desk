-- Check performance agreements for a specific user
SELECT 
  u.email, 
  u."firstName", 
  u."lastName",
  COUNT(*) FILTER (WHERE pa."isAdhocContainer" = false) as actual_agreements,
  COUNT(*) FILTER (WHERE pa."isAdhocContainer" = true) as container_agreements,
  COUNT(*) as total_records
FROM "PerformanceAgreement" pa 
JOIN "User" u ON pa."userId" = u.id 
WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
GROUP BY u.email, u."firstName", u."lastName";

-- List all non-container agreements for the user
SELECT 
  pa.id,
  pa.title,
  LEFT(pa."customAction", 50) as action_preview,
  pa."createdAt",
  pa."performancePeriodId",
  pp.name as period_name
FROM "PerformanceAgreement" pa 
JOIN "User" u ON pa."userId" = u.id 
LEFT JOIN "PerformancePeriod" pp ON pa."performancePeriodId" = pp.id
WHERE LOWER(u.email) = LOWER('AFanuel@nsa.org.na')
  AND pa."isAdhocContainer" = false
ORDER BY pa."createdAt" ASC;

-- Check performance periods
SELECT id, name, "isActive", "startDate", "endDate" 
FROM "PerformancePeriod" 
ORDER BY "createdAt" DESC;
