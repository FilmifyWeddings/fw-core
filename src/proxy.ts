import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_ROOT_PATHS = new Set([
  'admin',
  'api',
  'assigned-shoots',
  'attendance',
  'auth',
  'bee-queen-curtail',
  'blocked',
  'book-demo',
  'broadcast-campaigns',
  'clear-cookies',
  'dashboard',
  'data-deletion',
  'downloads',
  'features',
  'fix-431',
  'forgot-password',
  'free-trial',
  'g',
  'home',
  'home2',
  'instant-import',
  'integration-showcase',
  'integrations',
  'leads',
  'login',
  'p',
  'pdf-preview',
  'portal',
  'pricing',
  'privacy-policy',
  'quotations',
  'r',
  'reset-password',
  'review',
  'robots.txt',
  'sarajosmith',
  'settings',
  'signup',
  'single-send',
  'sitemap.xml',
  'support',
  'sushant-1023-fw',
  'sushant',
  'team',
  'team-manager',
  'partner',
  'terms-of-service',
  'vendor-portal',
  'workspace',
  '_next',
  'favicon.ico',
]);

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
      const paths = ['/', '/workspace', '/dashboard', '/api', '/leads', '/quotations', '/team', '/partner'];
      const host = request.headers.get('host') || request.nextUrl.host || '';
      const domain = host.split(':')[0];
      const isSub = domain.split('.').length > 2 && !domain.startsWith('localhost') && !domain.startsWith('127.');
      const rootDomain = isSub ? domain.split('.').slice(-2).join('.') : domain;

      request.cookies.getAll().forEach((c) => {
        paths.forEach((p) => {
          clearResponse.cookies.set(c.name, '', { maxAge: 0, path: p });
          clearResponse.cookies.set(c.name, '', { maxAge: 0, path: p, domain });
          if (rootDomain && rootDomain !== domain) {
            clearResponse.cookies.set(c.name, '', { maxAge: 0, path: p, domain: `.${rootDomain}` });
          }
        });
      });
      clearResponse.headers.set('Clear-Site-Data', '"cookies", "storage"');
      return clearResponse;
    }

    // Luxury Branded Event Gallery Rewrite
    // Pattern 1: /{studio_slug}/{couple_slug}/{unique_code} -> /g/{couple_slug}-{unique_code}
    const pathSegments = pathname.split('/').filter(Boolean);
    const RESERVED_SUB_PATHS = new Set([
      'admin',
      'api',
      'assigned-shoots',
      'attendance',
      'auth',
      'bee-queen-curtail',
      'blocked',
      'book-demo',
      'bookings',
      'broadcast-campaigns',
      'clear-cookies',
      'clients',
      'dashboard',
      'data-deletion',
      'deliverables',
      'downloads',
      'features',
      'finance',
      'fix-431',
      'forgot-password',
      'free-trial',
      'g',
      'gallery',
      'home',
      'home2',
      'instant-import',
      'integration-showcase',
      'integrations',
      'leads',
      'login',
      'logout',
      'p',
      'partner',
      'partner-portal',
      'pdf-preview',
      'portal',
      'post-production',
      'pricing',
      'privacy-policy',
      'quotations',
      'r',
      'reset-password',
      'review',
      'robots.txt',
      'sarajosmith',
      'settings',
      'shoots',
      'signup',
      'single-send',
      'sitemap.xml',
      'smart-attendance',
      'support',
      'sushant-1023-fw',
      'team',
      'team-manager',
      'terms-of-service',
      'vendor-portal',
      'workspace',
      '_next',
      'favicon.ico',
    ]);

    if (
      pathSegments.length === 3 &&
      !pathSegments[0].includes('.') &&
      !RESERVED_ROOT_PATHS.has(pathSegments[0].toLowerCase())
    ) {
      const [studio, second, third] = pathSegments;
      const secondLower = second.toLowerCase();

      // If second segment is a known application route, route to proper portal page with studio param
      if (secondLower === 'team' && third.toLowerCase() === 'attendance') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/attendance';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'team' && third.toLowerCase() === 'dashboard') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/dashboard';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'team' && third.toLowerCase() === 'finance') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/finance';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'workspace') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/workspace/${third}`;
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }

      // If not an application route, rewrite to branded event gallery
      if (!RESERVED_SUB_PATHS.has(secondLower)) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/g/${second}-${third}`;
        rewriteUrl.searchParams.set('studio', studio);
        rewriteUrl.searchParams.set('couple', second);
        rewriteUrl.searchParams.set('code', third);
        return NextResponse.rewrite(rewriteUrl);
      }
    }

    // Pattern 2: Subdomain routing: {studio_slug}.studiocore.in/{couple_slug}/{unique_code}
    const requestHost = request.headers.get('host') || request.nextUrl.host || '';
    const hostParts = requestHost.split(':')[0].split('.');
    const isSubdomain = hostParts.length > 2 && hostParts[0] !== 'www' && hostParts[0] !== 'localhost';
    if (
      isSubdomain &&
      pathSegments.length === 2 &&
      !pathSegments[0].includes('.') &&
      !RESERVED_ROOT_PATHS.has(pathSegments[0].toLowerCase()) &&
      !RESERVED_SUB_PATHS.has(pathSegments[0].toLowerCase())
    ) {
      const studio = hostParts[0];
      const [couple, code] = pathSegments;
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/g/${couple}-${code}`;
      rewriteUrl.searchParams.set('studio', studio);
      rewriteUrl.searchParams.set('couple', couple);
      rewriteUrl.searchParams.set('code', code);
      return NextResponse.rewrite(rewriteUrl);
    }

    // Pattern 3: /{studio_slug}/{route_or_couple_slug}
    if (
      pathSegments.length === 2 &&
      !isSubdomain &&
      !pathSegments[0].includes('.') &&
      !RESERVED_ROOT_PATHS.has(pathSegments[0].toLowerCase())
    ) {
      const [studio, second] = pathSegments;
      const secondLower = second.toLowerCase();

      // If second segment is a known application route, route to proper portal page with studio param
      if (secondLower === 'attendance' || secondLower === 'smart-attendance') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/attendance';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'dashboard') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/dashboard';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'finance') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/team/finance';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'post-production') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/workspace/post-production';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'assigned-shoots' || secondLower === 'shoots') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/assigned-shoots';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'team' || secondLower === 'team-manager') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/workspace/team';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }
      if (secondLower === 'workspace') {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = '/workspace';
        rewriteUrl.searchParams.set('studio', studio);
        return NextResponse.rewrite(rewriteUrl);
      }

      // If NOT a reserved application route, rewrite to client gallery
      if (!RESERVED_SUB_PATHS.has(secondLower)) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/g/${second}`;
        rewriteUrl.searchParams.set('studio', studio);
        rewriteUrl.searchParams.set('couple', second);
        return NextResponse.rewrite(rewriteUrl);
      }
    }

    // Clean legacy v1 auth token and foreign project auth tokens
    const allExistingCookies = request.cookies.getAll();
    if (allExistingCookies.length > 5) {
      let currentRef = '';
      try {
        currentRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.split('.')[0];
      } catch (_) {}

      allExistingCookies.forEach((c) => {
        // Prune foreign project auth tokens (never touch sb-access-token, sb-refresh-token, or active project)
        if (
          c.name.startsWith('sb-') &&
          c.name.includes('-auth-token') &&
          currentRef &&
          !c.name.startsWith(`sb-${currentRef}`)
        ) {
          response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
        }
        // Prune legacy v1 auth token only
        if (c.name === 'supabase.auth.token') {
          response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
        }
      });
    }

    // Social media crawler detection for link previews (WhatsApp, Facebook, Twitter, Telegram, etc.)
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const isSocialCrawler =
      userAgent.includes('whatsapp') ||
      userAgent.includes('facebookexternalhit') ||
      userAgent.includes('facebot') ||
      userAgent.includes('twitterbot') ||
      userAgent.includes('telegrambot') ||
      userAgent.includes('linkedinbot') ||
      userAgent.includes('slackbot') ||
      userAgent.includes('discordbot') ||
      userAgent.includes('pinterest') ||
      userAgent.includes('googlebot') ||
      userAgent.includes('bingbot') ||
      userAgent.includes('applebot');

    // Check if visiting a read-only public quotation preview or its opengraph/social image
    const isPublicQuotationPreview =
      pathname.startsWith('/p/quotation/') ||
      pathname.includes('/opengraph-image') ||
      pathname.includes('/twitter-image') ||
      (pathname.startsWith('/workspace/quotations/builder/templet/') &&
        (request.nextUrl.searchParams.get('preview') === 'public' ||
          request.nextUrl.searchParams.has('token') ||
          pathname.includes('/opengraph-image') ||
          pathname.includes('/twitter-image') ||
          pathname.includes('/icon') ||
          isSocialCrawler));

    // 1. UNCONDITIONAL PASS FOR PUBLIC & AUTH PATHS
    const isPublicRoute =
      isPublicQuotationPreview ||
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

    // If visiting any public route (except /login which needs session resolution for auto-redirect), pass through!
    if (isPublicRoute && pathname !== '/login') {
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

    // ── 0ms FAST PATH: Local JWT Decode (Zero external Supabase network latency) ──
    try {
      const allCookies = request.cookies.getAll();
      const candidateTokens: string[] = [];

      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.substring(7).trim();
        if (bearerToken) candidateTokens.push(bearerToken);
      }

      const sbAccessToken = request.cookies.get('sb-access-token')?.value;
      if (sbAccessToken) candidateTokens.push(sbAccessToken);

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

      Object.values(chunkMap).forEach(chunks => {
        chunks.sort((a, b) => a.index - b.index);
        const combined = chunks.map(c => c.value).join('');
        standaloneValues.push(combined);
      });

      for (let rawVal of standaloneValues) {
        if (!rawVal) continue;
        try {
          let unescaped = rawVal;
          if (unescaped.startsWith('base64-')) {
            try {
              unescaped = Buffer.from(unescaped.substring(7), 'base64url').toString('utf-8');
            } catch (_) {
              try {
                const normalized = unescaped.substring(7).replace(/-/g, '+').replace(/_/g, '/');
                unescaped = Buffer.from(normalized, 'base64').toString('utf-8');
              } catch (_) {}
            }
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
    } catch (_) {}

    // Only if local JWT didn't resolve an active user, attempt Supabase getUser with 3s hard timeout
    if (!user) {
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
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({
                request,
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, {
                  ...options,
                  sameSite: 'lax',
                  secure: process.env.NODE_ENV === 'production',
                  path: '/',
                  maxAge: options?.maxAge ?? 60 * 60 * 24 * 365,
                })
              );
            },
          },
        });

        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        const { data, error: userError } = await Promise.race([getUserPromise, timeoutPromise]);
        if (!userError && data?.user) {
          user = data.user;
        }
      } catch {
        /* ignore */
      }
    }

    // Fallback 1: Direct cookie token inspection with proper chunk reassembly
    if (!user) {
      const candidateTokens: string[] = [];

      // Extract Bearer token from authorization header if present (for API requests)
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.substring(7).trim();
        if (bearerToken) candidateTokens.push(bearerToken);
      }

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

      // Also check standard sb-access-token & sb-refresh-token
      const sbAccessToken = request.cookies.get('sb-access-token')?.value;
      if (sbAccessToken) standaloneValues.push(sbAccessToken);

      const candidateRefreshTokens: string[] = [];
      const sbRefreshToken = request.cookies.get('sb-refresh-token')?.value;
      if (sbRefreshToken) candidateRefreshTokens.push(sbRefreshToken);

      for (let rawVal of standaloneValues) {
        if (!rawVal) continue;
        try {
          let unescaped = rawVal;
          if (unescaped.startsWith('base64-')) {
            try {
              unescaped = Buffer.from(unescaped.substring(7), 'base64url').toString('utf-8');
            } catch (_) {
              try {
                const normalized = unescaped.substring(7).replace(/-/g, '+').replace(/_/g, '/');
                unescaped = Buffer.from(normalized, 'base64').toString('utf-8');
              } catch (_) {}
            }
          }
          const parsed = JSON.parse(unescaped);
          const tok = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
          if (tok && typeof tok === 'string') candidateTokens.push(tok);

          const rTok = parsed?.refresh_token || (Array.isArray(parsed) ? parsed[1] : null);
          if (rTok && typeof rTok === 'string') candidateRefreshTokens.push(rTok);
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

      // Fallback 3: Proactively refresh session using refresh token if access token expired (>1 hour)
      if (!user && candidateRefreshTokens.length > 0 && supabaseUrl && supabaseAnonKey) {
        try {
          const client = createClient(supabaseUrl, supabaseAnonKey);
          for (const rTok of candidateRefreshTokens) {
            const { data: refreshed, error: refErr } = await client.auth.refreshSession({ refresh_token: rTok });
            if (!refErr && refreshed?.session?.user) {
              user = refreshed.session.user;
              response.cookies.set('sb-access-token', refreshed.session.access_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false,
              });
              response.cookies.set('sb-refresh-token', refreshed.session.refresh_token, {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false,
              });
              break;
            }
          }
        } catch (_) {}
      }
    }

    // Auto-redirect authenticated users accessing /login directly away from the login form
    if (pathname === '/login') {
      if (user) {
        const isExplicitLogout = request.nextUrl.searchParams.get('logout') === 'true';
        const hasAuthError = request.nextUrl.searchParams.has('error');
        if (!isExplicitLogout && !hasAuthError) {
          const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/workspace';
          const safeDestination =
            redirectTo.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.startsWith('/login')
              ? redirectTo
              : '/workspace';
          return NextResponse.redirect(new URL(safeDestination, request.url), { status: 303 });
        }
      }
      return response;
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
    // is_platform_blocked verified asynchronously in client workspace context

    // API Route Protection: fail-closed 401 Unauthorized for private workspace APIs,
    // while explicitly allowing guest portals (gallery, moodboard, review, quotation response),
    // webhooks, auth/OAuth callbacks, and public health/media routes.
    if (!user && pathname.startsWith('/api/') && !pathname.startsWith('/api/public') && !pathname.startsWith('/api/webhooks')) {
      const isPublicEndpoint =
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/facebook') ||
        pathname.startsWith('/api/meta') ||
        pathname.startsWith('/api/billing/plans') ||
        pathname.startsWith('/api/fonts') ||
        pathname.startsWith('/api/gallery') ||
        pathname.startsWith('/api/moodboard') ||
        pathname.startsWith('/api/quotations/response') ||
        pathname.startsWith('/api/review') ||
        pathname.startsWith('/api/vendors') ||
        pathname.startsWith('/api/team/check-invite') ||
        pathname.startsWith('/api/team/link-account') ||
        pathname.startsWith('/api/agent') ||
        pathname.startsWith('/api/cron') ||
        pathname.startsWith('/api/proxy-image') ||
        pathname.startsWith('/api/pdf') ||
        pathname.startsWith('/api/system/health') ||
        pathname === '/api/integrations/baileys/fetch-groups';
      if (!isPublicEndpoint) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Page Routes: Pass through cleanly to Next.js so BhamstraContext and
    // WorkspaceHydrationGate can resolve authentication instantly via client localStorage / IndexedDB.
    // Client components handle any needed login redirects without server 303 bouncing.

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
     * - api/whatsapp/templates/upload (bypasses middleware 10MB stream truncation)
     * - api/whatsapp/templates/delete-media
     * - api/media (direct media streaming)
     * - public folder files (.svg, .png, .jpg, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/whatsapp/templates/upload|api/whatsapp/templates/delete-media|api/media|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
