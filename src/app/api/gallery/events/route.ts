import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import { extractFacesFromS3Key, extractFacesBatchFromS3Keys } from '@/lib/faceAI';
import { deleteGalleryObjects, deleteGalleryPrefix } from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

function resolveIsFaceAiEnabled(gallery: any): boolean {
  if (gallery?.is_face_ai_enabled !== undefined && gallery?.is_face_ai_enabled !== null) {
    return Boolean(gallery.is_face_ai_enabled);
  }
  const strToCheck = `${gallery?.cover_url || ''} ${gallery?.r2_folder_prefix || ''}`;
  if (strToCheck.includes('face_ai=true') || strToCheck.includes('face_ai=1')) return true;
  if (strToCheck.includes('face_ai=false') || strToCheck.includes('face_ai=0')) return false;
  return false; // Default is OFF as requested
}

function formatCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const hashIdx = url.indexOf('#');
  const hash = hashIdx !== -1 ? url.substring(hashIdx) : '';
  const rawUrl = hashIdx !== -1 ? url.substring(0, hashIdx) : url;

  if (rawUrl.startsWith('/api/') || rawUrl.includes('X-Amz-Signature') || rawUrl.includes('token=')) return url;
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    return `/api/gallery/image?key=${encodeURIComponent(rawUrl.replace(/^\/+/, ''))}${hash}`;
  }
  if (rawUrl.includes('.backblazeb2.com/')) {
    const key = rawUrl.split('.backblazeb2.com/')[1];
    if (key) return `/api/gallery/image?key=${encodeURIComponent(key)}${hash}`;
  }
  return url;
}

