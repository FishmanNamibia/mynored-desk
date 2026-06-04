const fs = require('fs');
const path = require('path');

// Directories to scan
const dirs = [
  path.join(__dirname, 'apps/web/app/(protected)/dashboard/performance'),
  path.join(__dirname, 'apps/web/components/performance'),
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      // Skip api directories - those are the backend routes, not frontend
      if (file === 'api') continue;
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

// Map of /api/ paths to their /dashboard/performance/api/ equivalents
// We need to be careful: only rewrite paths that have corresponding routes under /dashboard/performance/api/
const pathMappings = [
  // Performance period
  ["/api/performance-period", "/dashboard/performance/api/performance-period"],
  ["/api/performance-periods", "/dashboard/performance/api/performance-periods"],
  // Performance agreements
  ["/api/performance-agreements", "/dashboard/performance/api/performance-agreements"],
  // Targets
  ["/api/targets", "/dashboard/performance/api/targets"],
  // Users
  ["/api/users", "/dashboard/performance/api/users"],
  // Notifications
  ["/api/notifications", "/dashboard/performance/api/notifications"],
  // Goals
  ["/api/goals", "/dashboard/performance/api/goals"],
  // Objectives
  ["/api/objectives", "/dashboard/performance/api/objectives"],
  // Initiatives
  ["/api/initiatives", "/dashboard/performance/api/initiatives"],
  // Departments
  ["/api/departments", "/dashboard/performance/api/departments"],
  // Divisions
  ["/api/divisions", "/dashboard/performance/api/divisions"],
  // Roles
  ["/api/roles", "/dashboard/performance/api/roles"],
  // Me
  ["/api/me", "/dashboard/performance/api/me"],
  // Dashboard
  ["/api/dashboard", "/dashboard/performance/api/dashboard"],
  // 360 rating
  ["/api/360-rating", "/dashboard/performance/api/360-rating"],
  // Adhoc tasks
  ["/api/adhoc-tasks", "/dashboard/performance/api/adhoc-tasks"],
  // Independent plans
  ["/api/independent-plans", "/dashboard/performance/api/independent-plans"],
  // Projects
  ["/api/projects", "/dashboard/performance/api/projects"],
  // Upload
  ["/api/upload", "/dashboard/performance/api/upload"],
  // User (singular - profile picture, signature, etc)
  ["/api/user/", "/dashboard/performance/api/user/"],
  // Performance management
  ["/api/performance-management", "/dashboard/performance/api/performance-management"],
  // Performance reviews
  ["/api/performance-reviews", "/dashboard/performance/api/performance-reviews"],
  // Questionnaires
  ["/api/questionnaires", "/dashboard/performance/api/questionnaires"],
  // Reports
  ["/api/reports", "/dashboard/performance/api/reports"],
  // Executives
  ["/api/executives", "/dashboard/performance/api/executives"],
  // Audit logs
  ["/api/audit-logs", "/dashboard/performance/api/audit-logs"],
  // AI chat
  ["/api/ai/chat", "/dashboard/performance/api/ai/chat"],
  // Help assistant
  ["/api/help-assistant", "/dashboard/performance/api/help-assistant"],
  // Fix users
  ["/api/fix-users", "/dashboard/performance/api/fix-users"],
  // Health
  ["/api/health", "/dashboard/performance/api/health"],
];

let totalFixed = 0;
let filesFixed = 0;

for (const dir of dirs) {
  const files = walkDir(dir);
  
  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Only process files that have fetch('/api/ calls
    if (!content.includes("'/api/") && !content.includes('"/api/') && !content.includes('`/api/')) continue;
    
    let fileChanges = 0;
    
    for (const [oldPath, newPath] of pathMappings) {
      // Replace in single quotes
      const singleQuoteOld = `'${oldPath}`;
      const singleQuoteNew = `'${newPath}`;
      while (content.includes(singleQuoteOld)) {
        content = content.replace(singleQuoteOld, singleQuoteNew);
        fileChanges++;
      }
      
      // Replace in double quotes
      const doubleQuoteOld = `"${oldPath}`;
      const doubleQuoteNew = `"${newPath}`;
      while (content.includes(doubleQuoteOld)) {
        content = content.replace(doubleQuoteOld, doubleQuoteNew);
        fileChanges++;
      }
      
      // Replace in backticks (template literals)
      const backtickOld = `\`${oldPath}`;
      const backtickNew = `\`${newPath}`;
      while (content.includes(backtickOld)) {
        content = content.replace(backtickOld, backtickNew);
        fileChanges++;
      }
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      const rel = path.relative(path.join(__dirname, 'apps/web'), filePath);
      console.log(`Fixed ${fileChanges} paths in: ${rel}`);
      totalFixed += fileChanges;
      filesFixed++;
    }
  }
}

console.log(`\nDone! Fixed ${totalFixed} path references across ${filesFixed} files.`);
