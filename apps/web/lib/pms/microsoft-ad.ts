import { prisma } from './prisma'
import { Role } from '@prisma/client'

interface MicrosoftUser {
  id: string
  displayName?: string
  givenName?: string
  surname?: string
  mail?: string
  userPrincipalName?: string
  jobTitle?: string
  department?: string
  officeLocation?: string
  company?: string
  manager?: {
    displayName?: string
    mail?: string
  }
}

// Map Microsoft AD roles to local system roles
function mapMicrosoftRoleToSystemRole(microsoftUser: MicrosoftUser): Role {
  const email = microsoftUser.mail || microsoftUser.userPrincipalName || ''
  const title = microsoftUser.jobTitle?.toLowerCase() || ''
  
  // Admin roles - check for specific patterns
  if (email.includes('admin') || title.includes('administrator')) {
    return 'ADMIN'
  }
  
  // Board Chairperson - highest level
  if (title.includes('board chair') || title.includes('chairperson') || title.includes('board chairperson')) {
    return 'BOARD_CHAIRPERSON'
  }
  
  // Statistician General - Head of Institution
  if (title.includes('statistician general') || title.includes('sg') || title.includes('statistician-general')) {
    return 'SG'
  }
  
  // Deputy Statistician General
  if (title.includes('deputy statistician') || title.includes('deputy sg') || title.includes('deputy statistician-general')) {
    return 'DEPUTY_SG'
  }
  
  // Executive roles (check before director to avoid conflicts)
  if (title.includes('executive')) {
    return 'EXECUTIVE'
  }
  
  // Director/Chief roles
  if (title.includes('director') || title.includes('chief')) {
    return 'EXECUTIVE' // Directors and Chiefs are executives
  }
  
  // Management roles
  if (title.includes('manager') || title.includes('head') || title.includes('lead')) {
    return 'MANAGER'
  }
  
  // Senior roles
  if (title.includes('senior') || title.includes('principal')) {
    return 'SENIOR'
  }
  
  // Chief roles (already handled above, but keeping for clarity)
  if (title.includes('chief')) {
    return 'CHIEF'
  }
  
  // Administrative Assistant roles
  if (title.includes('administrative assistant') || title.includes('admin assistant') || title.includes('admin assistant')) {
    return 'ADMINISTRATIVE_ASSISTANT'
  }
  
  // Viewer roles
  if (title.includes('viewer') || title.includes('read only') || title.includes('readonly') || title.includes('observer')) {
    return 'VIEWER'
  }
  
  // Default to staff
  return 'STAFF'
}

// Find or create department based on Microsoft AD data
async function findOrCreateDepartment(departmentName: string): Promise<string | null> {
  if (!departmentName) return null
  
  try {
    let department = await prisma.department.findFirst({
      where: { name: { equals: departmentName, mode: 'insensitive' } }
    })
    
    if (!department) {
      department = await prisma.department.create({
        data: {
          name: departmentName,
          description: `Auto-created from Microsoft AD: ${departmentName}`
        }
      })
    }
    
    return department.id
  } catch (error) {
    console.error('[Microsoft AD] Error finding/creating department:', error)
    return null
  }
}

// Division model does not exist in PMS schema — divisionName is stored as a scalar on User
async function findOrCreateDivision(_divisionName: string, _departmentId: string): Promise<string | null> {
  // No Division model in schema; return null so divisionId stays null on User
  return null
}

// Fetch Microsoft AD user profile picture
async function fetchMicrosoftProfilePicture(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    
    if (response.ok) {
      const photoBlob = await response.blob()
      // Convert blob to base64
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          // Remove data:image/jpeg;base64, prefix and just keep the base64 part
          const base64Data = result.split(',')[1]
          resolve(`data:image/jpeg;base64,${base64Data}`)
        }
        reader.readAsDataURL(photoBlob)
      })
    }
  } catch (error) {
    console.log('[Microsoft AD] Could not fetch profile picture:', error)
  }
  
  return null
}
// Find supervisor by email
async function findSupervisor(supervisorEmail: string): Promise<string | null> {
  if (!supervisorEmail) return null
  
  try {
    const supervisor = await prisma.user.findUnique({
      where: { email: supervisorEmail.toLowerCase() }
    })
    
    return supervisor?.id || null
  } catch (error) {
    console.error('[Microsoft AD] Error finding supervisor:', error)
    return null
  }
}

