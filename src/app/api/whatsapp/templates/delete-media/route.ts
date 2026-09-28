import { NextRequest, NextResponse } from 'next/server';
import { 
  DeleteObjectCommand, 
  ListObjectVersionsCommand, 
  DeleteObjectsCommand 
} from '@aws-sdk/client-s3';
import { whatsappB2Client, B2_WHATSAPP_BUCKET } from '@/lib/storage/whatsappB2Client';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  getWorkspaceWhatsAppStorageUsage, 
  resolveEffectiveWorkspaceId 
} from '@/lib/services/whatsappStorageService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleDelete(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let workspaceId = searchParams.get('workspaceId') || searchParams.get('workspace_id');
    let fileKey = searchParams.get('fileKey') || searchParams.get('file_key');
    let templateId = searchParams.get('templateId') || searchParams.get('template_id');
    let fileName = searchParams.get('fileName') || searchParams.get('file_name');

    if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        if (bodyText && bodyText.trim()) {
          const body = JSON.parse(bodyText);
          workspaceId = body.workspaceId || body.workspace_id || workspaceId;
          fileKey = body.fileKey || body.file_key || fileKey;
          templateId = body.templateId || body.template_id || templateId;
          fileName = body.fileName || body.file_name || fileName;
        }
      } catch (parseErr) {
        console.warn('[DeleteMediaRoute] Body parse warning:', parseErr);
      }
    }

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Missing workspaceId' }, { status: 400 });
    }

    const effectiveWsId = await resolveEffectiveWorkspaceId(workspaceId);

    if (!fileKey && !fileName && !templateId) {
      return NextResponse.json({ success: false, error: 'fileKey, fileName, or templateId is required' }, { status: 400 });
    }

    // 1. If fileName is provided but not fileKey, find fileKey from database
    if (!fileKey && fileName) {
      const { data: fileRow } = await supabaseAdmin
        .from('fw_whatsapp_media_files')
        .select('file_key')
        .or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.${workspaceId}`)
        .eq('file_name', fileName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fileRow?.file_key) {
        fileKey = fileRow.file_key;
      }
    }

    // 2. If templateId is provided without fileKey, extract fileKey from template payload
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

    // 3. Permanently purge object and ALL versions/markers from Backblaze B2 bucket
    if (cleanKey) {
      try {
        const versionsRes = await whatsappB2Client.send(
          new ListObjectVersionsCommand({
            Bucket: B2_WHATSAPP_BUCKET,
            Prefix: cleanKey,
          })
        );

        const objectsToDelete: { Key: string; VersionId?: string }[] = [];
        if (versionsRes.Versions) {
          versionsRes.Versions.filter(v => v.Key === cleanKey).forEach(v => {
            objectsToDelete.push({ Key: v.Key!, VersionId: v.VersionId });
          });
        }
        if (versionsRes.DeleteMarkers) {
          versionsRes.DeleteMarkers.filter(d => d.Key === cleanKey).forEach(d => {
            objectsToDelete.push({ Key: d.Key!, VersionId: d.VersionId });
          });
        }

        if (objectsToDelete.length > 0) {
          await whatsappB2Client.send(
            new DeleteObjectsCommand({
              Bucket: B2_WHATSAPP_BUCKET,
              Delete: {
                Objects: objectsToDelete,
                Quiet: true,
              },
            })
          );
          console.log(`[DeleteMediaRoute] 🗑️ Permanently purged ${objectsToDelete.length} versions/markers for:`, cleanKey);
        } else {
          await whatsappB2Client.send(
            new DeleteObjectCommand({
              Bucket: B2_WHATSAPP_BUCKET,
              Key: cleanKey,
            })
          );
          console.log('[DeleteMediaRoute] 🗑️ Standard DeleteObject executed for:', cleanKey);
        }
      } catch (s3Err) {
        console.warn('[DeleteMediaRoute] B2 DeleteObject warning:', s3Err);
      }

      // 4. Delete record from Supabase fw_whatsapp_media_files
      try {
        const { error: dbErr } = await supabaseAdmin
          .from('fw_whatsapp_media_files')
          .delete()
          .or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.${workspaceId}`)
          .eq('file_key', cleanKey);

        if (dbErr) {
          console.error('[DeleteMediaRoute] DB delete error:', dbErr);
        } else {
          console.log('[DeleteMediaRoute] 🗑️ Deleted record from fw_whatsapp_media_files for key:', cleanKey);
        }
      } catch (dbEx) {
        console.error('[DeleteMediaRoute] Exception deleting record from Supabase:', dbEx);
      }
    }

    // If fileName was provided, ensure any matching db record is also cleaned
    if (fileName) {
      try {
        await supabaseAdmin
          .from('fw_whatsapp_media_files')
          .delete()
          .or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.${workspaceId}`)
          .eq('file_name', fileName);
      } catch {}
    }

    // 5. Detach deleted media from ANY template in workspace referencing this fileKey or fileName
    try {
      const { data: templates } = await supabaseAdmin
        .from('whatsapp_templates')
        .select('id, payload')
        .or(`workspace_id.eq.${effectiveWsId},workspace_id.eq.${workspaceId}`);

      if (templates && templates.length > 0) {
        for (const tpl of templates) {
          const p = (tpl.payload as Record<string, any>) || {};
          const pStr = JSON.stringify(p);
          const shouldClear = 
            (cleanKey && pStr.includes(cleanKey)) || 
            (fileName && pStr.includes(fileName)) || 
            (templateId && tpl.id === templateId);

          if (shouldClear) {
            const updatedPayload = {
              ...p,
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
              .update({ payload: updatedPayload, updated_at: new Date().toISOString() })
              .eq('id', tpl.id);
            console.log('[DeleteMediaRoute] 🔄 Detached deleted media from template:', tpl.id);
          }
        }
      }
    } catch (tplErr) {
      console.warn('[DeleteMediaRoute] Warning detaching media from templates:', tplErr);
    }

    // 6. Recalculate storage quota and return fresh stats
    const usage = await getWorkspaceWhatsAppStorageUsage(effectiveWsId);

    return NextResponse.json({
      success: true,
      message: 'Template media permanently deleted and detached from templates',
      fileKey: cleanKey || fileName,
      workspaceId: effectiveWsId,
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
