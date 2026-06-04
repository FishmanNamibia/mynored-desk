// Run with: node -e "require('./scripts/add-pending-categories.js')"
// Or directly: npx tsx scripts/add-pending-categories.ts
const { execSync } = require('child_process')

// Read DATABASE_URL from .env
const fs = require('fs')
const path = require('path')

// Try to find .env file
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  const envPaths = [
    path.join(__dirname, '..', '..', '.env'),
    path.join(__dirname, '..', '.env'),
  ]
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8')
      const match = content.match(/DATABASE_URL=["']?([^"'\n]+)/)
      if (match) {
        dbUrl = match[1]
        break
      }
    }
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found')
  process.exit(1)
}

// Parse the URL to extract connection details
const url = new URL(dbUrl)
const host = url.hostname
const port = url.port || '5432'
const user = url.username
const password = decodeURIComponent(url.password)
const database = url.pathname.slice(1).split('?')[0]

console.log(`Connecting to ${host}:${port}/${database} as ${user}`)

// Use node-postgres or just prisma migrate
// Since we can't rely on psql, let's create a simple SQL migration file and use prisma db execute
const sql = 'ALTER TABLE "UserTaskWeight" ADD COLUMN IF NOT EXISTS "pendingCategories" TEXT;'
const sqlFile = '/tmp/add_pending_categories.sql'
fs.writeFileSync(sqlFile, sql)
console.log('SQL file written to', sqlFile)
console.log('Run: cd packages/database && npx prisma db execute --file ' + sqlFile)

