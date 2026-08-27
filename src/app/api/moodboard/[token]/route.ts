import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function calculateCompletionPercentage(data: Record<string, any>): number {
  let score = 0;
  const weights = {
    couple_photos: 15, // >= 1 photo
    social_handles: 10, // at least 1 handle
    coordinators: 10, // bride or groom coordinator filled
    close_family: 10, // >= 1 family photo
    photo_references: 15, // >= 1 visual inspiration
    video_references: 10, // >= 1 video ref
    itinerary_schedule: 10, // >= 1 event schedule
    venue_locations: 10, // >= 1 venue location
    outfit_references: 5, // >= 1 outfit
    payment_contact: 5, // payment contact filled
  };

  if (Array.isArray(data.couple_photos) && data.couple_photos.length > 0) {
    score += weights.couple_photos;
  }
  if (data.bride_instagram || data.groom_instagram || data.couple_instagram) {
    score += weights.social_handles;
  }
  if (
    (data.bride_coordinator && (data.bride_coordinator.name || data.bride_coordinator.phone)) ||
    (data.groom_coordinator && (data.groom_coordinator.name || data.groom_coordinator.phone))
  ) {
    score += weights.coordinators;
  }
  if (Array.isArray(data.close_family_photos) && data.close_family_photos.length > 0) {
    score += weights.close_family;
  }
  if (Array.isArray(data.photo_references) && data.photo_references.length > 0) {
    score += weights.photo_references;
  }
  if (Array.isArray(data.video_references) && data.video_references.length > 0) {
    score += weights.video_references;
  }
  if (Array.isArray(data.itinerary_schedule) && data.itinerary_schedule.length > 0) {
    score += weights.itinerary_schedule;
  }
  if (Array.isArray(data.venue_locations) && data.venue_locations.length > 0) {
    score += weights.venue_locations;
  }
  if (Array.isArray(data.outfit_references) && data.outfit_references.length > 0) {
    score += weights.outfit_references;
  }
  if (data.payment_contact && (data.payment_contact.name || data.payment_contact.phone)) {
    score += weights.payment_contact;
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
      name: 'StudioCore Photography',
      logo: null,
      phone: null,
      email: null,
    };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('workspace_name, business_name, company, logo_url, phone, email')
      .eq('id', moodboard.workspace_id)
      .maybeSingle();

    if (profile) {
      studioInfo = {
        name: profile.business_name || profile.workspace_name || profile.company || 'StudioCore Photography',
        logo: profile.logo_url || null,
        phone: profile.phone || null,
        email: profile.email || null,
      };
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
      .select('id, workspace_id, client_id, status')
      .eq('token', token)
      .maybeSingle();

    if (existErr || !existing) {
      return NextResponse.json({ error: 'Mood board not found' }, { status: 404 });
    }

    const completion = calculateCompletionPercentage(body);

    const updatePayload: Record<string, any> = {
      completion_percentage: completion,
      updated_at: new Date().toISOString(),
    };

    if (body.couple_photos !== undefined) updatePayload.couple_photos = body.couple_photos;
    if (body.bride_instagram !== undefined) updatePayload.bride_instagram = body.bride_instagram;
    if (body.groom_instagram !== undefined) updatePayload.groom_instagram = body.groom_instagram;
    if (body.couple_instagram !== undefined) updatePayload.couple_instagram = body.couple_instagram;
    if (body.bride_coordinator !== undefined) updatePayload.bride_coordinator = body.bride_coordinator;
    if (body.groom_coordinator !== undefined) updatePayload.groom_coordinator = body.groom_coordinator;
    if (body.close_family_photos !== undefined) updatePayload.close_family_photos = body.close_family_photos;
    if (body.photo_references !== undefined) updatePayload.photo_references = body.photo_references;
    if (body.video_references !== undefined) updatePayload.video_references = body.video_references;
    if (body.itinerary_schedule !== undefined) updatePayload.itinerary_schedule = body.itinerary_schedule;
    if (body.venue_locations !== undefined) updatePayload.venue_locations = body.venue_locations;
    if (body.outfit_references !== undefined) updatePayload.outfit_references = body.outfit_references;
    if (body.payment_contact !== undefined) updatePayload.payment_contact = body.payment_contact;

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
      message: isSubmitting ? 'Mood board submitted successfully to the studio!' : 'Progress auto-saved successfully.',
    });
  } catch (error: any) {
    console.error('[Moodboard Update Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
