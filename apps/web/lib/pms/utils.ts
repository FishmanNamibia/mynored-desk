import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function canEditTarget(user: any, target: any): boolean {
  // Simple implementation - adjust based on your business logic
  if (!user || !target) return false
  
  // Allow editing if user is the responsible person
  if (target.responsible?.email === user.email) return true
  
  // Allow editing if user has admin role
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return true
  
  return false
}

export function canSeeFullDetails(user: any): boolean {
  if (!user) return false
  
  // Senior roles can see full details
  const seniorRoles = ['ADMIN', 'SUPERVISOR', 'EXECUTIVE', 'SG', 'DSG']
  return seniorRoles.includes(user.role)
}

export function canSeeAllDivisions(user: any): boolean {
  if (!user) return false
  
  // Roles that can see all divisions in their department
  const rolesWithDivisionAccess = ['ADMIN', 'SUPERVISOR', 'EXECUTIVE', 'SG', 'DSG']
  return rolesWithDivisionAccess.includes(user.role)
}
