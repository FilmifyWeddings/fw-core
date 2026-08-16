import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, normalizePhoneNumber } from '@/lib/auth-otp-store';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * POST /api/auth/verify-whatsapp-otp
 * Verifies 6-digit WhatsApp OTP and registers or activates the Studio account.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, otp, signupData } = body;

    if (!phone || !otp) {
      return NextResponse.json({ success: false, error: 'Phone and OTP are required' }, { status: 400 });
    }

    const cleanPhone = normalizePhoneNumber(phone);
    const verification = await verifyOtp({ phone: cleanPhone, otp });

    if (!verification.valid) {
      return NextResponse.json({ success: false, error: verification.error || 'Invalid OTP' }, { status: 400 });
    }

    // If signupData is attached, create the studio user in Supabase
    if (signupData) {
      const { name, businessName, email, password } = signupData;
      const targetEmail = (email || '').trim().toLowerCase();

      if (!targetEmail || !password) {
        return NextResponse.json({ success: false, error: 'Email and password are required for signup' }, { status: 400 });
      }

      // Check if user already exists with this email
      const { data: existingUserList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUserList?.users?.find(u => u.email?.toLowerCase() === targetEmail);

      let userId = existingUser?.id;

      if (!existingUser) {
        // Create new user with confirmed email
        const { data: createdUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: targetEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: name || 'Creator',
            workspace_name: businessName || `${name || 'My'}'s Studio`,
            phone: cleanPhone,
          },
        });

        if (createError) {
          return NextResponse.json({ success: false, error: createError.message }, { status: 400 });
        }

        userId = createdUserData.user.id;
      } else {
        // Update user metadata and password if already exists
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: password,
          user_metadata: {
            full_name: name || existingUser.user_metadata?.full_name,
            workspace_name: businessName || existingUser.user_metadata?.workspace_name,
            phone: cleanPhone,
          },
        });
      }

      if (userId) {
        // Upsert into profiles table
        try {
          await supabaseAdmin.from('profiles').upsert({
            id: userId,
            workspace_name: businessName || `${name || 'My'}'s Studio`,
            full_name: name || 'Creator',
            email: targetEmail,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          });
        } catch (profileErr) {
          console.warn('[Profile Upsert Warning]:', profileErr);
        }
      }

      // Sign in user to retrieve session and set cookies
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      const res = NextResponse.json({
        success: true,
        message: 'Account verified and created successfully!',
        redirectUrl: '/workspace',
        user: signInData?.user || { id: userId, email: targetEmail },
        session: signInData?.session,
      });

      if (signInData?.session) {
        const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
        const maxAge = 60 * 60 * 24 * 7; // 7 days

        res.cookies.set('sb-access-token', signInData.session.access_token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: false,
        });

        res.cookies.set('sb-refresh-token', signInData.session.refresh_token, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          secure: isHttps,
          httpOnly: false,
        });
      }

      return res;
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (err: any) {
    console.error('[API Verify WhatsApp OTP Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'OTP verification failed.' },
      { status: 500 }
    );
  }
}
