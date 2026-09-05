import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Helper to completely purge corrupted auth cookies across domains and paths
export function clearAllSupabaseAuthCookies() {
  if (typeof document === 'undefined') return;
  try {
    const raw = document.cookie;
    if (!raw) return;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const rootDomain = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    const domains = [undefined, hostname, `.${hostname}`, `.${rootDomain}`].filter(Boolean);
    const paths = ['/', '/workspace', '/dashboard', '/api'];

    raw.split(';').forEach((cookieStr) => {
      const trimmed = cookieStr.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const name = trimmed.substring(0, eqIdx).trim();
        if (name.includes('auth-token') || name.startsWith('sb-') || name.includes('-token')) {
          paths.forEach((p) => {
            domains.forEach((d) => {
              const dPart = d ? `; domain=${d}` : '';
              document.cookie = `${name}=; path=${p}${dPart}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
            });
          });
        }
      }
    });
  } catch (_) {}
}

// Standard client for client-side or scoped user actions with native @supabase/ssr cookie sync
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations (webhooks, cron tasks) that bypass RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-admin-auth-token',
  },
});
