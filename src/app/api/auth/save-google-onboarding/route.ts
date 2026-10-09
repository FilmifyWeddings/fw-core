import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

/**
 * POST /api/auth/save-google-onboarding
 * Direct, fast onboarding for Google-verified users.
 * Saves mandatory mobile number, full name, role, studio details, and avatar directly to Supabase.
 * Strictly non-destructive: only creates or updates the target authenticated user's records.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      phone,
      fullName,
      studioName,
      role = 'owner',
      countryCode = '+91',
      avatarUrl,
    } = body;

    // 1. Validate Mandatory Mobile Number
    if (!phone) {
      return NextResponse.json({ error: 'Mobile number is mandatory' }, { status: 400 });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    const national10 = cleanDigits.slice(-10);
    const codeDigits = String(countryCode).replace(/\D/g, '') || '91';
    const fullInternationalPhone = `+${codeDigits}${national10}`;

    // 2. Validate Full Name
    const cleanFullName = String(fullName || '').trim();
    if (!cleanFullName) {
      return NextResponse.json({ error: 'Full Name is required' }, { status: 400 });
    }

    // 3. Validate Role & Studio Name
    const targetRole = role === 'team_member' ? 'team_member' : 'owner';
    const cleanStudioName = String(studioName || '').trim() || (cleanFullName ? `${cleanFullName}'s Studio` : 'My Studio');

    if (targetRole === 'owner' && !cleanStudioName) {
      return NextResponse.json({ error: 'Studio / Brand Name is required for Studio Owners' }, { status: 400 });
    }

    // 4. Resolve Authenticated User Session
    const { userId, userEmail } = await resolveRequestUser(req);
    const targetUserId = userId && userId !== 'demo_user' ? userId : null;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User session required to complete onboarding' }, { status: 401 });
    }

    // 5. Enforce unique phone number (prevent phone hijacking across accounts)
    try {
      const { data: existingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, phone')
        .or(`phone.eq.${fullInternationalPhone},phone.eq.${codeDigits}${national10},phone.ilike.%${national10}%`)
        .limit(2);

      const belongsToOtherUser = existingProfiles?.some((p) => p.id !== targetUserId);
      if (belongsToOtherUser && existingProfiles && existingProfiles.length > 0) {
        return NextResponse.json({
          error: 'This mobile number is already registered with another account. Please use your own unique mobile number.',
        }, { status: 409 });
      }
    } catch (checkErr) {
      console.warn('[save-google-onboarding]: phone uniqueness check notice:', checkErr);
    }

    // 6. Non-destructively upsert into `profiles` table
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

    if (avatarUrl) {
      profilePayload.avatar_url = avatarUrl;
    }

    if (targetRole === 'owner') {
      profilePayload.workspace_name = cleanStudioName;
      profilePayload.business_name = cleanStudioName;
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (profileErr) {
      console.warn('[save-google-onboarding]: profiles upsert notice:', profileErr.message);
    }

    // 7. If Studio Owner, create or update `workspaces` table safely
    if (targetRole === 'owner') {
      try {
        const { data: existingWs } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .or(`id.eq.${targetUserId},owner_id.eq.${targetUserId}`)
          .maybeSingle();

        if (existingWs) {
          const wsUpdatePayload: any = {
            name: cleanStudioName,
            updated_at: new Date().toISOString(),
          };
          if (avatarUrl) wsUpdatePayload.logo_url = avatarUrl;

          await supabaseAdmin
            .from('workspaces')
            .update(wsUpdatePayload)
            .eq('id', existingWs.id);
        } else {
          await supabaseAdmin
            .from('workspaces')
            .insert({
              id: targetUserId,
              owner_id: targetUserId,
              name: cleanStudioName,
              logo_url: avatarUrl || null,
              slug: cleanStudioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'studio',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      } catch (wsErr) {
        console.warn('[save-google-onboarding]: workspace creation notice:', wsErr);
      }
    }

    // 8. Update user_metadata in Supabase Auth
    try {
      const userMetaUpdate: any = {
        full_name: cleanFullName,
        name: cleanFullName,
        phone: fullInternationalPhone,
        phone_verified: true,
        role: targetRole,
        workspace_name: cleanStudioName,
        is_onboarded: true,
        auth_provider: 'google',
      };
      if (avatarUrl) userMetaUpdate.avatar_url = avatarUrl;

      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: userMetaUpdate,
      });
    } catch (authMetaErr) {
      console.warn('[save-google-onboarding]: auth metadata update notice:', authMetaErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Account profile and workspace activated successfully!',
      role: targetRole,
      phone: fullInternationalPhone,
      studioName: cleanStudioName,
      fullName: cleanFullName,
      avatarUrl: avatarUrl || undefined,
    });
  } catch (err: any) {
    console.error('[save-google-onboarding error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete profile onboarding' }, { status: 500 });
  }
}
