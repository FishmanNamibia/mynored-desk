/**
 * Direct Database Cleanup Script
 * Uses pg library to connect directly to PostgreSQL
 * Run with: node cleanup-db-direct.js
 */

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

async function cleanupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL
  })

  try {
    console.log('')
    console.log('🚨🚨🚨 CRITICAL WARNING 🚨🚨🚨')
    console.log('='.repeat(60))
    console.log('This will DELETE PERFORMANCE DATA from the database:')
    console.log('  ❌ ALL Performance Agreements')
    console.log('  ❌ ALL Adhoc Tasks')
    console.log('  ❌ ALL 360 Rating data')
    console.log('')
    console.log('  ✅ User Accounts will be PRESERVED')
    console.log('')
    console.log('⚠️  This action CANNOT be undone!')
    console.log('='.repeat(60))
    console.log('')

    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')
    console.log('')

    // Count before deletion
    console.log('📊 Current record counts:')
    const beforeCounts = {}
    
    const tables = [
      'PerformanceAgreement',
      'AdhocTask',
      'Rating360'
    ]

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM "${table}"`)
      beforeCounts[table] = parseInt(result.rows[0].count)
      console.log(`  ${table}: ${beforeCounts[table]}`)
    }
    console.log('')

    console.log('🗑️  Starting deletion process...')
    console.log('')

    // Use TRUNCATE CASCADE to delete performance data only
    await client.query('BEGIN')

    console.log('  [1/2] Truncating 360 Rating tables...')
    await client.query('TRUNCATE TABLE "Rating360Answer", "SubordinateRating360", "PeerRating360", "Rating360", "Rating360Cycle", "Rating360Question", "Rating360Category" CASCADE')
    
    console.log('  [2/2] Truncating Performance tables...')
    await client.query('TRUNCATE TABLE "AdhocTask", "PerformanceAgreement" CASCADE')

    await client.query('COMMIT')
    
    console.log('')
    console.log('✅ Deletion complete!')
    console.log('')

    // Verify deletion
    console.log('📊 Verifying deletion (all should be 0):')
    const afterCounts = {}
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM "${table}"`)
      afterCounts[table] = parseInt(result.rows[0].count)
      console.log(`  ${table}: ${afterCounts[table]}`)
    }
    console.log('')

    const allZero = Object.values(afterCounts).every(count => count === 0)
    if (allZero) {
      console.log('✅ SUCCESS: All data has been deleted!')
      console.log('Users can now sign in fresh with updated AD departments.')
    } else {
      console.log('⚠️  WARNING: Some records remain. Please check manually.')
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
    console.log('')
    console.log('Database connection closed.')
  }
}

// Execute
cleanupDatabase()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
