SELECT id, email, "firstName", "lastName", "signatureUrl", "jobTitle"
FROM "User"
WHERE LOWER(email) IN ('himmanuel@nsa.org.na','suulenga@nsa.org.na','akalunduka@nsa.org.na')
ORDER BY email;
