/**
 * Second pass: Fix remaining `name: true` in User-context selects.
 * 
 * User relations that need fixing: supervisor, rater, assignedTo, createdBy, 
 * owner, responsible, user (when it's a User relation)
 * 
 * Valid name fields (DO NOT touch): department, division, cycle, goal, objective,
 * initiative, category, performancePeriod (these models have `name`)
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

// User relation names - these are User model references
const userRelations = [
  'supervisor', 'rater', 'assignedTo', 'createdBy', 'owner', 
  'responsible', 'approvedBy', 'sender', 'receiver', 'actor'
];

let totalFixed = 0;
let filesFixed = 0;

const files = walkDir(apiDir);

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanges = 0;

  // Fix `select: { id: true, name: true }` - this is always a User select (2 fields, id + name)
  // Department/Division selects would typically not have `id` + `name` only
  // But we need to check context. Let's look at the line before for User relation names.
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern: `select: { id: true, name: true }`  (inline)
    if (line.match(/select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}/)) {
      // Check context - look back for User relation
      const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
      const isUserRelation = userRelations.some(rel => context.includes(rel + ':') || context.includes(rel + ' {'));
      
      if (isUserRelation) {
        lines[i] = line.replace(
          /select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}/,
          'select: { id: true, firstName: true, lastName: true }'
        );
        fileChanges++;
      }
    }
    
    // Pattern: `select: { name: true }` (inline, single field) - always User if in User relation context
    if (line.match(/select:\s*\{\s*name:\s*true\s*\}/) && !line.match(/department|division/i)) {
      const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
      const isUserRelation = userRelations.some(rel => context.includes(rel + ':') || context.includes(rel + ' {'));
      
      if (isUserRelation) {
        lines[i] = line.replace(
          /select:\s*\{\s*name:\s*true\s*\}/,
          'select: { firstName: true, lastName: true }'
        );
        fileChanges++;
      }
    }
    
    // Pattern: multiline - `name: true` on its own line in a User select
    // Check if `name: true` is preceded (within 5 lines) by a User relation
    if (line.match(/^\s+name:\s*true,?\s*$/) || line.match(/^\s+name:\s*true\s*$/)) {
      const context = lines.slice(Math.max(0, i - 8), i + 1).join('\n');
      const isUserRelation = userRelations.some(rel => context.includes(rel + ':') || context.includes(rel + ' {'));
      // Also check if it's a User findUnique/findFirst/findMany
      const isUserQuery = context.match(/prisma\.user\./i);
      // Check it's NOT a department/division/cycle context
      const isModelWithName = context.match(/department:|division:|cycle:|goal:|objective:|initiative:|category:|performancePeriod\./i);
      
      if ((isUserRelation || isUserQuery) && !isModelWithName) {
        const indent = line.match(/^(\s+)/)?.[1] || '';
        const hasComma = line.trim().endsWith(',');
        lines[i] = `${indent}firstName: true,\n${indent}lastName: true${hasComma ? ',' : ''}`;
        fileChanges++;
      }
    }
  }
  
  if (fileChanges > 0) {
    content = lines.join('\n');
  }

  // Also fix any remaining `dbUser.name` references
  if (content.includes('dbUser.name')) {
    content = content.replace(/dbUser\.name\b/g, '`${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim()');
    fileChanges++;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(apiDir, filePath);
    console.log(`Fixed ${fileChanges} in: ${rel}`);
    totalFixed += fileChanges;
    filesFixed++;
  }
}

console.log(`\nDone! Fixed ${totalFixed} references across ${filesFixed} files.`);

// Final check
console.log('\n=== Final remaining name: true in potential User contexts ===');
for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.match(/\bname:\s*true\b/) && !line.includes('//')) {
      const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
      const isUserRelation = userRelations.some(rel => context.includes(rel + ':'));
      const isUserQuery = context.match(/prisma\.user\./i);
      if (isUserRelation || isUserQuery) {
        const rel = path.relative(apiDir, filePath);
        console.log(`  STILL USER: ${rel}:${i + 1}: ${line.trim()}`);
        console.log(`    Context: ${lines.slice(Math.max(0, i - 3), i).map(l => l.trim()).join(' | ')}`);
      }
    }
  });
}
