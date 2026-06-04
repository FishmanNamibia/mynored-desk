/**
 * Centralized role name formatting utility
 * Converts role codes to full display names in uppercase
 */

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  'ADMIN': 'ADMINISTRATOR',
  'BOARD_CHAIRPERSON': 'BOARD CHAIRPERSON',
  'SG': 'STATISTICIAN GENERAL',
  'DEPUTY_SG': 'DEPUTY STATISTICIAN GENERAL',
  'EXECUTIVE': 'EXECUTIVE',
  'MANAGER': 'MANAGER',
  'SENIOR': 'SENIOR',
  'CHIEF': 'CHIEF',
  'STAFF': 'STAFF',
  'ADMINISTRATIVE_ASSISTANT': 'ADMINISTRATIVE ASSISTANT',
  'VIEWER': 'VIEWER'
}

/**
 * Format a role code to its full display name in uppercase
 * @param roleCode - The role code (e.g., 'DEPUTY_SG')
 * @returns The full display name in uppercase (e.g., 'DEPUTY STATISTICIAN GENERAL')
 */
export function formatRoleDisplay(roleCode: string): string {
  return ROLE_DISPLAY_NAMES[roleCode] || roleCode.replace(/_/g, ' ')
}

/**
 * Format a role code to title case for display in headers/dropdowns
 * @param roleCode - The role code (e.g., 'DEPUTY_SG')
 * @returns The formatted name in title case (e.g., 'Deputy Statistician General')
 */
export function formatRoleTitleCase(roleCode: string): string {
  const fullName = formatRoleDisplay(roleCode)
  return fullName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
