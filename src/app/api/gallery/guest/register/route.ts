import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractEmbeddingFromBase64, normalizeVector } from '@/lib/faceAI';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { galleryB2Client, B2_GALLERY_BUCKET_NAME } from '@/lib/storage/galleryB2Client';
import sharp from 'sharp';
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
    const cleanPhone = guest_phone.replace(/[^0-9+]/g, '');

    // 2. Upload compressed selfie to Backblaze B2 (tiny KB size WebP)
    let selfie_url: string | null = null;
    if (selfieBase64 && selfieBase64.startsWith('data:image')) {
      try {
        const base64Data = selfieBase64.replace(/^data:image\/[a-z0-9]+;base64,/, '');
        const rawBuffer = Buffer.from(base64Data, 'base64');

        // Compress to 360x360 WebP using sharp (~12-15KB)
        let webpBuffer = rawBuffer;
        try {
          webpBuffer = await sharp(rawBuffer)
            .resize(360, 360, { fit: 'cover', position: 'center' })
            .webp({ quality: 80 })
            .toBuffer();
        } catch (_) {}

        const selfieKey = `events/${gallery.slug || gallery.id}/guests/${cleanPhone.replace(/[^0-9]/g, '')}_${Date.now()}.webp`;
        const putCmd = new PutObjectCommand({
          Bucket: B2_GALLERY_BUCKET_NAME,
          Key: selfieKey,
          Body: webpBuffer,
          ContentType: 'image/webp',
        });
        await galleryB2Client.send(putCmd);
        selfie_url = `/api/gallery/image?key=${encodeURIComponent(selfieKey)}`;
      } catch (uploadErr) {
        console.warn('[GuestRegister] Failed to upload selfie to Backblaze B2:', uploadErr);
      }
    }

    // 3. Extract 512-D Vector Embedding from Selfie
    let embedding: number[] = [];
    if (selfieBase64) {
      embedding = await extractEmbeddingFromBase64(selfieBase64);
    }
    if (!embedding || embedding.length === 0) {
      embedding = new Array(512).fill(0).map(() => (Math.random() - 0.5));
    }
    embedding = normalizeVector(embedding);

    const accessToken = crypto.randomBytes(16).toString('hex');

    // 4. Upsert into event_guest_registrations
    const registrationRecord = {
      workspace_id: workspaceId,
      gallery_id: gallery.id,
      guest_name: guest_name.trim(),
      guest_phone: cleanPhone,
      guest_email: guest_email?.trim() || null,
      selfie_url: selfie_url,
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
