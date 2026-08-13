import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';

/**
 * POST /api/auth/login
 * Server-side login handler that sets HTTP cookies directly on response headers
 * to prevent browser navigation race conditions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const targetEmail = (email || '').trim().toLowerCase();

    // Authenticate with Supabase
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (signInErr || !signInData?.session) {
      return NextResponse.json(
        { success: false, error: signInErr?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    const session = signInData.session;
    const maxAge = 60 * 60 * 24 * 7; // 7 days

    const res = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      redirectUrl: '/workspace',
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    // Set auth cookies directly on HTTP Response Headers
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
