-- Add audit category to user's task weight configuration
UPDATE "UserTaskWeight" 
SET categories = categories::jsonb || '[{"id": "audit", "name": "Audit Tasks", "weight": 10}]'::jsonb 
WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'THC@nsa.org.na') 
  AND NOT (categories::jsonb @> '[{"id": "audit"}]'::jsonb);

-- Verify the update
SELECT u.email, utw.categories 
FROM "UserTaskWeight" utw
JOIN "User" u ON u.id = utw."userId"
WHERE u.email = 'THC@nsa.org.na';
