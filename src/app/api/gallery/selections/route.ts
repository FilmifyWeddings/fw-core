import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Resilient local fallback store in case PostgreSQL table hasn't been migrated yet
const FALLBACK_DIR = path.join(process.cwd(), '.gallery_selections_cache');
function getFallbackFile(galleryId: string) {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    return path.join(FALLBACK_DIR, `${galleryId}.json`);
  } catch (_) {
    return null;
  }
}

function readFallback(galleryId: string): Record<string, any> {
  try {
    const f = getFallbackFile(galleryId);
    if (f && fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeFallback(galleryId: string, email: string, data: any) {
  try {
    const f = getFallbackFile(galleryId);
    if (!f) return;
    const current = readFallback(galleryId);
    current[email] = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(f, JSON.stringify(current, null, 2), 'utf8');
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const galleryId = searchParams.get('gallery_id');
  const email = searchParams.get('email');

  if (!galleryId) {
    return NextResponse.json({ success: false, error: 'gallery_id is required' }, { status: 400 });
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  try {
    // 1. Try PostgreSQL table
    if (normalizedEmail) {
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('*')
        .eq('gallery_id', galleryId)
        .eq('client_email', normalizedEmail)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          selection: data,
          selected_photo_ids: data.selected_photo_ids || [],
        });
      }
    } else {
      // List all selections for studio workspace (excluding internal configuration record)
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('*')
        .eq('gallery_id', galleryId)
        .neq('client_email', '__config__')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return NextResponse.json({
          success: true,
          selections: data,
        });
      }
    }
  } catch (_) {}

  // 2. Fallback to local cache if table is not yet created in Supabase
  const fallbackData = readFallback(galleryId);
  if (normalizedEmail) {
    const sel = fallbackData[normalizedEmail] || null;
    return NextResponse.json({
      success: true,
      selection: sel,
      selected_photo_ids: sel?.selected_photo_ids || [],
      is_fallback: true,
    });
  }

  const list = Object.entries(fallbackData)
    .filter(([k]) => k !== '__config__')
    .map(([, v]) => v);
  return NextResponse.json({
    success: true,
    selections: list,
    is_fallback: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, client_name, client_email, selected_photo_ids, max_limit, is_submitted, action } = body;

    if (!gallery_id) {
      return NextResponse.json(
        { success: false, error: 'gallery_id is required' },
        { status: 400 }
      );
    }

    // Action: Studio Owner Unlocks Client Selection
    if (action === 'unlock') {
      const emailToUnlock = (client_email || '').toLowerCase().trim();
      let query = supabaseAdmin
        .from('gallery_album_selections')
        .update({
          is_submitted: false,
          submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('gallery_id', gallery_id);

      if (emailToUnlock) {
        query = query.eq('client_email', emailToUnlock);
      }

      await query;
      return NextResponse.json({ success: true, message: 'Selection unlocked for client editing.' });
    }

    // Action: Studio Owner sets Max Limit from Share Modal or Selections Tab
    if (action === 'set_limit' && max_limit) {
      const numLimit = Number(max_limit);
      try {
        // Upsert configuration row so it persists even if no client has submitted yet
        await supabaseAdmin
          .from('gallery_album_selections')
          .upsert({
            gallery_id,
            client_email: '__config__',
            client_name: 'Gallery Configuration',
            max_limit: numLimit,
            selected_photo_ids: [],
            total_count: 0,
            is_submitted: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'gallery_id,client_email' });

        // Also update all existing client rows for this gallery
        await supabaseAdmin
          .from('gallery_album_selections')
          .update({
            max_limit: numLimit,
            updated_at: new Date().toISOString(),
          })
          .eq('gallery_id', gallery_id);
      } catch (err) {
        console.warn('[set_limit] DB warning:', err);
      }

      writeFallback(gallery_id, '__config__', {
        gallery_id,
        client_name: 'Gallery Configuration',
        client_email: '__config__',
        max_limit: numLimit,
        selected_photo_ids: [],
        total_count: 0,
        is_submitted: false,
      });

      return NextResponse.json({ success: true, max_limit: numLimit });
    }

    // Action: Studio Owner Saves Share Settings (PINs, Don't Ask PIN Toggles, Max Selection Limit)
    if (action === 'save_share_settings') {
      const {
        guest_pin,
        admin_pin,
        guest_skip_pin,
        full_access_skip_pin,
        selection_skip_pin,
        max_limit: customMaxLimit,
      } = body;

      // 1. Update PINs in event_galleries
      const galUpdates: any = {};
      if (guest_pin !== undefined && guest_pin !== null) {
        galUpdates.guest_pin = String(guest_pin).trim();
      }
      if (admin_pin !== undefined && admin_pin !== null) {
        galUpdates.admin_pin = String(admin_pin).trim();
        galUpdates.pin_code = String(admin_pin).trim();
      }

      if (Object.keys(galUpdates).length > 0) {
        try {
          await supabaseAdmin
            .from('event_galleries')
            .update(galUpdates)
            .eq('id', gallery_id);
        } catch (dbPinErr) {
          console.warn('[save_share_settings] event_galleries update warning:', dbPinErr);
        }
      }

      // 2. Fetch existing config to merge notes
      let existingNotes: any = {};
      let curMax = 50;
      try {
        const { data: curConfig } = await supabaseAdmin
          .from('gallery_album_selections')
          .select('notes, max_limit')
          .eq('gallery_id', gallery_id)
          .eq('client_email', '__config__')
          .maybeSingle();

        if (curConfig?.notes) {
          try {
            existingNotes = JSON.parse(curConfig.notes);
          } catch (_) {}
        }
        if (curConfig?.max_limit) {
          curMax = curConfig.max_limit;
        }
      } catch (_) {}

      const updatedNotes = {
        ...existingNotes,
        ...(guest_skip_pin !== undefined ? { guest_skip_pin: Boolean(guest_skip_pin) } : {}),
        ...(full_access_skip_pin !== undefined ? { full_access_skip_pin: Boolean(full_access_skip_pin) } : {}),
        ...(selection_skip_pin !== undefined ? { selection_skip_pin: Boolean(selection_skip_pin) } : {}),
      };

      const finalMaxLimit = customMaxLimit ? Number(customMaxLimit) : curMax;

      try {
        await supabaseAdmin
          .from('gallery_album_selections')
          .upsert({
            gallery_id,
            client_email: '__config__',
            client_name: 'Gallery Configuration',
            max_limit: finalMaxLimit,
            notes: JSON.stringify(updatedNotes),
            selected_photo_ids: [],
            total_count: 0,
            is_submitted: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'gallery_id,client_email' });

        if (customMaxLimit) {
          await supabaseAdmin
            .from('gallery_album_selections')
            .update({ max_limit: finalMaxLimit })
            .eq('gallery_id', gallery_id);
        }
      } catch (dbConfigErr) {
        console.warn('[save_share_settings] gallery_album_selections config upsert warning:', dbConfigErr);
      }

      writeFallback(gallery_id, '__config__', {
        gallery_id,
        client_name: 'Gallery Configuration',
        client_email: '__config__',
        max_limit: finalMaxLimit,
        notes: JSON.stringify(updatedNotes),
        ...galUpdates,
        selected_photo_ids: [],
        total_count: 0,
        is_submitted: false,
      });

      return NextResponse.json({
        success: true,
        max_limit: finalMaxLimit,
        share_settings: updatedNotes,
        ...galUpdates,
      });
    }

    const normalizedEmail = (client_email || 'guest@gallery.local').toLowerCase().trim();
    const cleanName = (client_name || 'Guest Client').trim();
    const photoIds = Array.isArray(selected_photo_ids) ? selected_photo_ids : [];
    const limit = Number(max_limit) || 50;
    const isSubmitted = Boolean(is_submitted);

    // Always mirror to fallback cache for instantaneous resilience
    writeFallback(gallery_id, normalizedEmail, {
      gallery_id,
      client_name: cleanName,
      client_email: normalizedEmail,
      selected_photo_ids: photoIds,
      max_limit: limit,
      total_count: photoIds.length,
      is_submitted: isSubmitted,
      submitted_at: isSubmitted ? new Date().toISOString() : null,
    });

    // Save to PostgreSQL table
    try {
      const updateData: any = {
        gallery_id,
        client_name: cleanName,
        client_email: normalizedEmail,
        selected_photo_ids: photoIds,
        max_limit: limit,
        total_count: photoIds.length,
        updated_at: new Date().toISOString(),
      };

      if (is_submitted !== undefined) {
        updateData.is_submitted = isSubmitted;
        if (isSubmitted) {
          updateData.submitted_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .upsert(updateData, { onConflict: 'gallery_id,client_email' })
        .select()
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, selection: data });
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      selection: {
        gallery_id,
        client_name: cleanName,
        client_email: normalizedEmail,
        selected_photo_ids: photoIds,
        max_limit: limit,
        total_count: photoIds.length,
        is_submitted: isSubmitted,
        submitted_at: isSubmitted ? new Date().toISOString() : null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
