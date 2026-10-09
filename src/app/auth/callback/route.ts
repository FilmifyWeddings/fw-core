import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /auth/callback
 * Handles Google OAuth callback from Supabase.
 * Exchanges authorization code for session cookies and verifies onboarding status.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const role = requestUrl.searchParams.get('role') || 'owner';
  const next = requestUrl.searchParams.get('next');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = forwardedHost || request.headers.get('host');

  let appOrigin = host ? `${forwardedProto}://${host}` : requestUrl.origin;
  if (appOrigin.includes('nip.io') || appOrigin.includes('143.244.133.235') || (appOrigin.includes('localhost') && process.env.NODE_ENV === 'production')) {
    appOrigin = 'https://studiocore.in';
  } else if (!appOrigin || appOrigin.includes('localhost:3000')) {
    // If not in local dev environment
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      appOrigin = process.env.NEXT_PUBLIC_APP_URL;
    }
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (_) {}
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session?.user) {
      const user = data.session.user;
      const userId = user.id;

      // Check if user has an existing verified phone number in `profiles` or auth metadata
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('phone, phone_verified, platform_role')
        .eq('id', userId)
        .maybeSingle();

      const userMeta = user.user_metadata || {};
      const hasVerifiedPhone = Boolean(
        (profile?.phone && profile.phone_verified) ||
        (userMeta.phone && userMeta.phone_verified)
      );

      const effectiveRole = profile?.platform_role || userMeta.role || role;

      // ── IF PHONE IS NOT VERIFIED: Trigger Mandatory Google Onboarding Modal ──
      if (!hasVerifiedPhone) {
        const onboardingTarget = effectiveRole === 'team_member' ? '/team/dashboard' : '/workspace';
        const redirectUrl = new URL(onboardingTarget, appOrigin);
        redirectUrl.searchParams.set('google_onboarding', 'true');
        redirectUrl.searchParams.set('role', effectiveRole);
        return NextResponse.redirect(redirectUrl.toString());
      }

      // ── IF ALREADY VERIFIED: Redirect to destination dashboard ──
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(new URL(next, appOrigin).toString());
      }

      const defaultDestination = effectiveRole === 'team_member' ? '/team/dashboard' : '/workspace';
      return NextResponse.redirect(new URL(defaultDestination, appOrigin).toString());
    }
  }

  // Fallback if code exchange failed
  return NextResponse.redirect(new URL('/login?error=Google authentication failed', appOrigin).toString());
}
