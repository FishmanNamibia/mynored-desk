export const CONTENT_MANAGER_ROLES = [
  "Junior Communication Specialist",
  "Manager: Corporate Communications",
  "Communications Officer",
  "Senior Communications Officer",
  "Web Developer",
];

// Users explicitly authorized to create SharePoint notices by email
// (for those whose job title alone doesn't qualify them)
// Emails are case-insensitive; all stored lowercase here
export const NOTICE_CREATOR_EMAILS = new Set([
  // Tuliikeni Shimhanda — Information Security Specialist: NHIES
  "tshimhanda@nsa.org.na",
  // NSA Communications shared / service account
  "nsacommunications@nsa.org.na",
  "nsa.communications@nsa.org.na",
]);

export function canCreateNotice(
  jobTitle?: string | null,
  email?: string | null,
): boolean {
  if (jobTitle && CONTENT_MANAGER_ROLES.includes(jobTitle)) return true;
  if (email && NOTICE_CREATOR_EMAILS.has(email.toLowerCase())) return true;
  return false;
}

export function canManageContent(jobTitle?: string | null): boolean {
  return canCreateNotice(jobTitle);
}
