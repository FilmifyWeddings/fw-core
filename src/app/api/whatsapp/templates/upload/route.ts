import { NextRequest, NextResponse } from 'next/server';
import { 
  uploadWhatsAppFileAndGetSignedUrl, 
  getWorkspaceWhatsAppStorageUsage,
  deleteWhatsAppFile,
} from '@/lib/services/whatsappStorageService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Allow 60s for video/document uploads

// Helper to deduce mimeType from file extension
function deduceMimeType(fName: string, rawMime?: string): string {
  const ext = (fName.split('.').pop() || '').toLowerCase();
  if (['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext)) return 'video/mp4';
  if (['pdf'].includes(ext)) return 'application/pdf';
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (['png'].includes(ext)) return 'image/png';
  if (['webp'].includes(ext)) return 'image/webp';
  if (['gif'].includes(ext)) return 'image/gif';
  if (['doc', 'docx'].includes(ext)) return 'application/msword';
  if (['xls', 'xlsx'].includes(ext)) return 'application/vnd.ms-excel';
  if (rawMime && rawMime !== 'application/octet-stream' && rawMime.trim() !== '') return rawMime;
  return 'application/octet-stream';
}

/**
 * GET /api/whatsapp/templates/upload?workspaceId=...
 * Returns current 500 MB quota stats for template uploads
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    const usage = await getWorkspaceWhatsAppStorageUsage(workspaceId);
    return NextResponse.json({ success: true, ...usage });
  } catch (error: any) {
    console.error('[TemplateUploadRoute] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/templates/upload
 * Handles template media uploads (photos, videos, documents) to Backblaze B2 private bucket
 * with automatic image compression (sharp WebP 85 for images only), raw preservation for video/PDF,
 * 500 MB quota enforcement, Supabase logging (fw_whatsapp_media_files),
 * and permanent lifetime proxy URL generation (/api/media/...).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const { searchParams } = new URL(req.url);
    let fileBuffer: Buffer | null = null;
    let fileName = `template_media_${Date.now()}`;
    let mimeType = 'application/octet-stream';
    let workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id') || '';
    let templateName = searchParams.get('templateName') || searchParams.get('template_name') || '';

    // 1. Try standard FormData if Content-Type indicates multipart
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        const file = (formData.get('file') || formData.get('media') || formData.get('attachment')) as File | null;
        workspaceId = (formData.get('workspaceId') as string) || (formData.get('workspace_id') as string) || workspaceId;
        templateName = (formData.get('templateName') as string) || (formData.get('template_name') as string) || templateName;

        if (file && typeof file.arrayBuffer === 'function') {
          fileName = file.name || fileName;
          mimeType = deduceMimeType(fileName, file.type);
          const arrayBuffer = await file.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }
      } catch (formErr) {
        console.warn('[TemplateUploadRoute] FormData parse failed, checking JSON/binary fallback:', formErr);
      }
    }

    // 2. Fallback: Parse base64 JSON payload
    if (!fileBuffer && contentType.includes('application/json')) {
      try {
        const body = await req.json();
        if (body.base64) {
          workspaceId = body.workspaceId || body.workspace_id || workspaceId;
          templateName = body.templateName || body.template_name || templateName;
          fileName = body.fileName || body.file_name || fileName;
          mimeType = deduceMimeType(fileName, body.mimeType || body.mime_type);

          const base64Data = body.base64.replace(/^data:.*?;base64,/, '');
          fileBuffer = Buffer.from(base64Data, 'base64');
        }
      } catch (jsonErr) {
        console.warn('[TemplateUploadRoute] JSON fallback parse failed:', jsonErr);
      }
    }

    // 3. Fallback: Raw binary octet-stream
    if (!fileBuffer && req.body) {
      try {
        const arrayBuffer = await req.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
          fileBuffer = Buffer.from(arrayBuffer);
          fileName = searchParams.get('fileName') || searchParams.get('file_name') || fileName;
          mimeType = deduceMimeType(fileName, contentType.split(';')[0].trim());
        }
      } catch (rawErr) {
        console.warn('[TemplateUploadRoute] Raw stream parse failed:', rawErr);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No file provided in form data or JSON payload' },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    // Upload to Backblaze B2 WhatsApp bucket under 'template' category
    // Enforces 500MB quota against vw_workspace_whatsapp_storage_usage,
    // compresses images to WebP 85 via sharp, preserves videos/PDFs as raw buffers,
    // and saves metadata into fw_whatsapp_media_files
    const result = await uploadWhatsAppFileAndGetSignedUrl({
      workspaceId,
      buffer: fileBuffer,
      fileName,
      mimeType,
      mediaCategory: 'template',
      metadata: {
        template_name: templateName,
        original_size: fileBuffer.length,
        uploaded_via: 'template_hub',
      },
    });

    return NextResponse.json({
      success: true,
      fileUrl: result.permanentUrl,
      fileName: result.fileName || fileName,
      fileSize: result.fileSizeBytes,
      fileSizeBytes: result.fileSizeBytes,
      mimeType: result.mimeType || mimeType,
      fileKey: result.fileKey,
      signedUrl: result.signedUrl,
    });
  } catch (error: any) {
    console.error('[TemplateUploadRoute] Upload failure:', error);
    const statusCode = error?.message?.includes('storage quota exceeded') ? 400 : 500;
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to process media upload' 
      },
      { status: statusCode }
    );
  }
}

/**
 * DELETE /api/whatsapp/templates/upload?workspaceId=...&fileKey=...
 * Two-way cascade delete: Deletes media from Backblaze B2 bucket and fw_whatsapp_media_files.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');
    let fileKey = searchParams.get('fileKey') || searchParams.get('file_key');
    let fileName = searchParams.get('fileName') || searchParams.get('file_name');

    if (!fileKey && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        workspaceId = body.workspaceId || body.workspace_id || workspaceId;
        fileKey = body.fileKey || body.file_key || fileKey;
        fileName = body.fileName || body.file_name || fileName;
      } catch {}
    }

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabase');

    let targetKey = fileKey;
    if (!targetKey && fileName) {
      const { data } = await supabaseAdmin
        .from('fw_whatsapp_media_files')
        .select('file_key')
        .eq('workspace_id', workspaceId)
        .eq('file_name', fileName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      targetKey = data?.file_key;
    }

    if (targetKey) {
      await deleteWhatsAppFile(workspaceId, targetKey);
    }

    return NextResponse.json({ success: true, message: 'Media permanently deleted from B2 and database' });
  } catch (error: any) {
    console.error('[TemplateUploadRoute] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
