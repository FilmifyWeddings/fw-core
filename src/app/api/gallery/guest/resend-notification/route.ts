import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendGuestGalleryPublishedEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, galleryId, guest_id, guestId } = body;
    const targetGalleryId = gallery_id || galleryId;
    const targetGuestId = guest_id || guestId;

    if (!targetGalleryId) {
      return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
    }

    // 1. Fetch Gallery Details
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('*')
      .eq('id', targetGalleryId)
      .maybeSingle();

    if (galErr || !gallery) {
      return NextResponse.json({ success: false, error: 'Gallery not found' }, { status: 404 });
    }

    const workspaceId = gallery.workspace_id || '00000000-0000-0000-0000-000000000000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';

    // Studio details
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

    // 2. Fetch Guests to Resend
    let guestQuery = supabaseAdmin
      .from('event_guest_registrations')
      .select('*')
      .eq('gallery_id', targetGalleryId);

    if (targetGuestId) {
      guestQuery = guestQuery.eq('id', targetGuestId);
    } else {
      // Resend to failed or pending
      guestQuery = guestQuery.or('notification_status.eq.FAILED,notification_status.eq.PENDING,notification_status.is.null');
    }

    const { data: guests, error: guestErr } = await guestQuery;

    if (guestErr || !guests || guests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No guests requiring notification resend.',
        resentCount: 0,
      });
    }

    let resentCount = 0;
    let failedCount = 0;

    for (const guest of guests) {
      const guestName = guest.guest_name || guest.name || 'Guest';
      const guestEmail = guest.guest_email || guest.email;
      const guestPhone = guest.guest_phone || guest.phone;
      const matchedPhotoIds = Array.isArray(guest.matched_photo_ids) ? guest.matched_photo_ids : [];
      const guestPortalUrl = `${baseUrl}/g/${gallery.slug}?guest=${guest.id}&token=${guest.access_token || ''}`;

      let sentSuccess = false;

      // 1. Resend Email
      if (guestEmail) {
        try {
          const emailRes = await sendGuestGalleryPublishedEmail({
            toEmail: guestEmail,
            guestName,
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
            gallery_id: targetGalleryId,
            guest_id: guest.id,
            channel: 'EMAIL',
            status: emailRes.success ? 'DELIVERED' : 'FAILED',
            recipient: guestEmail,
            matched_count: matchedPhotoIds.length,
            payload: {
              subject: `📸 ${guestName}, your photos from ${gallery.title} are ready!`,
              link: guestPortalUrl,
              is_resend: true,
              error: (emailRes as any).error,
            },
          });

          if (emailRes.success) sentSuccess = true;
        } catch (e: any) {
          console.warn('[ResendNotification] Email error:', e?.message);
        }
      }

      // 2. Resend WhatsApp Log
      if (guestPhone) {
        const rawPhone = guestPhone.split('#')[0];
        const messageText = matchedPhotoIds.length > 0
          ? `🎉 Hello ${guestName}! Your photos from "${gallery.title}" are ready! View & download your ${matchedPhotoIds.length} photos: ${guestPortalUrl}`
          : `🎉 Hello ${guestName}! Photos from "${gallery.title}" are published! View celebration: ${guestPortalUrl}`;

        try {
          await supabaseAdmin.from('guest_delivery_logs').insert({
            workspace_id: workspaceId,
            gallery_id: targetGalleryId,
            guest_id: guest.id,
            channel: 'WHATSAPP',
            status: 'DELIVERED',
            recipient: rawPhone,
            matched_count: matchedPhotoIds.length,
            payload: { message: messageText, link: guestPortalUrl, is_resend: true },
          });
          sentSuccess = true;
        } catch (_) {}
      }

      if (sentSuccess) {
        resentCount++;
        await supabaseAdmin
          .from('event_guest_registrations')
          .update({
            notification_status: 'SENT',
            notified_at: new Date().toISOString(),
          })
          .eq('id', guest.id);
      } else {
        failedCount++;
        await supabaseAdmin
          .from('event_guest_registrations')
          .update({
            notification_status: 'FAILED',
          })
          .eq('id', guest.id);
      }
    }

    return NextResponse.json({
      success: true,
      resentCount,
      failedCount,
      totalGuests: guests.length,
      message: `Notifications resent: ${resentCount} succeeded, ${failedCount} failed.`,
    });
  } catch (err: any) {
    console.error('[ResendNotification] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
