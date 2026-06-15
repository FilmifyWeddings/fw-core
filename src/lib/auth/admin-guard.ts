/**
 * Super Admin Auth Guard helper for FW Core
 */
export const SUPER_ADMIN_EMAIL = 'sushantnawale700@gmail.com';

/**
 * Checks if the provided email is the Super Admin.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Checks if a Supabase user object represents the Super Admin.
 */
export function isUserSuperAdmin(user: { email?: string } | null | undefined): boolean {
  return isSuperAdmin(user?.email);
}
