import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractEmbeddingFromBase64, normalizeVector } from '@/lib/faceAI';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, guest_name, guest_phone, guest_email, selfieBase64 } = body;

    if (!gallery_id || !guest_name || !guest_phone) {
      return NextResponse.json({
        success: false,
        error: 'gallery_id, guest_name, and guest_phone are required',
      }, { status: 400 });
    }

    // 1. Fetch gallery & workspace
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('id, workspace_id, title, slug, status')
      .eq('id', gallery_id)
      .maybeSingle();

    if (galErr || !gallery) {
      return NextResponse.json({ success: false, error: 'Gallery event not found' }, { status: 404 });
    }

    const workspaceId = gallery.workspace_id || '00000000-0000-0000-0000-000000000000';

    // 2. Extract 512-D Vector Embedding from Selfie
    let embedding: number[] = [];
    if (selfieBase64) {
      embedding = await extractEmbeddingFromBase64(selfieBase64);
    } else {
      embedding = new Array(512).fill(0).map(() => (Math.random() - 0.5));
    }
    embedding = normalizeVector(embedding);

    const accessToken = crypto.randomBytes(16).toString('hex');
    const cleanPhone = guest_phone.replace(/[^0-9+]/g, '');

    // 3. Upsert into event_guest_registrations
    const registrationRecord = {
      workspace_id: workspaceId,
      gallery_id: gallery.id,
      guest_name: guest_name.trim(),
      guest_phone: cleanPhone,
      guest_email: guest_email?.trim() || null,
      selfie_url: selfieBase64 ? selfieBase64.slice(0, 200) : null,
      face_embedding: embedding,
      access_token: accessToken,
      notification_status: 'PENDING',
      updated_at: new Date().toISOString(),
    };

    const { data: registered, error: regErr } = await supabaseAdmin
      .from('event_guest_registrations')
      .upsert(registrationRecord, { onConflict: 'gallery_id,guest_phone' })
      .select()
      .maybeSingle();

    if (regErr) {
      console.error('Registration Upsert Error:', regErr);
    }

    // 4. Update count on event_galleries
    try {
      const { count } = await supabaseAdmin
        .from('event_guest_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_id', gallery.id);

      if (typeof count === 'number') {
        await supabaseAdmin
          .from('event_galleries')
          .update({ total_registered_guests: count })
          .eq('id', gallery.id);
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Guest pre-registered successfully',
      registration: registered || registrationRecord,
      gallery_title: gallery.title,
      gallery_slug: gallery.slug,
      access_token: accessToken,
    });
  } catch (err: any) {
    console.error('Guest registration exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 });
  }
}
