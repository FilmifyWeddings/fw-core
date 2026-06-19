/**
 * POST /api/integrations/baileys/send-message
 * ============================================
 *
 * HINDI:
 * Do modes mein kaam karta hai:
 *
 * MODE 1 - DIRECT SEND (real-time, user triggers manually from chat UI):
 *   → Seedha sendMessageServerless() call karo
 *   → Response mein success/fail batao
 *   → Best for: Live chat window mein real-time messages
 *
 * MODE 2 - QUEUE + WEBHOOK (automation triggers, welcome msgs, followups):
 *   → baileys_action_queue mein insert karo
 *   → Supabase webhook automatically /webhook-trigger ko hit karega
 *   → Response mein queued status batao
 *   → Best for: Automation flows, large batch sends
 *
 * Request body mein mode field se decide hota hai.
 * Default: 'direct' for manual sends from UI, 'queue' for automation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sendMessageServerless, normalizeJid } from '@/lib/baileys-serverless';

export const maxDuration = 60;
export const runtime = 'nodejs';

type SendMode = 'direct' | 'queue';

type SendMessageBody = {
  to: string;
  type: 'text' | 'media' | 'template';
  mode?: SendMode;        // 'direct' (default) | 'queue'
  text?: string;
  mediaUrl?: string;
  caption?: string;
  mimeType?: string;
  templateId?: string;
  variables?: Record<string, string>;
  leadId?: string;
};

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

    const body: SendMessageBody = await req.json();
    const { to, type, mode = 'direct', leadId } = body;

    if (!to) return NextResponse.json({ error: 'Missing field: to' }, { status: 400 });
    if (!['text', 'media', 'template'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const chatJid = normalizeJid(to);

    // Check session connection
    const { data: session } = await supabaseAdmin
      .from('baileys_sessions')
      .select('conn_state')
      .eq('workspace_id', user.id)
      .maybeSingle();

    if (!session || session.conn_state !== 'open') {
      return NextResponse.json({
        error: 'WhatsApp not connected. Please scan QR code first.',
        conn_state: session?.conn_state ?? 'disconnected',
      }, { status: 409 });
    }

    // Create message record (pre-insert with 'queued' status)
    const { data: msgRecord } = await supabaseAdmin
      .from('baileys_messages')
      .insert({
        workspace_id: user.id,
        lead_id: leadId ?? null,
        chat_jid: chatJid,
        direction: 'outbound',
        message_text: type === 'text' ? body.text : body.caption ?? null,
        media_url: body.mediaUrl ?? null,
        media_mime: body.mimeType ?? null,
        template_id: body.templateId ?? null,
        status: 'queued',
      })
      .select('id')
      .single();

    // ── MODE: DIRECT SEND ──────────────────────────────────────────────────────
    if (mode === 'direct') {
      let result;

      if (type === 'text') {
        if (!body.text) return NextResponse.json({ error: 'Missing: text' }, { status: 400 });
        result = await sendMessageServerless(supabaseAdmin, user.id, {
          to: chatJid,
          type: 'text',
          text: body.text,
        });
      } else if (type === 'media') {
        if (!body.mediaUrl || !body.mimeType) {
          return NextResponse.json({ error: 'Missing: mediaUrl, mimeType' }, { status: 400 });
        }
        const mediaType = body.mimeType.startsWith('image/') ? 'image' :
                          body.mimeType.startsWith('video/') ? 'video' :
                          body.mimeType.startsWith('audio/') ? 'audio' : 'document';

        result = await sendMessageServerless(supabaseAdmin, user.id, {
          to: chatJid,
          type: mediaType as 'image' | 'video' | 'audio' | 'document',
          mediaUrl: body.mediaUrl,
          caption: body.caption,
          mimeType: body.mimeType,
        });
      } else {
        // Template — fetch and render
        if (!body.templateId) return NextResponse.json({ error: 'Missing: templateId' }, { status: 400 });
        
        let tpl: { body_text: string; media_url: string | null; media_type: string | null } | null = null;
        
        const { data: tenantTpl } = await supabaseAdmin
          .from('tenant_whatsapp_templates')
          .select('body_text, media_url_payload')
          .eq('id', body.templateId)
          .eq('tenant_id', user.id)
          .maybeSingle();

        if (tenantTpl) {
          tpl = {
            body_text: tenantTpl.body_text || '',
            media_url: tenantTpl.media_url_payload || null,
            media_type: tenantTpl.media_url_payload ? 'image' : null
          };
        } else {
          // Fallback to legacy whatsapp_templates
          const { data: legacyTpl } = await supabaseAdmin
            .from('whatsapp_templates')
            .select('payload')
            .eq('id', body.templateId)
            .eq('workspace_id', user.id)
            .maybeSingle();

          if (legacyTpl) {
            tpl = {
              body_text: (legacyTpl.payload as any)?.body || '',
              media_url: (legacyTpl.payload as any)?.mediaUrl || null,
              media_type: (legacyTpl.payload as any)?.mediaUrl ? 'image' : null
            };
          }
        }

        if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        let rendered = tpl.body_text as string;
        if (body.variables) {
          for (const [k, v] of Object.entries(body.variables)) {
            rendered = rendered.replaceAll(`{${k}}`, v);
          }
        }

        if (tpl.media_url) {
          result = await sendMessageServerless(supabaseAdmin, user.id, {
            to: chatJid,
            type: tpl.media_type as 'image' | 'video' | 'audio' | 'document',
            mediaUrl: tpl.media_url as string,
            caption: rendered,
            mimeType: tpl.media_type === 'image' ? 'image/jpeg' : 'video/mp4',
          });
        } else {
          result = await sendMessageServerless(supabaseAdmin, user.id, {
            to: chatJid, type: 'text', text: rendered,
          });
        }
      }

      // Update message record with final status
      if (msgRecord?.id) {
        await supabaseAdmin
          .from('baileys_messages')
          .update({
            status: result.success ? 'sent' : 'failed',
            wa_message_id: result.waMessageId ?? null,
            error_message: result.error ?? null,
          })
          .eq('id', msgRecord.id);
      }

      return NextResponse.json({
        success: result.success,
        mode: 'direct',
        messageId: msgRecord?.id,
        waMessageId: result.waMessageId,
        error: result.error,
      }, { status: result.success ? 200 : 500 });
    }

    // ── MODE: QUEUE (for automation) ───────────────────────────────────────────
    let actionPayload: Record<string, unknown>;
    if (type === 'text') {
      actionPayload = { to: chatJid, text: body.text };
    } else if (type === 'media') {
      actionPayload = { to: chatJid, mediaUrl: body.mediaUrl, caption: body.caption, mimeType: body.mimeType };
    } else {
      actionPayload = { to: chatJid, templateId: body.templateId, variables: body.variables ?? {} };
    }

    const { data: queueItem } = await supabaseAdmin
      .from('baileys_action_queue')
      .insert({
        workspace_id: user.id,
        action_type: `send_${type}`,
        payload: { ...actionPayload, _messageRecordId: msgRecord?.id },
        priority: 5,
      })
      .select('id')
      .single();

    return NextResponse.json({
      success: true,
      mode: 'queue',
      messageId: msgRecord?.id,
      queueId: queueItem?.id,
      status: 'queued',
    });
  } catch (err) {
    console.error('[send-message]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
