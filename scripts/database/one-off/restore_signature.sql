-- Restore Henok Immanuel's signature URL on the canonical account.
-- The signature file still exists on disk (from the ghost account).
-- We simply update the canonical account to point at that existing file.

UPDATE "User"
SET "signatureUrl" = '/dashboard/performance/api/uploads/signatures/63e921e8-0d3d-4d9a-b268-b1ab86795c76-1771521383369.png'
WHERE id = '8323e773-cdf0-4867-8738-038e1fd840e4';

-- Verify
SELECT id, email, "firstName", "lastName", "signatureUrl", "jobTitle"
FROM "User"
WHERE id = '8323e773-cdf0-4867-8738-038e1fd840e4';
