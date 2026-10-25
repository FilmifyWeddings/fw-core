import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';
import {
  getGalleryPresignedUploadUrl,
  B2_GALLERY_BUCKET_NAME,
  ensureGalleryCors,
} from '@/lib/storage/galleryB2Client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const galleryId = body.galleryId || body.gallery_id;
    const requestedWorkspaceId = body.workspaceId || body.workspace_id;
    const rawFiles: Array<{ filename?: string; fileName?: string; file_name?: string; originalType?: string; content_type?: string }> =
      Array.isArray(body.files) ? body.files : (body.filename || body.fileName || body.file_name ? [{
        filename: body.filename || body.fileName || body.file_name,
        originalType: body.originalType || body.content_type || 'image/jpeg'
      }] : []);

    if (!galleryId || rawFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing galleryId or files' }, { status: 400 });
    }

    // 1. Fetch gallery details to verify existence and get studio workspace_id
    const { data: gallery, error: galErr } = await supabaseAdmin
      .from('event_galleries')
      .select('id, workspace_id, title')
      .eq('id', galleryId)
      .maybeSingle();

    if (galErr || !gallery) {
      return NextResponse.json({ success: false, error: 'Gallery not found' }, { status: 404 });
    }

    // 2. Validate multi-tenant isolation
    const auth = await resolveRequestUser(req);
    const targetWorkspaceId = gallery.workspace_id || requestedWorkspaceId || auth.userId || 'default';

    if (auth.userId && !auth.isSuperAdmin) {
      // If user is authenticated and not superadmin, verify workspace ownership
      if (gallery.workspace_id && gallery.workspace_id !== '00000000-0000-0000-0000-000000000000') {
        if (gallery.workspace_id !== auth.userId && gallery.workspace_id !== requestedWorkspaceId) {
          // Check if user is a member of this workspace
          const { data: membership } = await supabaseAdmin
            .from('workspace_members')
            .select('workspace_id')
            .eq('workspace_id', gallery.workspace_id)
            .or(`user_id.eq.${auth.userId},email.ilike.${auth.userEmail || ''}`)
            .maybeSingle();

          if (!membership) {
            return NextResponse.json({ success: false, error: 'Unauthorized to upload to this studio gallery' }, { status: 403 });
          }
        }
      }
    }

    // 3. Generate Backblaze B2 Presigned Upload URLs in parallel
    const timestamp = Date.now();
    const isBatch = Array.isArray(body.files);

    const results = await Promise.all(
      rawFiles.map(async (fileItem, index) => {
        const fname = fileItem.filename || fileItem.fileName || fileItem.file_name || `photo_${index}`;
        const ftype = fileItem.originalType || fileItem.content_type || 'image/jpeg';
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        const baseName = fname.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

        const originalKey = `galleries/${targetWorkspaceId}/${galleryId}/original/${timestamp}_${randomSuffix}_${baseName}.jpg`;
        const previewKey = `galleries/${targetWorkspaceId}/${galleryId}/previews/${timestamp}_${randomSuffix}_${baseName}.webp`;
        const thumbKey = `galleries/${targetWorkspaceId}/${galleryId}/thumbs/${timestamp}_${randomSuffix}_${baseName}.webp`;

        const [originalUploadUrl, previewUploadUrl, thumbUploadUrl] = await Promise.all([
          getGalleryPresignedUploadUrl(originalKey, ftype, 3600, B2_GALLERY_BUCKET_NAME),
          getGalleryPresignedUploadUrl(previewKey, 'image/webp', 3600, B2_GALLERY_BUCKET_NAME),
          getGalleryPresignedUploadUrl(thumbKey, 'image/webp', 3600, B2_GALLERY_BUCKET_NAME),
        ]);

        return {
          filename: fname,
          originalKey,
          previewKey,
          thumbKey,
          originalUploadUrl,
          previewUploadUrl,
          thumbUploadUrl,
        };
      })
    );

    // Asynchronously ensure CORS is configured on the bucket
    ensureGalleryCors(B2_GALLERY_BUCKET_NAME).catch(() => {});

    if (isBatch) {
      return NextResponse.json({
        success: true,
        count: results.length,
        results,
      });
    }

    // Single file response for backward compatibility
    const single = results[0];
    return NextResponse.json({
      success: true,
      originalKey: single.originalKey,
      previewKey: single.previewKey,
      thumbKey: single.thumbKey,
      originalUploadUrl: single.originalUploadUrl,
      previewUploadUrl: single.previewUploadUrl,
      thumbUploadUrl: single.thumbUploadUrl,
    });
  } catch (err: any) {
    console.error('Error generating presigned upload URLs:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to generate upload URLs' }, { status: 500 });
  }
}
