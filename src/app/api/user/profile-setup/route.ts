import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

/**
 * GET /api/user/profile-setup
 * Returns full profile details for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, userEmail } = await resolveRequestUser(req);
    const targetUserId = userId;

    if (!targetUserId || targetUserId === 'demo_user') {
      return NextResponse.json({
        success: true,
        profile: {
          id: 'demo_user',
          fullName: 'Studio Owner',
          studioName: 'StudioCore Workspace',
          email: userEmail || 'user@studiocore.in',
          phone: '',
          address: '',
          avatarUrl: '',
          logoUrl: '',
          instagram: '',
          youtube: '',
          facebook: '',
        },
      });
    }

    // 1. Fetch Profile row
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    // 2. Fetch Workspace row
    const { data: wsData } = await supabaseAdmin
      .from('workspaces')
      .select('name, logo_url')
      .or(`id.eq.${targetUserId},owner_id.eq.${targetUserId}`)
      .maybeSingle();

    // 3. Fetch Auth User metadata
    let userMeta: Record<string, any> = {};
    let email = userEmail;
    try {
      const { data: userRec } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (userRec?.user) {
        userMeta = userRec.user.user_metadata || {};
        email = userRec.user.email || email;
      }
    } catch (e) {}

    const effectiveStudioName = wsData?.name || profile?.workspace_name || userMeta.workspace_name || 'My Studio';

    return NextResponse.json({
      success: true,
      profile: {
        id: targetUserId,
        fullName: profile?.full_name || userMeta.full_name || userMeta.name || '',
        studioName: effectiveStudioName,
        email: email || '',
        phone: profile?.phone || userMeta.phone || '',
        address: profile?.address || userMeta.address || '',
        avatarUrl: profile?.avatar_url || userMeta.avatar_url || '',
        logoUrl: profile?.logo_url || wsData?.logo_url || userMeta.logo_url || '',
        instagram: profile?.instagram_handle || userMeta.instagram_handle || '',
        youtube: profile?.youtube_handle || userMeta.youtube_handle || '',
        facebook: profile?.facebook_handle || userMeta.facebook_handle || '',
        isOnboarded: !!userMeta.is_onboarded,
      },
    });
  } catch (err: any) {
    console.error('[Get Profile Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * POST /api/user/profile-setup
 * Saves or updates complete Studio Profile details in Supabase (profiles, workspaces, and auth.users).
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
      youtube,
      facebook,
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
    const cleanYoutube = (youtube || '').trim();
    const cleanFacebook = (facebook || '').trim();
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
    if (avatarUrl !== undefined) profilePayload.avatar_url = avatarUrl;
    if (logoUrl !== undefined) profilePayload.logo_url = logoUrl;
    if (cleanInstagram !== undefined) profilePayload.instagram_handle = cleanInstagram;
    if (cleanYoutube !== undefined) profilePayload.youtube_handle = cleanYoutube;
    if (cleanFacebook !== undefined) profilePayload.facebook_handle = cleanFacebook;
    if (cleanAddress !== undefined) profilePayload.address = cleanAddress;

    try {
      await supabaseAdmin.from('profiles').upsert(profilePayload, { onConflict: 'id' });
    } catch (profileErr) {
      console.warn('[Profile Upsert Warning]:', profileErr);
    }

    // 2. Update or Upsert in public.workspaces table
    if (cleanStudioName) {
      try {
        const { data: existingWs } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .or(`id.eq.${targetUserId},owner_id.eq.${targetUserId}`)
          .maybeSingle();

        if (existingWs?.id) {
          await supabaseAdmin
            .from('workspaces')
            .update({
              name: cleanStudioName,
              logo_url: logoUrl || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingWs.id);
        } else {
          await supabaseAdmin
            .from('workspaces')
            .insert([{
              id: targetUserId,
              owner_id: targetUserId,
              name: cleanStudioName,
              logo_url: logoUrl || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }]);
        }
      } catch (wsErr) {
        console.warn('[Workspaces Table Update Warning]:', wsErr);
      }
    }

    // 3. Update Supabase Auth User Metadata
    try {
      const userMeta: Record<string, any> = {};
      if (cleanStudioName) userMeta.workspace_name = cleanStudioName;
      if (cleanFullName) userMeta.full_name = cleanFullName;
      if (cleanPhone) userMeta.phone = cleanPhone;
      if (avatarUrl !== undefined) userMeta.avatar_url = avatarUrl;
      if (logoUrl !== undefined) userMeta.logo_url = logoUrl;
      if (cleanInstagram !== undefined) userMeta.instagram_handle = cleanInstagram;
      if (cleanYoutube !== undefined) userMeta.youtube_handle = cleanYoutube;
      if (cleanFacebook !== undefined) userMeta.facebook_handle = cleanFacebook;
      if (cleanAddress !== undefined) userMeta.address = cleanAddress;
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
        fullName: cleanFullName,
        phone: cleanPhone,
        avatarUrl,
        logoUrl,
        instagram: cleanInstagram,
        youtube: cleanYoutube,
        facebook: cleanFacebook,
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
