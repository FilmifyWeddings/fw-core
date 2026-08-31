import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Helper to safely parse document.cookie in the browser
function getBrowserCookies(): { name: string; value: string }[] {
  if (typeof document === 'undefined') return [];
  const cookies: { name: string; value: string }[] = [];
  const raw = document.cookie;
  if (!raw) return cookies;

  raw.split(';').forEach((cookieStr) => {
    const trimmed = cookieStr.trim();
    if (!trimmed) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const name = decodeURIComponent(trimmed.substring(0, eqIdx).trim());
      const value = decodeURIComponent(trimmed.substring(eqIdx + 1).trim());
      cookies.push({ name, value });
    }
  });
  return cookies;
}

// Helper to write to document.cookie with automatic orphaned chunk cleanup
function setBrowserCookies(cookiesToSet: { name: string; value: string; options?: any }[]) {
  if (typeof document === 'undefined') return;

  const newlySetNames = new Set(cookiesToSet.map(c => c.name));

  cookiesToSet.forEach(({ name, value, options }) => {
    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
    if (options?.maxAge) {
      cookieStr += `; max-age=${options.maxAge}`;
    }
    if (options?.expires) {
      cookieStr += `; expires=${options.expires.toUTCString()}`;
    }
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      cookieStr += '; Secure';
    }
    document.cookie = cookieStr;
  });

  // Prune old chunks (e.g. if we set .0 and .1, delete old .2, .3 etc.)
  try {
    const existing = getBrowserCookies();
    existing.forEach(({ name }) => {
      if (name.includes('-auth-token.') && !newlySetNames.has(name)) {
        document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    });
  } catch (_) {}
}

// Helper to completely purge corrupted auth cookies
export function clearAllSupabaseAuthCookies() {
  if (typeof document === 'undefined') return;
  try {
    const raw = document.cookie;
    if (!raw) return;
    raw.split(';').forEach((cookieStr) => {
      const trimmed = cookieStr.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const name = trimmed.substring(0, eqIdx).trim();
        if (name.includes('auth-token') || name.startsWith('sb-')) {
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    });
  } catch (_) {}
}

// Standard client for client-side or scoped user actions with bulletproof SSR cookie sync
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: getBrowserCookies,
        setAll: setBrowserCookies,
      },
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
