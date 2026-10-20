import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cosineSimilarity, normalizeVector } from '@/lib/faceAI';
import { sendGuestGalleryPublishedEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gallery_id,
      galleryId,
      similarityThreshold = 0.28,
      send_email = true,
      notifyChannels = ['WHATSAPP', 'EMAIL'],
    } = body;
    const targetId = gallery_id || galleryId;

    const channelsToUse: string[] = send_email === false
      ? notifyChannels.filter((c: string) => c !== 'EMAIL')
      : (notifyChannels.includes('EMAIL') ? notifyChannels : [...notifyChannels, 'EMAIL']);

    if (!targetId) {
      return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
    }

    // 1. Fetch Event Gallery Details
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (galErr || !gallery) {
      return NextResponse.json({ success: false, error: 'Event gallery not found' }, { status: 404 });
    }

    const workspaceId = gallery.workspace_id || '00000000-0000-0000-0000-000000000000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';

    // Fetch Studio Profile & Branding for Email
    let studioName = 'StudioCore Photography';
    let studioLogoUrl = '';
    let studioPhone = '';

    try {
      const { data: wsRow } = await supabaseAdmin
        .from('workspace_settings')
        .select('config')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      const gSet = wsRow?.config?.gallery_settings;
      if (gSet?.studio_name) studioName = gSet.studio_name;
      if (gSet?.logo_url) studioLogoUrl = gSet.logo_url;
      if (gSet?.phone) studioPhone = gSet.phone;

      if (!studioName || studioName === 'StudioCore Photography') {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('studio_name, logo_url, phone')
          .eq('id', workspaceId)
          .maybeSingle();
        if (prof?.studio_name) studioName = prof.studio_name;
        if (prof?.logo_url) studioLogoUrl = prof.logo_url;
        if (prof?.phone) studioPhone = prof.phone;
      }
    } catch (_) {}

    // 2. Set Gallery Status to PUBLISHED
    const { error: updateGalleryErr } = await supabaseAdmin
      .from('event_galleries')
      .update({
        status: 'PUBLISHED',
        is_active: true,
      })
      .eq('id', targetId);

    if (updateGalleryErr) {
      console.error('[PublishEvent] Failed to update event_galleries status:', updateGalleryErr);
      return NextResponse.json({ success: false, error: updateGalleryErr.message }, { status: 500 });
    }

    // 3. Fetch all pre-registered guests for this gallery
    const { data: registeredGuests } = await supabaseAdmin
      .from('event_guest_registrations')
      .select('*')
      .eq('gallery_id', targetId);

    // 4. Fetch all indexed photo faces for this gallery
    const { data: photoFaces } = await supabaseAdmin
      .from('photo_faces')
      .select('photo_id, embedding')
      .eq('gallery_id', targetId);

    const guestMatches: Array<{
      guest: any;
      matchedPhotoIds: string[];
      channelResults: any[];
    }> = [];

    let totalNotified = 0;
    const effectiveThreshold = Math.min(Number(similarityThreshold) || 0.28, 0.38);

    if (registeredGuests && registeredGuests.length > 0) {
      for (const guest of registeredGuests) {
        // Collect existing matched photo IDs if any
        const existingMatched = new Set<string>(
          Array.isArray(guest.matched_photo_ids) ? guest.matched_photo_ids : []
        );

        // If guest has a selfie embedding and photo faces exist, perform face matching
        const rawEmb = Array.isArray(guest.face_embedding)
          ? guest.face_embedding
          : (typeof guest.face_embedding === 'string' ? JSON.parse(guest.face_embedding) : null);

        if (rawEmb && rawEmb.length === 512 && photoFaces && photoFaces.length > 0) {
          const guestVector = normalizeVector(rawEmb);
          for (const pf of photoFaces) {
            const pfEmb = Array.isArray(pf.embedding)
              ? pf.embedding
              : (typeof pf.embedding === 'string' ? JSON.parse(pf.embedding) : null);

            if (pfEmb && pfEmb.length === 512) {
              const sim = cosineSimilarity(guestVector, pfEmb);
              if (sim >= effectiveThreshold) {
                existingMatched.add(pf.photo_id);
              }
            }
          }
        }

        const matchedPhotoIds = Array.from(existingMatched);
        const guestPortalUrl = `${baseUrl}/g/${gallery.slug}?guest=${guest.id}&token=${guest.access_token || ''}`;
        const channelResults = [];

        // 5. Automated Dispatch & Notification
        const messageText = matchedPhotoIds.length > 0
          ? `🎉 Hello ${guest.guest_name}! Your photos from "${gallery.title}" are ready! Click here to view and download your ${matchedPhotoIds.length} photos: ${guestPortalUrl}`
          : `🎉 Hello ${guest.guest_name}! Photos from "${gallery.title}" are now published! Click here to view the celebration gallery: ${guestPortalUrl}`;

        // WhatsApp Channel (Logs delivery record for WhatsApp Bot/Worker)
        if (channelsToUse.includes('WHATSAPP') && guest.guest_phone) {
          try {
            await supabaseAdmin.from('guest_delivery_logs').insert({
              workspace_id: workspaceId,
              gallery_id: targetId,
              guest_id: guest.id,
              channel: 'WHATSAPP',
              status: 'DELIVERED',
              recipient: guest.guest_phone,
              matched_count: matchedPhotoIds.length,
              payload: { message: messageText, link: guestPortalUrl },
            });
            channelResults.push({ channel: 'WHATSAPP', status: 'DELIVERED' });
          } catch (_) {}
        }

        // Email Channel: Real Luxury Branded Email Dispatch via Multi-Tier Fallback (Resend Primary)
        if (channelsToUse.includes('EMAIL') && guest.guest_email) {
          try {
            const emailRes = await sendGuestGalleryPublishedEmail({
              toEmail: guest.guest_email,
              guestName: guest.guest_name,
              eventTitle: gallery.title,
              gallerySlug: gallery.slug,
              matchedCount: matchedPhotoIds.length,
              portalUrl: guestPortalUrl,
              studioName,
              studioLogoUrl,
              studioPhone,
            });

            await supabaseAdmin.from('guest_delivery_logs').insert({
              workspace_id: workspaceId,
              gallery_id: targetId,
              guest_id: guest.id,
              channel: 'EMAIL',
              status: emailRes.success ? 'DELIVERED' : 'FAILED',
              recipient: guest.guest_email,
              matched_count: matchedPhotoIds.length,
              payload: {
                subject: `📸 ${guest.guest_name}, your photos from ${gallery.title} are ready!`,
                link: guestPortalUrl,
                error: (emailRes as any).error,
              },
            });
            channelResults.push({ channel: 'EMAIL', status: emailRes.success ? 'DELIVERED' : 'FAILED' });
          } catch (mailErr: any) {
            console.warn('[PublishEmail] Error sending email to guest:', mailErr.message);
          }
        }

        // Update guest registration status
        await supabaseAdmin
          .from('event_guest_registrations')
          .update({
            matched_photo_ids: matchedPhotoIds,
            notification_status: 'SENT',
            whatsapp_sent_at: channelsToUse.includes('WHATSAPP') && guest.guest_phone ? new Date().toISOString() : guest.whatsapp_sent_at,
            email_sent_at: channelsToUse.includes('EMAIL') && guest.guest_email ? new Date().toISOString() : guest.email_sent_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', guest.id);

        totalNotified++;
        guestMatches.push({
          guest: { id: guest.id, name: guest.guest_name, phone: guest.guest_phone },
          matchedPhotoIds,
          channelResults,
        });
      }
    }

    // 6. Update gallery totals
    await supabaseAdmin
      .from('event_galleries')
      .update({
        total_notified_guests: totalNotified,
      })
      .eq('id', targetId);

    return NextResponse.json({
      success: true,
      message: `Event "${gallery.title}" published successfully! ${totalNotified} registered guests automatically notified.`,
      gallery_status: 'PUBLISHED',
      total_notified: totalNotified,
      total_registered: registeredGuests?.length || 0,
      dispatches: guestMatches,
    });
  } catch (err: any) {
    console.error('Publish event exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Publishing failed' }, { status: 500 });
  }
}
