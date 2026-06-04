-- Fix new ghost accounts (adGuid already on canonical — skip that step, just re-point and delete)
-- NEW GHOST: Henok   5b1453fd (Himmanuel@nsa.org.na) → canonical 8323e773 (himmanuel@nsa.org.na)
-- NEW GHOST: Uulenga 04244184 (suulenga@nsa.org.na)  → canonical 1fc44f31 (SUulenga@nsa.org.na)

BEGIN;

-- ============================================================
-- A. HENOK new ghost → canonical
-- ============================================================

UPDATE "PerformanceAgreement"
SET "userId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "userId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

UPDATE "PerformanceAgreement"
SET "supervisorId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "supervisorId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

UPDATE "User"
SET "managerId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "managerId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

UPDATE "PmsNotification"
SET "senderId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "senderId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

UPDATE "PmsNotification"
SET "receiverId" = '8323e773-cdf0-4867-8738-038e1fd840e4'
WHERE "receiverId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

DELETE FROM "UserRole" WHERE "userId" = '5b1453fd-1d22-4d89-916a-8fb6e339128b';
DELETE FROM "User"     WHERE id = '5b1453fd-1d22-4d89-916a-8fb6e339128b';

-- ============================================================
-- B. UULENGA new ghost → canonical
-- ============================================================

UPDATE "PerformanceAgreement"
SET "userId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "userId" = '04244184-a035-4c36-9441-1e1bfe985598';

UPDATE "PerformanceAgreement"
SET "supervisorId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "supervisorId" = '04244184-a035-4c36-9441-1e1bfe985598';

UPDATE "User"
SET "managerId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "managerId" = '04244184-a035-4c36-9441-1e1bfe985598';

UPDATE "PmsNotification"
SET "senderId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "senderId" = '04244184-a035-4c36-9441-1e1bfe985598';

UPDATE "PmsNotification"
SET "receiverId" = '1fc44f31-fd32-4feb-a6cc-e199814996e0'
WHERE "receiverId" = '04244184-a035-4c36-9441-1e1bfe985598';

DELETE FROM "UserRole" WHERE "userId" = '04244184-a035-4c36-9441-1e1bfe985598';
DELETE FROM "User"     WHERE id = '04244184-a035-4c36-9441-1e1bfe985598';

-- ============================================================
-- Verify: zero duplicate email pairs should remain
-- ============================================================
SELECT LOWER(email) AS normalized_email, COUNT(*) AS cnt
FROM "User"
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

COMMIT;
