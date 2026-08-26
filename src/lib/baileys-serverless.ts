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
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'poll' | 'buttons' | 'list';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  mimeType?: string;
  fileName?: string;
  pollOptions?: string[];
  pollSelectableCount?: number;
  workflowLogId?: string;
  buttons?: any[];
  rawButtons?: any[];
  listButtonText?: string;
  listSections?: any[];
  footer?: string;
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

  const replaceFn = (match: string, rawKey: string) => {
    const key = rawKey.trim();
    const normalizedKey = key.toLowerCase();

    // 1. Time / Date
    if (normalizedKey === 'created_time' || normalizedKey === 'timestamp') {
      if (lead.created_time) return String(lead.created_time);
      if (lead.timestamp) {
        try {
          return new Date(lead.timestamp).toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
        } catch {}
      }
      return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    if (normalizedKey === 'current_date' || normalizedKey === 'date') {
      return lead.current_date || new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    // 2. Direct property matches (case-insensitive)
    const leadKeys = Object.keys(lead);
    const directMatch = leadKeys.find(k => k.toLowerCase() === normalizedKey);
    if (directMatch && lead[directMatch] !== undefined && lead[directMatch] !== null && String(lead[directMatch]).trim() !== '') {
      return String(lead[directMatch]);
    }

    // 3. Smart Semantic Aliases
    const aliasMap: Record<string, string[]> = {
      full_name: ['full_name', 'name', 'lead_name', 'client_name', 'Name', 'Name_1'],
      first_name: ['first_name', 'fname'],
      last_name: ['last_name', 'lname'],
      phone: ['phone', 'phone_number', 'mobile', 'contact', 'whatsapp_number'],
      email: ['email', 'email_address', 'mail'],
      shoot_type: [
        'shoot_type', 'kind_of_shoot', 'shoot', 'service', 'services', 'photography_services',
        'what_photography_services_are_you_looking_for?', 'what_photography_services_are_you_looking_for'
      ],
      location: ['location', 'city', 'venue', 'destination', 'event_location', 'shoot_location', 'address'],
      budget: [
        'budget', 'max_budget', 'price', 'expected_budget',
        'what_is_your_budget_for_photography_services?', 'what_is_your_budget_for_photography_services'
      ],
      source: ['source', 'lead_source', 'campaign_name', 'form_name', 'page_name', 'platform', 'ad_name'],
      wedding_date: ['wedding_date', 'event_date', 'shoot_date', 'date_of_event'],
    };

    const aliases = aliasMap[normalizedKey] || [];
    for (const alias of aliases) {
      const foundKey = leadKeys.find(k => k.toLowerCase() === alias.toLowerCase());
      if (foundKey && lead[foundKey] !== undefined && lead[foundKey] !== null && String(lead[foundKey]).trim() !== '') {
        return String(lead[foundKey]);
      }
    }

    // 4. Nested field_data array check (Facebook / Meta Lead Ad structure)
    if (Array.isArray(lead.field_data)) {
      for (const item of lead.field_data) {
        const itemKey = (item.name || '').toLowerCase();
        if (itemKey === normalizedKey || aliases.some(a => a.toLowerCase() === itemKey)) {
          const val = Array.isArray(item.values) ? item.values[0] : item.values;
          if (val) return String(val);
        }
      }
    }

    // 5. Nested raw_payload check
    if (lead.raw_payload && typeof lead.raw_payload === 'object') {
      const rawKeys = Object.keys(lead.raw_payload);
      for (const alias of [normalizedKey, ...aliases]) {
        const found = rawKeys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (found && lead.raw_payload[found] != null && String(lead.raw_payload[found]).trim() !== '') {
          return String(lead.raw_payload[found]);
        }
      }
    }

    // Fallback: if not found, return empty string for clean replacement
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
    // 0. Centralized Fallback Resolution for workspaceId / user_id
    let effectiveWsId = workspaceId;
    if (!effectiveWsId || effectiveWsId.trim() === '' || effectiveWsId === 'null' || effectiveWsId === 'undefined') {
      effectiveWsId = (payload as any).workspace_id || (payload as any).workspaceId || (payload as any).user_id || (payload as any).userId;
    }

    // IF STILL EMPTY (e.g. background cron job, workflow retry):
    if (!effectiveWsId || effectiveWsId.trim() === '' || effectiveWsId === 'null' || effectiveWsId === 'undefined') {
      if (payload.workflowLogId) {
        try {
          const { data: logData } = await supabaseAdmin
            .from('whatsapp_workflow_logs')
            .select('tenant_id, workspace_id, workflow_id, lead_id')
            .eq('id', payload.workflowLogId)
            .maybeSingle();

          if (logData) {
            effectiveWsId = logData.tenant_id || logData.workspace_id;
            if (!effectiveWsId && logData.workflow_id) {
              const { data: wfData } = await supabaseAdmin
                .from('whatsapp_custom_workflows')
                .select('user_id, workspace_id, tenant_id')
                .eq('id', logData.workflow_id)
                .maybeSingle();
              effectiveWsId = wfData?.user_id || wfData?.workspace_id || wfData?.tenant_id;
            }
            if (!effectiveWsId && logData.lead_id) {
              const { data: leadData } = await supabaseAdmin
                .from('leads')
                .select('workspace_id')
                .eq('id', logData.lead_id)
                .maybeSingle();
              effectiveWsId = leadData?.workspace_id;
            }
          }
        } catch (dbErr) {
          console.error('[sendMessageServerless] Error looking up fallback tenantId:', dbErr);
        }
      }
    }

    if (!effectiveWsId || effectiveWsId.trim() === '' || effectiveWsId === 'null' || effectiveWsId === 'undefined') {
      console.error(`[sendMessageServerless Error] Cannot execute workflow step: Missing tenant workspace_id for recipient ${payload.to}`);
      return { success: false, error: `[sendMessageServerless Error] Cannot execute step: Missing tenant workspace_id for recipient ${payload.to}` };
    }

    workspaceId = effectiveWsId;

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
    const sendTo = normalizeJid(payload.to);
    const sendType = payload.type;
    console.log(`[send] ➡️ Sending ${sendType} to ${sendTo} via worker 127.0.0.1:${WORKER_PORT}...`);

    try {
      const res = await fetch(`http://127.0.0.1:${WORKER_PORT}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          user_id: workspaceId,
          to: sendTo,
          type: sendType,
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          caption: payload.caption,
          mimeType: payload.mimeType,
          pollOptions: payload.pollOptions,
          pollSelectableCount: payload.pollSelectableCount,
          buttons: payload.buttons,
          rawButtons: payload.rawButtons,
          listButtonText: payload.listButtonText,
          listSections: payload.listSections,
          footer: payload.footer,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody.error || `Worker returned HTTP ${res.status}`;
        console.error(`[send] ❌ Worker rejected: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      const resData = await res.json();
      console.log(`[send] ✅ Worker accepted. WA ID: ${resData.waMessageId || 'N/A'}`);
      return { success: true, waMessageId: resData.waMessageId };
    } catch (err: any) {
      console.error(`[send] ❌ Failed to reach worker at 127.0.0.1:${WORKER_PORT}:`, err.message);
      return { success: false, error: `Worker at 127.0.0.1:${WORKER_PORT} unreachable: ${err.message}. Ensure Baileys Worker is running under PM2.` };
    }

  } finally {
    // 4. Temp File Cleanup (Delayed to allow worker to read it)
    if (tempFileToClean) {
      const fileToClean = tempFileToClean;
      setTimeout(() => {
        try {
          const fs = require('fs');
          if (fs.existsSync(fileToClean)) {
            fs.unlinkSync(fileToClean);
            console.log('[compression] Cleaned up temporary compressed file after delay:', fileToClean);
          }
        } catch (err: any) {
          console.error('[compression] Error unlinking temp file after delay:', err.message);
        }
      }, 120_000); // 2 minutes delay
    }
  }
}



// ─── CORE: Generate QR Code via Standalone Worker Bridge ─────────────────────
async function startDirectServerlessQr(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  onQr: (qrString: string) => void,
  onConnected: (phoneNumber: string) => void,
  onError: (msg: string) => void,
  timeoutMs: number
): Promise<void> {
  console.log(`[startDirectServerlessQr] 🚀 Starting direct serverless QR generation for workspace ${workspaceId}`);
  try {
    const makeWASocket = (await import('@whiskeysockets/baileys')).default;
    const { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, initAuthCreds, BufferJSON, Browsers } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;
    const logger = pino({ level: 'silent' });

    // For fresh QR pairing, always initialize fresh auth credentials so Baileys generates a QR code immediately
    const creds: any = initAuthCreds();
    const keysCache: Record<string, any> = {};

    const saveCreds = async () => {
      try {
        const credsJson = JSON.stringify(creds, BufferJSON.replacer);
        const keysJson = JSON.stringify(keysCache, BufferJSON.replacer);
        await supabaseAdmin
          .from('baileys_sessions')
          .upsert({
            workspace_id: workspaceId,
            creds_json: credsJson,
            keys_json: keysJson,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id' });
      } catch (err) {
        console.error('[saveCreds error]', err);
      }
    };

    const keysStore = {
      async get(type: string, ids: string[]) {
        const result: Record<string, any> = {};
        const typeCache = keysCache[type] || {};
        for (const id of ids) {
          if (typeCache[id] !== undefined) {
            result[id] = typeCache[id];
          }
        }
        return result;
      },
      async set(data: Record<string, Record<string, any>>) {
        for (const [type, entries] of Object.entries(data)) {
          if (!keysCache[type]) keysCache[type] = {};
          if (entries) {
            for (const [id, value] of Object.entries(entries)) {
              keysCache[type][id] = value;
            }
          }
        }
        await saveCreds();
      },
    };

    let { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1017531287] as [number, number, number],
    }));

    const socket = makeWASocket({
      version,
      logger: logger.child({ module: 'baileys-qr' }),
      auth: {
        creds,
        keys: makeCacheableSignalKeyStore(keysStore as any, logger.child({ module: 'keys-qr' })),
      },
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      keepAliveIntervalMs: 10_000,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      markOnlineOnConnect: true,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: true,
      shouldSyncHistoryMessage: () => true,
    });

    socket.ev.on('creds.update', async (update: Partial<any>) => {
      Object.assign(creds, update);
      await saveCreds();
    });

    // ── Capture Phone Chats History Sync ──
    socket.ev.on('messaging-history.set' as any, async ({ chats: histChats, contacts: histContacts, messages: histMessages }: any) => {
      try {
        console.log(`[baileys-sync] 📥 Received messaging-history.set: ${histChats?.length || 0} chats, ${histContacts?.length || 0} contacts, ${histMessages?.length || 0} messages`);
        
        if (histChats && histChats.length > 0) {
          const chatRows = histChats.map((c: any) => ({
            workspace_id: workspaceId,
            jid: c.id,
            display_name: c.name || c.subject || null,
            unread_count: c.unreadCount || 0,
            last_message: c.conversationTimestamp ? 'Synced message' : null,
            last_message_at: c.conversationTimestamp ? new Date(Number(c.conversationTimestamp) * 1000).toISOString() : new Date().toISOString(),
            is_group: c.id?.endsWith('@g.us'),
            updated_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('baileys_chats').upsert(chatRows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
        }

        if (histContacts && histContacts.length > 0) {
          const contactRows = histContacts.map((c: any) => ({
            workspace_id: workspaceId,
            jid: c.id,
            name: c.name || c.notify || c.verifiedName || null,
            push_name: c.notify || null,
            phone: c.id?.split('@')[0],
            updated_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('evolution_contacts').upsert(contactRows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
        }
      } catch (histErr: any) {
        console.warn('[baileys-sync] History sync error:', histErr.message);
      }
    });

    socket.ev.on('chats.set' as any, async ({ chats: histChats }: any) => {
      try {
        if (histChats && histChats.length > 0) {
          const chatRows = histChats.map((c: any) => ({
            workspace_id: workspaceId,
            jid: c.id,
            display_name: c.name || c.subject || null,
            unread_count: c.unreadCount || 0,
            last_message: c.conversationTimestamp ? 'Synced message' : null,
            last_message_at: c.conversationTimestamp ? new Date(Number(c.conversationTimestamp) * 1000).toISOString() : new Date().toISOString(),
            is_group: c.id?.endsWith('@g.us'),
            updated_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('baileys_chats').upsert(chatRows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
        }
      } catch (_) {}
    });

    socket.ev.on('messages.upsert' as any, async ({ messages: newMsgs, type }: any) => {
      try {
        if (!newMsgs || newMsgs.length === 0) return;
        for (const msg of newMsgs) {
          const chatJid = msg.key?.remoteJid;
          if (!chatJid) continue;
          const text = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       msg.message?.imageMessage?.caption || 
                       '[media]';
          
          await supabaseAdmin.from('evolution_messages').upsert({
            workspace_id: workspaceId,
            message_id: msg.key?.id,
            remote_jid: chatJid,
            from_me: !!msg.key?.fromMe,
            message_type: msg.message?.imageMessage ? 'image' : 'text',
            content: text,
            status: msg.key?.fromMe ? 'SENT' : 'DELIVERED',
            timestamp: new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
          }, { onConflict: 'workspace_id,message_id' });
        }
      } catch (_) {}
    });

    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try { (socket.ev as any).removeAllListeners(); socket.end(undefined); } catch {}
        resolve();
      }, timeoutMs);

      socket.ev.on('connection.update', async (update: any) => {
        const { connection, qr } = update;
        if (qr) {
          console.log(`[startDirectServerlessQr] 📱 Emitting fresh QR code for ${workspaceId}`);
          onQr(qr);
          await supabaseAdmin
            .from('baileys_sessions')
            .upsert({
              workspace_id: workspaceId,
              qr_string: qr,
              qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
              conn_state: 'connecting',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
        }

        if (connection === 'open') {
          console.log(`[startDirectServerlessQr] ✅ WhatsApp connected for ${workspaceId}`);
          const rawPhone = socket.user?.id?.split(':')[0]?.split('@')[0] || '';
          onConnected(rawPhone);
          await supabaseAdmin
            .from('baileys_sessions')
            .upsert({
              workspace_id: workspaceId,
              conn_state: 'open',
              status: 'CONNECTED',
              phone_number: rawPhone || null,
              last_connected: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });

          // Auto-fetch groups on connect
          setTimeout(async () => {
            try {
              const groupMap = await socket.groupFetchAllParticipating();
              const groups = Object.values(groupMap).map((g: any) => ({
                workspace_id: workspaceId,
                jid: g.id,
                display_name: g.subject || g.id.split('@')[0],
                participant_count: g.participants?.length ?? 0,
                is_group: true,
                updated_at: new Date().toISOString(),
              }));
              if (groups.length > 0) {
                await supabaseAdmin.from('baileys_chats').upsert(groups, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
              }
            } catch (_) {}
          }, 2000);

          clearTimeout(timer);
          resolve();
        }
      });
    });
  } catch (err: any) {
    console.error('[startDirectServerlessQr Exception]', err);
    onError(err.message || 'Serverless QR generation failed');
  }
}

export async function generateQrServerless(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  onQr: (qrString: string) => void,
  onConnected: (phoneNumber: string) => void,
  onError: (msg: string) => void,
  timeoutMs = 55_000
): Promise<void> {
  const WORKER_PORT = process.env.WORKER_PORT ?? '3002';

  // 1. Fast check DB — if session is ALREADY CONNECTED/OPEN, return immediately!
  const { data: dbSess } = await supabaseAdmin
    .from('baileys_sessions')
    .select('conn_state, status, phone_number')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (dbSess?.conn_state === 'open' || dbSess?.status === 'CONNECTED') {
    console.log(`[generateQrServerless] ✅ DB shows session already connected for ${workspaceId}`);
    onConnected(dbSess.phone_number || 'Device Linked');
    return;
  }

  let isWorkerAvailable = false;
  try {
    const healthRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/health?workspace_id=${encodeURIComponent(workspaceId)}`, { signal: AbortSignal.timeout(1500) });
    if (healthRes.ok) {
      const health = await healthRes.json();
      if (health.socket_conn_state === 'open' || health.socket_authenticated) {
        console.log(`[generateQrServerless] ✅ Worker reports socket already connected for ${workspaceId}`);
        onConnected(health.phone_number || 'Device Linked');
        return;
      }
      isWorkerAvailable = true;
      await fetch(`http://127.0.0.1:${WORKER_PORT}/init-qr?workspace_id=${encodeURIComponent(workspaceId)}`, { method: 'POST' }).catch(() => {});
    }
  } catch {
    isWorkerAvailable = false;
  }

  if (!isWorkerAvailable) {
    console.log(`[generateQrServerless] Worker offline — falling back to Direct Serverless Gateway for ${workspaceId}`);
    return startDirectServerlessQr(supabaseAdmin, workspaceId, onQr, onConnected, onError, timeoutMs);
  }

  // 2. Poll DB for REAL QR from Baileys worker
  const startTime = Date.now();
  let lastQr: string | null = null;
  let lastHealthCheck = 0;

  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data } = await supabaseAdmin
      .from('baileys_sessions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if ((data as any)?.conn_state === 'open') {
      console.log(`[generateQrServerless] ✅ DB shows conn_state=open for ${workspaceId}`);
      onConnected((data as any)?.phone_number ?? '');
      return;
    }

    if ((data as any)?.qr_string && (data as any).qr_string !== lastQr) {
      const qrExpired = (data as any)?.qr_expires_at ? new Date((data as any).qr_expires_at) < new Date() : false;
      if (!qrExpired) {
        lastQr = (data as any).qr_string;
        onQr((data as any).qr_string);
      }
    }

    if (data?.conn_state === 'disconnected' && !data?.qr_string) {
      // Still waiting for worker to generate QR — keep polling silently
      continue;
    }

    // Periodically check worker health as a fallback — if the socket is actually
    // connected but the DB write failed (dbWrite timeout), we force-update the DB.
    if (Date.now() - lastHealthCheck > 10_000) {
      lastHealthCheck = Date.now();
      try {
        const healthRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/health`);
        if (healthRes.ok) {
          const health = await healthRes.json();
          if (health.socket_conn_state === 'open') {
            const hp = health.phone_number ?? '';
            console.log(`[generateQrServerless] ⚠️ Worker reports connected but DB lags — force-updating for ${workspaceId}`);
            await supabaseAdmin
              .from('baileys_sessions')
              .upsert({
                workspace_id: workspaceId,
                conn_state: 'open',
                status: 'CONNECTED',
                qr_string: null,
                phone_number: hp || null,
                last_connected: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: 'workspace_id' });
            onConnected(hp);
            return;
          }
        }
      } catch {
        // worker not reachable — keep polling DB
      }
    }
  }

  // ── Final fallback after timeout ──
  // If the polling loop exhausted but the worker is actually connected, force
  // the DB update one last time before giving up.
  try {
    const healthRes = await fetch(`http://127.0.0.1:${WORKER_PORT}/health`);
    if (healthRes.ok) {
      const health = await healthRes.json();
      if (health.socket_conn_state === 'open') {
        const hp = health.phone_number ?? '';
        console.log(`[generateQrServerless] ⏰ Timeout fallback — worker connected, force-updating DB for ${workspaceId}`);
        await supabaseAdmin
          .from('baileys_sessions')
          .upsert({
            workspace_id: workspaceId,
            conn_state: 'open',
            status: 'CONNECTED',
            qr_string: null,
            phone_number: hp || null,
            last_connected: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id' });
        onConnected(hp);
        return;
      }
    }
  } catch {
    // worker not reachable
  }

  console.log(`[generateQrServerless] ❌ QR pairing timed out for ${workspaceId}`);
  onError('QR pairing timed out. Please try again.');
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
        body = parseShortcodes(body, variables);
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

    case 'group_dispatch':
    case 'group_lead_alert': {
      const p = payload as any;
      const groupJid = p.groupJid || p.groupId || p.to || '';
      const leadData = p.leadData || p.variables || {};
      const templateId = p.templateId || p.template_id;
      const templateStr = p.templateStr;
      const workflowLogId = p.workflowLogId;

      if (!groupJid) {
        return { success: false, error: 'Missing target group JID for group dispatch' };
      }

      let tpl: any = null;

      // 1. Try querying tenant_whatsapp_templates first if templateId is provided
      if (templateId) {
        const { data: tenantTpl } = await supabaseAdmin
          .from('tenant_whatsapp_templates')
          .select('*')
          .eq('id', templateId)
          .eq('tenant_id', workspace_id)
          .maybeSingle();

        if (tenantTpl) {
          tpl = {
            id: tenantTpl.id,
            name: tenantTpl.template_name,
            type: tenantTpl.media_url_payload ? 'media' : (tenantTpl.type || 'text'),
            payload: {
              body: tenantTpl.body_text || '',
              mediaUrl: tenantTpl.media_url_payload || '',
              ...(tenantTpl.payload_json || {})
            },
            buttons: tenantTpl.buttons || []
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
      }

      // If user specified a template or templateStr, use that template ONLY
      if (tpl || templateStr) {
        const tplPayload = tpl?.payload || {};
        let body = (templateStr || tplPayload.body || tplPayload.question || '') as string;
        body = parseShortcodes(body, leadData);

        // Media template
        if (tpl && (tpl.type === 'media' || tplPayload.mediaUrl)) {
          const mediaUrl = tplPayload.mediaUrl || tplPayload.default_send_media_url;
          const mimeType = tplPayload.mediaMime || tplPayload.default_send_media_mime || 'image/jpeg';
          const mediaType = mimeType.startsWith('image/') ? 'image' :
                            mimeType.startsWith('video/') ? 'video' :
                            mimeType.startsWith('audio/') ? 'audio' : 'document';

          return sendMessageServerless(supabaseAdmin, workspace_id, {
            to: normalizeJid(groupJid),
            type: mediaType as any,
            mediaUrl,
            caption: body,
            mimeType,
            fileName: tplPayload.fileName || 'lead_alert',
            workflowLogId,
          });
        }

        // Poll template
        if (tpl && tpl.type === 'poll') {
          const options = (tplPayload.options || []).map((o: any) => o.text).filter(Boolean);
          return sendMessageServerless(supabaseAdmin, workspace_id, {
            to: normalizeJid(groupJid),
            type: 'poll',
            text: body,
            pollOptions: options,
            pollSelectableCount: tplPayload.allowMultiple ? 0 : 1,
            workflowLogId,
          });
        }

        // Plain Text template
        return sendMessageServerless(supabaseAdmin, workspace_id, {
          to: normalizeJid(groupJid),
          type: 'text',
          text: body,
          workflowLogId,
        });
      }

      // Fallback ONLY if no templateId and no templateStr was ever specified
      const card =
        `🎯 *NEW LEAD ALERT*\n\n` +
        `👤 *Name:* ${leadData.name || leadData.full_name || leadData.lead_name || 'Unknown'}\n` +
        `📞 *Phone:* ${leadData.phone || leadData.phone_number || '—'}\n` +
        `📧 *Email:* ${leadData.email || '—'}\n` +
        `🔗 *Source:* ${leadData.source || leadData.campaign_name || '—'}\n` +
        `🕐 *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `_FW Core — Automated Lead Alert_`;

      return sendMessageServerless(supabaseAdmin, workspace_id, {
        to: normalizeJid(groupJid),
        type: 'text',
        text: card,
        workflowLogId,
      });
    }

    default:
      return { success: false, error: `Unknown action type: ${action_type}` };
  }
}

export let isQueuePollerInitialized = false;

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
  isQueuePollerInitialized = true;
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
        // Check if we can process: either a local socket exists OR the worker has an open session
        let canProcess = globalSockets.has(workspaceId);

        if (!canProcess) {
          const { data: session } = await supabaseAdmin
            .from('baileys_sessions')
            .select('conn_state, creds_json')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (session?.conn_state === 'open' && session?.creds_json) {
            // Worker has an active session — no need to create a duplicate local socket,
            // sendMessageServerless will route through the worker at WORKER_PORT.
            canProcess = true;
          } else {
            // ── DEAD-LOCK AUTO-FAIL: No local socket AND no worker session.
            // Any past-deadline pending tasks cannot be delivered. Immediately mark them
            // as failed so they don't perpetually deadlock in PENDING state.
            const { data: overdueItems } = await supabaseAdmin
              .from('baileys_action_queue')
              .select('id, attempt_count')
              .eq('workspace_id', workspaceId)
              .eq('status', 'pending')
              .lte('next_retry_at', now);

            if (overdueItems && overdueItems.length > 0) {
              console.warn(`[poller] No active session for workspace ${workspaceId}. Auto-failing ${overdueItems.length} overdue pending task(s).`);
              for (const item of overdueItems) {
                await supabaseAdmin
                  .from('baileys_action_queue')
                  .update({
                    status: 'failed',
                    error_message: `[AUTO-FAIL] No active WhatsApp session. Scheduled dispatch deadline passed at ${now}. Scan QR code on integrations page to re-establish connection, then use Retry Failed Steps.`,
                    next_retry_at: null
                  })
                  .eq('id', item.id)
                  .eq('status', 'pending');
              }
            }
            continue;
          }
        }

        if (!canProcess) continue;

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
            const actionId = action.id;
            const actionType = action.action_type;
            const stepDesc = `${actionType}[${actionId.slice(0, 8)}]`;

            // Log: Attempting to claim
            await supabaseAdmin.from('live_logs').insert({
              workspace_id: workspaceId,
              event_type: 'queue_action_claimed',
              message: `⏳ ${stepDesc} — Claiming action (attempt ${action.attempt_count + 1})`,
              metadata: { action_id: actionId, action_type: actionType, attempt: action.attempt_count + 1, payload: action.payload }
            });

            // Claim action
            const { data: claimed, error: claimErr } = await supabaseAdmin
              .from('baileys_action_queue')
              .update({
                status: 'processing',
                attempt_count: action.attempt_count + 1,
                processed_at: new Date().toISOString()
              })
              .eq('id', actionId)
              .eq('status', 'pending')
              .select();

            if (claimErr || !claimed || claimed.length === 0) {
              // Log: Claim failed (another processor got it)
              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_claim_skipped',
                message: `⏭️ ${stepDesc} — Already claimed by another processor`,
                metadata: { action_id: actionId, action_type: actionType }
              });
              continue;
            }

            // Log: Claimed successfully, starting execution
            await supabaseAdmin.from('live_logs').insert({
              workspace_id: workspaceId,
              event_type: 'queue_action_executing',
              message: `▶️ ${stepDesc} — Executing via ${actionType} handler`,
              metadata: { action_id: actionId, action_type: actionType }
            });

            try {
              const result = await processSingleQueuedAction(supabaseAdmin, action);
              if (!result.success) throw new Error(result.error || 'Execution returned success=false');

              // Log: Execution succeeded
              await supabaseAdmin
                .from('baileys_action_queue')
                .update({
                  status: 'done',
                  result_message_id: result.waMessageId || null,
                  error_message: null
                })
                .eq('id', actionId);

              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_done',
                message: `✅ ${stepDesc} — Sent successfully. WA ID: ${result.waMessageId || 'N/A'}`,
                metadata: { action_id: actionId, wa_message_id: result.waMessageId, attempts: action.attempt_count + 1 }
              });
            } catch (err: any) {
              const errMsg = err.message || String(err);
              const newAttemptCount = action.attempt_count + 1;

              // Log: Execution failed
              await supabaseAdmin.from('live_logs').insert({
                workspace_id: workspaceId,
                event_type: 'queue_action_error',
                message: `❌ ${stepDesc} — Failed: ${errMsg}`,
                metadata: { action_id: actionId, action_type: actionType, error: errMsg, attempt: newAttemptCount }
              });

              if (newAttemptCount >= 5) {
                await supabaseAdmin
                  .from('baileys_action_queue')
                  .update({
                    status: 'failed',
                    error_message: `[Attempt ${newAttemptCount}/5] PERMANENTLY FAILED: ${errMsg}`,
                    next_retry_at: null
                  })
                  .eq('id', actionId);

                await supabaseAdmin.from('live_logs').insert({
                  workspace_id: workspaceId,
                  event_type: 'queue_action_failed',
                  message: `🚫 ${stepDesc} — Permanently failed after ${newAttemptCount} attempts. Manual retry required.`,
                  metadata: { action_id: actionId, error: errMsg, total_attempts: newAttemptCount }
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
                  .eq('id', actionId);

                await supabaseAdmin.from('live_logs').insert({
                  workspace_id: workspaceId,
                  event_type: 'queue_action_retry_scheduled',
                  message: `↩️ ${stepDesc} — Retry scheduled in ${Math.round(delayMs / 1000)}s (attempt ${newAttemptCount}/5)`,
                  metadata: { action_id: actionId, error: errMsg, next_retry_at: nextRetryAt, attempt: newAttemptCount }
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
    // Include both local-socket workspaces AND worker-managed workspaces with open sessions
    const { data: activeSessions } = await supabaseAdmin
      .from('baileys_sessions')
      .select('workspace_id')
      .eq('conn_state', 'open');
    const sessionWorkspaceIds = (activeSessions || []).map((s: any) => s.workspace_id);
    const activeWorkspaceIds = Array.from(new Set([
      ...Array.from(globalSockets.keys() as Iterable<string>),
      ...sessionWorkspaceIds,
    ])) as string[];
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
      await fetch(`http://127.0.0.1:${WORKER_PORT}/trigger`, {
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
