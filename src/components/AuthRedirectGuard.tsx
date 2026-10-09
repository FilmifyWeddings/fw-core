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

  // Auto-healing: Clean cookies only on explicit user SIGN_OUT event
  useEffect(() => {
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          if (typeof document !== 'undefined' && document.cookie) {
            document.cookie.split(';').forEach((c) => {
              const trimmed = c.trim();
              if (trimmed.startsWith('sb-') && (trimmed.includes('auth-token') || trimmed.includes('-token'))) {
                document.cookie = trimmed.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/;SameSite=Lax');
              }
            });
          }
        }
      });
      return () => subscription.unsubscribe();
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const host = window.location.host || '';
    const search = window.location.search || '';

    // ── Auto-heal 1: If user came via old nip.io or VPS IP domain ──
    if (host.includes('nip.io') || host.includes('143.244.133.235')) {
      console.log('[AuthRedirectGuard] Old nip.io/IP detected, redirecting to official studiocore.in domain');
      // If OAuth code landed on nip.io, bounce immediately to /auth/callback on studiocore.in
      if (search.includes('code=')) {
        window.location.href = `https://studiocore.in/auth/callback${search}`;
        return;
      }
      if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        window.location.href = `https://studiocore.in/reset-password${hash}`;
        return;
      }
      window.location.href = `https://studiocore.in${pathname}${search}${hash}`;
      return;
    }

    // ── Auto-heal 2: If OAuth code landed on root "/" instead of /auth/callback ──
    if (pathname === '/' && search.includes('code=')) {
      console.log('[AuthRedirectGuard] Root OAuth code detected, redirecting to /auth/callback');
      window.location.href = `https://studiocore.in/auth/callback${search}`;
      return;
    }

    // ── Check if recovery token is present in the URL hash ──
    if (hash.includes('type=recovery') || (hash.includes('access_token=') && !pathname.startsWith('/reset-password'))) {
      console.log('[AuthRedirectGuard] Recovery hash detected, routing to /reset-password');
      if (!pathname.startsWith('/reset-password')) {
        window.location.href = `/reset-password${hash}`;
      }
    }
  }, [pathname, router]);

  return null;
}
