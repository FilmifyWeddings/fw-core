import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteFromR2 } from '@/lib/r2-storage';
import {
  hasMoodboardB2Credentials,
  uploadMoodboardToB2,
  deleteMoodboardFromB2,
  isMoodboardB2Url,
  isR2MoodboardUrl,
} from '@/lib/storage/moodboardB2Client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB raw upload safety cap
const TARGET_KB_SOFT_LIMIT = 80 * 1024; // ~80 KB adaptive WebP target for fast loading & tiny storage

async function compressBufferToCompactWebP(
  rawBuffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; contentType: string; compressed: boolean }> {
  // SVG cannot always convert cleanly in sharp without librsvg issues; leave SVG untouched if uploaded
  if (mimeType === 'image/svg+xml') {
    return { buffer: rawBuffer, contentType: mimeType, compressed: false };
  }

  try {
    // Pass 1: Crisp 1080px WebP at quality 68 (~30-75 KB for typical wedding moodboard photos)
    let out = await sharp(rawBuffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 68, effort: 6, smartSubsample: true })
      .toBuffer();

    // Pass 2: If still > 80 KB (e.g. high-detail texture / confetti photo), tighten quality to 54
    if (out.byteLength > TARGET_KB_SOFT_LIMIT) {
      const pass2 = await sharp(rawBuffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 54, effort: 6, smartSubsample: true })
        .toBuffer();
      if (pass2.byteLength < out.byteLength) out = pass2;
    }

    // Pass 3: If still > 85 KB, tighten to quality 42
    if (out.byteLength > 85 * 1024) {
      const pass3 = await sharp(rawBuffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 42, effort: 6, smartSubsample: true })
        .toBuffer();
      if (pass3.byteLength < out.byteLength) out = pass3;
    }

    // Pass 4: If still > 95 KB, downscale to 840px at quality 46 while maintaining clear subject sharpness
    if (out.byteLength > 95 * 1024) {
      const pass4 = await sharp(rawBuffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 840, height: 840, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 46, effort: 6, smartSubsample: true })
        .toBuffer();
      if (pass4.byteLength < out.byteLength) out = pass4;
    }

    return { buffer: out, contentType: 'image/webp', compressed: true };
  } catch (err: any) {
    console.warn('[Moodboard Upload] Sharp WebP compression fallback:', err?.message || err);
    return {
      buffer: rawBuffer,
      contentType: mimeType || 'image/webp',
      compressed: false,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!hasMoodboardB2Credentials()) {
      return NextResponse.json(
        {
          error:
            'Backblaze B2 credentials are not configured on this server. Set B2_MOODBOARD_ACCESS_KEY_ID & B2_MOODBOARD_SECRET_ACCESS_KEY (or B2_GALLERY_ACCESS_KEY_ID & B2_GALLERY_SECRET_ACCESS_KEY).',
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawToken = ((formData.get('token') as string) || '').trim();
    const rawFolder = ((formData.get('folder') as string) || '').trim();
    const rawSection = ((formData.get('section') as string) || 'photos').trim();
    let clientId = ((formData.get('clientId') as string) || '').trim();
    let workspaceId = ((formData.get('workspaceId') as string) || '').trim();

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const tokenFromFolder = rawFolder.startsWith('moodboards/')
      ? rawFolder.replace(/^moodboards\//, '').split('/')[0]
      : '';
    const token = rawToken || tokenFromFolder || 'mb';

    const mimeType = (file.type || '').toLowerCase();
    const fileName = file.name || `moodboard_${Date.now()}.webp`;
    const isImageByMime = mimeType.startsWith('image/');
    const isImageByExt = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(fileName);

    if (!isImageByMime && !isImageByExt) {
      return NextResponse.json(
        { error: 'Only image files are supported for Mood Board photo uploads.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    // Resolve authoritative workspace_id and client_id from DB so every client gets an isolated B2 prefix
    if ((!workspaceId || !clientId) && token && token !== 'mb') {
      try {
        const { data: mbRow } = await supabaseAdmin
          .from('client_moodboards')
          .select('workspace_id, client_id')
          .eq('token', token)
          .maybeSingle();

        if (mbRow) {
          if (!workspaceId && mbRow.workspace_id) workspaceId = String(mbRow.workspace_id);
          if (!clientId && mbRow.client_id) clientId = String(mbRow.client_id);
        }
      } catch (_) {}
    }

    if (!workspaceId && clientId) {
      try {
        const { data: clRow } = await supabaseAdmin
          .from('workspace_clients')
          .select('workspace_id, user_id')
          .eq('id', clientId)
          .maybeSingle();
        if (clRow) {
          workspaceId = String(clRow.workspace_id || clRow.user_id || '');
        }
      } catch (_) {}
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const originalBytes = rawBuffer.byteLength;

    const { buffer: finalBuffer, contentType } = await compressBufferToCompactWebP(
      rawBuffer,
      mimeType || 'image/webp'
    );

    const { url, key, bucket } = await uploadMoodboardToB2(finalBuffer, {
      workspaceId: workspaceId || 'shared',
      clientId: clientId || token || 'general',
      token,
      section: rawSection,
      contentType,
    });

    console.log(
      `[Moodboard B2 Upload] ${key} (${bucket}): ${(originalBytes / 1024).toFixed(1)} KB -> ${(finalBuffer.byteLength / 1024).toFixed(1)} KB (${contentType})`
    );

    return NextResponse.json({
      success: true,
      url,
      key,
      bucket,
      storage: 'backblaze-b2',
      format: contentType === 'image/webp' ? 'webp' : contentType,
      originalBytes,
      sizeBytes: finalBuffer.byteLength,
      workspaceId: workspaceId || 'shared',
      clientId: clientId || token || 'general',
    });
  } catch (err: any) {
    console.error('[Moodboard B2 Upload API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload moodboard image to Backblaze B2' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlOrKey = (body.url || body.key || '').trim();

    if (!urlOrKey) {
      return NextResponse.json({ error: 'Missing url or key parameter' }, { status: 400 });
    }

    // Legacy Cloudflare R2 moodboard file backward compatibility
    if (isR2MoodboardUrl(urlOrKey)) {
      const deleted = await deleteFromR2(urlOrKey);
      return NextResponse.json({
        success: true,
        deleted,
        storage: 'cloudflare-r2-legacy',
      });
    }

    // New Backblaze B2 moodboard file delete
    if (isMoodboardB2Url(urlOrKey)) {
      const deleted = await deleteMoodboardFromB2(urlOrKey);
      return NextResponse.json({
        success: true,
        deleted,
        storage: 'backblaze-b2',
      });
    }

    return NextResponse.json({
      success: true,
      deleted: false,
      skipped: true,
    });
  } catch (err: any) {
    console.error('[Moodboard B2 Delete API Error]:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete moodboard media' },
      { status: 500 }
    );
  }
}
