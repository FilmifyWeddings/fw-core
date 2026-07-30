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

  // 2. PROTECTED ROUTE CHECK ONLY
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
