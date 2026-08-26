import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  getInstanceNameForWorkspace, 
  sendEvolutionTextMessage, 
  sendEvolutionMediaMessage, 
  formatJid 
} from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * POST /api/whatsapp-beta/send-message
 * Dispatches outgoing text or media message via Evolution API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { 
      workspace_id, 
      recipient, 
      content, 
      message_type = 'text',
      media_url,
      caption,
      file_name,
      mimetype 
    } = body;

    if (!workspace_id || !recipient) {
      return NextResponse.json({ 
        success: false, 
        error: 'workspace_id and recipient are required' 
      }, { status: 400 });
    }

    const instanceName = getInstanceNameForWorkspace(workspace_id);
    const remoteJid = formatJid(recipient);
    const tempMessageId = 'out_' + Date.now() + '_' + Math.random().toString(36).substring(7);

    // 1. Optimistic insert in DB
    const optimisticRecord = {
      workspace_id,
      message_id: tempMessageId,
      remote_jid: remoteJid,
      from_me: true,
      message_type,
      content: content || caption || '',
      media_url: media_url || null,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      raw_payload: { recipient, caption, file_name },
    };

    const { data: savedMsg } = await supabaseAdmin
      .from('evolution_messages')
      .upsert(optimisticRecord, { onConflict: 'workspace_id,message_id' })
      .select('*')
      .single();

    // 2. Dispatch via Evolution API
    let evoRes: any = null;

    if (message_type === 'text' || !media_url) {
      evoRes = await sendEvolutionTextMessage(instanceName, recipient, content || '');
    } else {
      evoRes = await sendEvolutionMediaMessage(instanceName, recipient, {
        mediaUrl: media_url,
        mediaType: message_type as any,
        caption: caption || content || '',
        fileName: file_name || 'attachment',
        mimetype: mimetype,
      });
    }

    const realMessageId = evoRes?.data?.key?.id || evoRes?.data?.messageId || tempMessageId;
    const finalStatus = evoRes?.ok ? 'SENT' : 'FAILED';

    // 3. Update DB record with real message ID & status
    if (realMessageId !== tempMessageId) {
      await supabaseAdmin
        .from('evolution_messages')
        .delete()
        .eq('workspace_id', workspace_id)
        .eq('message_id', tempMessageId);

      await supabaseAdmin
        .from('evolution_messages')
        .upsert({
          ...optimisticRecord,
          message_id: realMessageId,
          status: finalStatus,
          raw_payload: evoRes?.data || {},
        }, { onConflict: 'workspace_id,message_id' });
    } else {
      await supabaseAdmin
        .from('evolution_messages')
        .update({ status: finalStatus, raw_payload: evoRes?.data || {} })
        .eq('workspace_id', workspace_id)
        .eq('message_id', tempMessageId);
    }

    // 4. Update contact last interaction time
    await supabaseAdmin
      .from('evolution_contacts')
      .upsert({
        workspace_id,
        jid: remoteJid,
        phone: recipient.replace(/[^0-9]/g, ''),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,jid' });

    return NextResponse.json({
      success: evoRes?.ok ?? true,
      message_id: realMessageId,
      status: finalStatus,
      evolution_response: evoRes?.data,
    });
  } catch (err: any) {
    console.error('[Evolution Send Message Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
