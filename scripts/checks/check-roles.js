/**
 * Check what roles exist in the database
 */

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL

async function checkRoles() {
  const client = new Client({
    connectionString: DATABASE_URL
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('✅ Connected!')
    console.log('')

    // Check all roles
    console.log('📊 All roles in database:')
    const rolesResult = await client.query('SELECT * FROM "Role" ORDER BY name')
    rolesResult.rows.forEach(role => {
      console.log(`  - ${role.name} (ID: ${role.id})`)
    })
    console.log('')

    // Check users and their roles
    console.log('📊 Users and their roles:')
    const usersWithRoles = await client.query(
      `SELECT u.email, u."firstName", u."lastName", r.name as role
       FROM "User" u
       LEFT JOIN "UserRole" ur ON u.id = ur."userId"
       LEFT JOIN "Role" r ON ur."roleId" = r.id
       ORDER BY u.email`
    )
    
    usersWithRoles.rows.forEach(user => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name'
      console.log(`  ${user.email} (${name}) - Role: ${user.role || 'NO ROLE'}`)
    })
    console.log('')

    // Count users by role
    console.log('📊 User count by role:')
    const roleCount = await client.query(
      `SELECT r.name as role, COUNT(u.id) as count
       FROM "Role" r
       LEFT JOIN "UserRole" ur ON r.id = ur."roleId"
       LEFT JOIN "User" u ON ur."userId" = u.id
       GROUP BY r.name
       ORDER BY count DESC`
    )
    roleCount.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`)
    })
    console.log('')

    // Check users without any role
    const usersWithoutRole = await client.query(
      `SELECT COUNT(*) 
       FROM "User" u
       WHERE NOT EXISTS (
         SELECT 1 FROM "UserRole" ur WHERE ur."userId" = u.id
       )`
    )
    console.log(`📊 Users without any role: ${usersWithoutRole.rows[0].count}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await client.end()
    console.log('')
    console.log('Database connection closed.')
  }
}

checkRoles()
  .then(() => {
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
