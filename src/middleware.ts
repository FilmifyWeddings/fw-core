import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
    pathname.startsWith('/_next') ||
    pathname === '/privacy-policy' ||
    pathname === '/terms-of-service' ||
    pathname === '/book-demo' ||
    pathname === '/free-trial' ||
    pathname === '/pricing' ||
    pathname === '/features' ||
    pathname.startsWith('/p/quotation') ||
    pathname.includes('.');

  // If visiting any public route (especially /login), pass through unconditionally!
  if (isPublicRoute) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  let user: any = null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
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

  // Fallback: If SSR client didn't find user, verify sb-access-token cookie directly
  if (!user) {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    if (accessToken) {
      try {
        const client = createClient(supabaseUrl, supabaseAnonKey);
        const { data } = await client.auth.getUser(accessToken);
        user = data.user;
      } catch {
        /* ignore */
      }
    }
  }

  // 2. PROTECTED ROUTE & STAGING AUTHORIZATION CHECK
  const allowedStagingEmailsRaw = 
    process.env.NEXT_PUBLIC_ALLOWED_STAGING_EMAILS ||
    process.env.ALLOWED_EMAILS ||
    process.env.STAGING_ALLOWED_EMAILS ||
    '';

  const allowedStagingEmails = allowedStagingEmailsRaw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // If user is authenticated, verify staging email permission
  if (user && allowedStagingEmails.length > 0) {
    const userEmail = (user.email || '').trim().toLowerCase();
    const isAllowed = allowedStagingEmails.includes(userEmail);

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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
