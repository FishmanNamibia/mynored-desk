import { Client } from 'ldapts'

interface LDAPConfig {
  url: string
  baseDN: string
  bindDN?: string
  bindPassword?: string
  userSearchBase: string
  userSearchFilter: string
}

interface LDAPUser {
  dn: string
  cn: string
  sn: string
  givenName: string
  mail: string
  displayName: string
  sAMAccountName: string
  memberOf?: string[]
}

// LDAP Configuration from environment variables
const ldapConfig: LDAPConfig = {
  url: process.env.LDAP_URL || 'ldap://your-ad-server.domain.com:389',
  baseDN: process.env.LDAP_BASE_DN || 'DC=domain,DC=com',
  bindDN: process.env.LDAP_BIND_DN, // Optional: for searching users
  bindPassword: process.env.LDAP_BIND_PASSWORD,
  userSearchBase: process.env.LDAP_USER_SEARCH_BASE || 'OU=Users,DC=domain,DC=com',
  userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || '(sAMAccountName={username})',
}

/**
 * Authenticate user against Active Directory
 */
export async function authenticateWithAD(username: string, password: string): Promise<LDAPUser | null> {
  const client = new Client({
    url: ldapConfig.url,
    timeout: 5000,
    connectTimeout: 10000,
  })

  try {
    await client.bind(ldapConfig.bindDN || '', ldapConfig.bindPassword || '')

    // Search for the user
    const searchFilter = ldapConfig.userSearchFilter.replace('{username}', username)
    const { searchEntries } = await client.search(ldapConfig.userSearchBase, {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['dn', 'cn', 'sn', 'givenName', 'mail', 'displayName', 'sAMAccountName', 'memberOf'],
    })

    if (searchEntries.length === 0) {
      console.log('[LDAP] User not found:', username)
      return null
    }

    const userEntry = searchEntries[0] as any
    const userDN = userEntry.dn

    // Unbind the search connection
    await client.unbind()

    // Try to bind as the user to verify password
    const userClient = new Client({
      url: ldapConfig.url,
      timeout: 5000,
      connectTimeout: 10000,
    })

    try {
      await userClient.bind(userDN, password)
      await userClient.unbind()

      // Password is valid, return user info
      return {
        dn: userDN,
        cn: userEntry.cn as string,
        sn: userEntry.sn as string,
        givenName: userEntry.givenName as string,
        mail: userEntry.mail as string,
        displayName: userEntry.displayName as string,
        sAMAccountName: userEntry.sAMAccountName as string,
        memberOf: Array.isArray(userEntry.memberOf) ? userEntry.memberOf : userEntry.memberOf ? [userEntry.memberOf] : [],
      }
    } catch (bindError) {
      console.log('[LDAP] Invalid password for user:', username)
      return null
    }
  } catch (error) {
    console.error('[LDAP] Authentication error:', error)
    return null
  } finally {
    try {
      await client.unbind()
    } catch (e) {
      // Ignore unbind errors
    }
  }
}

/**
 * Sync AD user to local database
 */
export async function syncADUserToDatabase(ldapUser: LDAPUser, prisma: any) {
  try {
    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { email: ldapUser.mail },
    })

    if (!user) {
      // Create new user from AD
      user = await prisma.user.create({
        data: {
          email: ldapUser.mail,
          name: ldapUser.displayName || `${ldapUser.givenName} ${ldapUser.sn}`,
          password: '', // No password for AD users
          role: 'STAFF', // Default role
          isApproved: false, // Requires admin approval
          // Store AD username for future reference
        },
      })

      console.log('[LDAP] Created new user from AD:', ldapUser.mail)
    } else {
      // Update existing user info from AD
      user = await prisma.user.update({
        where: { email: ldapUser.mail },
        data: {
          name: ldapUser.displayName || `${ldapUser.givenName} ${ldapUser.sn}`,
        },
      })

      console.log('[LDAP] Updated user from AD:', ldapUser.mail)
    }

    return user
  } catch (error) {
    console.error('[LDAP] Error syncing user to database:', error)
    throw error
  }
}
