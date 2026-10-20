import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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
      // List all selections for studio workspace
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .select('*')
        .eq('gallery_id', galleryId)
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

  const list = Object.values(fallbackData);
  return NextResponse.json({
    success: true,
    selections: list,
    is_fallback: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, client_name, client_email, selected_photo_ids, max_limit } = body;

    if (!gallery_id || !client_email) {
      return NextResponse.json(
        { success: false, error: 'gallery_id and client_email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = client_email.toLowerCase().trim();
    const cleanName = (client_name || 'Guest Client').trim();
    const photoIds = Array.isArray(selected_photo_ids) ? selected_photo_ids : [];
    const limit = Number(max_limit) || 50;

    // Always mirror to fallback cache for instantaneous resilience
    writeFallback(gallery_id, normalizedEmail, {
      gallery_id,
      client_name: cleanName,
      client_email: normalizedEmail,
      selected_photo_ids: photoIds,
      max_limit: limit,
    });

    // Save to PostgreSQL table
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_album_selections')
        .upsert(
          {
            gallery_id,
            client_name: cleanName,
            client_email: normalizedEmail,
            selected_photo_ids: photoIds,
            max_limit: limit,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'gallery_id,client_email' }
        )
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
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
