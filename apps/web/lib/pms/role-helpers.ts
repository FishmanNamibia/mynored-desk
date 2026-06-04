import { UserRole } from '@prisma/client'

type UserWithRoles = {
  id: string
  jobTitle?: string | null
  roles?: UserRole[] | any
}

export function userHasAnyRole(user: UserWithRoles | undefined | any, roles: UserRole[]): boolean {
  if (!user || !user.roles || !Array.isArray(user.roles)) return false
  return user.roles.some((role: UserRole) => roles.includes(role))
}

export function isExecutive(user: UserWithRoles | undefined | any): boolean {
  if (!user || !user.jobTitle) return false
  const title = user.jobTitle.toLowerCase()
  return (
    title.includes('executive') || 
    title.includes('statistician general') || 
    title.includes('deputy')
  )
}

export function isDepartmentManager(user: UserWithRoles | undefined | any): boolean {
  if (!user || !user.jobTitle) return false
  const title = user.jobTitle.toLowerCase()
  return (
    title.includes('manager') || 
    title.includes('director') || 
    title.includes('head of')
  )
}

export function isRiskComplianceOfficer(user: UserWithRoles | undefined | any): boolean {
  if (!user || !user.jobTitle) return false
  const title = user.jobTitle.toLowerCase()
  return (
    title.includes('risk') && 
    (title.includes('compliance') || title.includes('officer'))
  )
}
