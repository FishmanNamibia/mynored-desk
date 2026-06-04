import { NextResponse } from 'next/server'
import { prisma } from '@/lib/pms/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
function mapMicrosoftRoleToSystemRole(microsoftUser: MicrosoftUser): string {
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

export async function GET() {
  try {
    // This would require Microsoft Graph API with proper permissions
    // For now, return info about current limitation
    return NextResponse.json({
      message: "Current system only syncs users when they sign in",
      currentUsers: await prisma.user.count(),
      executivesInDB: await prisma.user.count({
        where: { role: 'EXECUTIVE' }
      }),
      note: "To sync all AD users, we need to implement Microsoft Graph API bulk user endpoint",
      required: [
        "Microsoft Graph API access with User.Read.All permission",
        "Service account or app-only access",
        "Bulk sync endpoint implementation"
      ]
    })
  } catch (error) {
    console.error('[AD Sync] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