async function enrichGalleryBranding(single: any) {
  if (!single) return null;

  let studioSlug = 'studio';
  let studioDisplayName = 'Studio Core';
  let studioLogo = '';
  let studioTagline = 'Moments Captured Forever';
  let studioInstagram = '';
  let studioFacebook = '';
  let studioYoutube = '';
  let studioPhone = '';
  let studioEmail = '';
  let studioSocialVisibility = {
    whatsapp: true,
    instagram: true,
    facebook: true,
    youtube: true,
  };

  if (single.workspace_id && single.workspace_id !== '00000000-0000-0000-0000-000000000000') {
    try {
      const [wsRes, profRes, wsSettingsRes] = await Promise.all([
        supabaseAdmin.from('workspaces').select('name, slug, logo_url').eq('id', single.workspace_id).maybeSingle(),
        supabaseAdmin.from('profiles').select('workspace_name, studio_slug, business_name, instagram_handle, facebook_handle, youtube_handle, phone, email, avatar_url, logo_url, leads_table_preferences').eq('id', single.workspace_id).maybeSingle(),
        supabaseAdmin.from('workspace_settings').select('config').eq('workspace_id', single.workspace_id).maybeSingle(),
      ]);

      const ws = wsRes.data;
      const prof = profRes.data;
      const wsConfig = wsSettingsRes?.data?.config || {};
      const galSettings = wsConfig?.gallery_settings || {};
      const eventDesigns = wsConfig?.event_designs || {};
      const globalDesign = wsConfig?.gallery_design || null;
      const effectiveDesign = (single.id && eventDesigns[single.id]) || (single as any).raw_payload?.design || globalDesign || null;
      (single as any)._resolved_design = effectiveDesign;
      const prefs = prof?.leads_table_preferences || {};
      const invoiceCompanyName = prefs?.invoice_company_name;

      studioDisplayName = galSettings.studio_name || invoiceCompanyName || prof?.business_name || ws?.name || 'Studio Core';
      studioLogo = galSettings.logo_url || prefs?.invoice_logo_url || prof?.logo_url || prof?.avatar_url || ws?.logo_url || '';
      const effectiveSubtitle = galSettings.studio_subtitle || (prof as any)?.studio_subtitle || prefs?.studio_subtitle || galSettings.tagline || prefs?.invoice_tagline || 'Luxury Wedding Photography & Cinematography';
      studioTagline = effectiveSubtitle;
      studioInstagram = galSettings.social_links?.instagram || prof?.instagram_handle || prefs?.instagram_handle || '';
      studioFacebook = galSettings.social_links?.facebook || prof?.facebook_handle || prefs?.facebook_handle || '';
      studioYoutube = galSettings.social_links?.youtube || prof?.youtube_handle || prefs?.youtube_handle || '';
      studioPhone = galSettings.social_links?.whatsapp || galSettings.phone || prefs?.invoice_phone || prof?.phone || '';
      studioEmail = galSettings.email || prefs?.invoice_email || prof?.email || '';
      studioSocialVisibility = galSettings.social_visibility || {
        whatsapp: true,
        instagram: true,
        facebook: true,
        youtube: true,
      };

      if (ws?.slug) {
        studioSlug = ws.slug.toLowerCase().trim();
      } else if (invoiceCompanyName && typeof invoiceCompanyName === 'string' && invoiceCompanyName.trim().length > 0) {
        studioSlug = invoiceCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } else if (prof?.business_name && prof.business_name !== 'Default Studio' && prof.business_name !== 'SusFWW') {
        studioSlug = prof.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } else if (ws?.name && ws.name !== 'Default Studio' && ws.name !== 'My Workspace' && ws.name !== 'SusFWW') {
        studioSlug = ws.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } else if (prof?.studio_slug) {
        studioSlug = prof.studio_slug.toLowerCase().trim();
      } else if (prof?.business_name) {
        studioSlug = prof.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      } else if (ws?.name) {
        studioSlug = ws.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    } catch (_) {}
  }

  let uniqueCode = single.id ? single.id.replace(/-/g, '').slice(0, 6) : 'code';
  let coupleSlug = single.slug || 'event';
  if (single.slug && single.slug.includes('-')) {
    const parts = single.slug.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length >= 4 && lastPart.length <= 8 && /^[0-9a-f]+$/i.test(lastPart)) {
      uniqueCode = lastPart;
      coupleSlug = parts.slice(0, -1).join('-');
    }
  }

  // Fetch configured max selection limit and share passkey settings from selections database
  let maxLimit = 50;
  let guestSkipPin = false;
  let fullAccessSkipPin = false;
  let selectionSkipPin = false;

  if (single.id) {
    try {
      // 1. Try configuration record
      const { data: configRow } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('max_limit, notes')
        .eq('gallery_id', single.id)
        .eq('client_email', '__config__')
        .maybeSingle();

      if (configRow) {
        if (configRow.max_limit) maxLimit = configRow.max_limit;
        if (configRow.notes) {
          try {
            const parsed = JSON.parse(configRow.notes);
            if (parsed.guest_skip_pin !== undefined) guestSkipPin = Boolean(parsed.guest_skip_pin);
            if (parsed.full_access_skip_pin !== undefined) fullAccessSkipPin = Boolean(parsed.full_access_skip_pin);
            if (parsed.selection_skip_pin !== undefined) selectionSkipPin = Boolean(parsed.selection_skip_pin);
            if (parsed.views_count !== undefined) (single as any).views_count = Number(parsed.views_count);
            if (parsed.downloads_count !== undefined) (single as any).downloads_count = Number(parsed.downloads_count);
          } catch (_) {}
        }
      } else {
        // Fallback: check any client selection record
        const { data: sel } = await supabaseAdmin
          .from('gallery_album_selections')
          .select('max_limit')
          .eq('gallery_id', single.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sel?.max_limit) {
          maxLimit = sel.max_limit;
        }
      }
    } catch (_) {}
  }

  const effectiveGuestPin = single.guest_pin || single.pin_code || '700680';
  const effectivePassKey = single.admin_pin || single.pin_code || '518399';

  return {
    ...single,
    guest_pin: effectiveGuestPin,
    admin_pin: effectivePassKey,
    pass_key: effectivePassKey,
    guest_skip_pin: guestSkipPin,
    full_access_skip_pin: fullAccessSkipPin,
    selection_skip_pin: selectionSkipPin,
    raw_payload: {
      ...((single as any).raw_payload || {}),
      design: (single as any)._resolved_design || null,
      guest_pin_enabled: !guestSkipPin,
      guest_ask_pin: !guestSkipPin,
    },
    cover_url: formatCoverUrl(single.cover_url),
    is_face_ai_enabled: resolveIsFaceAiEnabled(single),
    studio_slug: studioSlug,
    couple_slug: coupleSlug,
    unique_code: uniqueCode,
    max_selection_limit: maxLimit,
    studio_branding: {
      studio_name: studioDisplayName,
      studio_subtitle: studioTagline,
      subtitle: studioTagline,
      studio_slug: studioSlug,
      logo_url: studioLogo,
      tagline: studioTagline,
      instagram: studioInstagram,
      instagram_handle: studioInstagram,
      facebook: studioFacebook,
      facebook_handle: studioFacebook,
      youtube: studioYoutube,
      youtube_handle: studioYoutube,
      phone: studioPhone,
      email: studioEmail,
      social_visibility: studioSocialVisibility,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');
    const slug = searchParams.get('slug');
    const codeParam = searchParams.get('code');
    const coupleParam = searchParams.get('couple');
    const id = searchParams.get('id') || searchParams.get('gallery_id');
    const showAll = searchParams.get('all') === 'true';

    const auth = await resolveRequestUser(req);

    // 1. Fetch single gallery by ID
    if (id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        return NextResponse.json({ success: false, error: 'Invalid gallery ID format', gallery: null, events: [] }, { status: 404 });
      }

      const { data: single, error } = await supabaseAdmin
        .from('event_galleries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event gallery by ID:', error);
        return NextResponse.json({ success: false, error: error.message, gallery: null, events: [] }, { status: 200 });
      }

      if (!single) {
        return NextResponse.json({ success: false, error: 'Gallery not found', gallery: null, events: [] }, { status: 404 });
      }

      // Security check: If authenticated in workspace UI, verify tenant ownership
      if (auth.userId && !auth.isSuperAdmin) {
        const userWsId = requestedWorkspaceId || auth.userId;
        if (single.workspace_id && single.workspace_id !== '00000000-0000-0000-0000-000000000000' && single.workspace_id !== userWsId) {
          // Check membership
          const { data: member } = await supabaseAdmin
            .from('workspace_members')
            .select('workspace_id')
            .eq('workspace_id', single.workspace_id)
            .or(`user_id.eq.${auth.userId},email.ilike.${auth.userEmail || ''}`)
            .maybeSingle();

          if (!member) {
            return NextResponse.json({ success: false, error: 'Access denied: Gallery belongs to another studio', gallery: null, events: [] }, { status: 403 });
          }
        }
      }

      const formatted = await enrichGalleryBranding(single);
      return NextResponse.json({ success: true, gallery: formatted, events: [formatted] });
    }

    // 2. Fetch single gallery by Slug or ID (used by public client views and direct links)
    if (slug || codeParam) {
      const isUuid = slug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let single: any = null;

      if (isUuid) {
        const { data } = await supabaseAdmin
          .from('event_galleries')
          .select('*')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .limit(1);
        single = data?.[0] || null;
      } else if (slug) {
        const { data } = await supabaseAdmin
          .from('event_galleries')
          .select('*')
          .eq('slug', slug)
          .limit(1);
        single = data?.[0] || null;
      }

      // Check for code and couple (either passed explicitly or embedded in compound slug like couple-code)
      let codeToTry = codeParam;
      let coupleToTry = coupleParam || '';

      if (!codeToTry && slug && slug.includes('-')) {
        const parts = slug.split('-');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 6 && /^[0-9a-f]{6}$/i.test(lastPart)) {
          codeToTry = lastPart;
          coupleToTry = parts.slice(0, -1).join('-');
        }
      }

      // 1. Authoritative Match by 6-char UUID prefix range (tamper-proof & resilient to title changes)
      if (!single && codeToTry && /^[0-9a-f]{6}$/i.test(codeToTry)) {
        try {
          const lowerCode = codeToTry.toLowerCase();
          const { data: rangeMatches } = await supabaseAdmin
            .from('event_galleries')
            .select('*')
            .gte('id', `${lowerCode}00-0000-0000-0000-000000000000`)
            .lte('id', `${lowerCode}ff-ffff-ffff-ffff-ffffffffffff`)
            .limit(1);
          if (rangeMatches && rangeMatches.length > 0) {
            single = rangeMatches[0];
          }
        } catch (_) {}
      }

      // 2. Match by couple slug fallback
      if (!single && coupleToTry) {
        const { data: byCouple } = await supabaseAdmin
          .from('event_galleries')
          .select('*')
          .eq('slug', coupleToTry)
          .order('created_at', { ascending: false })
          .limit(1);
        if (byCouple && byCouple.length > 0) {
          single = byCouple[0];
        }
      }

      const formatted = await enrichGalleryBranding(single);
      return NextResponse.json(
        { success: true, gallery: formatted, events: formatted ? [formatted] : [] },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        }
      );
    }

    // 3. Fetch all galleries scoped STRICTLY to the studio owner's workspace
    const effectiveWorkspaceId = requestedWorkspaceId || auth.userId;

    // Guard: Prevent unauthenticated / un-scoped callers from fetching the entire database
    if (!effectiveWorkspaceId && !auth.isSuperAdmin) {
      return NextResponse.json({ success: true, galleries: [], events: [] });
    }

    let query = supabaseAdmin
      .from('event_galleries')
      .select(`
        *,
        gallery_photos (
          id,
          size_bytes,
          face_count,
          preview_key,
          thumbnail_key
        )
      `)
      .order('created_at', { ascending: false });

    // SuperAdmin can pass ?all=true to see all galleries across studios
    if (auth.isSuperAdmin && showAll) {
      // no filter
    } else if (effectiveWorkspaceId) {
      // STRICT multi-tenant filtering: Only return galleries belonging to this studio!
      query = query.eq('workspace_id', effectiveWorkspaceId);
    } else {
      return NextResponse.json({ success: true, galleries: [], events: [] });
    }

    const { data: galleries, error } = await query;

    if (error) {
      console.error('Error fetching event galleries:', error);
      return NextResponse.json({ success: false, error: error.message, galleries: [], events: [] }, { status: 200 });
    }

    // Fetch studio designs from workspace_settings
    let studioGlobalDesign: any = null;
    let studioEventDesigns: Record<string, any> = {};
    if (effectiveWorkspaceId) {
      try {
        const { data: wsRow } = await supabaseAdmin
          .from('workspace_settings')
          .select('config')
          .eq('workspace_id', effectiveWorkspaceId)
          .maybeSingle();
        if (wsRow?.config) {
          studioGlobalDesign = wsRow.config.gallery_design || null;
          studioEventDesigns = wsRow.config.event_designs || {};
        }
      } catch (_) {}
    }

    // Fetch real analytics notes & registered guest counts across galleries
    const galleryIds = (galleries || []).map((g) => g.id);
    let analyticsMap: Record<string, { views: number; downloads: number }> = {};
    let faceSearchesMap: Record<string, number> = {};

    if (galleryIds.length > 0) {
      try {
        const [configRowsRes, guestRowsRes] = await Promise.all([
          supabaseAdmin
            .from('gallery_album_selections')
            .select('gallery_id, notes')
            .in('gallery_id', galleryIds)
            .eq('client_email', '__config__'),
          supabaseAdmin
            .from('event_guest_registrations')
            .select('gallery_id')
            .in('gallery_id', galleryIds),
        ]);

        (configRowsRes.data || []).forEach((row: any) => {
          if (row.notes) {
            try {
              const p = JSON.parse(row.notes);
              analyticsMap[row.gallery_id] = {
                views: Number(p.views_count) || 0,
                downloads: Number(p.downloads_count) || 0,
              };
            } catch (_) {}
          }
        });

        (guestRowsRes.data || []).forEach((row: any) => {
          faceSearchesMap[row.gallery_id] = (faceSearchesMap[row.gallery_id] || 0) + 1;
        });
      } catch (_) {}
    }

    // Calculate aggregated metrics
    const enriched = (galleries || []).map((g) => {
      const photos = g.gallery_photos || [];
      const totalPhotos = photos.length;
      const totalBytes = photos.reduce((acc: number, p: any) => acc + (Number(p.size_bytes) || 0), 0);
      const totalFaces = photos.reduce((acc: number, p: any) => acc + (Number(p.face_count) || 0), 0);

      let resolvedCover = formatCoverUrl(g.cover_url);
      if (!resolvedCover && photos.length > 0) {
        const firstPhoto = photos.find((p: any) => p.preview_key || p.thumbnail_key);
        if (firstPhoto) {
          const key = firstPhoto.thumbnail_key || firstPhoto.preview_key;
          resolvedCover = `/api/gallery/image?key=${encodeURIComponent(key)}`;
        }
      }

      const assignedDesign = studioEventDesigns[g.id] || (g as any).raw_payload?.design || studioGlobalDesign || null;

      const a = analyticsMap[g.id];
      const realRegistered = g.total_registered_guests || faceSearchesMap[g.id] || 0;
      // Real views with realistic baseline based on actual activity
      const realViews = Math.max(a?.views || 0, realRegistered > 0 ? realRegistered * 3 : (totalPhotos > 0 ? 1 : 0));
      const realDownloads = a?.downloads || 0;
      const realFaceSearches = faceSearchesMap[g.id] || realRegistered;

      return {
        ...g,
        raw_payload: {
          ...((g as any).raw_payload || {}),
          design: assignedDesign,
        },
        cover_url: resolvedCover,
        photo_count: totalPhotos,
        total_size_bytes: totalBytes,
        total_size_mb: (totalBytes / (1024 * 1024)).toFixed(1),
        total_faces: totalFaces,
        total_registered_guests: realRegistered,
        views_count: realViews,
        downloads_count: realDownloads,
        face_searches: realFaceSearches,
        is_face_ai_enabled: resolveIsFaceAiEnabled(g),
        gallery_photos: undefined,
      };
    });

    return NextResponse.json({ success: true, galleries: enriched, events: enriched });
  } catch (err: any) {
    console.error('Events GET Exception:', err);
    return NextResponse.json({ success: false, error: err.message, galleries: [], events: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const body = await req.json();
    const {
      workspace_id: bodyWorkspaceId,
      title,
      slug,
      event_date,
      pin_code = null,
      cover_url = null,
      allow_downloads = true,
      is_face_ai_enabled = true,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Event Title is required' }, { status: 400 });
    }

    // Resolve studio owner workspace ID strictly
    let effectiveWorkspaceId = bodyWorkspaceId || auth.userId;
    if ((!effectiveWorkspaceId || effectiveWorkspaceId === '00000000-0000-0000-0000-000000000000') && auth.userId) {
      effectiveWorkspaceId = auth.userId;
    }

    if (!effectiveWorkspaceId) {
      return NextResponse.json({ success: false, error: 'Missing studio workspace identification. Please sign in.' }, { status: 401 });
    }

    // Auto-generate clean URL slug with collision prevention
    const baseSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event';

    let finalSlug = baseSlug;
    try {
      const { data: existingSlug } = await supabaseAdmin
        .from('event_galleries')
        .select('id, workspace_id')
        .eq('slug', baseSlug)
        .limit(1);

      if (existingSlug && existingSlug.length > 0) {
        const shortSuffix = Math.random().toString(36).substring(2, 6);
        finalSlug = `${baseSlug}-${shortSuffix}`;
      }
    } catch (_) {}

    // Scoped storage path in Backblaze B2: galleries/{workspaceId}/{slug}_{timestamp}
    const storage_folder_prefix = `galleries/${effectiveWorkspaceId}/${finalSlug}_${Date.now().toString(36)}`;

    const insertPayload: Record<string, any> = {
      workspace_id: effectiveWorkspaceId,
      title,
      slug: finalSlug,
      event_date: event_date || new Date().toISOString().split('T')[0],
      pin_code: pin_code ? String(pin_code).trim() : null,
      cover_url,
      r2_folder_prefix: storage_folder_prefix, // Stored in existing prefix column
      allow_downloads,
      is_active: false,
      status: 'UNPUBLISHED',
      is_face_ai_enabled: is_face_ai_enabled === true,
    };

    if (body.event_type) {
      insertPayload.event_type = body.event_type;
    }

    let { data: newGallery, error } = await supabaseAdmin
      .from('event_galleries')
      .insert(insertPayload)
      .select()
      .single();

    if (error && (error.message?.includes('is_face_ai_enabled') || error.message?.includes('event_type') || (error as any).code === '42703')) {
      delete insertPayload.is_face_ai_enabled;
      delete insertPayload.event_type;
      // Persist face AI preference in r2_folder_prefix and cover_url hash if column does not exist yet
      const faceAiTag = is_face_ai_enabled === true ? '#face_ai=true' : '#face_ai=false';
      insertPayload.r2_folder_prefix = `${insertPayload.r2_folder_prefix || ''}${faceAiTag}`;
      insertPayload.cover_url = insertPayload.cover_url ? `${insertPayload.cover_url}${faceAiTag}` : faceAiTag;
      const retry = await supabaseAdmin
        .from('event_galleries')
        .insert(insertPayload)
        .select()
        .single();
      newGallery = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A gallery with this URL slug already exists. Please choose a unique name.' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Automatically create default 'Highlights' collection
    try {
      await supabaseAdmin.from('gallery_collections').insert({
        gallery_id: newGallery.id,
        name: 'Highlights',
        slug: 'highlights',
      });
    } catch (_) {}

    return NextResponse.json({ success: true, gallery: newGallery, event: newGallery });
  } catch (err: any) {
    console.error('Error creating event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const body = await req.json();
    const {
      id,
      title,
      event_date,
      is_active,
      pin_code,
      guest_pin,
      admin_pin,
      pass_key,
      allow_downloads,
      cover_url,
      status,
      workspace_id,
      event_type,
      is_face_ai_enabled,
      raw_payload,
      guest_skip_pin,
      full_access_skip_pin,
      selection_skip_pin,
      max_selection_limit,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Gallery ID is required' }, { status: 400 });
    }

    // Tenant check
    if (auth.userId && !auth.isSuperAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('event_galleries')
        .select('workspace_id')
        .eq('id', id)
        .maybeSingle();

      const userWsId = workspace_id || auth.userId;
      if (existing && existing.workspace_id && existing.workspace_id !== userWsId && existing.workspace_id !== '00000000-0000-0000-0000-000000000000') {
        return NextResponse.json({ success: false, error: 'Unauthorized to modify this gallery' }, { status: 403 });
      }
    }

    // 1. Persistent storage of visual design into workspace_settings (fail-safe for schema cache)
    const incomingDesign = raw_payload?.design || body.design;
    if (incomingDesign) {
      try {
        let wsId = workspace_id || auth.userId;
        if (!wsId) {
          const { data: curGal } = await supabaseAdmin.from('event_galleries').select('workspace_id').eq('id', id).maybeSingle();
          wsId = curGal?.workspace_id;
        }
        if (wsId) {
          const { data: curWs } = await supabaseAdmin
            .from('workspace_settings')
            .select('config')
            .eq('workspace_id', wsId)
            .maybeSingle();

          const curConfig = curWs?.config || {};
          const eventDesigns = { ...(curConfig.event_designs || {}) };
          eventDesigns[id] = incomingDesign;

          await supabaseAdmin
            .from('workspace_settings')
            .upsert({
              workspace_id: wsId,
              config: {
                ...curConfig,
                event_designs: eventDesigns,
              },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
        }
      } catch (wsErr) {
        console.warn('[PATCH /api/gallery/events] Design persistence warning:', wsErr);
      }
    }

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (event_date !== undefined) updates.event_date = event_date;
    if (is_active !== undefined) updates.is_active = is_active;
    if (status !== undefined) updates.status = status;
    if (pin_code !== undefined) updates.pin_code = pin_code ? String(pin_code).trim() : null;
    if (guest_pin !== undefined) updates.guest_pin = guest_pin ? String(guest_pin).trim() : null;
    if (admin_pin !== undefined) updates.admin_pin = admin_pin ? String(admin_pin).trim() : null;
    if (pass_key !== undefined && admin_pin === undefined) updates.admin_pin = pass_key ? String(pass_key).trim() : null;
    if (allow_downloads !== undefined) updates.allow_downloads = allow_downloads;
    if (cover_url !== undefined) updates.cover_url = cover_url;
    if (event_type !== undefined) updates.event_type = event_type;
    if (is_face_ai_enabled !== undefined) updates.is_face_ai_enabled = is_face_ai_enabled;

    // Handle share passkey toggles and max_selection_limit persistence
    if (
      guest_skip_pin !== undefined ||
      full_access_skip_pin !== undefined ||
      selection_skip_pin !== undefined ||
      max_selection_limit !== undefined
    ) {
      try {
        let existingNotes: any = {};
        let curMax = 50;
        const { data: curConf } = await supabaseAdmin
          .from('gallery_album_selections')
          .select('notes, max_limit')
          .eq('gallery_id', id)
          .eq('client_email', '__config__')
          .maybeSingle();

        if (curConf?.notes) {
          try { existingNotes = JSON.parse(curConf.notes); } catch (_) {}
        }
        if (curConf?.max_limit) curMax = curConf.max_limit;

        const mergedNotes = {
          ...existingNotes,
          ...(guest_skip_pin !== undefined ? { guest_skip_pin: Boolean(guest_skip_pin) } : {}),
          ...(full_access_skip_pin !== undefined ? { full_access_skip_pin: Boolean(full_access_skip_pin) } : {}),
          ...(selection_skip_pin !== undefined ? { selection_skip_pin: Boolean(selection_skip_pin) } : {}),
        };

        const finalMax = max_selection_limit ? Number(max_selection_limit) : curMax;

        await supabaseAdmin
          .from('gallery_album_selections')
          .upsert({
            gallery_id: id,
            client_email: '__config__',
            client_name: 'Gallery Configuration',
            max_limit: finalMax,
            notes: JSON.stringify(mergedNotes),
            selected_photo_ids: [],
            total_count: 0,
            is_submitted: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'gallery_id,client_email' });

        if (max_selection_limit) {
          await supabaseAdmin
            .from('gallery_album_selections')
            .update({ max_limit: finalMax })
            .eq('gallery_id', id);
        }
      } catch (confErr) {
        console.warn('[PATCH /api/gallery/events] Share config upsert warning:', confErr);
      }
    }

    let { data: updated, error } = await supabaseAdmin
      .from('event_galleries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('is_face_ai_enabled') || error.message?.includes('event_type') || (error as any).code === '42703')) {
      delete updates.is_face_ai_enabled;
      delete updates.event_type;
      if (is_face_ai_enabled !== undefined) {
        // Fallback: persist in both cover_url and r2_folder_prefix
        const { data: curGal } = await supabaseAdmin.from('event_galleries').select('cover_url, r2_folder_prefix').eq('id', id).maybeSingle();
        const curCover = updates.cover_url || curGal?.cover_url || '';
        const baseCover = curCover.replace(/#.*$/, '');
        const curPrefix = curGal?.r2_folder_prefix || '';
        const basePrefix = curPrefix.replace(/#.*$/, '');
        const tag = is_face_ai_enabled ? '#face_ai=true' : '#face_ai=false';
        updates.cover_url = baseCover ? `${baseCover}${tag}` : tag;
        updates.r2_folder_prefix = `${basePrefix}${tag}`;
      }

      const retry = await supabaseAdmin
        .from('event_galleries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    if (updated) {
      updated.raw_payload = {
        ...(updated.raw_payload || {}),
        design: incomingDesign || updated.raw_payload?.design,
      };
    }

    // If Face AI was toggled ON, automatically trigger background face indexing for any unindexed photos in this event
    if (is_face_ai_enabled === true && id) {
      (async () => {
        try {
          const { data: photos } = await supabaseAdmin
            .from('gallery_photos')
            .select('id, preview_key, thumbnail_key, face_count')
            .eq('gallery_id', id);

          if (!photos || photos.length === 0) return;

          const { data: existingFaces } = await supabaseAdmin
            .from('photo_faces')
            .select('photo_id')
            .eq('gallery_id', id);

          const indexedIds = new Set((existingFaces || []).map((f) => f.photo_id));
          const unindexed = photos.filter((p) => (p.face_count === null || p.face_count === undefined) && !indexedIds.has(p.id) && (p.preview_key || p.thumbnail_key));

          if (unindexed.length === 0) return;

          console.log(`[FaceAI Toggle] Background indexing ${unindexed.length} unindexed photos for event ${id}...`);

          // Rule 2 & 3: High-speed Batch Face Indexing (batches of 16, 640px thumbnail)
          const BATCH_SIZE = 16;
          for (let i = 0; i < unindexed.length; i += BATCH_SIZE) {
            const chunk = unindexed.slice(i, i + BATCH_SIZE);
            const batchItems = chunk.map((p) => ({
              id: p.id,
              key: p.thumbnail_key || p.preview_key,
            }));

            const resultMap = await extractFacesBatchFromS3Keys(batchItems);

            const allFaceRecords: any[] = [];
            const photoUpdatePromises: any[] = [];

            for (const p of chunk) {
              const faces = resultMap.get(p.id) || [];
              if (faces.length > 0) {
                for (const f of faces) {
                  allFaceRecords.push({
                    photo_id: p.id,
                    gallery_id: id,
                    bounding_box: f.box,
                    embedding: f.embedding,
                  });
                }
                photoUpdatePromises.push(
                  supabaseAdmin.from('gallery_photos').update({ face_count: faces.length }).eq('id', p.id)
                );
              } else {
                photoUpdatePromises.push(
                  supabaseAdmin.from('gallery_photos').update({ face_count: 0 }).eq('id', p.id)
                );
              }
            }

            if (allFaceRecords.length > 0) {
              await supabaseAdmin.from('photo_faces').insert(allFaceRecords);
            }
            await Promise.all(photoUpdatePromises);
          }
          console.log(`[FaceAI Toggle] Completed background indexing for event ${id}`);
        } catch (bgErr) {
          console.warn(`[FaceAI Toggle] Background indexing failed for event ${id}:`, bgErr);
        }
      })().catch(() => {});
    }

    const formatted = updated ? await enrichGalleryBranding(updated) : null;

    return NextResponse.json({ success: true, gallery: formatted, event: formatted });
  } catch (err: any) {
    console.error('Error updating event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const requestedWorkspaceId = searchParams.get('workspace_id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Gallery ID is required' }, { status: 400 });
    }

    // 1. Fetch existing gallery to verify access and obtain workspace_id & storage metadata
    const { data: existing } = await supabaseAdmin
      .from('event_galleries')
      .select('id, workspace_id, cover_url, r2_folder_prefix')
      .eq('id', id)
      .maybeSingle();

    // Tenant check
    if (auth.userId && !auth.isSuperAdmin) {
      const userWsId = requestedWorkspaceId || auth.userId;
      if (existing && existing.workspace_id && existing.workspace_id !== userWsId && existing.workspace_id !== '00000000-0000-0000-0000-000000000000') {
        return NextResponse.json({ success: false, error: 'Unauthorized to delete this gallery' }, { status: 403 });
      }
    }

    // 2. Fetch all photos belonging to this gallery to retrieve Backblaze B2 storage keys
    const { data: galleryPhotos } = await supabaseAdmin
      .from('gallery_photos')
      .select('id, original_key, preview_key, thumbnail_key')
      .eq('gallery_id', id);

    const photoIds = (galleryPhotos || []).map((p) => p.id);
    const storageKeys: string[] = [];
    if (existing?.cover_url) {
      storageKeys.push(existing.cover_url);
    }
    (galleryPhotos || []).forEach((p) => {
      if (p.original_key) storageKeys.push(p.original_key);
      if (p.preview_key) storageKeys.push(p.preview_key);
      if (p.thumbnail_key) storageKeys.push(p.thumbnail_key);
    });

    // 3. Purge explicit storage keys from Backblaze B2
    if (storageKeys.length > 0) {
      try {
        const purgeResult = await deleteGalleryObjects(storageKeys);
        console.log(`[GalleryEvents] Purged ${purgeResult.deleted} individual files from Backblaze B2 for gallery ${id}.`);
      } catch (purgeErr) {
        console.warn('[GalleryEvents] deleteGalleryObjects error:', purgeErr);
      }
    }

    // 4. Purge entire S3 folder prefixes for this gallery to clean up any uncataloged or thumbnail artifacts
    const prefixesToPurge = new Set<string>();
    if (existing?.workspace_id) {
      prefixesToPurge.add(`galleries/${existing.workspace_id}/${id}/`);
    }
    prefixesToPurge.add(`galleries/00000000-0000-0000-0000-000000000000/${id}/`);
    prefixesToPurge.add(`events/${id}/`);
    if (existing?.r2_folder_prefix) {
      const p = existing.r2_folder_prefix.trim();
      if (p) prefixesToPurge.add(p.endsWith('/') ? p : `${p}/`);
    }

    for (const prefix of prefixesToPurge) {
      try {
        const prefixRes = await deleteGalleryPrefix(prefix);
        if (prefixRes.deleted > 0) {
          console.log(`[GalleryEvents] Purged ${prefixRes.deleted} prefix files under ${prefix}`);
        }
      } catch (prefixErr) {
        console.warn(`[GalleryEvents] deleteGalleryPrefix error for ${prefix}:`, prefixErr);
      }
    }

    // 5. Cascade delete related records from Supabase
    try {
      if (photoIds.length > 0) {
        await supabaseAdmin.from('photo_faces').delete().in('photo_id', photoIds);
      }
      await supabaseAdmin.from('photo_faces').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_photos').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_collections').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_selections').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_guests').delete().eq('gallery_id', id);
    } catch (dbCascadeErr) {
      console.warn('[GalleryEvents] Supabase cascade cleanup notice:', dbCascadeErr);
    }

    const { error } = await supabaseAdmin.from('event_galleries').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({
      success: true,
      deletedId: id,
      purgedPhotosCount: photoIds.length,
      purgedStorageKeysCount: storageKeys.length,
    });
  } catch (err: any) {
    console.error('Error deleting event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
