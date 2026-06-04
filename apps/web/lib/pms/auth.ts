import { NextAuthOptions } from 'next-auth'
import MicrosoftProvider from 'next-auth/providers/azure-ad'
import { prisma } from './prisma'
import { Role } from '@prisma/client'
import { syncMicrosoftUserToDatabase, getMicrosoftUserDetails } from './microsoft-ad'

export const authOptions: NextAuthOptions = {
  providers: [
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.Read User.ReadBasic.All"
        }
      },
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/v2.0`
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'azure-ad' && account.access_token) {
        try {
          console.log('[Auth] Microsoft AD sign-in for:', user.email)
          
          // Get detailed user info from Microsoft Graph
          const microsoftUser = await getMicrosoftUserDetails(account.access_token)
          console.log('[Auth] Microsoft user details:', JSON.stringify(microsoftUser, null, 2))
          
          // Sync user to local database
          const syncedUser = await syncMicrosoftUserToDatabase(microsoftUser, account.access_token)
          console.log('[Auth] User synced successfully:', syncedUser.id)
          
          // Update last login time
          await prisma.user.update({
            where: { id: syncedUser.id },
            data: { lastLoginAt: new Date() }
          })
          
          console.log('[Auth] Microsoft AD sync successful for:', user.email)
          
          // Return true to allow sign-in (user data will be handled in jwt callback)
          return true
        } catch (error: any) {
          console.error('[Auth] Microsoft AD sync failed:', error?.message || error)
          console.error('[Auth] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
          return false
        }
      }
      
      return false // Only allow Microsoft AD sign-ins
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, fetch user data from database
      if (account?.provider === 'azure-ad' && user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: {
              id: true,
              role: true,
              profilePicture: true,
              departmentId: true,
              divisionId: true,
              jobTitle: true,
              departmentName: true
            }
          })
          
          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.profilePicture = dbUser.profilePicture
            token.departmentId = dbUser.departmentId
            token.divisionId = dbUser.divisionId
            token.jobTitle = dbUser.jobTitle
            token.departmentName = dbUser.departmentName
          }
        } catch (error) {
          console.error('[Auth] Error fetching user data for JWT:', error)
        }
      }
      
      // For subsequent token refreshes, keep existing data
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.profilePicture = token.profilePicture as string | null
        session.user.departmentId = token.departmentId as string | null
        session.user.divisionId = token.divisionId as string | null
        session.user.jobTitle = token.jobTitle as string | null
        session.user.departmentName = token.departmentName as string | null
      }
      return session
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 5 * 60 * 60, // 5 hours in seconds
    updateAge: 24 * 60 * 60, // 24 hours
  },
  events: {
    async signOut({ token }) {
      console.log('[Auth] User signed out:', token?.email)
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}
