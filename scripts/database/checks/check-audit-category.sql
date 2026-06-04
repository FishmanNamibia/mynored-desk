SELECT categories::text FROM "UserTaskWeight" WHERE "userId" IN (SELECT id FROM "User" WHERE email = 'THC@nsa.org.na');
