import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB — WhatsApp protocol limit
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/3gpp',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/**
 * POST /api/integrations/baileys/upload-media
 * Validates and uploads media to Supabase 'baileys-media' bucket.
 * Returns a public URL for use in send-message.
 *
 * Form data fields:
 *   - file: File object
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ── Strict Validation ──────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `File type '${file.type}' not allowed. Supported: images, videos (mp4), audio, PDF, DOCX, XLSX`,
      }, { status: 415 });
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json({
        error: `File size ${sizeMB}MB exceeds the 16MB WhatsApp limit. Please compress the file.`,
        sizeBytes: file.size,
        maxBytes: MAX_FILE_SIZE,
      }, { status: 413 });
    }

    // ── Upload to Supabase Storage ─────────────────────────────────
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('baileys-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-media] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('baileys-media')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err) {
    console.error('[baileys/upload-media] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
