import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatJid, extractPhoneFromJid } from '@/lib/evolution-api';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/evolution-beta
 * Ingests Evolution API real-time events (MESSAGES_UPSERT, CHATS_SET, CONNECTION_UPDATE)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody || '{}');

    const event = payload.event || payload.type || '';
    const instance = payload.instance || payload.instanceName || '';
    const data = payload.data || {};

    console.log(`[Evolution Webhook Ingress] Event: ${event} | Instance: ${instance}`);

    // 1. Resolve workspace_id from instance name "ws_{cleanId}"
    let workspaceId: string | null = null;

    if (instance.startsWith('ws_')) {
      const cleanSlug = instance.replace(/^ws_/, '');
      // Look up workspace in evolution_instances
      const { data: instRow } = await supabaseAdmin
        .from('evolution_instances')
        .select('workspace_id')
        .ilike('instance_name', instance)
        .maybeSingle();

      if (instRow) {
        workspaceId = instRow.workspace_id;
      }
    }

    // ── EVENT: CONNECTION_UPDATE ──────────────────────────────────────────────
    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = data.state || data.status || '';
      const mappedStatus = state === 'open' ? 'CONNECTED' : state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';
      const phoneNumber = data.ownerJid ? extractPhoneFromJid(data.ownerJid) : null;
      const profileName = data.profileName || null;

      if (workspaceId) {
        await supabaseAdmin
          .from('evolution_instances')
          .update({
            connection_status: mappedStatus,
            phone_number: phoneNumber,
            profile_name: profileName,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', workspaceId);
      }

      return NextResponse.json({ success: true, handled: 'CONNECTION_UPDATE' });
    }

    if (!workspaceId) {
      // If we cannot match workspace, accept with 200 so Evolution doesn't retry infinitely
      return NextResponse.json({ success: true, warning: 'Workspace not mapped for instance' });
    }

    // ── EVENT: MESSAGES_UPSERT ───────────────────────────────────────────────
    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const messagesList = Array.isArray(data) ? data : data.messages || [data];

      for (const msg of messagesList) {
        if (!msg || !msg.key) continue;

        const messageId = msg.key.id;
        const remoteJid = formatJid(msg.key.remoteJid || '');
        const fromMe = Boolean(msg.key.fromMe);
        const pushName = msg.pushName || '';

        // Ignore broadcast status messages
        if (remoteJid.includes('status@broadcast')) continue;

        // Parse content & message type
        let messageType = 'text';
        let content = '';
        let mediaUrl: string | null = null;

        const m = msg.message || {};

        if (m.conversation) {
          content = m.conversation;
        } else if (m.extendedTextMessage?.text) {
          content = m.extendedTextMessage.text;
        } else if (m.imageMessage) {
          messageType = 'image';
          content = m.imageMessage.caption || '';
          mediaUrl = m.imageMessage.url || null;
        } else if (m.audioMessage) {
          messageType = 'audio';
          content = 'Voice note';
          mediaUrl = m.audioMessage.url || null;
        } else if (m.videoMessage) {
          messageType = 'video';
          content = m.videoMessage.caption || 'Video';
          mediaUrl = m.videoMessage.url || null;
        } else if (m.documentMessage) {
          messageType = 'document';
          content = m.documentMessage.fileName || 'Document';
          mediaUrl = m.documentMessage.url || null;
        } else if (m.stickerMessage) {
          messageType = 'sticker';
          content = 'Sticker';
        }

        const msgTimestamp = msg.messageTimestamp 
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        // Upsert message to evolution_messages
        await supabaseAdmin
          .from('evolution_messages')
          .upsert({
            workspace_id: workspaceId,
            message_id: messageId,
            remote_jid: remoteJid,
            from_me: fromMe,
            message_type: messageType,
            content: content || '',
            media_url: mediaUrl,
            status: fromMe ? 'SENT' : 'DELIVERED',
            timestamp: msgTimestamp,
            raw_payload: msg,
          }, { onConflict: 'workspace_id,message_id' });

        // Upsert contact metadata
        await supabaseAdmin
          .from('evolution_contacts')
          .upsert({
            workspace_id: workspaceId,
            jid: remoteJid,
            push_name: pushName || null,
            phone: extractPhoneFromJid(remoteJid),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,jid' });
      }

      return NextResponse.json({ success: true, handled: 'MESSAGES_UPSERT' });
    }

    // ── EVENT: MESSAGES_UPDATE ───────────────────────────────────────────────
    if (event === 'MESSAGES_UPDATE' || event === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data];
      for (const u of updates) {
        if (!u.key?.id) continue;
        const messageId = u.key.id;
        const updateStatus = u.update?.status || u.status || '';

        let mappedStatus = 'SENT';
        if (updateStatus === 'READ' || updateStatus === 3) mappedStatus = 'READ';
        else if (updateStatus === 'DELIVERY_ACK' || updateStatus === 2) mappedStatus = 'DELIVERED';
        else if (updateStatus === 'SERVER_ACK' || updateStatus === 1) mappedStatus = 'SENT';

        await supabaseAdmin
          .from('evolution_messages')
          .update({ status: mappedStatus })
          .eq('workspace_id', workspaceId)
          .eq('message_id', messageId);
      }

      return NextResponse.json({ success: true, handled: 'MESSAGES_UPDATE' });
    }

    // ── EVENT: CONTACTS_SET / CHATS_SET ──────────────────────────────────────
    if (event === 'CONTACTS_SET' || event === 'CHATS_SET' || event === 'contacts.set') {
      const contactsList = Array.isArray(data) ? data : [data];
      for (const c of contactsList) {
        const jid = c.id || c.jid;
        if (!jid || jid.includes('status@broadcast')) continue;

        const name = c.name || c.verifiedName || c.pushName || '';
        const profilePic = c.profilePictureUrl || c.profile_pic_url || null;

        await supabaseAdmin
          .from('evolution_contacts')
          .upsert({
            workspace_id: workspaceId,
            jid: formatJid(jid),
            name: name || null,
            phone: extractPhoneFromJid(jid),
            profile_pic_url: profilePic,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id,jid' });
      }

      return NextResponse.json({ success: true, handled: 'CONTACTS_SET' });
    }

    return NextResponse.json({ success: true, handled: 'DEFAULT_ACK' });
  } catch (err: any) {
    console.error('[Evolution Webhook Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
