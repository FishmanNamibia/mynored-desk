/**
 * Delete Users with STAFF Role
 * Removes all users with role='STAFF' and their related data
 * Keeps users with role='EMPLOYEE' and other roles
 * Run with: node delete-staff-users.js
 */

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

async function deleteStaffUsers() {
  const client = new Client({
    connectionString: DATABASE_URL
  })

  try {
    console.log('')
    console.log('🚨 DELETE STAFF USERS')
    console.log('='.repeat(60))
    console.log('This will DELETE all users with role = STAFF')
    console.log('Users with EMPLOYEE and other roles will be PRESERVED')
    console.log('='.repeat(60))
    console.log('')

    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')
    console.log('')

    // First, get the STAFF role ID
    const staffRoleResult = await client.query(
      'SELECT id FROM "Role" WHERE name = $1',
      ['STAFF']
    )
    
    if (staffRoleResult.rows.length === 0) {
      console.log('✅ No STAFF role found in database. Nothing to delete.')
      return
    }
    
    const staffRoleId = staffRoleResult.rows[0].id
    console.log(`Found STAFF role ID: ${staffRoleId}`)
    console.log('')

    // Get count of users with STAFF role
    const staffCountResult = await client.query(
      `SELECT COUNT(DISTINCT u.id) 
       FROM "User" u
       INNER JOIN "UserRole" ur ON u.id = ur."userId"
       WHERE ur."roleId" = $1`,
      [staffRoleId]
    )
    const staffCount = parseInt(staffCountResult.rows[0].count)

    // Get total user count
    const totalUsersResult = await client.query('SELECT COUNT(*) FROM "User"')
    const totalUsers = parseInt(totalUsersResult.rows[0].count)
    const nonStaffCount = totalUsers - staffCount

    console.log('📊 Current user counts:')
    console.log(`  STAFF users (will be deleted): ${staffCount}`)
    console.log(`  Non-STAFF users (will be kept): ${nonStaffCount}`)
    console.log(`  Total users: ${totalUsers}`)
    console.log('')

    if (staffCount === 0) {
      console.log('✅ No STAFF users found. Nothing to delete.')
      return
    }

    // Get list of STAFF users for logging
    const staffUsersResult = await client.query(
      `SELECT u.id, u.email, u."firstName", u."lastName"
       FROM "User" u
       INNER JOIN "UserRole" ur ON u.id = ur."userId"
       WHERE ur."roleId" = $1`,
      [staffRoleId]
    )
    const staffUsers = staffUsersResult.rows

    console.log('👥 STAFF users to be deleted:')
    staffUsers.forEach(user => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'
      console.log(`  - ${user.email} (${name})`)
    })
    console.log('')

    console.log('🗑️  Starting deletion process...')
    console.log('')

    await client.query('BEGIN')

    // Delete users with STAFF role (will cascade to all related data due to foreign key constraints)
    console.log('  [1/1] Deleting STAFF users (will cascade to all related data)...')
    const deleteResult = await client.query(
      `DELETE FROM "User" 
       WHERE id IN (
         SELECT u.id 
         FROM "User" u
         INNER JOIN "UserRole" ur ON u.id = ur."userId"
         WHERE ur."roleId" = $1
       )`,
      [staffRoleId]
    )
    
    console.log(`  ✅ Deleted ${deleteResult.rowCount} STAFF users`)

    await client.query('COMMIT')
    
    console.log('')
    console.log('✅ Deletion complete!')
    console.log('')

    // Verify deletion
    console.log('📊 Verifying deletion:')
    const afterStaffCount = await client.query(
      `SELECT COUNT(DISTINCT u.id) 
       FROM "User" u
       INNER JOIN "UserRole" ur ON u.id = ur."userId"
       WHERE ur."roleId" = $1`,
      [staffRoleId]
    )
    const afterTotalCount = await client.query('SELECT COUNT(*) FROM "User"')
    
    console.log(`  STAFF users remaining: ${afterStaffCount.rows[0].count}`)
    console.log(`  Total users remaining: ${afterTotalCount.rows[0].count}`)
    console.log('')

    // Show remaining users by role
    const roleDistribution = await client.query(
      `SELECT r.name as role, COUNT(DISTINCT u.id) as count
       FROM "User" u
       INNER JOIN "UserRole" ur ON u.id = ur."userId"
       INNER JOIN "Role" r ON ur."roleId" = r.id
       GROUP BY r.name
       ORDER BY count DESC`
    )
    
    console.log('📊 Remaining users by role:')
    roleDistribution.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`)
    })
    console.log('')

    if (parseInt(afterStaffCount.rows[0].count) === 0) {
      console.log('✅ SUCCESS: All STAFF users have been deleted!')
      console.log(`✅ ${afterTotalCount.rows[0].count} users with other roles remain.`)
    } else {
      console.log('⚠️  WARNING: Some STAFF users remain. Please check manually.')
    }

  } catch (error) {
    console.error('❌ Error during deletion:', error)
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
    console.log('')
    console.log('Database connection closed.')
  }
}

// Execute
deleteStaffUsers()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
