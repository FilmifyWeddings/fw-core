import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { whatsappB2Client, B2_WHATSAPP_BUCKET } from '@/lib/storage/whatsappB2Client';
import { supabaseAdmin } from '@/lib/supabase';
import { getWorkspaceWhatsAppStorageUsage } from '@/lib/services/whatsappStorageService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');
    let fileKey = searchParams.get('fileKey') || searchParams.get('file_key');
    let templateId = searchParams.get('templateId') || searchParams.get('template_id');

    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        workspaceId = body.workspaceId || body.workspace_id || workspaceId;
        fileKey = body.fileKey || body.file_key || fileKey;
        templateId = body.templateId || body.template_id || templateId;
      } catch {}
    }

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    if (!fileKey && !templateId) {
      return NextResponse.json({ success: false, error: 'fileKey or templateId is required' }, { status: 400 });
    }

    // 1. If templateId is provided without fileKey, extract fileKey from template payload
    if (!fileKey && templateId) {
      const { data: templateRow } = await supabaseAdmin
        .from('whatsapp_templates')
        .select('payload')
        .eq('id', templateId)
        .maybeSingle();

      const payload = templateRow?.payload as Record<string, any> | undefined;
      fileKey = payload?.mediaFileKey || payload?.media_file_key || payload?.mediaUrl || payload?.media_url;
    }

    // Clean fileKey if a proxy URL was provided
    let cleanKey = (fileKey || '').replace(/^\/?api\/media\//, '').replace(/^\/+/, '');

    // 2. Delete object from Backblaze B2 bucket
    if (cleanKey) {
      try {
        await whatsappB2Client.send(
          new DeleteObjectCommand({
            Bucket: B2_WHATSAPP_BUCKET,
            Key: cleanKey,
          })
        );
        console.log('[DeleteMediaRoute] 🗑️ Deleted object from B2:', cleanKey);
      } catch (s3Err) {
        console.warn('[DeleteMediaRoute] B2 DeleteObject warning:', s3Err);
      }

      // 3. Delete record from Supabase fw_whatsapp_media_files
      try {
        const { error: dbErr } = await supabaseAdmin
          .from('fw_whatsapp_media_files')
          .delete()
          .match({ file_key: cleanKey, workspace_id: workspaceId });

        if (dbErr) {
          console.error('[DeleteMediaRoute] DB delete error:', dbErr);
        } else {
          console.log('[DeleteMediaRoute] 🗑️ Deleted record from fw_whatsapp_media_files for key:', cleanKey);
        }
      } catch (dbEx) {
        console.error('[DeleteMediaRoute] Exception deleting record from Supabase:', dbEx);
      }
    }

    // 4. Reset media_url and media_file_key on the template row if templateId is provided
    if (templateId) {
      const { data: currentTpl } = await supabaseAdmin
        .from('whatsapp_templates')
        .select('payload')
        .eq('id', templateId)
        .maybeSingle();

      if (currentTpl?.payload) {
        const updatedPayload = {
          ...(currentTpl.payload as Record<string, any>),
          mediaUrl: null,
          media_url: null,
          mediaFileKey: null,
          media_file_key: null,
          mediaMime: null,
          media_mime: null,
          mediaFileName: null,
          mediaFileSize: null,
        };

        await supabaseAdmin
          .from('whatsapp_templates')
          .update({
            payload: updatedPayload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId);

        console.log('[DeleteMediaRoute] 🔄 Reset template payload for template:', templateId);
      }
    }

    // 5. Storage quota recalculates automatically, return fresh quota stats
    const usage = await getWorkspaceWhatsAppStorageUsage(workspaceId);

    return NextResponse.json({
      success: true,
      message: 'Template media deleted successfully from B2 and database',
      fileKey: cleanKey,
      workspaceId,
      storage: usage,
    });
  } catch (err: any) {
    console.error('[DeleteMediaRoute] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to delete template media' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}

export async function POST(req: NextRequest) {
  return handleDelete(req);
}
