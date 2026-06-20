/**
 * POST /api/integrations/baileys/webhook-trigger
 * ==============================================
 *
 * HINDI EXPLANATION:
 * Yeh route Supabase Database Webhook ka receiver hai.
 * Jab bhi `baileys_action_queue` mein koi naya row INSERT hota hai,
 * Supabase automatically is endpoint ko hit karta hai.
 *
 * Flow:
 * 1. Supabase webhook → POST /api/integrations/baileys/webhook-trigger
 * 2. Payload mein naya action_queue row hota hai
 * 3. Hum workspace ka creds.json Supabase se load karte hain → /tmp
 * 4. makeWASocket() → connect → message bhejo → socket band karo
 * 5. Message status DB mein update karo (queued → sent/failed)
 *
 * SECURITY:
 * - BAILEYS_WEBHOOK_SECRET env var se validate karo
 * - Supabase webhook mein same secret set karna hai HTTP header mein
 *
 * VERCEL CONFIG:
 * maxDuration = 60 (Vercel Pro required for 60s functions)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessageServerless, normalizeJid } from '@/lib/baileys-serverless';

// Tell Vercel this route can run up to 60 seconds (Pro plan)
export const maxDuration = 60;
// Must be Node.js runtime (not Edge) for Baileys fs access
export const runtime = 'nodejs';

// ─── Webhook Secret Validation ────────────────────────────────────────────────
function validateWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.BAILEYS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook-trigger] BAILEYS_WEBHOOK_SECRET not set in environment!');
    return false;
  }

  // Check both common header formats
  const providedSecret =
    req.headers.get('x-webhook-secret') ??
    req.headers.get('authorization')?.replace('Bearer ', '');

  return providedSecret === secret;
}

// ─── Action Processor ─────────────────────────────────────────────────────────
async function processQueuedAction(action: {
  id: string;
  workspace_id: string;
  action_type: string;
  payload: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string; waMessageId?: string }> {
  const { workspace_id, action_type, payload } = action;

  // Build SendPayload from action
  switch (action_type) {
    case 'send_text': {
      const { to, text } = payload as { to: string; text: string };
      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(to),
        type: 'text',
        text,
      });
    }

    case 'send_media': {
      const { to, mediaUrl, caption, mimeType } = payload as {
        to: string; mediaUrl: string; caption?: string; mimeType: string;
      };
      const mediaType = mimeType.startsWith('image/') ? 'image' :
                        mimeType.startsWith('video/') ? 'video' :
                        mimeType.startsWith('audio/') ? 'audio' : 'document';

      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(to),
        type: mediaType as 'image' | 'video' | 'audio' | 'document',
        mediaUrl,
        caption,
        mimeType,
      });
    }

    case 'send_template': {
      const { to, templateId, variables } = payload as {
        to: string; templateId: string; variables?: Record<string, string>;
      };

      let tpl: any = null;

      // 1. Try querying tenant_whatsapp_templates first (Law 1 Multi-Tenancy RLS compliant)
      const { data: tenantTpl, error: tenantTplErr } = await supabaseAdmin
        .from('tenant_whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', workspace_id)
        .maybeSingle();

      if (!tenantTplErr && tenantTpl) {
        tpl = {
          id: tenantTpl.id,
          name: tenantTpl.template_name,
          type: tenantTpl.media_url_payload ? 'media' : 'text',
          payload: {
            body: tenantTpl.body_text || '',
            mediaUrl: tenantTpl.media_url_payload || ''
          },
          buttons: []
        };
      } else {
        // 2. Fallback to legacy whatsapp_templates
        const { data: legacyTpl } = await supabaseAdmin
          .from('whatsapp_templates')
          .select('*')
          .eq('id', templateId)
          .eq('workspace_id', workspace_id)
          .maybeSingle();

        if (legacyTpl) {
          tpl = legacyTpl;
        }
      }

      if (!tpl) return { success: false, error: `Template ${templateId} not found in workspace/tenant templates.` };

      const tplPayload = tpl.payload || {};
      const tplButtons = tpl.buttons || [];

      // Replace placeholders in body/question
      let body = (tplPayload.body || tplPayload.question || '') as string;
      if (variables) {
        for (const [key, val] of Object.entries(variables)) {
          body = body.replaceAll(`{${key}}`, val).replaceAll(`{{${key}}}`, val);
        }
      }

      // ─── Case 1: Poll Template ──────────────────────────────────
      if (tpl.type === 'poll') {
        const options = (tplPayload.options || []).map((o: any) => o.text).filter(Boolean);
        return sendMessageServerless(supabaseAdmin, workspace_id, {
          to: normalizeJid(to),
          type: 'poll',
          text: body,
          pollOptions: options,
          pollSelectableCount: tplPayload.allowMultiple ? 0 : 1,
        });
      }

      // ─── Case 2: Media Template ──────────────────────────────────
      if (tpl.type === 'media') {
        const mediaUrl = tplPayload.mediaUrl || tplPayload.default_send_media_url;
        const mimeType = tplPayload.mediaMime || tplPayload.default_send_media_mime || 'application/pdf';
        
        // Append footer if exists
        if (tplPayload.footer) {
          body += `\n\n_${tplPayload.footer}_`;
        }

        // Append formatted buttons for compatibility
        if (tplButtons.length > 0) {
          body += `\n\n`;
          tplButtons.forEach((btn: any, index: number) => {
            body += `[${index + 1}] ${btn.text}\n`;
          });
        }

        const mediaType = mimeType.startsWith('image/') ? 'image' :
                          mimeType.startsWith('video/') ? 'video' :
                          mimeType.startsWith('audio/') ? 'audio' : 'document';

        return sendMessageServerless(supabaseAdmin, workspace_id, {
          to: normalizeJid(to),
          type: mediaType as any,
          mediaUrl,
          caption: body,
          mimeType,
          fileName: tplPayload.fileName || 'document',
        });
      }

      // ─── Case 3: List / Button / Text Template ──────────────────
      // For maximum compatibility and reliable delivery, format list sections and buttons as text.
      if (tplPayload.footer) {
        body += `\n\n_${tplPayload.footer}_`;
      }

      // Format List sections if it's a List template
      if (tpl.type === 'list' && tplPayload.sections) {
        body += `\n\n*${tplPayload.buttonText || 'Options'}*`;
        tplPayload.sections.forEach((sec: any) => {
          body += `\n\n*${sec.title}*:`;
          (sec.rows || []).forEach((row: any) => {
            body += `\n- ${row.title}${row.desc || row.description ? ` (${row.desc || row.description})` : ''}`;
          });
        });
      }

      // Format standard buttons
      if (tplButtons.length > 0) {
        body += `\n\n`;
        tplButtons.forEach((btn: any, index: number) => {
          body += `[${index + 1}] ${btn.text}\n`;
        });
      }

      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(to),
        type: 'text',
        text: body,
      });
    }

    case 'group_dispatch': {
      const { groupJid, leadData } = payload as {
        groupJid: string;
        leadData: { name?: string; phone?: string; email?: string; source?: string };
      };

      const card =
        `🎯 *NEW LEAD ALERT*\n\n` +
        `👤 *Name:* ${leadData.name ?? 'Unknown'}\n` +
        `📞 *Phone:* ${leadData.phone ?? '—'}\n` +
        `📧 *Email:* ${leadData.email ?? '—'}\n` +
        `🔗 *Source:* ${leadData.source ?? '—'}\n` +
        `🕐 *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `_FW Core — Automated Lead Alert_`;

      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: groupJid,
        type: 'text',
        text: card,
      });
    }

    default:
      return { success: false, error: `Unknown action type: ${action_type}` };
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Validate webhook secret
  if (!validateWebhookSecret(req)) {
    console.error('[webhook-trigger] Unauthorized — invalid webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 2. Parse Supabase webhook payload
  // Supabase sends: { type: "INSERT", table: "baileys_action_queue", record: {...}, schema: "public" }
  const eventType = body.type as string;
  const record = body.record as {
    id: string;
    workspace_id: string;
    action_type: string;
    payload: Record<string, unknown>;
    status: string;
  } | undefined;

  if (!record || eventType !== 'INSERT') {
    console.log('[webhook-trigger] Ignoring non-INSERT event or missing record');
    return NextResponse.json({ skipped: true });
  }

  if (record.status !== 'pending') {
    console.log('[webhook-trigger] Action not pending, skipping');
    return NextResponse.json({ skipped: true, reason: 'not_pending' });
  }

  console.log(`[webhook-trigger] Processing action: ${record.id} (${record.action_type})`);

  // 3. Mark as processing
  await supabaseAdmin
    .from('baileys_action_queue')
    .update({
      status: 'processing',
      attempt_count: 1,
      processed_at: new Date().toISOString(),
    })
    .eq('id', record.id);

  // 4. Process the action (send message via serverless hydration)
  const result = await processQueuedAction({
    id: record.id,
    workspace_id: record.workspace_id,
    action_type: record.action_type,
    payload: record.payload,
  });

  // 5. Update final status in DB
  if (result.success) {
    await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'done',
        result_message_id: result.waMessageId ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    console.log(`[webhook-trigger] ✅ Action ${record.id} completed. WA ID: ${result.waMessageId}`);
    return NextResponse.json({
      success: true,
      actionId: record.id,
      waMessageId: result.waMessageId,
    });
  } else {
    await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'failed',
        error_message: result.error,
        processed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    console.error(`[webhook-trigger] ❌ Action ${record.id} failed: ${result.error}`);
    return NextResponse.json({
      success: false,
      actionId: record.id,
      error: result.error,
    }, { status: 500 });
  }
}

// HEAD/GET for Supabase webhook health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'baileys-webhook-trigger',
    version: '2.0-serverless',
  });
}
