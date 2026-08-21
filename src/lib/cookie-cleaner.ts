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
    const cookieNames: string[] = [];

    for (const c of cookies) {
      const parts = c.split('=');
      const name = parts[0]?.trim();
      if (name) cookieNames.push(name);
    }

    // 1. Identify Supabase auth token chunk groups
    const chunkMap = new Map<string, number[]>();
    const obsoleteNames = ['sb-access-token', 'sb-refresh-token', 'supabase.auth.token'];

    cookieNames.forEach((name) => {
      // Check for chunked cookies like sb-xxx-auth-token.0, sb-xxx-auth-token.1
      const match = name.match(/^(sb-[a-z0-9_-]+-auth-token)\.(\d+)$/i);
      if (match) {
        const baseName = match[1];
        const index = parseInt(match[2], 10);
        if (!chunkMap.has(baseName)) {
          chunkMap.set(baseName, []);
        }
        chunkMap.get(baseName)!.push(index);
      }
    });

    // 2. Remove obsolete custom tokens if standard Supabase SSR cookies exist
    obsoleteNames.forEach((obsName) => {
      if (cookieNames.includes(obsName)) {
        deleteCookie(obsName);
      }
    });

    // 3. For any chunked group, if non-contiguous or stale chunks exist beyond maximum, prune them
    chunkMap.forEach((indices, baseName) => {
      indices.sort((a, b) => a - b);
      // If there are orphaned high index chunks (e.g. > 3), clean them
      indices.forEach((idx) => {
        if (idx > 3) {
          deleteCookie(`${baseName}.${idx}`);
        }
      });
    });
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
  const paths = ['/', '/workspace', '/dashboard', '/api'];

  paths.forEach((path) => {
    document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    document.cookie = `${name}=; path=${path}; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    if (domain.startsWith('www.')) {
      const rootDomain = domain.substring(4);
      document.cookie = `${name}=; path=${path}; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  });
}
