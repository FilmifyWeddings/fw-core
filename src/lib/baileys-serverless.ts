/**
 * ============================================================
 * BAILEYS SERVERLESS SESSION HYDRATION ENGINE
 * ============================================================
 *
 * STRATEGY (HINDI):
 * =================
 * Bhai, yeh module ka kaam hai:
 * 1. Supabase se creds.json load karo
 * 2. /tmp folder mein temporarily likhho (Vercel ka writable dir)
 * 3. makeWASocket() se socket banao
 * 4. Message bhejo / QR generate karo
 * 5. creds.update pe turant Supabase mein save karo (session rotation)
 * 6. Kaam khatam → socket destroy karo (clean serverless exit)
 *
 * YEH APPROACH KYU KAAM KARTA HAI:
 * - Vercel functions mein /tmp = 512MB writable, per-invocation available
 * - Baileys ka useMultiFileAuthState /tmp ko use kar sakta hai
 * - creds.update event → Supabase mein instantly save → next invocation mein fresh load
 * - 5 users ke alpha test ke liye perfectly sufficient
 * - No external worker needed!
 *
 * IMPORTANT NOTES:
 * - Vercel Pro = 60s timeout, Hobby = 10s. Pro strongly recommended.
 * - /tmp is NOT shared across invocations (ephemeral), that's why Supabase persist karna CRITICAL hai
 * - Socket ko always destroy karo at the end to avoid lingering connections
 * ============================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';



// ─── Runtime-only types (avoid build-time static resolution of 'baileys') ─────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BaileysSocket = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WAMessageContent = any;

// Standard dynamic imports (restored so Vercel NFT tracing works)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalSockets = (globalThis as any).baileysSockets || new Map<string, any>();
(globalThis as any).baileysSockets = globalSockets;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HydrationResult {
  success: boolean;
  error?: string;
  qrString?: string;
  phoneNumber?: string;
  waMessageId?: string;
}

export interface SendPayload {
  to: string;                        // JID or phone number digits
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'poll';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  mimeType?: string;
  fileName?: string;
  pollOptions?: string[];
  pollSelectableCount?: number;
  workflowLogId?: string;
}

// ─── /tmp Path Helper ─────────────────────────────────────────────────────────
function getTmpAuthPath(workspaceId: string): string {
  // /tmp is writable on Vercel (and locally during dev)
  const tmpBase = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.tmp');
  const authDir = path.join(tmpBase, 'baileys_auth', workspaceId);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  return authDir;
}

export async function hydrateCredsFromSupabase(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<{ authDir: string; hasExistingCreds: boolean }> {
  // Purged Render legacy credentials hydration
  return { authDir: '', hasExistingCreds: true };
}

export async function persistCredsToSupabase(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  authDir: string
): Promise<void> {
  // Purged Render legacy credentials persistence
  return Promise.resolve();
}

export function normalizeJid(to: string): string {
  if (to.includes('@')) return to;
  // Strip non-digits and append WhatsApp suffix
  const digits = to.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

export async function getOrCreateSocket(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<any> {
  // Socket is managed by the standalone singleton worker process
  return Promise.resolve(null);
}

export async function autoReconnectSessions(supabaseAdmin: SupabaseClient) {
  // Managed by standalone worker
  return Promise.resolve();
}

// ─── Token Replacement Parser (Regex Parser) ──────────────────────────────────
export function parseShortcodes(text: string, lead: any): string {
  if (!text) return '';
  if (!lead) return text;

  const replaceFn = (match: string, key: string) => {
    const normalizedKey = key.trim().toLowerCase();

    // 1. Client Info Group
    if (normalizedKey === 'first_name') {
      const name = lead.name || '';
      const parts = name.trim().split(/\s+/);
      return parts[0] || '';
    }
    if (normalizedKey === 'last_name') {
      const name = lead.name || '';
      const parts = name.trim().split(/\s+/);
      return parts.slice(1).join(' ') || '';
    }
    if (normalizedKey === 'full_name' || normalizedKey === 'name') {
      return lead.name || '';
    }
    if (normalizedKey === 'phone_number' || normalizedKey === 'phone') {
      return lead.phone || '';
    }
    if (normalizedKey === 'email') return lead.email || '';
    if (normalizedKey === 'source' || normalizedKey === 'lead_source') return lead.source || '';
    if (normalizedKey === 'status') return lead.status || '';
    if (normalizedKey === 'score') return lead.score || '';

    // 2. System / Time Group
    if (normalizedKey === 'timestamp') {
      return new Date().toISOString();
    }
    if (normalizedKey === 'current_date') {
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    // 3. Meta / Campaign Fields
    if (normalizedKey === 'facebook_lead_id') {
      if (lead.facebook_lead_id !== undefined && lead.facebook_lead_id !== null) {
        return String(lead.facebook_lead_id);
      }
      if (lead.raw_payload && typeof lead.raw_payload === 'object') {
        const val = lead.raw_payload.lead_id || lead.raw_payload.facebook_lead_id;
        if (val !== undefined && val !== null) return String(val);
      }
    }
    if (normalizedKey === 'form_name') {
      if (lead.form_name !== undefined && lead.form_name !== null) {
        return String(lead.form_name);
      }
      if (lead.raw_payload && typeof lead.raw_payload === 'object') {
        const val = lead.raw_payload.form_name;
        if (val !== undefined && val !== null) return String(val);
      }
    }
    if (normalizedKey === 'campaign_name') {
      if (lead.campaign_name !== undefined && lead.campaign_name !== null) {
        return String(lead.campaign_name);
      }
      if (lead.raw_payload && typeof lead.raw_payload === 'object') {
        const val = lead.raw_payload.campaign_name;
        if (val !== undefined && val !== null) return String(val);
      }
    }
    if (normalizedKey === 'platform') {
      if (lead.platform !== undefined && lead.platform !== null) {
        return String(lead.platform);
      }
      if (lead.raw_payload && typeof lead.raw_payload === 'object') {
        const val = lead.raw_payload.platform;
        if (val !== undefined && val !== null) return String(val);
      }
    }

    // Direct property check for any other key
    if (lead[normalizedKey] !== undefined && lead[normalizedKey] !== null) {
      return String(lead[normalizedKey]);
    }

    // Check inside raw_payload
    if (lead.raw_payload && typeof lead.raw_payload === 'object') {
      const payloadKeys = Object.keys(lead.raw_payload);
      const matchedKey = payloadKeys.find(k => k.toLowerCase() === normalizedKey);
      if (matchedKey) {
        const val = lead.raw_payload[matchedKey];
        if (val !== undefined && val !== null) {
          // Format date if key contains "date" and it's a valid date string
          if (normalizedKey.includes('date') && typeof val === 'string' && !isNaN(Date.parse(val))) {
            try {
              return new Date(val).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
            } catch {
              return val;
            }
          }
          return String(val);
        }
      }
    }

    // Fallback gracefully
    return '';
  };

  // Replace double braces first, then single braces
  let parsed = text;
  parsed = parsed.replace(/\{\{([^{}]+)\}\}/g, replaceFn);
  parsed = parsed.replace(/\{([^{}]+)\}/g, replaceFn);

  return parsed;
}

// ─── CORE: Send Message via Standalone Worker Bridge ──────────────────────────
export async function sendMessageServerless(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  payload: SendPayload,
  timeoutMs = 25_000
): Promise<HydrationResult> {
  let tempFileToClean: string | null = null;

  try {
    // 1. Token Replacement Parser (Regex Parser)
    const textContent = payload.text || payload.caption || '';
    if (textContent && (textContent.includes('{') || textContent.includes('}'))) {
      try {
        let leadRecord: any = null;
        if (payload.workflowLogId) {
          const { data: logData } = await supabaseAdmin
            .from('whatsapp_workflow_logs')
            .select('lead_id')
            .eq('id', payload.workflowLogId)
            .maybeSingle();
          if (logData?.lead_id) {
            const { data: leadData } = await supabaseAdmin
              .from('leads')
              .select('*')
              .eq('id', logData.lead_id)
              .maybeSingle();
            leadRecord = leadData;
          }
        }

        if (!leadRecord && payload.to) {
          const cleanPhone = payload.to.replace(/[^0-9]/g, '');
          const { data: leadsData } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('workspace_id', workspaceId);
          
          if (leadsData) {
            leadRecord = leadsData.find((l: any) => {
              const lp = (l.phone || '').replace(/[^0-9]/g, '');
              return lp && (lp === cleanPhone || lp.endsWith(cleanPhone) || cleanPhone.endsWith(lp));
            });
          }
        }

        if (leadRecord) {
          if (payload.text) {
            payload.text = parseShortcodes(payload.text, leadRecord);
          }
          if (payload.caption) {
            payload.caption = parseShortcodes(payload.caption, leadRecord);
          }
        }
      } catch (scErr) {
        console.error('[send] Error parsing shortcodes:', scErr);
      }
    }

    // 2. Mime-type and extension check to fix PDF bug (ensure images are treated as 'image')
    const isImageMime = payload.mimeType && payload.mimeType.startsWith('image/');
    const isImageUrl = payload.mediaUrl && /\.(jpg|jpeg|png|webp)($|\?)/i.test(payload.mediaUrl);
    if (payload.mediaUrl && (isImageMime || isImageUrl)) {
      payload.type = 'image';
      if (!payload.mimeType || !payload.mimeType.startsWith('image/')) {
        const extMatch = payload.mediaUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'jpeg';
        payload.mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      }
    }

    // 3. Auto-Compression Layer for images over 5MB
    if (payload.type === 'image' && payload.mediaUrl && (payload.mediaUrl.startsWith('http://') || payload.mediaUrl.startsWith('https://'))) {
      try {
        const LIMIT = 5 * 1024 * 1024; // 5MB limit
        let needsCompression = false;
        let size = 0;

        try {
          const headRes = await fetch(payload.mediaUrl, { method: 'HEAD' });
          const contentLength = headRes.headers.get('content-length');
          size = contentLength ? parseInt(contentLength, 10) : 0;
          if (size > LIMIT || size === 0) {
            needsCompression = true;
          }
        } catch (headErr) {
          needsCompression = true;
        }

        if (needsCompression) {
          console.log(`[compression] Fetching image for size check/compression: ${payload.mediaUrl}`);
          const res = await fetch(payload.mediaUrl);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > LIMIT) {
              console.log(`[compression] Image size ${buffer.length} bytes exceeds 5MB. Compressing...`);
              
              const sharp = (await import('sharp')).default;
              const fs = await import('fs');
              const path = await import('path');
              const os = await import('os');

              let quality = 85;
              let compressedBuffer = await sharp(buffer)
                .jpeg({ quality, progressive: true })
                .toBuffer();

              if (compressedBuffer.length > 4.8 * 1024 * 1024) {
                quality = 70;
                compressedBuffer = await sharp(buffer)
                  .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
                  .jpeg({ quality, progressive: true })
                  .toBuffer();
              }

              const tempDir = os.tmpdir();
              const tempFileName = `fw_comp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
              const tempPath = path.join(tempDir, tempFileName);
              fs.writeFileSync(tempPath, compressedBuffer);

              console.log(`[compression] Compression complete. Original: ${buffer.length} bytes, New: ${compressedBuffer.length} bytes. Saved to temp path: ${tempPath}`);
              payload.mediaUrl = tempPath;
              tempFileToClean = tempPath;
            }
          }
        }
      } catch (compErr: any) {
        console.error('[compression] Error in image compression layer:', compErr.message);
      }
    }

    // ── Call Standalone Worker Bridge ──────────────────────────────────────────
    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    try {
      const res = await fetch(`http://localhost:${WORKER_PORT}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizeJid(payload.to),
          type: payload.type,
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          caption: payload.caption,
          mimeType: payload.mimeType,
          pollOptions: payload.pollOptions,
          pollSelectableCount: payload.pollSelectableCount,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        return { success: false, error: errBody.error || `Worker returned HTTP ${res.status}` };
      }

      const resData = await res.json();
      return { success: true, waMessageId: resData.waMessageId };
    } catch (err: any) {
      console.error('[send] Failed to call worker /send API:', err.message);
      return { success: false, error: `Worker connection issue: ${err.message}` };
    }

  } finally {
    // 4. Temp File Cleanup
    if (tempFileToClean) {
      try {
        const fs = require('fs');
        if (fs.existsSync(tempFileToClean)) {
          fs.unlinkSync(tempFileToClean);
          console.log('[compression] Cleaned up temporary compressed file:', tempFileToClean);
        }
      } catch (err: any) {
        console.error('[compression] Error unlinking temp file:', err.message);
      }
    }
  }
}



// ─── CORE: Generate QR Code via Standalone Worker Bridge ─────────────────────
export async function generateQrServerless(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  onQr: (qrString: string) => void,
  onConnected: (phoneNumber: string) => void,
  onError: (msg: string) => void,
  timeoutMs = 55_000
): Promise<void> {
  const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
  
  // 1. Tell worker to start the pairing flow
  try {
    const res = await fetch(`http://localhost:${WORKER_PORT}/init-qr`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Worker returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error('[generateQr] Failed to contact worker for init-qr:', err.message);
    onError(`Failed to contact worker: ${err.message}`);
    return;
  }

  // 2. Poll DB to retrieve the status and stream it
  const startTime = Date.now();
  let lastQr: string | null = null;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data, error } = await supabaseAdmin
      .from('baileys_sessions')
      .select('conn_state, qr_string, qr_expires_at, phone_number')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('[generateQr] DB query error:', error.message);
      continue;
    }

    if (!data) continue;

    if (data.conn_state === 'open' && data.phone_number) {
      onConnected(data.phone_number);
      return;
    }

    if (data.conn_state === 'disconnected') {
      onError('Session disconnected. Please try again.');
      return;
    }

    if (data.qr_string && data.qr_string !== lastQr) {
      const qrExpired = data.qr_expires_at ? new Date(data.qr_expires_at) < new Date() : false;
      if (!qrExpired) {
        lastQr = data.qr_string;
        onQr(data.qr_string);
      }
    }
  }

  onError('QR pairing timed out.');
}

// ─── QUEUE PROCESSOR & POLL ENGINE (SELF-CONTAINED IN NEXT.JS RUNTIME) ─────────

const workspaceLocks = new Map<string, number>();

function acquireLock(workspaceId: string): boolean {
  const now = Date.now();
  const expiry = workspaceLocks.get(workspaceId);
  if (expiry && expiry > now) return false;
  workspaceLocks.set(workspaceId, now + 30000); // 30s lock
  return true;
}

function releaseLock(workspaceId: string) {
  workspaceLocks.delete(workspaceId);
}

export async function processSingleQueuedAction(
  supabaseAdmin: SupabaseClient,
  action: {
    workspace_id: string;
    action_type: string;
    payload: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string; waMessageId?: string }> {
  const { workspace_id, action_type, payload } = action;

  switch (action_type) {
    case 'send_text': {
      const { to, text, workflowLogId } = payload as { to: string; text: string; workflowLogId?: string };
      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(to),
        type: 'text',
        text,
        workflowLogId,
      });
    }

    case 'send_media': {
      const { to, mediaUrl, caption, mimeType, workflowLogId } = payload as {
        to: string; mediaUrl: string; caption?: string; mimeType: string; workflowLogId?: string;
      };
      const mediaType = mimeType.startsWith('image/') ? 'image' :
                        mimeType.startsWith('video/') ? 'video' :
                        mimeType.startsWith('audio/') ? 'audio' : 'document';

      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(to),
        type: mediaType as any,
        mediaUrl,
        caption,
        mimeType,
        workflowLogId,
      });
    }

    case 'send_template': {
      const { to, templateId, variables, workflowLogId } = payload as {
        to: string; templateId: string; variables?: Record<string, string>; workflowLogId?: string;
      };

      let tpl: any = null;

      // 1. Try querying tenant_whatsapp_templates first
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

      let body = (tplPayload.body || tplPayload.question || '') as string;
      if (variables) {
        for (const [key, val] of Object.entries(variables)) {
          body = body.replaceAll(`{${key}}`, val).replaceAll(`{{${key}}}`, val);
        }
      }

      if (tpl.type === 'poll') {
        const options = (tplPayload.options || []).map((o: any) => o.text).filter(Boolean);
        return sendMessageServerless(supabaseAdmin, workspace_id, {
          to: normalizeJid(to),
          type: 'poll',
          text: body,
          pollOptions: options,
          pollSelectableCount: tplPayload.allowMultiple ? 0 : 1,
          workflowLogId,
        });
      }

      if (tpl.type === 'media') {
        const mediaUrl = tplPayload.mediaUrl || tplPayload.default_send_media_url;
        const mimeType = tplPayload.mediaMime || tplPayload.default_send_media_mime || 'application/pdf';
        
        if (tplPayload.footer) {
          body += `\n\n_${tplPayload.footer}_`;
        }

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
          workflowLogId,
        });
      }

      if (tplPayload.footer) {
        body += `\n\n_${tplPayload.footer}_`;
      }

      if (tpl.type === 'list' && tplPayload.sections) {
        body += `\n\n*${tplPayload.buttonText || 'Options'}*`;
        tplPayload.sections.forEach((sec: any) => {
          body += `\n\n*${sec.title}*:`;
          (sec.rows || []).forEach((row: any) => {
            body += `\n- ${row.title}${row.desc || row.description ? ` (${row.desc || row.description})` : ''}`;
          });
        });
      }

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
        workflowLogId,
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

export function startQueuePoller(supabaseAdmin: SupabaseClient) {
  if (process.env.DISABLE_WHATSAPP_WORKER === 'true') {
    console.log('[poller] Queue poller disabled in Next.js because DISABLE_WHATSAPP_WORKER is true.');
    return;
  }
  if ((globalThis as any).__baileysQueuePollerInitialized) {
    console.log('[poller] Baileys background queue poller already initialized, skipping.');
    return;
  }
  (globalThis as any).__baileysQueuePollerInitialized = true;
  console.log('[poller] Starting Baileys background queue poller (5s interval)...');

  setInterval(async () => {
    try {
      const now = new Date().toISOString();
      
      // 1. Fetch all distinct workspace IDs that have pending queue items due
      const { data: pendingItems, error: pendingErr } = await supabaseAdmin
        .from('baileys_action_queue')
        .select('workspace_id')
        .eq('status', 'pending')
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`);

      if (pendingErr || !pendingItems || pendingItems.length === 0) {
        return;
      }

      // Get unique workspace IDs
      const workspaceIds = Array.from(new Set(pendingItems.map((item: any) => item.workspace_id)));

      for (const workspaceId of workspaceIds) {
        // Verify socket is in globalSockets, if not try to wake it up if the session is open
        if (!globalSockets.has(workspaceId)) {
          const { data: session } = await supabaseAdmin
            .from('baileys_sessions')
            .select('conn_state, creds_json')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (session?.conn_state === 'open' && session?.creds_json) {
            console.log(`[poller] Found pending actions for offline workspace ${workspaceId}. Waking up socket...`);
            await getOrCreateSocket(supabaseAdmin, workspaceId).catch(err => {
              console.error(`[poller] Failed to auto-wake socket for workspace ${workspaceId}:`, err.message);
            });
          } else {
            // ── DEAD-LOCK AUTO-FAIL: Socket is DISCONNECTED and credentials are missing/null.
            // Any past-deadline pending tasks cannot be delivered. Immediately mark them
            // as failed so they don't perpetually deadlock in PENDING state.
            const { data: overdueItems } = await supabaseAdmin
              .from('baileys_action_queue')
              .select('id, attempt_count')
              .eq('workspace_id', workspaceId)
              .eq('status', 'pending')
              .lte('next_retry_at', now);

            if (overdueItems && overdueItems.length > 0) {
              console.warn(`[poller] Gateway DISCONNECTED for workspace ${workspaceId}. Auto-failing ${overdueItems.length} overdue pending task(s).`);
              for (const item of overdueItems) {
                await supabaseAdmin
                  .from('baileys_action_queue')
                  .update({
                    status: 'failed',
                    error_message: `[AUTO-FAIL] Gateway disconnected (no active WhatsApp session). Scheduled dispatch deadline passed at ${now}. Scan QR code on integrations page to re-establish connection, then use Retry Failed Steps.`,
                    next_retry_at: null
                  })
                  .eq('id', item.id)
                  .eq('status', 'pending');
              }
            }
            continue;
          }
        }

        // Proceed if socket is now active
        if (!globalSockets.has(workspaceId)) continue;

        if (!acquireLock(workspaceId)) continue;

        try {
          const { data: actions, error } = await supabaseAdmin
            .from('baileys_action_queue')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'pending')
            .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(3);

          if (error || !actions || actions.length === 0) {
            releaseLock(workspaceId);
            continue;
          }

          console.log(`[poller] Draining ${actions.length} actions for workspace ${workspaceId}...`);

          for (const action of actions) {
            // Claim action
            const { data: claimed, error: claimErr } = await supabaseAdmin
              .from('baileys_action_queue')
              .update({
                status: 'processing',
                attempt_count: action.attempt_count + 1,
                processed_at: new Date().toISOString()
              })
              .eq('id', action.id)
              .eq('status', 'pending')
              .select();

            if (claimErr || !claimed || claimed.length === 0) continue;

            try {
              const result = await processSingleQueuedAction(supabaseAdmin, action);
              if (!result.success) throw new Error(result.error || 'Execution returned success=false');

              await supabaseAdmin
                .from('baileys_action_queue')
                .update({
                  status: 'done',
                  result_message_id: result.waMessageId || null,
                  error_message: null
                })
                .eq('id', action.id);

              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_done',
                message: `Action ${action.action_type} [${action.id}] completed successfully.`,
                metadata: { action_id: action.id, wa_message_id: result.waMessageId }
              });
            } catch (err: any) {
              const errMsg = err.message || String(err);
              const newAttemptCount = action.attempt_count + 1;

              if (newAttemptCount >= 5) {
                await supabaseAdmin
                  .from('baileys_action_queue')
                  .update({
                    status: 'failed',
                    error_message: `[Attempt ${newAttemptCount}/5] PERMANENTLY FAILED: ${errMsg}`,
                    next_retry_at: null
                  })
                  .eq('id', action.id);

                await supabaseAdmin.from('live_logs').insert({
                  workspace_id: workspaceId,
                  event_type: 'queue_action_failed',
                  message: `⚠️ Action ${action.action_type} [${action.id}] permanently failed after 5 attempts.`,
                  metadata: { action_id: action.id, error: errMsg }
                });
              } else {
                const jitter = Math.floor(Math.random() * 5000);
                const delayMs = 15000 * Math.pow(4, newAttemptCount) + jitter;
                const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

                await supabaseAdmin
                  .from('baileys_action_queue')
                  .update({
                    status: 'pending',
                    error_message: `[Attempt ${newAttemptCount}/5] Failed: ${errMsg}`,
                    next_retry_at: nextRetryAt
                  })
                  .eq('id', action.id);

                await supabaseAdmin.from('live_logs').insert({
                  workspace_id: workspaceId,
                  event_type: 'queue_action_retry_scheduled',
                  message: `↩️ Action ${action.action_type} [${action.id}] failed. Retry in ${Math.round(delayMs / 1000)}s.`,
                  metadata: { action_id: action.id, error: errMsg, next_retry_at: nextRetryAt }
                });
              }
            }
          }
        } catch (err: any) {
          console.error(`[poller] Error draining queue for workspace ${workspaceId}:`, err.message);
        } finally {
          releaseLock(workspaceId);
        }
      }
    } catch (e: any) {
      console.error('[poller] Error in startQueuePoller interval:', e.message);
    }
  }, 5000);

  // Periodic sweeper to recover stuck processing rows (every 60s)
  setInterval(async () => {
    const activeWorkspaceIds = Array.from(globalSockets.keys()) as string[];
    for (const workspaceId of activeWorkspaceIds) {
      try {
        const stuckTimeout = new Date(Date.now() - 120000).toISOString(); // 2 minutes stuck
        const { data: stuck } = await supabaseAdmin
          .from('baileys_action_queue')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('status', 'processing')
          .lt('processed_at', stuckTimeout);

        if (stuck && stuck.length > 0) {
          const stuckIds = stuck.map(s => s.id);
          console.warn(`[poller] Sweeper found ${stuckIds.length} stuck actions in processing for workspace ${workspaceId}. Recovering...`);
          
          await supabaseAdmin
            .from('baileys_action_queue')
            .update({
              status: 'pending',
              error_message: 'Worker process crashed or timed out. Auto-recovered by sweeper.',
              next_retry_at: new Date(Date.now() + 5000).toISOString(),
            })
            .in('id', stuckIds);
        }
      } catch (err: any) {
        console.error(`[poller] Sweeper error for workspace ${workspaceId}:`, err.message);
      }
    }
  }, 60000);
}

export async function forceWakeQueue(supabaseAdmin: SupabaseClient, workspaceId: string): Promise<void> {
  console.log(`[poller] forceWakeQueue triggered for workspace ${workspaceId}`);
  
  if (process.env.DISABLE_WHATSAPP_WORKER === 'true') {
    console.log('[poller] Next.js forwarding forceWakeQueue to worker /trigger endpoint');
    const WORKER_PORT = process.env.WORKER_PORT ?? '3002';
    try {
      await fetch(`http://localhost:${WORKER_PORT}/trigger`, {
        method: 'POST',
      });
    } catch (err: any) {
      console.error('[poller] Failed to wake up worker via /trigger:', err.message);
    }
    return;
  }
  
  // Run connection recovery and draining in the background (as per Law 3)
  (async () => {
    try {
      // 1. Recover/re-establish socket connection if dead/disconnected
      const sock = await getOrCreateSocket(supabaseAdmin, workspaceId);
      if (!sock) {
        console.error(`[poller] forceWakeQueue: Could not get or create socket for workspace ${workspaceId}`);
        return;
      }

      // 2. Try to acquire lock (wait up to 5 seconds if locked)
      let acquired = false;
      for (let i = 0; i < 5; i++) {
        if (acquireLock(workspaceId)) {
          acquired = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!acquired) {
        console.log(`[poller] forceWakeQueue: Workspace ${workspaceId} is locked, skipping background drain`);
        return;
      }

      try {
        const now = new Date().toISOString();
        const { data: actions, error } = await supabaseAdmin
          .from('baileys_action_queue')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('status', 'pending')
          .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
          .order('priority', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(3);

        if (error || !actions || actions.length === 0) {
          return;
        }

        console.log(`[poller] [Force-Wake] Processing ${actions.length} actions for workspace ${workspaceId}...`);

        for (const action of actions) {
          // Claim action
          const { data: claimed, error: claimErr } = await supabaseAdmin
            .from('baileys_action_queue')
            .update({
              status: 'processing',
              attempt_count: action.attempt_count + 1,
              processed_at: new Date().toISOString()
            })
            .eq('id', action.id)
            .eq('status', 'pending')
            .select();

          if (claimErr || !claimed || claimed.length === 0) continue;

          try {
            const result = await processSingleQueuedAction(supabaseAdmin, action);
            if (!result.success) throw new Error(result.error || 'Execution returned success=false');

            await supabaseAdmin
              .from('baileys_action_queue')
              .update({
                status: 'done',
                result_message_id: result.waMessageId || null,
                error_message: null
              })
              .eq('id', action.id);

            await supabaseAdmin.from('live_logs').insert({
              workspace_id: workspaceId,
              event_type: 'queue_action_done',
              message: `Action ${action.action_type} [${action.id}] completed successfully. (Force-Woken)`,
              metadata: { action_id: action.id, wa_message_id: result.waMessageId }
            });
          } catch (err: any) {
            const errMsg = err.message || String(err);
            const newAttemptCount = action.attempt_count + 1;

            if (newAttemptCount >= 5) {
              await supabaseAdmin
                .from('baileys_action_queue')
                .update({
                  status: 'failed',
                  error_message: `[Attempt ${newAttemptCount}/5] PERMANENTLY FAILED: ${errMsg}`,
                  next_retry_at: null
                })
                .eq('id', action.id);

              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_failed',
                message: `⚠️ Action ${action.action_type} [${action.id}] permanently failed after 5 attempts. (Force-Woken)`,
                metadata: { action_id: action.id, error: errMsg }
              });
            } else {
              const jitter = Math.floor(Math.random() * 5000);
              const delayMs = 15000 * Math.pow(4, newAttemptCount) + jitter;
              const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

              await supabaseAdmin
                .from('baileys_action_queue')
                .update({
                  status: 'pending',
                  error_message: `[Attempt ${newAttemptCount}/5] Failed: ${errMsg}`,
                  next_retry_at: nextRetryAt
                })
                .eq('id', action.id);

              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_retry_scheduled',
                message: `↩️ Action ${action.action_type} [${action.id}] failed. Retry in ${Math.round(delayMs / 1000)}s. (Force-Woken)`,
                metadata: { action_id: action.id, error: errMsg, next_retry_at: nextRetryAt }
              });
            }
          }
        }
      } finally {
        releaseLock(workspaceId);
      }
    } catch (e: any) {
      console.error('[poller] forceWakeQueue background error:', e.message);
    }
  })();
}
