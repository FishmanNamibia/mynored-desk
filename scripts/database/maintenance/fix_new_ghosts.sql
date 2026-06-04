-- Fix new ghost accounts created after the 2026-02-20 cleanup.
-- NEW GHOST: Henok new ghost  5b1453fd (Himmanuel@nsa.org.na, created 2026-02-27)
-- CANONICAL: Henok canonical  8323e773 (himmanuel@nsa.org.na, created 2026-02-20)
-- NEW GHOST: Uulenga new ghost 04244184 (suulenga@nsa.org.na,  created 2026-02-27)
-- CANONICAL: Uulenga canonical 1fc44f31 (SUulenga@nsa.org.na,  created 2026-02-11)

BEGIN;

-- ============================================================
-- A. HENOK new ghost → canonical
-- ============================================================

-- Copy adGuid from new ghost to canonical (if canonical doesn't already have it)
UPDATE "User"
SET "adGuid" = (SELECT "adGuid" FROM "User" WHERE id = '5b1453fd-1d22-4d89-916a-8fb6e339128b')
WHERE id = '8323e773-cdf0-4867-8738-038e1fd840e4'
  AND "adGuid" IS NULL;

-- Re-point any agreements owned by new ghost → canonical
UPDATE "PerformanceAgreement"
SET "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "userId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- Re-point supervisorId references
UPDATE "PerformanceAgreement"
SET "supervisorId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "supervisorId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- Re-point managerId on User records
UPDATE "User"
SET "managerId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "managerId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- Re-point notifications
UPDATE "PmsNotification"
SET "senderId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "senderId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

UPDATE "PmsNotification"
SET "receiverId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "receiverId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- Remove UserRoles for new ghost
DELETE FROM "UserRole" WHERE "userId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- Delete new ghost
DELETE FROM "User" WHERE id = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- ============================================================
-- B. UULENGA new ghost → canonical
-- ============================================================

-- Copy adGuid from new ghost to canonical
UPDATE "User"
SET "adGuid" = (SELECT "adGuid" FROM "User" WHERE id = '04244184-a035-4c36-9441-1e1bfe985598')
WHERE id = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
  AND "adGuid" IS NULL;

-- Re-point any agreements owned by new ghost → canonical
UPDATE "PerformanceAgreement"
SET "userId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "userId" = '04244184-a035-4c36-9441-1e1bfe985598';

-- Re-point supervisorId references
UPDATE "PerformanceAgreement"
SET "supervisorId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "supervisorId" = '04244184-a035-4c36-9441-1e1bfe985598';

-- Re-point managerId on User records
UPDATE "User"
SET "managerId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "managerId" = '04244184-a035-4c36-9441-1e1bfe985598';

-- Re-point notifications
UPDATE "PmsNotification"
SET "senderId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "senderId" = '04244184-a035-4c36-9441-1e1bfe985598';

UPDATE "PmsNotification"
SET "receiverId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "receiverId" = '04244184-a035-4c36-9441-1e1bfe985598';

-- Remove UserRoles for new ghost
DELETE FROM "UserRole" WHERE "userId" = '04244184-a035-4c36-9441-1e1bfe985598';

-- Delete new ghost
DELETE FROM "User" WHERE id = '04244184-a035-4c36-9441-1e1bfe985598';

-- ============================================================
-- Verify: confirm zero duplicate email pairs remain
-- ============================================================
SELECT LOWER(email) AS normalized_email, COUNT(*) AS cnt
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

COMMIT;
