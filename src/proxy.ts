import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Proxy Handler (Updated Next.js convention)
 * Preserves all route protections, Supabase auth sessions, and headers.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;

  // 1. UNCONDITIONAL PASS FOR PUBLIC & AUTH PATHS
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/pdf-preview') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/_next') ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service' ||
    pathname === '/book-demo' ||
    pathname === '/free-trial' ||
    pathname === '/pricing' ||
    pathname === '/features' ||
    pathname.startsWith('/p/quotation') ||
    pathname.includes('.');

  // If visiting any public route (especially /login or /attendance), pass through unconditionally!
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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    /* ignore */
  }

  // Fallback 1: Direct cookie token inspection via parseJwt
  if (!user) {
    const candidateTokens: string[] = [];

    const sbAccessToken = request.cookies.get('sb-access-token')?.value;
    if (sbAccessToken) candidateTokens.push(sbAccessToken);

    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(c => c.name.includes('-auth-token'));
    for (const ac of authCookies) {
      if (ac.value) {
        try {
          const parsed = JSON.parse(ac.value);
          const tok = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          if (tok) candidateTokens.push(tok);
        } catch (_) {
          candidateTokens.push(ac.value);
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

      // Clear auth cookies on response to sign them out immediately
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', 'unauthorized_staging');
      const signOutResponse = NextResponse.redirect(redirectUrl, { status: 307 });
      
      signOutResponse.cookies.set('sb-access-token', '', { expires: new Date(0) });
      signOutResponse.cookies.set('sb-refresh-token', '', { expires: new Date(0) });
      return signOutResponse;
    }
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
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  return response;
}

export default proxy;
export const middleware = proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
