const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'apps/web/app/(protected)/dashboard/performance/api');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file === 'route.ts') {
      results.push(filePath);
    }
  }
  return results;
}

const files = walkDir(baseDir);
let fixedCount = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Only process files that have both getAuthenticatedUser and const user = await prisma.user.find
  if (!content.includes('getAuthenticatedUser')) continue;
  if (!content.includes('const user = await prisma.user.find')) continue;
  
  const original = content;
  
  // Replace "const user = await prisma.user.find" with "const dbUser = await prisma.user.find"
  content = content.replace(/const user = await prisma\.user\.find/g, 'const dbUser = await prisma.user.find');
  
  // Now we need to fix references to dbUser that were previously "user" but referred to the prisma result.
  // The tricky part: some "user.xxx" references are from getAuthenticatedUser (should stay as user.xxx)
  // and some are from the prisma result (should become dbUser.xxx).
  // 
  // Strategy: After each "const dbUser = ..." block, references like:
  //   if (!user) -> if (!dbUser)  (when checking if prisma result exists)
  //   user.role -> dbUser.role
  //   user.department -> dbUser.department
  //   user.profilePicture -> dbUser.profilePicture
  //   user.signatureUrl -> dbUser.signatureUrl
  //   user.supervisorId -> dbUser.supervisorId (when from prisma result)
  //   user.name -> dbUser.name (when from prisma result)
  //   user.divisionId -> dbUser.divisionId
  //   user.departmentId -> dbUser.departmentId
  //
  // But user.id should stay as user.id (from auth) in most cases.
  // user.email should stay as user.email (from auth).
  //
  // The safest approach: find each function block, and within it, after "const dbUser",
  // replace standalone "user." references that access DB-specific fields.
  
  // For files where the prisma lookup is `where: { id: user.id }` (looking up the CURRENT user),
  // the dbUser has DB fields like .role, .department, .profilePicture, .signatureUrl, .name
  // For files where the prisma lookup is `where: { id: params.id }` (looking up ANOTHER user),
  // the dbUser is a different user entirely, and all refs to it should be dbUser.
  
  // Let's handle both patterns:
  
  // Pattern 1: After "const dbUser = await prisma.user.find...", fix "if (!user)" to "if (!dbUser)"
  // We do this by finding blocks between "const dbUser" and the next "const { user }" or end of function
  
  // Simple approach: replace known patterns that ONLY come from DB results
  // These fields don't exist on AuthUser: role (it's roles[]), department, profilePicture, signatureUrl, 
  // supervisorId, divisionId, departmentId, isApproved, name (it's displayName)
  
  // Replace "if (!user) {" that comes after "const dbUser" - use a function-aware approach
  const lines = content.split('\n');
  let inDbUserScope = false;
  let braceDepth = 0;
  let dbUserBraceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track if we just assigned dbUser
    if (line.includes('const dbUser = await prisma.user.find')) {
      inDbUserScope = true;
      dbUserBraceDepth = braceDepth;
    }
    
    // Track brace depth
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    
    // If we encounter another "const { user }" we're in a new function scope
    if (line.includes('const { user } = await getAuthenticatedUser')) {
      inDbUserScope = false;
    }
    
    if (inDbUserScope) {
      // Replace DB-specific field accesses
      // "if (!user)" -> "if (!dbUser)" (null check on prisma result)
      lines[i] = lines[i].replace(/if \(!user\)/, 'if (!dbUser)');
      lines[i] = lines[i].replace(/if \(!user \|\|/, 'if (!dbUser ||');
      
      // DB-only fields (not on AuthUser)
      lines[i] = lines[i].replace(/\buser\.role\b/g, 'dbUser.role');
      lines[i] = lines[i].replace(/\buser\.department\b/g, 'dbUser.department');
      lines[i] = lines[i].replace(/\buser\.profilePicture\b/g, 'dbUser.profilePicture');
      lines[i] = lines[i].replace(/\buser\.signatureUrl\b/g, 'dbUser.signatureUrl');
      lines[i] = lines[i].replace(/\buser\.supervisorId\b/g, 'dbUser.supervisorId');
      lines[i] = lines[i].replace(/\buser\.divisionId\b/g, 'dbUser.divisionId');
      lines[i] = lines[i].replace(/\buser\.departmentId\b/g, 'dbUser.departmentId');
      lines[i] = lines[i].replace(/\buser\.isApproved\b/g, 'dbUser.isApproved');
      lines[i] = lines[i].replace(/\buser\.name\b/g, 'dbUser.name');
      lines[i] = lines[i].replace(/\buser\.userDepartments\b/g, 'dbUser.userDepartments');
      lines[i] = lines[i].replace(/\buser\.division\b/g, 'dbUser.division');
      lines[i] = lines[i].replace(/\buser\.supervisor\b/g, 'dbUser.supervisor');
      lines[i] = lines[i].replace(/\buser\.createdAt\b/g, 'dbUser.createdAt');
      lines[i] = lines[i].replace(/\buser\.password\b/g, 'dbUser.password');
      
      // For params.id lookups (looking up another user), also fix user.id refs to dbUser
      // But only when the prisma lookup was NOT { id: user.id }
      // We'll handle this case separately below
    }
  }
  
  content = lines.join('\n');
  
  // Special case: files where prisma looks up params.id (a different user)
  // In these files, ALL references after dbUser should use dbUser
  // Detect: "const dbUser = await prisma.user.findUnique({\n      where: { id: params.id }"
  if (content.includes('where: { id: params.id }')) {
    // In these files, the dbUser is a DIFFERENT user, so dbUser.id, dbUser.email etc are all valid
    // But we already renamed the variable, so just fix any remaining "user.xxx" that should be "dbUser.xxx"
    // after the dbUser assignment
    // This is handled by the line-by-line approach above
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(baseDir, filePath);
    console.log('Fixed:', rel);
    fixedCount++;
  }
}

console.log(`\nDone! Fixed ${fixedCount} files.`);
