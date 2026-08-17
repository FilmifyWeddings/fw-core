'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * AuthRedirectGuard
 * Intercepts Supabase Auth email recovery and magic links from any landing URL (e.g. /, /login, or nip.io domain)
 * and safely forwards them to /reset-password with the full auth hash.
 */
export function AuthRedirectGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const host = window.location.host || '';

    // Check if recovery token is present in the URL hash
    if (hash.includes('type=recovery') || (hash.includes('access_token=') && !pathname.startsWith('/reset-password'))) {
      console.log('[AuthRedirectGuard] Recovery hash detected, routing to /reset-password');
      
      // If user came via old nip.io domain, bounce to official domain
      if (host.includes('nip.io') || host.includes('143.244.133.235')) {
        window.location.href = `https://studiocore.in/reset-password${hash}`;
        return;
      }

      // If on studiocore.in but on root / or another page, redirect to /reset-password
      if (!pathname.startsWith('/reset-password')) {
        window.location.href = `/reset-password${hash}`;
      }
    }
  }, [pathname, router]);

  return null;
}
