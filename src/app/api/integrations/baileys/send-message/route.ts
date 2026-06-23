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
    if (!['text', 'media', 'template', 'list', 'poll', 'buttons'].includes(type)) {
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
        // ── TEMPLATE ── Fetch full row including type, buttons, payload_json ──────────
        if (!body.templateId) return NextResponse.json({ error: 'Missing: templateId' }, { status: 400 });

        type FullTplRow = {
          body_text: string;
          media_url_payload: string | null;
          type: string | null;
          buttons: any[] | null;
          payload_json: any | null;
        };
        let tpl: FullTplRow | null = null;

        // 1. Try tenant_whatsapp_templates with ALL fields including type/buttons/payload_json
        const { data: tenantTpl } = await supabaseAdmin
          .from('tenant_whatsapp_templates')
          .select('body_text, media_url_payload, type, buttons, payload_json')
          .eq('id', body.templateId)
          .eq('tenant_id', user.id)
          .maybeSingle();

        if (tenantTpl) {
          tpl = {
            body_text: tenantTpl.body_text || '',
            media_url_payload: tenantTpl.media_url_payload || null,
            type: (tenantTpl as any).type || (tenantTpl.media_url_payload ? 'media' : 'text'),
            buttons: (tenantTpl as any).buttons || [],
            payload_json: (tenantTpl as any).payload_json || {},
          };
        } else {
          // 2. Fallback to legacy whatsapp_templates
          const { data: legacyTpl } = await supabaseAdmin
            .from('whatsapp_templates')
            .select('payload, type, buttons')
            .eq('id', body.templateId)
            .eq('workspace_id', user.id)
            .maybeSingle();

          if (legacyTpl) {
            const p = (legacyTpl.payload as any) || {};
            tpl = {
              body_text: p.body || p.question || '',
              media_url_payload: p.mediaUrl || null,
              type: (legacyTpl as any).type || (p.mediaUrl ? 'media' : 'text'),
              buttons: (legacyTpl as any).buttons || [],
              payload_json: p,
            };
          }
        }

        if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        // Replace template variables in body text
        let rendered = tpl.body_text;
        if (body.variables) {
          for (const [k, v] of Object.entries(body.variables)) {
            rendered = rendered
              .replaceAll(`{{${k}}}`, v)
              .replaceAll(`{${k}}`, v);
          }
        }

        const pj = tpl.payload_json || {};
        const tplType = tpl.type || 'text';
        const tplButtons: any[] = tpl.buttons || [];

        // ── POLL ──────────────────────────────────────────────────────────
        if (tplType === 'poll') {
          result = await sendMessageServerless(supabaseAdmin, user.id, {
            to: chatJid,
            type: 'poll',
            text: rendered,
            pollOptions: (pj.options || []).map((o: any) => typeof o === 'string' ? o : o.text),
            pollSelectableCount: pj.allowMultiple ? 0 : 1,
          });

        // ── LIST ──────────────────────────────────────────────────────────
        } else if (tplType === 'list') {
          result = await sendMessageServerless(supabaseAdmin, user.id, {
            to: chatJid,
            type: 'list' as any,
            text: rendered,
            listButtonText: pj.buttonText || 'Options',
            listSections: pj.sections || [],
            footer: pj.footer || '',
          } as any);

        // ── BUTTONS (Quick Reply / URL / Phone) ───────────────────────────────
        } else if (tplButtons.length > 0) {
          const hasOverrideMedia = body.mediaUrl && body.mediaUrl !== 'null' && body.mediaUrl.trim() !== '';
          const hasDbMedia = tpl.media_url_payload && tpl.media_url_payload !== 'null' && tpl.media_url_payload.trim() !== '';
          
          const finalMediaUrl = hasOverrideMedia ? body.mediaUrl : (body.mediaUrl === '' || body.mediaUrl === 'null' ? undefined : (hasDbMedia ? tpl.media_url_payload : undefined));
          const finalMime = finalMediaUrl ? (hasOverrideMedia ? (body.mimeType || 'image/jpeg') : (pj.mediaMime || 'image/jpeg')) : undefined;

          result = await sendMessageServerless(supabaseAdmin, user.id, {
            to: chatJid,
            type: 'buttons' as any,
            text: rendered,
            rawButtons: tplButtons,
            footer: pj.footer || '',
            mediaUrl: finalMediaUrl,
            mimeType: finalMime,
          } as any);

        // ── MEDIA (no buttons) ────────────────────────────────────────────────
        } else if (body.mediaUrl || tpl.media_url_payload) {
          const finalMediaUrl = body.mediaUrl || tpl.media_url_payload;
          
          if (finalMediaUrl && finalMediaUrl !== 'null' && finalMediaUrl.trim() !== '') {
            const mimeType = body.mimeType || pj.mediaMime || 'image/jpeg';
            const mediaType = mimeType.startsWith('image/') ? 'image' :
                              mimeType.startsWith('video/') ? 'video' :
                              mimeType.startsWith('audio/') ? 'audio' : 'document';
            result = await sendMessageServerless(supabaseAdmin, user.id, {
              to: chatJid,
              type: mediaType as any,
              mediaUrl: finalMediaUrl,
              caption: rendered,
              mimeType,
            });
          } else {
            result = await sendMessageServerless(supabaseAdmin, user.id, {
              to: chatJid, type: 'text', text: rendered,
            });
          }

        // ── PLAIN TEXT ──────────────────────────────────────────────────────────
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
