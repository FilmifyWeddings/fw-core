import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { verifyEmailOtp, isDisposableEmail, isPhoneRegistered } from '@/lib/auth-otp-store';
import { sendWelcomeEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/signup
 * Instant Signup API for StudioCore accounts with Dual OTP Verification:
 * - Validates Full Name, Studio Name, Email, Phone, Country Code, Password
 * - Enforces Duplicate Mobile & Disposable Email protections
 * - Verifies Email OTP (via in-memory store or Supabase Cloud Auth verifyOtp)
 * - Confirms/Creates user in Supabase Auth (email_confirm: true)
 * - Upserts profile in public.profiles table
 * - Sends Welcome email
 * - Sets auth cookies and signs user in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, businessName, email, phone, countryCode, password, otp } = body;

    const targetName = (name || '').trim();
    const targetStudioName = (businessName || '').trim();
    const targetEmail = (email || '').trim().toLowerCase();
    const targetPassword = password || '';
    const code = (countryCode || '+91').trim();
    const cleanPhoneDigits = (phone || '').replace(/\D/g, '');
    const fullPhoneNumber = cleanPhoneDigits ? `${code}${cleanPhoneDigits}` : '';
    const cleanOtp = (otp || '').trim();

    if (!targetName) {
      return NextResponse.json({ success: false, error: 'Full name is required.' }, { status: 400 });
    }

    if (!targetStudioName) {
      return NextResponse.json({ success: false, error: 'Studio name is required.' }, { status: 400 });
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email address is required.' }, { status: 400 });
    }

    if (isDisposableEmail(targetEmail)) {
      return NextResponse.json({ success: false, error: 'Disposable email addresses are not permitted.' }, { status: 400 });
    }

    const isIndia = targetCountryCode === '+91' || targetCountryCode === '91';
    if (isIndia) {
      if (cleanPhoneDigits.length !== 10) {
        return NextResponse.json({
          success: false,
          error: 'Indian mobile numbers must be exactly 10 digits (e.g. 9876543210).'
        }, { status: 400 });
      }
      if (!/^[6-9]\d{9}$/.test(cleanPhoneDigits)) {
        return NextResponse.json({
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
        }, { status: 400 });
      }
    } else if (!cleanPhoneDigits || cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 15) {
      return NextResponse.json({ success: false, error: 'Valid mobile number is required (7 to 15 digits).' }, { status: 400 });
    }

    if (!targetPassword || targetPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (!cleanOtp) {
      return NextResponse.json({ success: false, error: 'Verification code is required.' }, { status: 400 });
    }

    // 1. Dual OTP Verification (Local Store OR Supabase Cloud verifyOtp)
    let isOtpValid = false;

    // Check local store first
    const otpVerification = await verifyEmailOtp({
      email: targetEmail,
      otp: cleanOtp,
    });

    if (otpVerification.valid) {
      isOtpValid = true;
    } else {
      // Fallback: Check Supabase Auth verifyOtp
      try {
        const { data: sbVerifyData, error: sbVerifyErr } = await supabase.auth.verifyOtp({
          email: targetEmail,
          token: cleanOtp,
          type: 'email',
        });

        if (!sbVerifyErr && (sbVerifyData?.user || sbVerifyData?.session)) {
          isOtpValid = true;
        }
      } catch (sbErr) {
        console.warn('[Supabase VerifyOtp Fallback Notice]:', sbErr);
      }
    }

    if (!isOtpValid) {
      return NextResponse.json({
        success: false,
        error: otpVerification.error || 'Invalid or expired verification code. Please check your email.',
      }, { status: 400 });
    }

    // 2. Duplicate Mobile Check
    const phoneExists = await isPhoneRegistered(cleanPhoneDigits);
    if (phoneExists) {
      return NextResponse.json({
        success: false,
        error: 'This mobile number is already registered with another account. Please use a different number or log in.',
      }, { status: 400 });
    }

    // 3. Find or Create User in Supabase Auth
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
          phone: fullPhoneNumber,
        },
      });

      if (createError) {
        // Fallback to client signup
        const { data: clientSignUpData, error: clientSignUpErr } = await supabase.auth.signUp({
          email: targetEmail,
          password: targetPassword,
          options: {
            data: {
              full_name: targetName,
              workspace_name: targetStudioName,
              phone: fullPhoneNumber,
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
      // User already exists in draft state: update password, confirm email, and set metadata
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          full_name: targetName,
          workspace_name: targetStudioName,
          phone: fullPhoneNumber || existingUser.user_metadata?.phone,
        },
      });
    }

    // 4. Upsert profile in `profiles` table (Official Account Activation)
    if (userId) {
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          workspace_name: targetStudioName,
          full_name: targetName,
          email: targetEmail,
          phone: fullPhoneNumber,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        console.warn('[Profile Upsert Warning]:', profileErr);
      }
    }

    // 5. Send Congratulations / Welcome Email via Hostinger SMTP (in background)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    sendWelcomeEmail({
      toEmail: targetEmail,
      name: targetName,
      businessName: targetStudioName,
      workspaceUrl: `${baseUrl.replace(/\/$/, '')}/workspace`,
    }).catch(err => {
      console.warn('[Async Welcome Email Notice]:', err);
    });

    // 6. Authenticate and sign in user immediately
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    if (signInErr || !signInData?.session) {
      return NextResponse.json({
        success: true,
        message: 'Account verified and created successfully! Please log in.',
        redirectUrl: '/login',
      });
    }

    const session = signInData.session;
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    const res = NextResponse.json({
      success: true,
      message: 'Account verified and created successfully!',
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
      redirectUrl: '/workspace?onboarding=true',
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
      { success: false, error: err.message || 'Failed to complete registration. Please try again.' },
      { status: 500 }
    );
  }
}
