import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * GET /api/whatsapp-beta/messages
 * Retrieves unified conversation message history for a specific remote_jid
 */
export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    const remoteJid = req.nextUrl.searchParams.get('remote_jid');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '150', 10);

    if (!workspaceId || !remoteJid) {
      return NextResponse.json({ 
        success: false, 
        error: 'workspace_id and remote_jid are required' 
      }, { status: 400 });
    }

    const cleanPhone = remoteJid.replace(/[^0-9]/g, '');

    // 1. Fetch from evolution_messages
    const { data: evoMsgs } = await supabaseAdmin
      .from('evolution_messages')
      .select('*')
      .or(`remote_jid.eq.${remoteJid},remote_jid.ilike.%${cleanPhone}%`)
      .order('timestamp', { ascending: true })
      .limit(limit);

    // 2. Fetch from baileys_messages
    const { data: bMsgs } = await supabaseAdmin
      .from('baileys_messages')
      .select('*')
      .or(`chat_jid.eq.${remoteJid},chat_jid.ilike.%${cleanPhone}%`)
      .order('sent_at', { ascending: true })
      .limit(limit);

    // 3. Fetch from whatsapp_workflow_logs
    const { data: logs } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, recipient, message_content, status, created_at')
      .or(`recipient.ilike.%${cleanPhone}%`)
      .order('created_at', { ascending: true })
      .limit(50);

    // 4. Combine and deduplicate
    const messagesMap = new Map<string, any>();

    (evoMsgs || []).forEach(m => {
      messagesMap.set(m.message_id, {
        id: m.id,
        message_id: m.message_id,
        workspace_id: m.workspace_id,
        remote_jid: m.remote_jid,
        from_me: m.from_me,
        message_type: m.message_type || 'text',
        content: m.content || '',
        media_url: m.media_url,
        status: m.status || 'DELIVERED',
        timestamp: m.timestamp,
        raw_payload: m.raw_payload,
      });
    });

    (bMsgs || []).forEach(bm => {
      const msgId = bm.wa_message_id || `b_${bm.id}`;
      if (!messagesMap.has(msgId)) {
        messagesMap.set(msgId, {
          id: bm.id,
          message_id: msgId,
          workspace_id: bm.workspace_id,
          remote_jid: bm.chat_jid,
          from_me: bm.direction === 'outbound',
          message_type: 'text',
          content: bm.message_text || '',
          media_url: null,
          status: 'READ',
          timestamp: bm.sent_at,
          raw_payload: {},
        });
      }
    });

    (logs || []).forEach(lg => {
      const logId = `log_${lg.id}`;
      if (!messagesMap.has(logId)) {
        messagesMap.set(logId, {
          id: lg.id,
          message_id: logId,
          workspace_id: workspaceId,
          remote_jid: remoteJid,
          from_me: true,
          message_type: 'text',
          content: lg.message_content || '',
          media_url: null,
          status: lg.status === 'success' ? 'SENT' : 'DELIVERED',
          timestamp: lg.created_at,
          raw_payload: {},
        });
      }
    });

    const allMessages = Array.from(messagesMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Mark incoming messages as READ in DB
    supabaseAdmin
      .from('evolution_messages')
      .update({ status: 'READ' })
      .eq('remote_jid', remoteJid)
      .eq('from_me', false)
      .neq('status', 'READ')
      .then(() => {});

    return NextResponse.json({
      success: true,
      remote_jid: remoteJid,
      messages: allMessages,
      count: allMessages.length,
    });
  } catch (err: any) {
    console.error('[Evolution Messages GET Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
