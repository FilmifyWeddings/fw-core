import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, event_type = 'view', count = 1 } = body;

    if (!gallery_id) {
      return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
    }

    // 1. Fetch current config/analytics from gallery_album_selections (__config__)
    const { data: configRow } = await supabaseAdmin
      .from('gallery_album_selections')
      .select('id, notes, workspace_id')
      .eq('gallery_id', gallery_id)
      .eq('client_email', '__config__')
      .maybeSingle();

    let notesObj: any = {};
    if (configRow?.notes) {
      try {
        notesObj = JSON.parse(configRow.notes);
      } catch (_) {
        notesObj = {};
      }
    }

    const currentViews = Number(notesObj.views_count) || 0;
    const currentDownloads = Number(notesObj.downloads_count) || 0;

    let updatedViews = currentViews;
    let updatedDownloads = currentDownloads;

    if (event_type === 'view') {
      updatedViews += Number(count) || 1;
      notesObj.views_count = updatedViews;
    } else if (event_type === 'download') {
      updatedDownloads += Number(count) || 1;
      notesObj.downloads_count = updatedDownloads;
    }

    const updatedNotes = JSON.stringify(notesObj);

    if (configRow) {
      await supabaseAdmin
        .from('gallery_album_selections')
        .update({
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', configRow.id);
    } else {
      // Create new config row if none exists
      // Fetch workspace_id from event_galleries
      const { data: gal } = await supabaseAdmin
        .from('event_galleries')
        .select('workspace_id')
        .eq('id', gallery_id)
        .maybeSingle();

      const wsId = gal?.workspace_id || '00000000-0000-0000-0000-000000000000';

      await supabaseAdmin.from('gallery_album_selections').insert({
        workspace_id: wsId,
        gallery_id,
        client_name: '__config__',
        client_email: '__config__',
        notes: updatedNotes,
        selected_photo_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      event_type,
      views_count: updatedViews,
      downloads_count: updatedDownloads,
    });
  } catch (err: any) {
    console.warn('[AnalyticsTrack] Error tracking event:', err?.message);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
