/**
 * Delete Users Without Employee Role
 * Removes all users who don't have the 'employee' role assigned
 * Keeps only users with the 'employee' role
 * Run with: node delete-users-without-employee-role.js
 */

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

async function deleteUsersWithoutEmployeeRole() {
  const client = new Client({
    connectionString: DATABASE_URL
  })

  try {
    console.log('')
    console.log('🚨 DELETE USERS WITHOUT EMPLOYEE ROLE')
    console.log('='.repeat(60))
    console.log('This will DELETE all users who do NOT have employee role')
    console.log('Users with employee role will be PRESERVED')
    console.log('='.repeat(60))
    console.log('')

    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')
    console.log('')

    // Get the employee role ID
    const employeeRoleResult = await client.query(
      'SELECT id FROM "Role" WHERE name = $1',
      ['employee']
    )
    
    if (employeeRoleResult.rows.length === 0) {
      console.log('❌ No employee role found in database. Cannot proceed.')
      return
    }
    
    const employeeRoleId = employeeRoleResult.rows[0].id
    console.log(`Found employee role ID: ${employeeRoleId}`)
    console.log('')

    // Get count of users WITH employee role
    const employeeCountResult = await client.query(
      `SELECT COUNT(DISTINCT u.id) 
       FROM "User" u
       INNER JOIN "UserRole" ur ON u.id = ur."userId"
       WHERE ur."roleId" = $1`,
      [employeeRoleId]
    )
    const employeeCount = parseInt(employeeCountResult.rows[0].count)

    // Get count of users WITHOUT employee role
    const nonEmployeeCountResult = await client.query(
      `SELECT COUNT(*) 
       FROM "User" u
       WHERE NOT EXISTS (
         SELECT 1 FROM "UserRole" ur 
         WHERE ur."userId" = u.id AND ur."roleId" = $1
       )`,
      [employeeRoleId]
    )
    const nonEmployeeCount = parseInt(nonEmployeeCountResult.rows[0].count)

    // Get total user count
    const totalUsersResult = await client.query('SELECT COUNT(*) FROM "User"')
    const totalUsers = parseInt(totalUsersResult.rows[0].count)

    console.log('📊 Current user counts:')
    console.log(`  Users WITH employee role (will be kept): ${employeeCount}`)
    console.log(`  Users WITHOUT employee role (will be deleted): ${nonEmployeeCount}`)
    console.log(`  Total users: ${totalUsers}`)
    console.log('')

    if (nonEmployeeCount === 0) {
      console.log('✅ No users without employee role found. Nothing to delete.')
      return
    }

    // Get list of users WITHOUT employee role for logging
    const nonEmployeeUsersResult = await client.query(
      `SELECT u.id, u.email, u."firstName", u."lastName"
       FROM "User" u
       WHERE NOT EXISTS (
         SELECT 1 FROM "UserRole" ur 
         WHERE ur."userId" = u.id AND ur."roleId" = $1
       )`,
      [employeeRoleId]
    )
    const nonEmployeeUsers = nonEmployeeUsersResult.rows

    console.log('👥 Users WITHOUT employee role (will be deleted):')
    nonEmployeeUsers.forEach(user => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'
      console.log(`  - ${user.email} (${name})`)
    })
    console.log('')

    console.log('🗑️  Starting deletion process...')
    console.log('')

    await client.query('BEGIN')

    // Delete users without employee role (will cascade to all related data)
    console.log('  [1/1] Deleting users without employee role (will cascade to all related data)...')
    const deleteResult = await client.query(
      `DELETE FROM "User" 
       WHERE id IN (
         SELECT u.id 
         FROM "User" u
         WHERE NOT EXISTS (
           SELECT 1 FROM "UserRole" ur 
           WHERE ur."userId" = u.id AND ur."roleId" = $1
         )
       )`,
      [employeeRoleId]
    )
    
    console.log(`  ✅ Deleted ${deleteResult.rowCount} users`)

    await client.query('COMMIT')
    
    console.log('')
    console.log('✅ Deletion complete!')
    console.log('')

    // Verify deletion
    console.log('📊 Verifying deletion:')
    const afterNonEmployeeCount = await client.query(
      `SELECT COUNT(*) 
       FROM "User" u
       WHERE NOT EXISTS (
         SELECT 1 FROM "UserRole" ur 
         WHERE ur."userId" = u.id AND ur."roleId" = $1
       )`,
      [employeeRoleId]
    )
    const afterTotalCount = await client.query('SELECT COUNT(*) FROM "User"')
    
    console.log(`  Users without employee role remaining: ${afterNonEmployeeCount.rows[0].count}`)
    console.log(`  Total users remaining: ${afterTotalCount.rows[0].count}`)
    console.log('')

    // Show remaining users
    const remainingUsers = await client.query(
      `SELECT u.email, u."firstName", u."lastName", r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON u.id = ur."userId"
       LEFT JOIN "Role" r ON ur."roleId" = r.id
       ORDER BY u.email`
    )
    
    console.log('📊 Remaining users:')
    remainingUsers.rows.forEach(user => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'
      console.log(`  ${user.email} (${name}) - Role: ${user.role || 'NO ROLE'}`)
    })
    console.log('')

    if (parseInt(afterNonEmployeeCount.rows[0].count) === 0) {
      console.log('✅ SUCCESS: All users without employee role have been deleted!')
      console.log(`✅ ${afterTotalCount.rows[0].count} users with employee role remain.`)
    } else {
      console.log('⚠️  WARNING: Some users without employee role remain. Please check manually.')
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
deleteUsersWithoutEmployeeRole()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
