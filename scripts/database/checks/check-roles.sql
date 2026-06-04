-- First check what roles exist
SELECT * FROM "Role";

-- Check the user's current roles
SELECT u.email, u."firstName", u."lastName", u."jobTitle", r.name as role_name 
FROM "User" u 
LEFT JOIN "UserRole" ur ON u.id = ur."userId"
LEFT JOIN "Role" r ON ur."roleId" = r.id
WHERE u.email = 'THC@nsa.org.na';