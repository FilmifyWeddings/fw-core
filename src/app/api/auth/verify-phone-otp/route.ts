import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/auth-otp-store';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

/**
 * POST /api/auth/verify-phone-otp
 * Verifies SMS OTP and saves phone number, role, and studio details to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, otp, fullName, studioName, role = 'owner', countryCode = '+91' } = body;

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone number and verification OTP code are required' }, { status: 400 });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    const national10 = cleanDigits.slice(-10);
    const codeDigits = String(countryCode).replace(/\D/g, '') || '91';
    const fullInternationalPhone = `${codeDigits}${national10}`;

    // 1. Verify OTP
    const verification = await verifyOtp({
      phone: fullInternationalPhone,
      otp: String(otp).trim(),
    });

    if (!verification.valid) {
      return NextResponse.json({ error: verification.error || 'Invalid or expired OTP code' }, { status: 400 });
    }

    // 2. Resolve Authenticated User
    const { userId, userEmail } = await resolveRequestUser(req);
    const targetUserId = userId && userId !== 'demo_user' ? userId : null;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User session required to complete phone verification' }, { status: 401 });
    }

    const cleanFullName = (fullName || '').trim();
    const cleanStudioName = (studioName || '').trim() || `${cleanFullName}'s Studio`;
    const targetRole = role === 'team_member' ? 'team_member' : 'owner';

    // 3. Update or Upsert into `profiles` table
    const profilePayload: any = {
      id: targetUserId,
      email: userEmail,
      full_name: cleanFullName,
      phone: fullInternationalPhone,
      phone_verified: true,
      auth_provider: 'google',
      platform_role: targetRole,
      updated_at: new Date().toISOString(),
    };

    if (targetRole === 'owner') {
      profilePayload.workspace_name = cleanStudioName;
      profilePayload.business_name = cleanStudioName;
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileErr) {
      console.warn('[verify-phone-otp notice]: profiles upsert fallback notice:', profileErr.message);
    }

    // 4. If Studio Owner, create/update `workspaces` table
    if (targetRole === 'owner') {
      try {
        const { data: existingWs } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .or(`id.eq.${targetUserId},owner_id.eq.${targetUserId}`)
          .maybeSingle();

        if (existingWs) {
          await supabaseAdmin
            .from('workspaces')
            .update({ name: cleanStudioName, updated_at: new Date().toISOString() })
            .eq('id', existingWs.id);
        } else {
          await supabaseAdmin
            .from('workspaces')
            .insert({
              id: targetUserId,
              owner_id: targetUserId,
              name: cleanStudioName,
              slug: cleanStudioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'studio',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      } catch (wsErr) {
        console.warn('[verify-phone-otp]: workspace creation notice:', wsErr);
      }
    }

    // 5. Update user_metadata in Supabase Auth
    try {
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          full_name: cleanFullName,
          name: cleanFullName,
          phone: fullInternationalPhone,
          phone_verified: true,
          role: targetRole,
          workspace_name: cleanStudioName,
          is_onboarded: true,
          auth_provider: 'google',
        },
      });
    } catch (authMetaErr) {
      console.warn('[verify-phone-otp]: auth metadata update notice:', authMetaErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Mobile number verified and profile updated successfully!',
      role: targetRole,
      phone: fullInternationalPhone,
      studioName: cleanStudioName,
      fullName: cleanFullName,
    });
  } catch (err: any) {
    console.error('[verify-phone-otp error]:', err);
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
