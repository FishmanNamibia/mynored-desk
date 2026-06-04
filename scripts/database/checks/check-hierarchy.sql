-- Show the IT dept hierarchy: who reports to whom
SELECT
  u.id,
  u.email,
  u."firstName",
  u."lastName",
  u."jobTitle",
  u."managerId",
  m."firstName" AS mgr_first,
  m."lastName" AS mgr_last,
  m."jobTitle" AS mgr_job
FROM "User" u
LEFT JOIN "User" m ON u."managerId" = m.id
WHERE u."departmentName" ILIKE '%IT%'
   OR u."jobTitle" ILIKE '%IT%'
ORDER BY u."jobTitle" NULLS LAST;
