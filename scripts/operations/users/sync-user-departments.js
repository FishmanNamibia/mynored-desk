/**
 * Sync User Departments from Azure AD
 * Updates all existing users' department information from Azure AD
 * Run with: node sync-user-departments.js
 * Required env vars:
 *   DATABASE_URL
 *   AZURE_TENANT_ID
 *   AZURE_CLIENT_ID
 *   AZURE_CLIENT_SECRET
 */

const { Client } = require('pg')
const fetch = require('node-fetch')

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const DATABASE_URL = requireEnv('DATABASE_URL')

// Azure AD Configuration
const AZURE_TENANT_ID = requireEnv('AZURE_TENANT_ID')
const AZURE_CLIENT_ID = requireEnv('AZURE_CLIENT_ID')
const AZURE_CLIENT_SECRET = requireEnv('AZURE_CLIENT_SECRET')

// Get Azure AD access token using client credentials flow
async function getAccessToken() {
  const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`
  
  const params = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

// Fetch all users from Azure AD
async function fetchAzureADUsers(accessToken) {
  const users = []
  let nextLink = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,companyName'

  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`)
    }

    const data = await response.json()
    users.push(...data.value)
    nextLink = data['@odata.nextLink'] || null
  }

  return users
}

// Fetch manager for a user
async function fetchUserManager(userId, accessToken) {
  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/manager`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const manager = await response.json()
      return manager.mail || manager.userPrincipalName
    }
  } catch (error) {
    // Manager not found or not set
  }
  return null
}

async function syncUserDepartments() {
  const client = new Client({
    connectionString: DATABASE_URL
  })

  try {
    console.log('')
    console.log('🔄 Azure AD Department Sync')
    console.log('='.repeat(60))
    console.log('This will update user departments from Azure AD')
    console.log('='.repeat(60))
    console.log('')

    console.log('Step 1: Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database!')
    console.log('')

    console.log('Step 2: Getting Azure AD access token...')
    const accessToken = await getAccessToken()
    console.log('✅ Access token obtained!')
    console.log('')

    console.log('Step 3: Fetching users from Azure AD...')
    const azureUsers = await fetchAzureADUsers(accessToken)
    console.log(`✅ Found ${azureUsers.length} users in Azure AD`)
    console.log('')

    console.log('Step 4: Fetching existing users from database...')
    const dbUsersResult = await client.query('SELECT id, email FROM "User"')
    const dbUsers = dbUsersResult.rows
    console.log(`✅ Found ${dbUsers.length} users in database`)
    console.log('')

    console.log('Step 5: Syncing department information...')
    console.log('')

    let updated = 0
    let notFound = 0
    let errors = 0

    for (const dbUser of dbUsers) {
      const email = dbUser.email.toLowerCase()
      
      // Find matching Azure AD user
      const azureUser = azureUsers.find(u => 
        (u.mail?.toLowerCase() === email) || 
        (u.userPrincipalName?.toLowerCase() === email)
      )

      if (!azureUser) {
        console.log(`  ⚠️  ${email} - Not found in Azure AD`)
        notFound++
        continue
      }

      try {
        // Fetch manager information
        const managerEmail = await fetchUserManager(azureUser.id, accessToken)
        
        // Find manager in database
        let managerId = null
        if (managerEmail) {
          const managerResult = await client.query(
            'SELECT id FROM "User" WHERE LOWER(email) = $1',
            [managerEmail.toLowerCase()]
          )
          if (managerResult.rows.length > 0) {
            managerId = managerResult.rows[0].id
          }
        }

        // Update user with Azure AD data
        await client.query(
          `UPDATE "User" 
           SET 
             "jobTitle" = $1,
             "departmentName" = $2,
             "divisionName" = $3,
             "companyName" = $4,
             "managerId" = $5
           WHERE id = $6`,
          [
            azureUser.jobTitle || null,
            azureUser.department || null,
            azureUser.officeLocation || azureUser.department || null,
            azureUser.companyName || null,
            managerId,
            dbUser.id
          ]
        )

        console.log(`  ✅ ${email} - Updated (Dept: ${azureUser.department || 'N/A'})`)
        updated++
      } catch (error) {
        console.log(`  ❌ ${email} - Error: ${error.message}`)
        errors++
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('📊 Sync Summary:')
    console.log(`  ✅ Updated: ${updated}`)
    console.log(`  ⚠️  Not found in AD: ${notFound}`)
    console.log(`  ❌ Errors: ${errors}`)
    console.log(`  📋 Total processed: ${dbUsers.length}`)
    console.log('='.repeat(60))
    console.log('')

    if (updated > 0) {
      console.log('✅ Department sync completed successfully!')
    } else {
      console.log('⚠️  No users were updated. Please check Azure AD permissions.')
    }

  } catch (error) {
    console.error('❌ Error during sync:', error)
    throw error
  } finally {
    await client.end()
    console.log('')
    console.log('Database connection closed.')
  }
}

// Execute
syncUserDepartments()
  .then(() => {
    console.log('')
    console.log('Script completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
