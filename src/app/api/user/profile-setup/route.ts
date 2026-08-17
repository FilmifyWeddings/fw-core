import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

/**
 * POST /api/user/profile-setup
 * Saves initial or updated Studio Profile details (Avatar, Logo, Studio Name, Instagram, Address).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await resolveRequestUser(req);
    const body = await req.json().catch(() => ({}));

    const {
      avatarUrl,
      logoUrl,
      studioName,
      instagram,
      address,
      fullName,
      phone,
    } = body;

    const targetUserId = userId !== 'demo_user' ? userId : body.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Unauthorized: User ID required' }, { status: 401 });
    }

    const cleanStudioName = (studioName || '').trim();
    const cleanInstagram = (instagram || '').trim();
    const cleanAddress = (address || '').trim();
    const cleanFullName = (fullName || '').trim();
    const cleanPhone = (phone || '').trim();

    // 1. Update public.profiles table
    const profilePayload: Record<string, any> = {
      id: targetUserId,
      updated_at: new Date().toISOString(),
    };

    if (cleanStudioName) profilePayload.workspace_name = cleanStudioName;
    if (cleanFullName) profilePayload.full_name = cleanFullName;
    if (cleanPhone) profilePayload.phone = cleanPhone;
    if (avatarUrl) profilePayload.avatar_url = avatarUrl;
    if (logoUrl) profilePayload.logo_url = logoUrl;
    if (cleanInstagram) profilePayload.instagram_handle = cleanInstagram;
    if (cleanAddress) profilePayload.address = cleanAddress;

    try {
      await supabaseAdmin.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    } catch (profileErr) {
      console.warn('[Profile Upsert Warning]:', profileErr);
    }

    // 2. Update Supabase Auth User Metadata
    try {
      const userMeta: Record<string, any> = {};
      if (cleanStudioName) userMeta.workspace_name = cleanStudioName;
      if (cleanFullName) userMeta.full_name = cleanFullName;
      if (cleanPhone) userMeta.phone = cleanPhone;
      if (avatarUrl) userMeta.avatar_url = avatarUrl;
      if (logoUrl) userMeta.logo_url = logoUrl;
      if (cleanInstagram) userMeta.instagram_handle = cleanInstagram;
      if (cleanAddress) userMeta.address = cleanAddress;
      userMeta.is_onboarded = true;

      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: userMeta,
      });
    } catch (authMetaErr) {
      console.warn('[Auth Metadata Update Warning]:', authMetaErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Studio profile saved successfully!',
      profile: {
        userId: targetUserId,
        studioName: cleanStudioName,
        avatarUrl,
        logoUrl,
        instagram: cleanInstagram,
        address: cleanAddress,
      },
    });
  } catch (err: any) {
    console.error('[Profile Setup Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save profile' },
      { status: 500 }
    );
  }
}
