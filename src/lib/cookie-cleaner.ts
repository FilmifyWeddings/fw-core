/**
 * Cookie Cleanup Helper
 * Prunes stale, orphaned, redundant or bloated cookie chunks to prevent 
 * "400 Bad Request: Request Header Or Cookie Too Large" errors in Next.js / Supabase.
 */

/**
 * Client-side cookie cleanup routine.
 * Deletes obsolete auth cookies and orphaned chunk cookies (e.g. index >= 3 when only 1 chunk exists).
 */
export function pruneClientCookies(): void {
  if (typeof document === 'undefined') return;

  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const parts = c.split('=');
      const name = parts[0]?.trim();
      // Only remove legacy v1 supabase token if present
      if (name === 'supabase.auth.token') {
        deleteCookie(name);
      }
      // Remove tokens from other supabase projects if present
      if (name && name.startsWith('sb-') && name.includes('-auth-token') && !name.startsWith('sb-nviwtgnqplebzsgdemlm')) {
        deleteCookie(name);
      }
    }
  } catch (e) {
    console.warn('[Cookie Cleaner Notice]:', e);
  }
}

/**
 * Helper to delete a cookie by name across all common domain and path variations
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = window.location.hostname;
  const paths = ['/', '/workspace', '/dashboard', '/api', '/leads', '/quotations', '/team', '/partner'];

  paths.forEach((path) => {
    document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    document.cookie = `${name}=; path=${path}; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    if (domain.startsWith('www.')) {
      const rootDomain = domain.substring(4);
      document.cookie = `${name}=; path=${path}; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  });
}
