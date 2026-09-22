import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function calculateCompletionPercentage(data: Record<string, any>): number {
  const eventTypeStr = (data.event_type || data.title || '').toLowerCase();
  const isPreWedding = eventTypeStr.includes('pre-wedding') || eventTypeStr.includes('pre wedding');

  let score = 0;

  if (isPreWedding) {
    // 5 Clean Sections for Pre-Wedding:
    // 1. Couple Photos (20%) - only if at least 1 photo has a valid url
    if (Array.isArray(data.couple_photos) && data.couple_photos.some((p: any) => p && typeof p.url === 'string' && p.url.trim())) {
      score += 20;
    }

    // 2. Shoot Coordinators (20%) - only if at least one coordinator has non-empty name or phone
    const coord = data.shoot_coordination || {};
    const brideCoord = coord.bride_coordinator || data.bride_coordinator;
    const groomCoord = coord.groom_coordinator || data.groom_coordinator;
    const hasBrideCoord = Boolean(brideCoord && (brideCoord.name?.trim() || brideCoord.phone?.trim()));
    const hasGroomCoord = Boolean(groomCoord && (groomCoord.name?.trim() || groomCoord.phone?.trim()));
    if (hasBrideCoord || hasGroomCoord) {
      score += 20;
    }

    // 3. Shoot Places (30%) - only if user uploaded photos, added notes/comments, or customized place name
    if (Array.isArray(data.shoot_places) && data.shoot_places.length > 0) {
      const hasValidPlace = data.shoot_places.some((p: any) =>
        Boolean(
          p.couple_photo_url?.trim() ||
          p.bride_photo_url?.trim() ||
          p.groom_photo_url?.trim() ||
          p.location_notes?.trim() ||
          p.comments?.trim() ||
          (p.place_name?.trim() && !p.place_name.trim().match(/^Location \d+$/i))
        )
      );
      if (hasValidPlace) score += 30;
    }

    // 4. Inspo / Pose Ideas (15%) - only if at least 1 valid url
    const inspos = Array.isArray(data.photo_references) ? data.photo_references : (Array.isArray(data.inspiration_links) ? data.inspiration_links : []);
    if (inspos.some((r: any) => r && (r.url?.trim() || r.pinterest_url?.trim()))) {
      score += 15;
    }

    // 5. Video References (15%) - only if at least 1 valid url
    if (Array.isArray(data.video_references) && data.video_references.some((v: any) => v && v.url?.trim())) {
      score += 15;
    }

    return Math.min(100, score);
  }

  // Original 8 Sections for Wedding and other events:
  // 1. Couple Photos (15%)
  if (Array.isArray(data.couple_photos) && data.couple_photos.some((p: any) => p && typeof p.url === 'string' && p.url.trim())) {
    score += 15;
  }

  // 2. Social Handles (10%)
  if (Boolean(data.bride_instagram?.trim() || data.groom_instagram?.trim() || data.couple_instagram?.trim())) {
    score += 10;
  }

  // 3. Event Coordinators (15%)
  const bCoords = Array.isArray(data.bride_coordinator)
    ? data.bride_coordinator
    : (Array.isArray(data.bride_coordinators) ? data.bride_coordinators : (data.bride_coordinator ? [data.bride_coordinator] : []));
  const gCoords = Array.isArray(data.groom_coordinator)
    ? data.groom_coordinator
    : (Array.isArray(data.groom_coordinators) ? data.groom_coordinators : (data.groom_coordinator ? [data.groom_coordinator] : []));
  const hasCoord = bCoords.some((c: any) => c?.name?.trim() || c?.phone?.trim()) ||
                   gCoords.some((c: any) => c?.name?.trim() || c?.phone?.trim());
  if (hasCoord) {
    score += 15;
  }

  // 4. Close Family Photos (15%)
  if (Array.isArray(data.close_family_photos) && data.close_family_photos.some((f: any) => f && f.url?.trim())) {
    score += 15;
  }

  // 5. Inspo Links (15%)
  const weddingInspos = Array.isArray(data.photo_references) ? data.photo_references : (Array.isArray(data.inspiration_links) ? data.inspiration_links : []);
  if (weddingInspos.some((r: any) => r && (r.url?.trim() || r.pinterest_url?.trim()))) {
    score += 15;
  }

  // 6. Video References (10%)
  if (Array.isArray(data.video_references) && data.video_references.some((v: any) => v && v.url?.trim())) {
    score += 10;
  }

  // 7. Event Itinerary (15%) - only if event name is present and at least one detail is filled
  if (Array.isArray(data.itinerary_schedule) && data.itinerary_schedule.some((it: any) =>
    it && it.event_name?.trim() && Boolean(
      it.date?.trim() || it.venue_name?.trim() || it.start_time?.trim() || it.rituals_notes?.trim() || it.bride_outfit_url?.trim() || it.groom_outfit_url?.trim()
    )
  )) {
    score += 15;
  }

  // 8. Payment Contacts (5%)
  const pContacts = Array.isArray(data.payment_contact)
    ? data.payment_contact
    : (Array.isArray(data.payment_contacts) ? data.payment_contacts : (data.payment_contact ? [data.payment_contact] : []));
  if (pContacts.some((c: any) => c?.name?.trim() || c?.phone?.trim())) {
    score += 5;
  }

  return Math.min(100, score);
}

