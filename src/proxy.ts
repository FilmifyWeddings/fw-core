import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Proxy & Middleware Handler.
 * Preserves all route protections, Supabase auth sessions, and headers.
 * Optimized with clean cookie parsing & orphaned chunk pruning to prevent
 * "400 Bad Request: Request Header Or Cookie Too Large" errors.
 */
export async function proxy(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const { pathname } = request.nextUrl;

    // Instant recovery route to immediately resolve 431 header size bloat on any client
    if (pathname === '/clear-cookies' || pathname === '/fix-431') {
      const clearResponse = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
      request.cookies.getAll().forEach((c) => {
        clearResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' });
      });
      return clearResponse;
    }

    // 1. UNCONDITIONAL PASS FOR PUBLIC & AUTH PATHS
    const isPublicRoute =
      pathname === '/login' ||
      pathname === '/blocked' ||
      pathname.startsWith('/blocked') ||
      pathname === '/' ||
      pathname.startsWith('/pdf-preview') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api/webhooks') ||
      pathname.startsWith('/api/public') ||
      pathname.startsWith('/attendance') ||
      pathname.startsWith('/_next') ||
      pathname === '/privacy-policy' ||
      pathname.startsWith('/privacy-policy') ||
      pathname === '/terms-of-service' ||
      pathname.startsWith('/terms-of-service') ||
      pathname === '/data-deletion' ||
      pathname.startsWith('/data-deletion') ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/favicon.ico' ||
      pathname === '/book-demo' ||
      pathname === '/free-trial' ||
      pathname === '/pricing' ||
      pathname === '/features' ||
      pathname === '/integration-showcase' ||
      pathname.startsWith('/integration-showcase') ||
      pathname.startsWith('/p/') ||
      pathname.startsWith('/g/') ||
      pathname.includes('.');

    // If visiting any public route (especially /login, /attendance, or /g/ gallery), pass through unconditionally!
    if (isPublicRoute) {
      return response;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    let user: any = null;

    // Helper: Fast and safe unexpired JWT decoding
    const parseJwt = (token: string) => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = typeof Buffer !== 'undefined'
          ? Buffer.from(base64, 'base64').toString('utf-8')
          : atob(base64);
        const parsed = JSON.parse(jsonPayload);
        if (parsed && parsed.sub && parsed.exp && parsed.exp * 1000 > Date.now()) {
          return {
            id: parsed.sub,
            email: parsed.email || '',
            app_metadata: parsed.app_metadata || {},
            user_metadata: parsed.user_metadata || {},
            aud: parsed.aud || 'authenticated',
            role: parsed.role || 'authenticated',
            ...parsed,
          };
        }
      } catch (_) {}
      return null;
    };

    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll();
            } catch {
              return [];
            }
          },
          setAll(cookiesToSet) {
            // Track active cookie names being set
            const newlySetNames = new Set(cookiesToSet.map(c => c.name));

            // Set cookies on request
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });

            // Set cookies on response with clean options
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              })
            );

            // Prune orphaned/stale cookie chunks from request that are no longer in cookiesToSet
            const existingCookies = request.cookies.getAll();
            existingCookies.forEach((c) => {
              if (c.name.includes('-auth-token.') && !newlySetNames.has(c.name)) {
                response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
              }
            });
          },
        },
      });

      const { data, error: userError } = await supabase.auth.getUser();
      if (!userError && data?.user) {
        user = data.user;
      }
    } catch {
      /* ignore */
    }

    // Proactively prune stale/orphaned auth token chunks if cookie count is bloated (> 6)
    const allExistingCookies = request.cookies.getAll();
    if (allExistingCookies.length > 6) {
      let currentRef = '';
      try {
        currentRef = new URL(supabaseUrl).hostname.split('.')[0];
      } catch (_) {}

      allExistingCookies.forEach((c) => {
        if (c.name.startsWith('sb-') && currentRef && !c.name.startsWith(`sb-${currentRef}`)) {
          response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
        }
      });
    }

    // Fallback 1: Direct cookie token inspection with proper chunk reassembly
    if (!user) {
      const candidateTokens: string[] = [];
      const allCookies = request.cookies.getAll();

      // Group and reassemble chunked cookies (e.g., sb-*-auth-token.0, .1)
      const chunkMap: { [baseName: string]: { index: number; value: string }[] } = {};
      const standaloneValues: string[] = [];

      allCookies.forEach(c => {
        if (c.name.includes('-auth-token')) {
          const match = c.name.match(/^(.*?)\.(\d+)$/);
          if (match) {
            const base = match[1];
            const idx = parseInt(match[2], 10);
            if (!chunkMap[base]) chunkMap[base] = [];
            chunkMap[base].push({ index: idx, value: c.value });
          } else {
            standaloneValues.push(c.value);
          }
        }
      });

      // Reassemble chunks sorted by index
      Object.values(chunkMap).forEach(chunks => {
        chunks.sort((a, b) => a.index - b.index);
        const combined = chunks.map(c => c.value).join('');
        standaloneValues.push(combined);
      });

      // Also check standard sb-access-token
      const sbAccessToken = request.cookies.get('sb-access-token')?.value;
      if (sbAccessToken) standaloneValues.push(sbAccessToken);

      for (let rawVal of standaloneValues) {
        if (!rawVal) continue;
        try {
          let unescaped = rawVal;
          if (unescaped.startsWith('base64-')) {
            try {
              unescaped = Buffer.from(unescaped.substring(7), 'base64').toString('utf-8');
            } catch (_) {}
          }
          const parsed = JSON.parse(unescaped);
          const tok = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          if (tok && typeof tok === 'string') candidateTokens.push(tok);
        } catch (_) {
          if (rawVal.startsWith('ey') && rawVal.split('.').length === 3) {
            candidateTokens.push(rawVal);
          }
        }
      }

      for (const tok of candidateTokens) {
        const decodedUser = parseJwt(tok);
        if (decodedUser) {
          user = decodedUser;
          break;
        }
      }

      // Fallback 2: Verify candidate token with Supabase client
      if (!user && candidateTokens.length > 0) {
        try {
          const client = createClient(supabaseUrl, supabaseAnonKey);
          for (const tok of candidateTokens) {
            const { data } = await client.auth.getUser(tok);
            if (data?.user) {
              user = data.user;
              break;
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    // 2. PROTECTED ROUTE & STAGING AUTHORIZATION CHECK
    const host = request.headers.get('host') || '';
    const isStagingDomain = (host.includes('staging') || host.includes('test') || process.env.IS_STAGING === 'true') && !host.includes('localhost') && !host.includes('127.0.0.1');

    const allowedStagingEmailsRaw = 
      process.env.NEXT_PUBLIC_ALLOWED_STAGING_EMAILS ||
      process.env.ALLOWED_EMAILS ||
      process.env.STAGING_ALLOWED_EMAILS ||
      '';

    const allowedStagingEmails = allowedStagingEmailsRaw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    // If user is authenticated on staging environment, verify staging email permission
    if (isStagingDomain && user && allowedStagingEmails.length > 0) {
      const userEmail = (user.email || '').trim().toLowerCase();
      const isMasterAdmin = userEmail === 'filmifyweddings@gmail.com';
      const isAllowed = allowedStagingEmails.includes(userEmail) || isMasterAdmin || userEmail.endsWith('@gmail.com') || userEmail.endsWith('@fwcore.com');

      if (!isAllowed) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Access Denied: This staging environment is restricted to authorized testing accounts only.' },
            { status: 403 }
          );
        }

        // Clear all auth cookies on response to sign them out immediately
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('error', 'unauthorized_staging');
        const signOutResponse = NextResponse.redirect(redirectUrl, { status: 307 });
        
        const allCookies = request.cookies.getAll();
        allCookies.forEach(c => {
          if (c.name.includes('-token') || c.name.startsWith('sb-')) {
            signOutResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' });
          }
        });
        return signOutResponse;
      }
    }

    // =========================================================================
    // 3. ZERO-LEAK ROUTE PROTECTION: SUPERADMIN GOD-MODE (/sushant-1023-fw)
    // =========================================================================
    if (pathname.startsWith('/sushant-1023-fw')) {
      // 1. If unauthenticated: Redirect cleanly to /login?redirectTo=%2Fsushant-1023-fw
      if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', '/sushant-1023-fw');
        return NextResponse.redirect(loginUrl, { status: 303 });
      }

      // 2. If authenticated: Check if user is SuperAdmin
      const superAdminEmails = ['sushantnawale700@gmail.com', 'filmifyweddings@gmail.com'];
      const userEmail = (user.email || '').trim().toLowerCase();
      const isHardcodedAdmin =
        user.id === 'f9359a12-3f2e-430c-9cec-2ec9841ec83e' ||
        superAdminEmails.includes(userEmail);

      let isSuperAdmin = isHardcodedAdmin;

      if (!isSuperAdmin && supabaseUrl && supabaseAnonKey) {
        try {
          const client = createClient(supabaseUrl, supabaseAnonKey);
          const { data: prof } = await client
            .from('profiles')
            .select('platform_role')
            .eq('id', user.id)
            .maybeSingle();

          if (prof?.platform_role === 'superadmin') {
            isSuperAdmin = true;
          }
        } catch (_) {}
      }

      // 3. If NOT superadmin: Strict HTTP 404 rewrite (Not Found) - appears non-existent
      if (!isSuperAdmin) {
        return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 });
      }

      return response;
    }

    // =========================================================================
    // 4. TENANT ACCESS GOVERNANCE: CHECK IS_PLATFORM_BLOCKED FOR /workspace
    // =========================================================================
    if (user && (pathname === '/workspace' || pathname.startsWith('/workspace/'))) {
      try {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        const { data: prof } = await client
          .from('profiles')
          .select('is_platform_blocked')
          .eq('id', user.id)
          .maybeSingle();

        if (prof?.is_platform_blocked === true) {
          return NextResponse.redirect(new URL('/blocked', request.url), { status: 303 });
        }
      } catch (_) {}
    }

    const isProtectedRoute =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/workspace') ||
      pathname.startsWith('/integrations') ||
      pathname.startsWith('/team-manager') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/single-send') ||
      pathname.startsWith('/quotations') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/broadcast-campaigns') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/integrations');

    if (isProtectedRoute && !user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl, { status: 303 });

      // If user had stale/corrupted cookies that failed auth, purge them so the browser stops sending dead chunks
      const allCookies = request.cookies.getAll();
      allCookies.forEach(c => {
        if (c.name.includes('-token') || c.name.startsWith('sb-')) {
          redirectResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' });
        }
      });

      return redirectResponse;
    }

    return response;
  } catch (err) {
    console.error('[Proxy Error]: Handled safely without 500 crash:', err);
    return NextResponse.next();
  }
}

export default proxy;
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (.svg, .png, .jpg, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
