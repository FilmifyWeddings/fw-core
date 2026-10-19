import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export interface GallerySettings {
  // Tab 1: Profile & Identity
  studio_name: string;
  owner_name: string;
  tagline: string;
  about_bio: string;
  logo_url: string;
  favicon_url: string;

  // Tab 2: Branding & Social
  phone: string;
  email: string;
  website: string;
  google_maps_url: string;
  studio_address: string;
  social_links: {
    instagram: string;
    facebook: string;
    youtube: string;
    whatsapp: string;
  };

  // Tab 3: Design & Templates
  template_preset: 'royal_classic' | 'minimalist_ivory' | 'cinematic_velvet';
  accent_color: string;
  font_pairing: 'playfair_inter' | 'cormorant_jakarta' | 'cinzel_outfit' | 'syne_inter';
  show_branding_watermark: boolean;
  enable_client_favorites: boolean;
  enable_pin_protection_default: boolean;

  // Tab 4: Cover Framing
  cover_focal_point: { x: number; y: number };
  cover_zoom: number;
  cover_overlay_opacity: number;
}

const DEFAULT_GALLERY_SETTINGS: GallerySettings = {
  studio_name: 'StudioCore Photography',
  owner_name: 'Lead Photographer',
  tagline: 'Capturing Timeless Stories & Unforgettable Moments',
  about_bio: 'We are a luxury wedding photography & cinematography collective dedicated to preserving authentic emotions and unforgettable celebrations.',
  logo_url: '',
  favicon_url: '',

  phone: '+91 98765 43210',
  email: 'hello@studiocore.in',
  website: 'https://studiocore.in',
  google_maps_url: '',
  studio_address: 'Mumbai, Maharashtra, India',
  social_links: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    youtube: 'https://youtube.com/',
    whatsapp: '+919876543210',
  },

  template_preset: 'royal_classic',
  accent_color: '#D97706',
  font_pairing: 'cormorant_jakarta',
  show_branding_watermark: true,
  enable_client_favorites: true,
  enable_pin_protection_default: false,

  cover_focal_point: { x: 50, y: 50 },
  cover_zoom: 1,
  cover_overlay_opacity: 40,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWsId = searchParams.get('workspace_id');
    const auth = await resolveRequestUser(req);

    const workspaceId = requestedWsId || auth.userId;
    if (!workspaceId) {
      return NextResponse.json({ success: true, settings: DEFAULT_GALLERY_SETTINGS });
    }

    // 1. Fetch from workspace_settings table
    let savedGallerySettings: Partial<GallerySettings> | null = null;
    try {
      const { data: wsRow } = await supabaseAdmin
        .from('workspace_settings')
        .select('config')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (wsRow?.config?.gallery_settings) {
        savedGallerySettings = wsRow.config.gallery_settings;
      }
    } catch (_) {}

    // 2. Fetch profile defaults as smart fallbacks if not explicitly configured
    let profileDefaults: Partial<GallerySettings> = {};
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('studio_name, full_name, email, phone, avatar_url, logo_url')
        .eq('id', workspaceId)
        .maybeSingle();

      if (profile) {
        if (profile.studio_name) profileDefaults.studio_name = profile.studio_name;
        if (profile.full_name) profileDefaults.owner_name = profile.full_name;
        if (profile.email) profileDefaults.email = profile.email;
        if (profile.phone) profileDefaults.phone = profile.phone;
        if (profile.logo_url || profile.avatar_url) profileDefaults.logo_url = profile.logo_url || profile.avatar_url;
      }
    } catch (_) {}

    const mergedSettings: GallerySettings = {
      ...DEFAULT_GALLERY_SETTINGS,
      ...profileDefaults,
      ...(savedGallerySettings || {}),
      social_links: {
        ...DEFAULT_GALLERY_SETTINGS.social_links,
        ...(profileDefaults as any)?.social_links,
        ...(savedGallerySettings?.social_links || {}),
      },
      cover_focal_point: {
        ...DEFAULT_GALLERY_SETTINGS.cover_focal_point,
        ...(savedGallerySettings?.cover_focal_point || {}),
      },
    };

    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (err: any) {
    console.error('Error fetching gallery settings:', err);
    return NextResponse.json({ success: false, error: err.message, settings: DEFAULT_GALLERY_SETTINGS }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const body = await req.json();
    const { workspace_id: bodyWsId, settings } = body;

    const workspaceId = bodyWsId || auth.userId;
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: missing workspace ID' }, { status: 401 });
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ success: false, error: 'Settings payload is required' }, { status: 400 });
    }

    // 1. Fetch current workspace_settings config
    let existingConfig: Record<string, any> = {};
    try {
      const { data: wsRow } = await supabaseAdmin
        .from('workspace_settings')
        .select('config')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (wsRow?.config) {
        existingConfig = wsRow.config;
      }
    } catch (_) {}

    const updatedConfig = {
      ...existingConfig,
      gallery_settings: {
        ...(existingConfig.gallery_settings || {}),
        ...settings,
      },
    };

    // 2. Upsert into workspace_settings table
    const { error: upsertErr } = await supabaseAdmin
      .from('workspace_settings')
      .upsert({
        workspace_id: workspaceId,
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (upsertErr) {
      console.warn('Could not upsert workspace_settings, attempting profiles fallback:', upsertErr.message);
    }

    // 3. Sync studio identity to profiles table if relevant
    try {
      const profileUpdates: Record<string, any> = {};
      if (settings.studio_name) profileUpdates.studio_name = settings.studio_name;
      if (settings.logo_url) profileUpdates.logo_url = settings.logo_url;
      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', workspaceId);
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Gallery settings saved successfully',
      settings: updatedConfig.gallery_settings,
    });
  } catch (err: any) {
    console.error('Error saving gallery settings:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