// Main function to sync Microsoft AD user to local database
export async function syncMicrosoftUserToDatabase(microsoftUser: MicrosoftUser, accessToken: string) {
  try {
    const email = (microsoftUser.mail || microsoftUser.userPrincipalName || '').toLowerCase()
    
    if (!email) {
      throw new Error('Microsoft user has no email address')
    }
    
    console.log('[Microsoft AD] Syncing user:', email)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true
      }
    })
    
    const mappedRole = mapMicrosoftRoleToSystemRole(microsoftUser)
    const displayName = microsoftUser.displayName || `${microsoftUser.givenName || ''} ${microsoftUser.surname || ''}`.trim()
    
    console.log('[Microsoft AD] User info:', {
      email,
      displayName,
      jobTitle: microsoftUser.jobTitle,
      mappedRole,
      department: microsoftUser.department
    })
    
    // Find or create department
    const departmentId = await findOrCreateDepartment(microsoftUser.department || 'General')
    
    // Find or create division (using officeLocation or department as division name)
    const divisionName = microsoftUser.officeLocation || microsoftUser.department || 'General'
    const divisionId = departmentId ? await findOrCreateDivision(divisionName, departmentId) : null
    
    // Find manager (supervisor from AD hierarchy)
    const managerId = microsoftUser.manager?.mail ? await findSupervisor(microsoftUser.manager.mail) : null
    
    // Fetch profile picture from Microsoft AD
    const profilePicture = await fetchMicrosoftProfilePicture(accessToken)
    console.log('[Microsoft AD] Profile picture fetched:', profilePicture ? 'Success' : 'Not available')

    let userId: string
    if (existingUser) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: displayName,
          role: mappedRole,
          position: microsoftUser.jobTitle || 'Employee',
          jobTitle: microsoftUser.jobTitle || null,
          departmentName: microsoftUser.department || null,
          divisionName: microsoftUser.officeLocation || microsoftUser.department || null,
          companyName: microsoftUser.company || null,
          profilePicture,
          departmentId,
          divisionId,
          managerId,
          lastLoginAt: new Date(),
        }
      })

      console.log('[Microsoft AD] Updated existing user:', email)
      userId = updated.id
    } else {
      // Create new user
      const created = await prisma.user.create({
        data: {
          email,
          name: displayName,
          username: email.split('@')[0], // Use email prefix as username
          password: '', // Empty password for Microsoft AD users
          role: mappedRole,
          position: microsoftUser.jobTitle || 'Employee',
          jobTitle: microsoftUser.jobTitle || null,
          departmentName: microsoftUser.department || null,
          divisionName: microsoftUser.officeLocation || microsoftUser.department || null,
          companyName: microsoftUser.company || null,
          profilePicture,
          departmentId,
          divisionId,
          managerId,
          lastLoginAt: new Date()
        }
      })

      console.log('[Microsoft AD] Created new user:', email)
      userId = created.id
    }

    // Reload user with relations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true
      }
    })
    
    if (!user) {
      throw new Error('Failed to load user after Microsoft AD sync')
    }
    
    console.log('[Microsoft AD] Sync successful for:', email)
    return user
    
  } catch (error) {
    console.error('[Microsoft AD] Error syncing user to database:', error)
    throw error
  }
}

// Get additional user details from Microsoft Graph API
export async function getMicrosoftUserDetails(accessToken: string): Promise<MicrosoftUser> {
  try {
    // Get basic user profile
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch user profile: ${profileResponse.statusText}`)
    }
    
    const profile = await profileResponse.json()
    
    // Get manager information
    let manager = null
    try {
      const managerResponse = await fetch('https://graph.microsoft.com/v1.0/me/manager', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (managerResponse.ok) {
        manager = await managerResponse.json()
      }
    } catch (error) {
      console.log('[Microsoft AD] Could not fetch manager info:', error)
    }
    
    return {
      ...profile,
      manager
    }
    
  } catch (error) {
    console.error('[Microsoft AD] Error fetching user details:', error)
    throw error
  }
}
