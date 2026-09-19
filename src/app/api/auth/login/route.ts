import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Server-side login handler supporting both Email & Phone Number credentials.
 * Sets HTTP cookies directly on response headers to prevent race conditions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email: identifier, password, rememberMe = true } = body;

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Email/Phone and password are required' }, { status: 400 });
    }

    let targetEmail = (identifier || '').trim().toLowerCase();

    // Check if identifier is a phone number (contains digits and no @)
    if (!targetEmail.includes('@')) {
      const cleanPhone = normalizePhoneNumber(targetEmail);
      const raw10 = cleanPhone.slice(-10);

      // Look up user email by phone in profiles table
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, id')
          .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.ilike.%${raw10}%`)
          .limit(1)
          .maybeSingle();

        if (profile && profile.email) {
          targetEmail = profile.email.toLowerCase();
        } else {
          // Fallback: search auth users list metadata
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const found = userList?.users?.find(
            u => u.user_metadata?.phone === cleanPhone ||
                 u.phone === cleanPhone ||
                 (u.user_metadata?.phone && u.user_metadata.phone.replace(/\D/g, '').includes(raw10))
          );
          if (found && found.email) {
            targetEmail = found.email.toLowerCase();
          } else {
            return NextResponse.json(
              { success: false, error: 'No account found matching this mobile number. Please check or sign up.' },
              { status: 404 }
            );
          }
        }
      } catch (phoneErr) {
        console.warn('[Phone Login Lookup Warning]:', phoneErr);
      }
    }

    // Authenticate with Supabase using resolved email via @supabase/ssr createServerClient
    const cookiesToSetList: { name: string; value: string; options: any }[] = [];
    const ssrClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nviwtgnqplebzsgdemlm.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HaCj2xEYg_e98o-UJccdvA_5OUl9t63',
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach((c) => cookiesToSetList.push(c));
          },
        },
      }
    );

    const { data: signInData, error: signInErr } = await ssrClient.auth.signInWithPassword({
      email: targetEmail,
      password: (password || '').trim(),
    });

    if (signInErr || !signInData?.session) {
      return NextResponse.json(
        { success: false, error: signInErr?.message || 'Invalid email/phone or password' },
        { status: 401 }
      );
    }

    const session = signInData.session;
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const isHttps = process.env.NODE_ENV === 'production' || req.nextUrl.protocol === 'https:';

    const res = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      },
      redirectUrl: '/workspace',
    });

    // Set official @supabase/ssr cookies on response
    cookiesToSetList.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, {
        ...options,
        sameSite: 'lax',
        secure: isHttps,
        path: '/',
        maxAge: options?.maxAge ?? maxAge,
      });
    });

    // Also set standard sb-access-token for legacy / direct inspection
    res.cookies.set('sb-access-token', session.access_token, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: isHttps,
      httpOnly: false,
    });

    res.cookies.set('sb-refresh-token', session.refresh_token, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: isHttps,
      httpOnly: false,
    });

    return res;
  } catch (err: any) {
    console.error('[API Auth Login Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
