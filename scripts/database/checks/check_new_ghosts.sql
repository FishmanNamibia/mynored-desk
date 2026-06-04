-- Find any users sharing the same email (case-insensitive) -- indicates new ghost accounts created after the cleanup
SELECT
  LOWER(email) AS normalized_email,
  COUNT(*) AS account_count,
  STRING_AGG(id || ' | ' || email || ' | ' || COALESCE("jobTitle",'no-title') || ' | created:' || "createdAt"::text, E'\n') AS accounts
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY account_count DESC;
