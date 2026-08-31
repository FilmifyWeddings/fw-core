'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * AuthRedirectGuard & Auto-Healing Cookie Recovery
 * 1. Intercepts Supabase Auth email recovery and magic links
 * 2. Auto-heals broken/corrupted Supabase SSR cookie chunks when session is absent or signed out
 */
export function AuthRedirectGuard() {
  const pathname = usePathname();
  const router = useRouter();

  // Auto-healing: Destroy broken or corrupted supabase cookies on sign-out or initial empty session on public routes
  useEffect(() => {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          if (pathname === '/login' || pathname === '/') {
            if (typeof document !== 'undefined' && document.cookie) {
              document.cookie.split(';').forEach((c) => {
                const trimmed = c.trim();
                if (trimmed.startsWith('sb-') && (trimmed.includes('auth-token') || trimmed.includes('-token'))) {
                  document.cookie = trimmed.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/;SameSite=Lax');
                }
              });
            }
          }
        }
      });
      return () => subscription.unsubscribe();
    } catch (_) {}
  }, [pathname]);

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
