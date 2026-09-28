import { NextRequest, NextResponse } from 'next/server';
import { 
  uploadWhatsAppFileAndGetSignedUrl, 
  getWorkspaceWhatsAppStorageUsage 
} from '@/lib/services/whatsappStorageService';

export const dynamic = 'force-dynamic';

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
 * with automatic image compression (sharp WebP 85), 500 MB quota enforcement,
 * and permanent lifetime proxy URL generation (/api/media/...).
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const { searchParams } = new URL(req.url);
    let fileBuffer: Buffer | null = null;
    let fileName = `template_media_${Date.now()}`;
    let mimeType = 'image/jpeg';
    let workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id') || '';
    let templateName = searchParams.get('templateName') || searchParams.get('template_name') || '';

    // 1. Try standard FormData if Content-Type indicates multipart
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        workspaceId = (formData.get('workspaceId') as string) || (formData.get('workspace_id') as string) || workspaceId;
        templateName = (formData.get('templateName') as string) || (formData.get('template_name') as string) || templateName;

        if (file) {
          fileName = file.name;
          mimeType = file.type || 'application/octet-stream';
          const arrayBuffer = await file.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }
      } catch (formErr) {
        console.warn('[TemplateUploadRoute] FormData parse failed, checking JSON fallback:', formErr);
      }
    }

    // 2. Fallback: Parse base64 JSON payload if multipart boundary was corrupted or posted as JSON
    if (!fileBuffer) {
      try {
        const body = await req.json();
        if (body.base64) {
          workspaceId = body.workspaceId || body.workspace_id || workspaceId;
          templateName = body.templateName || body.template_name || templateName;
          fileName = body.fileName || body.file_name || fileName;
          mimeType = body.mimeType || body.mime_type || mimeType;

          const base64Data = body.base64.replace(/^data:.*?;base64,/, '');
          fileBuffer = Buffer.from(base64Data, 'base64');
        }
      } catch (jsonErr) {
        console.warn('[TemplateUploadRoute] JSON fallback parse failed:', jsonErr);
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
    // compresses images to WebP 85 via sharp, preserves videos/PDFs as-is,
    // and saves metadata into fw_whatsapp_media_files
    const { uploadWhatsAppAttachment } = await import('@/lib/services/whatsappStorageService');
    const result = await uploadWhatsAppAttachment({
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
      fileSize: fileBuffer.length,
      fileSizeBytes: fileBuffer.length,
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
 * Deletes media from Backblaze B2 bucket and fw_whatsapp_media_files record.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');
    const fileKey = searchParams.get('fileKey') || searchParams.get('file_key');
    const fileName = searchParams.get('fileName') || searchParams.get('file_name');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    const { deleteWhatsAppFile } = await import('@/lib/services/whatsappStorageService');
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TemplateUploadRoute] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
