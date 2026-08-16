import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/auth-otp-store';

export const runtime = 'nodejs';

/**
 * POST /api/auth/signup
 * Instant Signup API for StudioCore accounts:
 * - Validates input
 * - Creates user in Supabase Auth (or activates if pending)
 * - Creates profile in public.profiles table
 * - Logs user in and sets session cookies
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, businessName, email, phone, password } = body;

    const targetEmail = (email || '').trim().toLowerCase();
    const targetPassword = password || '';
    const cleanPhone = phone ? normalizePhoneNumber(phone) : '';
    const targetName = (name || '').trim() || 'Studio Owner';
    const targetStudioName = (businessName || '').trim() || `${targetName}'s Studio`;

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required.' }, { status: 400 });
    }

    if (!targetPassword || targetPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // 1. Check if user already exists
    let existingUser = null;
    try {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      existingUser = userList?.users?.find(u => u.email?.toLowerCase() === targetEmail);
    } catch (listErr) {
      console.warn('[User List Check Warning]:', listErr);
    }

    let userId = existingUser?.id;

    if (!existingUser) {
      // Create user via Admin API with pre-confirmed email
      const { data: createdData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: targetName,
          workspace_name: targetStudioName,
          phone: cleanPhone,
        },
      });

      if (createError) {
        // Fallback to client signup if admin createUser fails
        const { data: clientSignUpData, error: clientSignUpErr } = await supabase.auth.signUp({
          email: targetEmail,
          password: targetPassword,
          options: {
            data: {
              full_name: targetName,
              workspace_name: targetStudioName,
              phone: cleanPhone,
            },
          },
        });

        if (clientSignUpErr) {
          return NextResponse.json({ success: false, error: clientSignUpErr.message }, { status: 400 });
        }

        userId = clientSignUpData?.user?.id;
      } else {
        userId = createdData?.user?.id;
      }
    } else {
      // User already exists, update password and metadata
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: targetPassword,
        user_metadata: {
          full_name: targetName,
          workspace_name: targetStudioName,
          phone: cleanPhone || existingUser.user_metadata?.phone,
        },
      });
    }

    // 2. Upsert profile in `profiles` table
    if (userId) {
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          workspace_name: targetStudioName,
          full_name: targetName,
          email: targetEmail,
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('[Profile Upsert Warning]:', profileErr);
      }
    }

    // 3. Authenticate and sign in user immediately
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    if (signInErr || !signInData?.session) {
      return NextResponse.json({
        success: true,
        message: 'Account created successfully! Please log in with your credentials.',
        redirectUrl: '/login',
      });
    }

    const session = signInData.session;
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const res = NextResponse.json({
      success: true,
      message: 'Account created and logged in successfully!',
      user: {
        id: session.user.id,
        email: session.user.email,
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

    // Set auth cookies directly
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
    console.error('[API Signup Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
