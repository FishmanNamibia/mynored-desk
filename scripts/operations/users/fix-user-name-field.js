/**
 * Fix all `name: true` references in User select/include statements.
 * The User model has firstName/lastName, NOT name.
 * 
 * We need to distinguish:
 * - VALID: department: { select: { name: true } } - Department HAS name
 * - VALID: division: { select: { name: true } } - Division HAS name
 * - INVALID: select: { id: true, name: true, email: true } on User - needs firstName/lastName
 * - INVALID: dbUser.name - needs `${dbUser.firstName} ${dbUser.lastName}`
 * 
 * Strategy: 
 * 1. Replace `select: { id: true, name: true, email: true }` patterns (User selects)
 * 2. Replace `name: true,\n            jobTitle:` patterns (User selects with jobTitle)
 * 3. Replace `name: true,\n            email:` patterns (User selects)
 * 4. Replace `dbUser.name` with template literal
 * 5. Leave department/division name: true alone
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'apps/web/app/(protected)/dashboard/performance/api');

function walkDir(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        results = results.concat(walkDir(filePath));
      } else if (file.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  } catch (e) {}
  return results;
}

let totalFixed = 0;
let filesFixed = 0;

const files = walkDir(apiDir);

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanges = 0;

  // Pattern 1: `select: { id: true, name: true, email: true }` → User select inline
  // This is clearly a User select (has id + email)
  const p1 = /select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*email:\s*true\s*\}/g;
  content = content.replace(p1, (match) => {
    fileChanges++;
    return match.replace('name: true,', 'firstName: true, lastName: true,');
  });

  // Pattern 2: `select: { id: true, name: true, email: true, role: true }` → User select
  const p2 = /select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*email:\s*true,\s*role:\s*true\s*\}/g;
  content = content.replace(p2, (match) => {
    fileChanges++;
    return match.replace('name: true,', 'firstName: true, lastName: true,');
  });

  // Pattern 3: `select: { name: true }` when it's a User context (like approve-individual)
  // We need to be careful - this could be department/division. Check surrounding context.
  // Skip this pattern - too risky without context

  // Pattern 4: Multi-line User selects where name is followed by jobTitle, position, email, role
  // These are clearly User fields
  // name: true,\n            jobTitle:
  content = content.replace(/(\s+)name:\s*true,(\s+)jobTitle:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}jobTitle:`;
  });

  // name: true,\n            email:  (in User context - has id before it)
  content = content.replace(/(\s+)name:\s*true,(\s+)email:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}email:`;
  });

  // name: true,\n            role:
  content = content.replace(/(\s+)name:\s*true,(\s+)role:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}role:`;
  });

  // name: true,\n            position:
  content = content.replace(/(\s+)name:\s*true,(\s+)position:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}position:`;
  });

  // name: true,\n            signatureUrl:
  content = content.replace(/(\s+)name:\s*true,(\s+)signatureUrl:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}signatureUrl:`;
  });

  // name: true,\n            isApproved:
  content = content.replace(/(\s+)name:\s*true,(\s+)isApproved:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}isApproved:`;
  });

  // name: true,\n            department:
  // This is a User select that includes department relation
  content = content.replace(/(\s+)name:\s*true,(\s+)department:/g, (match, ws1, ws2) => {
    fileChanges++;
    return `${ws1}firstName: true,${ws1}lastName: true,${ws2}department:`;
  });

  // name: true\n          } (end of select, name is last field in User select)
  // Only if preceded by id: true or email: true on previous lines
  // This is tricky - let's handle specific patterns

  // Pattern for `select: { supervisorId: true, name: true }` - User select
  content = content.replace(/supervisorId:\s*true,\s*name:\s*true/g, (match) => {
    fileChanges++;
    return match.replace('name: true', 'firstName: true, lastName: true');
  });

  // Pattern for `select: { name: true }` in approve-individual (User context)
  // We'll handle this case-by-case in specific files

  // Pattern 5: dbUser.name → `${dbUser.firstName} ${dbUser.lastName}`
  content = content.replace(/dbUser\.name\b/g, (match) => {
    fileChanges++;
    return '`${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim()';
  });

  // Pattern 6: user.name in notification contexts (where user is from prisma, not auth)
  // Skip - too risky without more context

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(apiDir, filePath);
    console.log(`Fixed ${fileChanges} in: ${rel}`);
    totalFixed += fileChanges;
    filesFixed++;
  }
}

console.log(`\nDone! Fixed ${totalFixed} references across ${filesFixed} files.`);

// Now check remaining name: true that might still be User-context
console.log('\n=== Remaining name: true references to review ===');
for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.match(/\bname:\s*true\b/) && !line.includes('//')) {
      // Check if it's in a department/division context
      const prevLines = lines.slice(Math.max(0, i - 5), i).join('\n');
      const isDeptOrDiv = prevLines.match(/department|division|goal|objective|initiative|category/i);
      if (!isDeptOrDiv) {
        const rel = path.relative(apiDir, filePath);
        console.log(`  ${rel}:${i + 1}: ${line.trim()}`);
      }
    }
  });
}
