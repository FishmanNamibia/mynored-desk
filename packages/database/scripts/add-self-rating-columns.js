require('dotenv').config()
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  
  try {
    // Add selfRating column
    await pool.query(`
      ALTER TABLE "PerformanceAgreement" 
      ADD COLUMN IF NOT EXISTS "selfRating" INTEGER
    `)
    console.log('✅ Added selfRating column')

    // Add selfRatedAt column
    await pool.query(`
      ALTER TABLE "PerformanceAgreement" 
      ADD COLUMN IF NOT EXISTS "selfRatedAt" TIMESTAMP(3)
    `)
    console.log('✅ Added selfRatedAt column')

    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration error:', error.message)
  } finally {
    await pool.end()
  }
}

main()