// GET: Public Magic Token lookup
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // 1. Find moodboard by token
    const { data: moodboard, error: mbErr } = await supabaseAdmin
      .from('client_moodboards')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (mbErr) {
      console.error('[Moodboard Token GET Error]:', mbErr);
      return NextResponse.json({ error: 'Failed to retrieve mood board' }, { status: 500 });
    }

    if (!moodboard) {
      return NextResponse.json({ error: 'Mood board not found or link has expired' }, { status: 404 });
    }

    // 2. Fetch Client Info
    let clientInfo: any = null;
    const { data: clientData } = await supabaseAdmin
      .from('workspace_clients')
      .select('id, name, phone, email, event_type, event_date, notes')
      .eq('id', moodboard.client_id)
      .maybeSingle();

    if (clientData) {
      clientInfo = clientData;
    }

    // 3. Fetch Studio Profile / Branding
    let studioInfo: any = {
      name: null,
      logo: null,
      phone: null,
      email: null,
    };

    if (moodboard.workspace_id) {
      let sName: string | null = null;
      let sLogo: string | null = null;

      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('name, logo_url, owner_id')
        .eq('id', moodboard.workspace_id)
        .maybeSingle();

      if (ws?.name) {
        sName = ws.name;
        sLogo = ws.logo_url;
      }

      const profileId = ws?.owner_id || moodboard.workspace_id;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('workspace_name, business_name, company, logo_url, phone, email, leads_table_preferences')
        .eq('id', profileId)
        .maybeSingle();

      if (profile) {
        const prefCompany = profile.leads_table_preferences?.invoice_company_name;
        sName = sName || prefCompany || profile.business_name || profile.company || profile.workspace_name || null;
        sLogo = sLogo || profile.logo_url || profile.leads_table_preferences?.invoice_logo_url || null;
        studioInfo = {
          name: sName,
          logo: sLogo,
          phone: profile.phone || profile.leads_table_preferences?.invoice_phone || null,
          email: profile.email || profile.leads_table_preferences?.invoice_email || null,
        };
      } else if (sName) {
        studioInfo.name = sName;
        studioInfo.logo = sLogo;
      }
    }

    return NextResponse.json({
      success: true,
      moodboard,
      client: clientInfo,
      studio: studioInfo,
    });
  } catch (error: any) {
    console.error('[Moodboard GET Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST/PUT: Update Moodboard by Token (Client side auto-save or submission)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const body = await req.json();
    const isSubmitting = body.submit === true;

    // Check if exists
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('client_moodboards')
      .select('id, workspace_id, client_id, status, event_type, title')
      .eq('token', token)
      .maybeSingle();

    if (existErr || !existing) {
      return NextResponse.json({ error: 'Mood board not found' }, { status: 404 });
    }

    const mergedData = { ...existing, ...body };
    const completion = calculateCompletionPercentage(mergedData);

    const updatePayload: Record<string, any> = {
      completion_percentage: completion,
      updated_at: new Date().toISOString(),
    };

    // Pre-Wedding & General fields:
    if (body.couple_photos !== undefined) updatePayload.couple_photos = body.couple_photos;
    if (body.shoot_coordination !== undefined) updatePayload.shoot_coordination = body.shoot_coordination;
    if (body.shoot_places !== undefined) updatePayload.shoot_places = body.shoot_places;
    if (body.photo_references !== undefined) updatePayload.photo_references = body.photo_references;
    else if (body.inspiration_links !== undefined) updatePayload.photo_references = body.inspiration_links;
    if (body.video_references !== undefined) updatePayload.video_references = body.video_references;
    
    // Wedding & Other event fields:
    if (body.bride_instagram !== undefined) updatePayload.bride_instagram = body.bride_instagram;
    if (body.groom_instagram !== undefined) updatePayload.groom_instagram = body.groom_instagram;
    if (body.couple_instagram !== undefined) updatePayload.couple_instagram = body.couple_instagram;
    
    // Coordinators: store in JSONB columns bride_coordinator & groom_coordinator (do NOT write to non-existent bride_coordinators)
    if (body.bride_coordinators !== undefined) {
      updatePayload.bride_coordinator = body.bride_coordinators;
    } else if (body.bride_coordinator !== undefined) {
      updatePayload.bride_coordinator = body.bride_coordinator;
    }

    if (body.groom_coordinators !== undefined) {
      updatePayload.groom_coordinator = body.groom_coordinators;
    } else if (body.groom_coordinator !== undefined) {
      updatePayload.groom_coordinator = body.groom_coordinator;
    }

    if (body.close_family_photos !== undefined) updatePayload.close_family_photos = body.close_family_photos;
    if (body.itinerary_schedule !== undefined) updatePayload.itinerary_schedule = body.itinerary_schedule;

    // Payment contacts: store in JSONB column payment_contact (do NOT write to non-existent payment_contacts)
    if (body.payment_contacts !== undefined) {
      updatePayload.payment_contact = body.payment_contacts;
    } else if (body.payment_contact !== undefined) {
      updatePayload.payment_contact = body.payment_contact;
    }

    // Optional metadata:
    if (body.event_type !== undefined) updatePayload.event_type = body.event_type;
    if (body.title !== undefined) updatePayload.title = body.title;

    if (isSubmitting) {
      updatePayload.status = 'SUBMITTED';
      updatePayload.submitted_at = new Date().toISOString();
    } else if (body.status) {
      updatePayload.status = body.status;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('client_moodboards')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) {
      console.error('[Moodboard Update Error]:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      moodboard: updated,
      completion_percentage: completion,
      message: isSubmitting ? 'Mood board submitted successfully to the studio!' : 'Progress saved successfully.',
    });
  } catch (error: any) {
    console.error('[Moodboard Update Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
