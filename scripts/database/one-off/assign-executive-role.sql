-- Create Executive role if it doesn't exist
INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
SELECT 
  uuid_generate_v4(),
  'Executive',
  'Executive role for senior management',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE name = 'Executive');

-- Assign Executive role to the HC user
INSERT INTO "UserRole" (id, "userId", "roleId", "assignedAt")
SELECT 
  uuid_generate_v4(),
  u.id,
  r.id,
  NOW()
FROM "User" u, "Role" r
WHERE u.email = 'THC@nsa.org.na' 
  AND r.name = 'Executive'
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur 
    WHERE ur."userId" = u.id AND ur."roleId" = r.id
  );