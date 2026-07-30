/**
 * Helper utility for Staging Environment Access Control & Email Authorization.
 * Checks environment variables:
 * - NEXT_PUBLIC_ALLOWED_STAGING_EMAILS
 * - ALLOWED_EMAILS
 * - STAGING_ALLOWED_EMAILS
 * - IS_STAGING / NEXT_PUBLIC_IS_STAGING
 */

export function getAllowedStagingEmails(): string[] {
  const raw = 
    process.env.NEXT_PUBLIC_ALLOWED_STAGING_EMAILS ||
    process.env.ALLOWED_EMAILS ||
    process.env.STAGING_ALLOWED_EMAILS ||
    '';

  if (!raw.trim()) return [];

  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isStagingEnvironment(): boolean {
  const isStagingFlag = 
    process.env.IS_STAGING === 'true' || 
    process.env.NEXT_PUBLIC_IS_STAGING === 'true';

  const allowedEmails = getAllowedStagingEmails();
  return isStagingFlag || allowedEmails.length > 0;
}

export function isEmailAllowedOnStaging(email: string | null | undefined): boolean {
  const allowedList = getAllowedStagingEmails();

  // If no allowed email list is defined in environment variables, access is open (production mode)
  if (allowedList.length === 0) {
    return true;
  }

  if (!email || typeof email !== 'string') {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  return allowedList.includes(normalizedEmail);
}
