import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractEmbeddingFromBase64, normalizeVector, cosineSimilarity } from '@/lib/faceAI';
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
    const basePhone = cleanPhone.split('#')[0];
    const cleanEmail = guest_email?.trim()?.toLowerCase() || null;
    const inputName = guest_name.trim();
    const normalizedInputName = inputName.toLowerCase();

    // 2. Multi-Guest Registration Engine:
    // Query existing registrations for this gallery matching this phone or email
    let existingQuery = supabaseAdmin
      .from('event_guest_registrations')
      .select('*')
      .eq('gallery_id', gallery.id);

    if (basePhone && cleanEmail) {
      existingQuery = existingQuery.or(`guest_phone.ilike.${basePhone}%,guest_email.eq.${cleanEmail}`);
    } else if (basePhone) {
      existingQuery = existingQuery.ilike('guest_phone', `${basePhone}%`);
    } else if (cleanEmail) {
      existingQuery = existingQuery.eq('guest_email', cleanEmail);
    }

    const { data: existingGuests } = await existingQuery;

    // Check if there is an exact name match (Same person re-registering or updating selfie)
    const existingGuest = (existingGuests || []).find(
      (g) => g.guest_name && g.guest_name.trim().toLowerCase() === normalizedInputName
    ) || null;

    // Disambiguate phone numbers for family members sharing the same number:
    // Postgres has a UNIQUE (gallery_id, guest_phone) constraint.
    // Person 1: +919876543210
    // Person 2 (Spouse/Child): +919876543210#2
    // Person 3: +919876543210#3
    let finalPhone = cleanPhone;
    if (!existingGuest) {
      const samePhoneGuests = (existingGuests || []).filter(
        (g) => g.guest_phone && (g.guest_phone === basePhone || g.guest_phone.startsWith(`${basePhone}#`))
      );
      if (samePhoneGuests.length > 0) {
        finalPhone = `${basePhone}#${samePhoneGuests.length + 1}`;
      } else {
        finalPhone = basePhone;
      }
    }

    // 3. Upload compressed selfie to Backblaze B2 (tiny KB size WebP)
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

    // 4. Extract 512-D Vector Embedding from Selfie
    let embedding: number[] = [];
    if (selfieBase64) {
      embedding = await extractEmbeddingFromBase64(selfieBase64);
    }
    if ((!embedding || embedding.length !== 512) && existingGuest?.face_embedding && Array.isArray(existingGuest.face_embedding) && existingGuest.face_embedding.length === 512) {
      embedding = existingGuest.face_embedding;
    }
    if (embedding && embedding.length === 512) {
      embedding = normalizeVector(embedding);
    } else {
      embedding = [];
    }

    // 4.5. Compute instant matches against existing photo faces in this gallery
    const matchedPhotoIds: string[] = [];
    if (embedding && embedding.length === 512) {
      try {
        const { data: existingFaces } = await supabaseAdmin
          .from('photo_faces')
          .select('photo_id, embedding')
          .eq('gallery_id', gallery.id);

        if (existingFaces && existingFaces.length > 0) {
          const matchedSet = new Set<string>();
          for (const ef of existingFaces) {
            const efEmb = Array.isArray(ef.embedding)
              ? ef.embedding
              : (typeof ef.embedding === 'string' ? JSON.parse(ef.embedding) : null);

            if (efEmb && efEmb.length === 512) {
              const sim = cosineSimilarity(embedding, efEmb);
              if (sim >= 0.40) {
                matchedSet.add(ef.photo_id);
              }
            }
          }
          matchedPhotoIds.push(...Array.from(matchedSet));
        }
      } catch (err) {
        console.warn('[GuestRegister] Error matching against existing gallery faces:', err);
      }
    }

    // If guest is already registered: Return existing profile and update matched photos
    if (existingGuest) {
      const mergedMatches = Array.from(
        new Set([
          ...(Array.isArray(existingGuest.matched_photo_ids) ? existingGuest.matched_photo_ids : []),
          ...matchedPhotoIds,
        ])
      );

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (selfie_url) updatePayload.selfie_url = selfie_url;
      if (embedding.length === 512) updatePayload.face_embedding = embedding;
      if (guest_name?.trim()) updatePayload.guest_name = guest_name.trim();
      if (mergedMatches.length > 0) updatePayload.matched_photo_ids = mergedMatches;

      const { data: updatedGuest } = await supabaseAdmin
        .from('event_guest_registrations')
        .update(updatePayload)
        .eq('id', existingGuest.id)
        .select()
        .maybeSingle();

      const activeRecord = updatedGuest || existingGuest;

      let matchedPhotos: any[] = [];
      if (mergedMatches.length > 0) {
        try {
          const { data: pData } = await supabaseAdmin
            .from('gallery_photos')
            .select('id, gallery_id, preview_key, thumbnail_key, original_key, width, height, created_at, is_selected')
            .in('id', mergedMatches);
          matchedPhotos = (pData || []).map((p: any) => ({
            ...p,
            preview_url: `/api/gallery/image?key=${encodeURIComponent(p.preview_key)}`,
            thumbnail_url: `/api/gallery/image?key=${encodeURIComponent(p.thumbnail_key || p.preview_key)}`,
          }));
        } catch (pErr) {
          console.warn('[GuestRegister] Failed to fetch matched photo rows:', pErr);
        }
      }

      return NextResponse.json({
        success: true,
        isExistingGuest: true,
        message: 'You have already registered for this event.',
        registration: activeRecord,
        guest: activeRecord,
        guest_id: activeRecord.id,
        access_token: activeRecord.access_token,
        gallery_title: gallery.title,
        gallery_slug: gallery.slug,
        status: gallery.status,
        matched_photos: matchedPhotos,
        photos: matchedPhotos,
        matched_photos_count: matchedPhotos.length,
        embedding: embedding.length === 512 ? embedding : null,
        face_detected: embedding.length === 512,
      });
    }

    const accessToken = crypto.randomBytes(16).toString('hex');

    // 5. Insert new unique record into event_guest_registrations with instant matched photos
    const registrationRecord = {
      workspace_id: workspaceId,
      gallery_id: gallery.id,
      guest_name: inputName,
      guest_phone: finalPhone,
      guest_email: cleanEmail,
      selfie_url: selfie_url,
      face_embedding: embedding,
      access_token: accessToken,
      matched_photo_ids: matchedPhotoIds,
      notification_status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: registered, error: regErr } = await supabaseAdmin
      .from('event_guest_registrations')
      .insert(registrationRecord)
      .select()
      .maybeSingle();

    if (regErr) {
      console.error('Registration Insert Error:', regErr);
      return NextResponse.json({ success: false, error: regErr.message }, { status: 500 });
    }

    // 6. Update aggregate count on event_galleries
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

    let matchedPhotos: any[] = [];
    if (matchedPhotoIds.length > 0) {
      try {
        const { data: pData } = await supabaseAdmin
          .from('gallery_photos')
          .select('id, gallery_id, preview_key, thumbnail_key, original_key, width, height, created_at, is_selected')
          .in('id', matchedPhotoIds);
        matchedPhotos = (pData || []).map((p: any) => ({
            ...p,
            preview_url: `/api/gallery/image?key=${encodeURIComponent(p.preview_key)}`,
            thumbnail_url: `/api/gallery/image?key=${encodeURIComponent(p.thumbnail_key || p.preview_key)}`,
          }));
      } catch (pErr) {
        console.warn('[GuestRegister] Failed to fetch matched photo rows:', pErr);
      }
    }

    return NextResponse.json({
      success: true,
      isExistingGuest: false,
      message: 'Guest registered successfully',
      registration: registered || registrationRecord,
      guest: registered || registrationRecord,
      guest_id: registered?.id,
      access_token: accessToken,
      gallery_title: gallery.title,
      gallery_slug: gallery.slug,
      status: gallery.status,
      matched_photos: matchedPhotos,
      photos: matchedPhotos,
      matched_photos_count: matchedPhotos.length,
      embedding: embedding.length === 512 ? embedding : null,
      face_detected: embedding.length === 512,
    });
  } catch (err: any) {
    console.error('Guest registration exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Registration failed' }, { status: 500 });
  }
}
