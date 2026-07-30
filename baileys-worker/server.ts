/**
 * FW Core — Baileys Persistent Worker
 * =====================================
 * This process runs 24/7 on Railway/Render/VPS.
 * It keeps the Baileys WebSocket alive and bridges between
 * Supabase (action queue) and WhatsApp servers.
 *
 * Architecture:
 *   Vercel (Next.js) → baileys_action_queue (Supabase) → THIS WORKER → WhatsApp
 *
 * Start: npm run dev  (development)
 *        npm start    (production)
 */

import { config } from 'dotenv';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  WAMessageContent,
  WAMessageKey,
  BaileysEventMap,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pino from 'pino';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';
import { useSupabaseAuthState } from './supabase-auth-state.js';
import type { SignalKeyStore } from './supabase-auth-state.js';
import { purgeSessionDir, getSessionDir, hasDiskSession } from './src/auth-adapter.js';

// Polyfill WebSocket globally for Supabase Realtime in Node.js < 22
globalThis.WebSocket = ws as any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: { target: 'pino-pretty' },
});

// ─── DB Timeout Helper ───────────────────────────────────────────────────────
// Prevents hanging Supabase calls from blocking the Baileys event loop.
// All DB writes inside socket event handlers MUST use this wrapper.
const DB_TIMEOUT = 15_000; // 15s — Supabase can be slow under load

async function dbWrite<T>(thenable: { then: Function }, label: string): Promise<T | undefined> {
  try {
    return await Promise.race([
      thenable as unknown as Promise<T>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`DB timeout: ${label}`)), DB_TIMEOUT)
      ),
    ]);
  } catch (err) {
    logger.error({ err, label }, `⚠️ DB operation failed or timed out: ${label}`);
    return undefined;
  }
}

// Critical DB write with retry — used for session state transitions (open/close).
// Retries up to `maxRetries` times with linear backoff (1s, 2s, 3s).
async function dbWriteCritical<T>(thenable: { then: Function }, label: string, maxRetries = 3): Promise<T | undefined> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        thenable as unknown as Promise<T>,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`DB timeout: ${label}`)), DB_TIMEOUT)
        ),
      ]);
    } catch (err) {
      logger.error({ err, label, attempt }, `⚠️ DB critical write failed (${attempt}/${maxRetries}): ${label}`);
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return undefined;
}

// ─── Config (Absolute Dotenv Paths) ─────────────────────────────────────────
const envPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env.local'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      config({ path: p });
      logger.info(`✅ Loaded environment variables from: ${p}`);
    } catch (err) {
      logger.warn({ err, path: p }, 'Failed to load environment path');
    }
  }
}


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WORKSPACE_ID = process.env.WORKER_WORKSPACE_ID || '';
const PORT = parseInt(process.env.WORKER_PORT ?? '3002', 10); // use WORKER_PORT to avoid collision with Next.js on 3000

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  logger.fatal('Missing required env vars: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ─── Supabase Admin Client ────────────────────────────────────────────────────
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    transport: ws as any,
  },
});

// (In-Memory Store chat cache removed to comply with ESM build of @whiskeysockets/baileys)

// ─── Multi-Tenant Active Session Store ──────────────────────────────────────
type WorkspaceSession = {
  wsId: string;
  sock: ReturnType<typeof makeWASocket>;
  authState: Awaited<ReturnType<typeof useSupabaseAuthState>>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  connectingTimeoutTimer?: ReturnType<typeof setTimeout>;
  lastQrTime: number;
};

const activeSessions = new Map<string, WorkspaceSession>();

async function getWorkspaceSocket(wsId: string): Promise<ReturnType<typeof makeWASocket>> {
  if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') {
    throw new Error('Invalid empty workspace/user ID provided to getWorkspaceSocket');
  }

  // 1. Direct activeSessions lookup
  let sess = activeSessions.get(wsId);
  if (sess && sess.sock) return sess.sock;

  // 2. Check DB session mapping for user_id or workspace_id
  let mappedId = wsId;
  try {
    const { data: dbSess } = await supabase
      .from('baileys_sessions')
      .select('user_id, workspace_id')
      .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`)
      .maybeSingle();

    if (dbSess) {
      mappedId = dbSess.user_id || dbSess.workspace_id || wsId;
      sess = activeSessions.get(mappedId);
      if (sess && sess.sock) return sess.sock;
    }
  } catch {}

  const targetId = hasDiskSession(mappedId) ? mappedId : (hasDiskSession(wsId) ? wsId : mappedId);

  // 3. Auto-restore on-the-fly from disk session
  if (hasDiskSession(targetId)) {
    logger.info({ workspaceId: targetId }, '🔌 Disk credentials found — auto-restoring socket into memory on-the-fly...');
    await startBaileysSocket(false, targetId);
    sess = activeSessions.get(targetId) || activeSessions.get(wsId);
    if (sess && sess.sock) return sess.sock;
  }

  // 4. Final attempt to restore socket
  logger.info({ workspaceId: targetId }, '🔌 Restoring socket from disk/DB creds...');
  await startBaileysSocket(false, targetId);
  sess = activeSessions.get(targetId) || activeSessions.get(wsId);

  if (!sess || !sess.sock) {
    throw new Error(`WhatsApp socket not connected for workspace ${wsId}`);
  }
  return sess.sock;
}

// ─── Session State Helpers ────────────────────────────────────────────────────
async function updateSessionState(
  state: 'disconnected' | 'connecting' | 'open',
  extras: Record<string, unknown> = {},
  targetWorkspaceId?: string
): Promise<void> {
  const wsId = targetWorkspaceId || WORKSPACE_ID;
  if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') return;
  await supabase
    .from('baileys_sessions')
    .upsert({
      user_id: wsId,
      workspace_id: wsId,
      conn_state: state,
      ...extras,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
}

function formatActionLinksText(rawButtons: any[]): string {
  if (!rawButtons || rawButtons.length === 0) return '';
  const lines = rawButtons.map((btn: any) => {
    if (btn.type === 'url') {
      return `🔗 ${btn.text}: ${btn.value}`;
    }
    if (btn.type === 'phone' || btn.type === 'call') {
      return `📞 ${btn.text}: ${btn.value}`;
    }
    return null;
  }).filter(Boolean);
  return lines.length > 0 ? '\n\n' + lines.join('\n') : '';
}

// ─── Media Helpers ──────────────────────────────────────────────────────────
function detectMimeTypeFromUrl(url: string): string {
  const clean = url.toLowerCase().split('?')[0].split('#')[0];
  if (clean.endsWith('.mp4') || clean.endsWith('.m4v') || clean.includes('.mp4')) return 'video/mp4';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.ogg') || clean.endsWith('.oga')) return 'audio/ogg';
  if (clean.endsWith('.m4a')) return 'audio/mp4';
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.bmp')) return 'image/bmp';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.txt') || clean.endsWith('.csv')) return 'text/plain';
  if (clean.endsWith('.doc') || clean.endsWith('.docx')) return 'application/msword';
  if (clean.endsWith('.xls') || clean.endsWith('.xlsx')) return 'application/vnd.ms-excel';
  return 'image/jpeg';
}

function detectMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

async function downloadMediaAsBuffer(
  mediaSource: string,
  overrideMimeType?: string,
  maxRetries = 2
): Promise<{ buffer: Buffer; mimeType: string; fileName?: string }> {
  // ── LOCAL FILE PATH: /tmp/fw_comp_*.jpg, /var/www/..., relative paths ──
  const isLocalPath = mediaSource.startsWith('/') || mediaSource.startsWith('./') || mediaSource.startsWith('../');
  if (isLocalPath) {
    try {
      logger.info({ path: mediaSource }, '📂 Reading local media file...');
      
      if (!fs.existsSync(mediaSource)) {
        throw new Error(`Local file not found: ${mediaSource}`);
      }
      
      const stat = fs.statSync(mediaSource);
      if (stat.size === 0) {
        throw new Error(`Local file is empty: ${mediaSource}`);
      }
      
      const buffer = fs.readFileSync(mediaSource);
      const detectedMime = overrideMimeType || detectMimeTypeFromUrl(mediaSource);
      
      logger.info({
        path: mediaSource,
        bufferSize: buffer.length,
        mimeType: detectedMime,
      }, '✅ Local media file read successfully');
      
      return { buffer, mimeType: detectedMime };
    } catch (err: any) {
      logger.error({ path: mediaSource, error: err.message }, '❌ Failed to read local media file');
      throw err;
    }
  }

  // ── HTTP/HTTPS URL: download via fetch ──
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info({ url: mediaSource.slice(0, 120), attempt }, '📥 Downloading media from URL...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(mediaSource, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FWCore/1.0)' },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} fetching media from ${mediaSource.slice(0, 100)}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new Error('Downloaded media buffer is empty');
      }

      const serverMimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
      const detectedFromUrl = detectMimeTypeFromUrl(mediaSource);
      const finalMime = overrideMimeType || serverMimeType || detectedFromUrl;

      logger.info({
        url: mediaSource.slice(0, 80),
        bufferSize: buffer.length,
        serverMimeType,
        detectedFromUrl,
        finalMime,
      }, '✅ Media downloaded successfully');

      return { buffer, mimeType: finalMime };

    } catch (err: any) {
      lastError = err;
      logger.warn({ url: mediaSource.slice(0, 100), attempt, error: err.message }, '⚠️ Media download attempt failed');
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Failed to download media after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

// ─── Message Sending Helpers ──────────────────────────────────────────────────
async function sendTextMessage(to: string, text: string, wsId = WORKSPACE_ID): Promise<string | null> {
  const targetSock = await getWorkspaceSocket(wsId);
  const result = await targetSock.sendMessage(to, { text });
  return result?.key?.id ?? null;
}

async function sendMediaMessage(
  to: string,
  mediaUrl: string,
  caption: string,
  mimeType: string,
  wsId = WORKSPACE_ID
): Promise<string | null> {
  const targetSock = await getWorkspaceSocket(wsId);
  const mediaCategory = detectMediaCategory(mimeType);

  // Download media to buffer first — avoids VPS→URL network issues
  const { buffer, mimeType: resolvedMime } = await downloadMediaAsBuffer(mediaUrl, mimeType);
  const finalCategory = detectMediaCategory(resolvedMime);

  let result;
  if (finalCategory === 'image') {
    result = await targetSock.sendMessage(to, { image: buffer, caption, mimetype: resolvedMime } as any);
  } else if (finalCategory === 'video') {
    result = await targetSock.sendMessage(to, { video: buffer, caption, mimetype: resolvedMime } as any);
  } else if (finalCategory === 'audio') {
    result = await targetSock.sendMessage(to, { audio: buffer, mimetype: resolvedMime, ptt: false } as any);
  } else {
    result = await targetSock.sendMessage(to, {
      document: buffer,
      mimetype: resolvedMime,
      fileName: caption || 'file',
    } as any);
  }
  return result?.key?.id ?? null;
}

async function sendTemplateMessage(
  to: string,
  templateId: string,
  variables: Record<string, string>,
  wsId = WORKSPACE_ID
): Promise<string | null> {
  const targetSock = await getWorkspaceSocket(wsId);

  // Full template row including type, buttons, and payload_json
  type TplRow = {
    body_text: string;
    media_url: string | null;
    media_type: string | null;
    tpl_type?: string | null;
    tpl_buttons?: any[] | null;
    tpl_payload?: any | null;
  };
  let tpl: TplRow | null = null;

  // 1. Query tenant_whatsapp_templates first (new schema with type/buttons/payload_json)
  const { data: tenantTpl } = await supabase
    .from('tenant_whatsapp_templates')
    .select('body_text, media_url_payload, type, buttons, payload_json')
    .eq('id', templateId)
    .eq('tenant_id', wsId)
    .maybeSingle();

  if (tenantTpl) {
    const pj = (tenantTpl.payload_json as any) || {};
    const mediaUrl = tenantTpl.media_url_payload || pj.mediaUrl || null;
    let mediaType: string | null = null;
    if (mediaUrl) {
      mediaType = detectMediaCategory(detectMimeTypeFromUrl(mediaUrl));
    }
    tpl = {
      body_text: tenantTpl.body_text || pj.body || pj.question || '',
      media_url: mediaUrl,
      media_type: mediaType,
      tpl_type: (tenantTpl as any).type || null,
      tpl_buttons: (tenantTpl as any).buttons || [],
      tpl_payload: pj,
    };
  } else {
    // 2. Fallback to legacy whatsapp_templates
    const { data: legacyTpl } = await supabase
      .from('whatsapp_templates')
      .select('payload, type, buttons')
      .eq('id', templateId)
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (legacyTpl) {
      const payloadObj = (legacyTpl.payload as any) || {};
      const legacyMediaUrl = payloadObj.mediaUrl || null;
      let legacyMediaType: string | null = null;
      if (legacyMediaUrl) {
        legacyMediaType = detectMediaCategory(detectMimeTypeFromUrl(legacyMediaUrl));
      }
      tpl = {
        body_text: payloadObj.body || payloadObj.question || '',
        media_url: legacyMediaUrl,
        media_type: legacyMediaType,
        tpl_type: (legacyTpl as any).type || null,
        tpl_buttons: (legacyTpl as any).buttons || [],
        tpl_payload: payloadObj,
      };
    }
  }

  // 3. Fallback to baileys_templates
  if (!tpl) {
    const { data: baileysTpl } = await supabase
      .from('baileys_templates')
      .select('body_text, media_url, media_type')
      .eq('id', templateId)
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (baileysTpl) {
      tpl = {
        body_text: baileysTpl.body_text || '',
        media_url: baileysTpl.media_url || null,
        media_type: baileysTpl.media_type || null,
        tpl_type: baileysTpl.media_url ? 'media' : 'text',
        tpl_buttons: [],
        tpl_payload: {},
      };
    }
  }

  if (!tpl) throw new Error(`Template ${templateId} not found`);

  // Replace placeholders (supports {{key}} and {key})
  let body = tpl.body_text;
  if (body) {
    const replaceFn = (match: string, key: string) => {
      const trimmedKey = key.trim();
      
      // Look up in variables (case insensitive)
      const foundKey = Object.keys(variables).find(k => k.toLowerCase() === trimmedKey.toLowerCase());
      if (foundKey && variables[foundKey] !== undefined && variables[foundKey] !== null) {
        return String(variables[foundKey]);
      }

      // Also compute client info and other fields dynamically if not present in variables
      const normalizedKey = trimmedKey.toLowerCase();
      const leadName = variables['Name'] || variables['name'] || variables['full_name'] || variables['lead_name'] || '';
      const leadPhone = variables['phone'] || variables['phone_number'] || '';

      if (normalizedKey === 'first_name') {
        const parts = leadName.trim().split(/\s+/);
        return parts[0] || '';
      }
      if (normalizedKey === 'last_name') {
        const parts = leadName.trim().split(/\s+/);
        return parts.slice(1).join(' ') || '';
      }
      if (normalizedKey === 'full_name') {
        return leadName;
      }
      if (normalizedKey === 'phone_number') {
        return leadPhone;
      }
      return match;
    };

    body = body.replace(/\{\{([^{}]+)\}\}/g, replaceFn).replace(/\{([^{}]+)\}/g, replaceFn);
  }

  // ── POLL TEMPLATE ────────────────────────────────────────────────────────
  if (tpl.tpl_type === 'poll' || (tpl.tpl_payload && tpl.tpl_payload.pollOptions)) {
    const pollOpts = tpl.tpl_payload.pollOptions || [];
    const allowMultiple = tpl.tpl_payload.allowMultipleChoice ?? false;
    const result = await targetSock.sendMessage(to, {
      poll: {
        name: body || 'Poll',
        values: pollOpts,
        selectableCount: allowMultiple ? pollOpts.length : 1,
      }
    });
    return result?.key?.id ?? null;
  }

  // ── ACTION LINKS (URL / Phone — text-formatted for reliable delivery) ────
  const rawButtons: any[] = tpl.tpl_buttons || [];
  const actionLinksText = formatActionLinksText(rawButtons);
  const finalBody = (body || '') + actionLinksText;

  if (actionLinksText) {
    logger.info({ to, linkCount: rawButtons.length }, '📤 Sending template with action links as text');
  }

  // ── MEDIA (with or without action links) ─────────────────────────────────
  if (tpl.media_url) {
    const mimeType = detectMimeTypeFromUrl(tpl.media_url);
    return sendMediaMessage(to, tpl.media_url, finalBody, mimeType, wsId);
  }

  // ── PLAIN TEXT ────────────────────────────────────────────────────────────
  return sendTextMessage(to, finalBody, wsId);
}

async function dispatchGroupCard(groupJid: string, leadData: Record<string, unknown>, wsId = WORKSPACE_ID): Promise<void> {
  const targetSock = await getWorkspaceSocket(wsId);

  const name = (leadData.name as string) ?? 'New Lead';
  const source = (leadData.source as string) ?? 'Unknown';
  const phone = (leadData.phone as string) ?? '—';
  const email = (leadData.email as string) ?? '—';

  const card = `🎯 *NEW LEAD ALERT*\n\n` +
    `👤 *Name:* ${name}\n` +
    `📞 *Phone:* ${phone}\n` +
    `📧 *Email:* ${email}\n` +
    `🔗 *Source:* ${source}\n` +
    `🕐 *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
    `_FW Core — Automated Lead Alert_`;

  await targetSock.sendMessage(groupJid, { text: card });
  logger.info({ groupJid, name, workspaceId: wsId }, '📤 Group dispatch sent');
}

/**
 * Parses a dynamic lead alert template and sends it to a WhatsApp group.
 * Placeholders: {{created_time}}, {{full_name}}, {{shoot_type}}, {{location}},
 *               {{budget}}, {{phone}}, {{email}}, {{source}}, etc.
 */
async function sendGroupAlert(
  groupId: string,
  leadData: Record<string, any>,
  templateStr: string,
  wsId = WORKSPACE_ID
): Promise<string | null> {
  const targetSock = await getWorkspaceSocket(wsId);
  if (!templateStr || !templateStr.trim()) {
    throw new Error('Template string is empty');
  }

  const replaceFn = (match: string, key: string) => {
    const normalizedKey = key.trim().toLowerCase();

    // Time fields
    if (normalizedKey === 'created_time' || normalizedKey === 'timestamp') {
      return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Client fields — check leadData properties (case-insensitive)
    const leadKeys = Object.keys(leadData);
    const matchedKey = leadKeys.find(k => k.toLowerCase() === normalizedKey);
    if (matchedKey !== undefined && leadData[matchedKey] !== undefined && leadData[matchedKey] !== null) {
      return String(leadData[matchedKey]);
    }

    // Common alias mappings
    const aliasMap: Record<string, string[]> = {
      full_name: ['name', 'full_name', 'lead_name', 'client_name'],
      phone: ['phone', 'phone_number', 'mobile', 'contact'],
      email: ['email', 'email_address'],
      source: ['source', 'lead_source', 'platform'],
      shoot_type: ['shoot_type', 'shoot', 'kind_of_shoot', 'category'],
      location: ['location', 'city', 'address', 'area'],
      budget: ['budget', 'max_budget', 'price', 'amount'],
      score: ['score', 'lead_score'],
      status: ['status', 'lead_status'],
    };

    const aliases = aliasMap[normalizedKey] || [normalizedKey];
    for (const alias of aliases) {
      const found = leadKeys.find(k => k.toLowerCase() === alias);
      if (found !== undefined && leadData[found] !== undefined && leadData[found] !== null) {
        return String(leadData[found]);
      }
    }

    // Check raw_payload nested object
    if (leadData.raw_payload && typeof leadData.raw_payload === 'object') {
      const rp = leadData.raw_payload;
      const rpKeys = Object.keys(rp);
      for (const alias of aliases) {
        const found = rpKeys.find(k => k.toLowerCase() === alias);
        if (found !== undefined && rp[found] !== undefined && rp[found] !== null) {
          return String(rp[found]);
        }
      }
    }

    return '';
  };

  const formatted = templateStr.replace(/\{\{([^{}]+)\}\}/g, replaceFn);
  const result = await targetSock.sendMessage(groupId, { text: formatted });
  const waMessageId = result?.key?.id ?? null;
  logger.info({ groupId, waMessageId, workspaceId: wsId }, '📤 Group lead alert sent');
  return waMessageId;
}

// ─── Action Handler (implements ActionHandler interface from queue-processor) ──
/**
 * Executes a single action from the queue.
 * Called by the queue-processor engine for each dequeued action.
 *
 * ACID GUARANTEE: This function writes status='done' to the DB IMMEDIATELY after
 * sock.sendMessage succeeds. This prevents the infinite-loop bug where the processor's
 * own DB update fails after dispatch, leaving the row as 'pending' and re-queuing it.
 *
 * Must return { success: boolean, waMessageId?, error? }
 */
async function executeAction(action: {
  id: string;
  action_type: string;
  payload: Record<string, unknown>;
  workspace_id: string;
  attempt_count: number;
  status: string;
  priority: number;
  created_at: string;
}): Promise<{ success: boolean; waMessageId?: string | null; error?: string }> {
  const wsId = action.workspace_id;
  let targetSock: ReturnType<typeof makeWASocket>;

  try {
    targetSock = await getWorkspaceSocket(wsId);
  } catch (err: any) {
    logger.error({ actionId: action.id, workspaceId: wsId }, '🔴 [Pre-Send Check] Workspace socket is unauthenticated or missing.');
    await dbWriteCritical(
      supabase
        .from('baileys_sessions')
        .update({
          conn_state: 'disconnected',
          error_info: 'WhatsApp Session Expired. Please reconnect QR code.',
          last_status_change: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', action.workspace_id),
      'presend-disconnect-update'
    );

    await dbWrite(
      supabase.from('wa_instance_alerts').insert({
        workspace_id: action.workspace_id,
        alert_type: 'presend_session_expired',
        message: 'Pre-send check failed: WhatsApp Session Expired. Please reconnect QR code.',
        metadata: { action_id: action.id, action_type: action.action_type },
      }),
      'insert-presend-alert'
    );

    throw new Error('WhatsApp Session Expired. Please reconnect QR code.');
  }

  let waMessageId: string | null = null;

  try {
    // ── Dispatch: throws on failure so the processor marks it 'failed' ──────────
    switch (action.action_type) {
      case 'send_text': {
        const { to, text } = action.payload as { to: string; text: string };
        waMessageId = await sendTextMessage(to, text);
        break;
      }
      case 'send_media': {
        const { to, mediaUrl, caption, mimeType } = action.payload as {
          to: string; mediaUrl: string; caption: string; mimeType: string;
        };
        waMessageId = await sendMediaMessage(to, mediaUrl, caption, mimeType);
        break;
      }
      case 'send_template': {
        const { to, templateId, variables } = action.payload as {
          to: string; templateId: string; variables: Record<string, string>;
        };
        waMessageId = await sendTemplateMessage(to, templateId, variables);
        break;
      }
      case 'group_dispatch': {
        const { groupJid, leadData } = action.payload as {
          groupJid: string; leadData: Record<string, unknown>;
        };
        await dispatchGroupCard(groupJid, leadData);
        break;
      }
      case 'group_lead_alert': {
        const { groupId, leadData, templateStr } = action.payload as {
          groupId: string; leadData: Record<string, any>; templateStr: string;
        };
        waMessageId = await sendGroupAlert(groupId, leadData, templateStr);
        break;
      }
      default:
        logger.warn({ type: action.action_type }, 'Unknown action type — skipping');
    }
  } catch (err: any) {
    const errStr = String(err?.message || err);
    const isDisconnectError = 
      errStr.includes('401') || errStr.includes('403') || errStr.includes('428') || 
      errStr.includes('515') || errStr.toLowerCase().includes('logged out') || 
      errStr.toLowerCase().includes('connection closed') || errStr.toLowerCase().includes('not connected');

    if (isDisconnectError) {
      logger.error({ err: errStr, actionId: action.id }, '🔴 [Execute Action] Socket error indicates disconnected session!');
      
      await dbWriteCritical(
        supabase
          .from('baileys_sessions')
          .update({
            conn_state: 'disconnected',
            error_info: 'WhatsApp Session Expired. Please reconnect QR code.',
            last_status_change: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', action.workspace_id),
        'execute-action-disconnect'
      );

      throw new Error('WhatsApp Session Expired. Please reconnect QR code.');
    }
    throw err;
  }

  // ── ACID: Write 'done' to DB immediately after successful dispatch ──────────
  // This is the critical mutation that prevents re-queuing. Even if the processor's
  // own update after this point fails, the row will already be 'done'.
  try {
    const { error: doneErr } = await supabase
      .from('baileys_action_queue')
      .update({
        status: 'done',
        result_message_id: waMessageId,
        failure_reason: null,
      })
      .eq('id', action.id)
      .eq('status', 'processing'); // Only update if still 'processing' (idempotent)

    if (doneErr) {
      logger.error({ actionId: action.id, err: doneErr.message }, '⚠️  Message sent but done-write failed. Processor will handle.');
    } else {
      logger.info({ actionId: action.id, type: action.action_type, waMessageId }, '✅ Action executed and status=done written immediately');
    }
  } catch (dbWriteErr: unknown) {
    // DB write failed but message was already sent — log and continue.
    // The processor's status check in processQueueAction will not re-queue because
    // we still return { success: true } here.
    logger.error({ actionId: action.id, err: dbWriteErr }, '⚠️  ACID done-write threw unexpectedly. Message was sent.');
  }

  return { success: true, waMessageId };
}

// ─── Queue Drain Wrapper (calls the processor engine) ─────────────────────────
async function runQueueDrain(): Promise<void> {
  if (activeSessions.size === 0) {
    return;
  }
  try {
    const { drainQueue } = await import('./src/queue-processor.js');
    for (const wsId of activeSessions.keys()) {
      if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') continue;
      await drainQueue(wsId, executeAction as any, 3);
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Queue drain error');
  }
}

async function runSweeper(): Promise<void> {
  try {
    const { sweepExpiredRetries } = await import('./src/queue-processor.js');
    for (const wsId of activeSessions.keys()) {
      if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') continue;
      const recovered = await sweepExpiredRetries(wsId);
      if (recovered > 0) logger.info({ wsId, recovered }, '🧹 Sweeper recovered stuck actions');
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Sweeper error');
  }
}

// ─── Supabase Realtime: baileys_action_queue Listener ────────────────────────
// Triggers an immediate drain when a new action is inserted.
// No polling interval — Realtime drives instant actions;
// scheduleNextDelayedCheck() handles time-delayed nodes.
function startActionQueueListener(): void {
  logger.info('📡 Subscribing to baileys_action_queue realtime...');

  supabase
    .channel('baileys_worker_queue')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'baileys_action_queue',
      },
      async (payload) => {
        const action = payload.new as { id: string; status: string; action_type: string; next_retry_at?: string };
        if (action.status !== 'pending') return;

        // If this action has a future next_retry_at it's a delayed node — reschedule
        if (action.next_retry_at && new Date(action.next_retry_at) > new Date()) {
          logger.info(
            { actionId: action.id, type: action.action_type, next_retry_at: action.next_retry_at },
            '⏱  Delayed action inserted — rescheduling next check'
          );
          await scheduleNextDelayedCheck();
          return;
        }

        logger.info({ actionId: action.id, type: action.action_type }, '🎯 Realtime trigger — draining queue immediately');
        await runQueueDrain();
        // After drain, reschedule in case delayed actions remain
        await scheduleNextDelayedCheck();
      }
    )
    .subscribe((status) => {
      logger.info({ status }, '📡 baileys_action_queue realtime subscription status');
    });

  // Startup drain: catch any pending actions that arrived while worker was offline
  logger.info('📋 Running startup queue drain...');
  runQueueDrain().then(() => scheduleNextDelayedCheck());
}

// ─── Connection Timeout Monitor ──────────────────────────────────────────────
function startConnectingTimeout(wsId: string): void {
  clearConnectingTimeout(wsId);
  const timer = setTimeout(async () => {
    const { data: cur } = await supabase
      .from('baileys_sessions')
      .select('conn_state, creds_json')
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (cur?.conn_state === 'open' || (cur?.creds_json && cur.creds_json !== 'null')) {
      logger.info({ workspaceId: wsId }, '⏰ Watchdog: session already open or creds saved — skipping force-reset.');
      return;
    }
    logger.warn({ workspaceId: wsId }, '⏰ Connection stuck in "connecting" for 120s — force-resetting socket for fresh QR...');
    await initiateForceReset(wsId);
  }, 120_000);

  const sess = activeSessions.get(wsId);
  if (sess) sess.connectingTimeoutTimer = timer;
}

function clearConnectingTimeout(wsId: string): void {
  const sess = activeSessions.get(wsId);
  if (sess?.connectingTimeoutTimer) {
    clearTimeout(sess.connectingTimeoutTimer);
    sess.connectingTimeoutTimer = undefined;
  }
}

// ─── Force Reset (shared between timeout handler and /force-reset endpoint) ──
async function initiateForceReset(targetWorkspaceId?: string): Promise<void> {
  const wsId = targetWorkspaceId || WORKSPACE_ID;
  const existing = activeSessions.get(wsId);
  if (existing) {
    if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
    if (existing.connectingTimeoutTimer) clearTimeout(existing.connectingTimeoutTimer);
    try {
      (existing.sock.ev as any).removeAllListeners();
      existing.sock.end(undefined);
    } catch {}
    activeSessions.delete(wsId);
  }

  // Purge local disk session files for target workspace ONLY
  purgeSessionDir(wsId);

  // Update Supabase metadata ONLY (no heavy JSONs written to DB)
  await supabase
    .from('baileys_sessions')
    .upsert({
      user_id: wsId,
      workspace_id: wsId,
      conn_state: 'connecting',
      qr_string: null,
      qr_expires_at: null,
      phone_number: null,
      error_info: 'Force reset — fresh QR generated',
      last_status_change: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  startBaileysSocket(true, wsId).catch(err => {
    logger.error({ err, workspaceId: wsId }, 'Failed to start Baileys socket after force-reset');
  });
}

/**
 * Multi-Event Phone Number & Session State Sync Helper
 */
async function syncOpenSessionToDb(wsId: string, sock: any, authState?: any): Promise<void> {
  if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') return;

  let phoneNum: string | null = null;
  const rawJid = sock?.user?.id || (sock?.user as any)?.jid || (authState?.state?.creds as any)?.me?.id || (authState?.state?.creds as any)?.me?.jid;

  if (rawJid) {
    const match = String(rawJid).match(/^(\d+)/);
    if (match && match[1]) {
      phoneNum = match[1];
    }
  }

  if (!phoneNum) {
    phoneNum = 'Connected Device';
  }

  console.log(`[WA Sync] Extracted phone number: ${phoneNum} for workspace: ${wsId}`);

  try {
    const { error: dbErr } = await supabase.from('baileys_sessions').upsert({
      user_id: wsId,
      workspace_id: wsId,
      conn_state: 'open',
      phone_number: phoneNum,
      qr_string: null,
      qr_expires_at: null,
      last_connected: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (dbErr) {
      console.error('[WA Sync DB Error]:', dbErr);
    }
  } catch (err) {
    console.error('[WA Sync Exception]:', err);
  }
}

const activeSocketStarts = new Map<string, Promise<void>>();

// ─── Main: Initialize Baileys Socket ─────────────────────────────────────────
async function startBaileysSocket(forceFresh = false, targetWorkspaceId?: string): Promise<void> {
  const wsId = targetWorkspaceId || WORKSPACE_ID;
  if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') {
    logger.warn('Skipping startBaileysSocket for empty or invalid workspaceId');
    return;
  }

  const existingStart = activeSocketStarts.get(wsId);
  if (existingStart && !forceFresh) {
    logger.info({ workspaceId: wsId }, '🔒 Concurrent startBaileysSocket in progress — reusing active promise');
    return existingStart;
  }

  const startPromise = (async () => {
    try {
      logger.info({ forceFresh, workspaceId: wsId }, '🚀 Starting Baileys socket for workspace...');

      const existing = activeSessions.get(wsId);
      if (existing) {
        if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
        if (existing.connectingTimeoutTimer) clearTimeout(existing.connectingTimeoutTimer);
        try {
          (existing.sock.ev as any).removeAllListeners();
          existing.sock.end(undefined);
        } catch {}
        activeSessions.delete(wsId);
      }

      clearConnectingTimeout(wsId);

      const authState = await useSupabaseAuthState(supabase, wsId);
      const hasCredsMe = !!(authState.state.creds as any)?.me?.id;

      if (forceFresh) {
        logger.info({ workspaceId: wsId }, '🔄 Force-fresh mode: purging local session dir and initializing fresh auth');
        purgeSessionDir(wsId);
        getSessionDir(wsId); // Guarantee directory re-creation immediately after purge
        await updateSessionState('connecting', {}, wsId);
      } else {
        getSessionDir(wsId); // Guarantee directory exists
        logger.info({ workspaceId: wsId, hasCredsMe }, '🧠 Reconnect mode: loading file-based auth state from local disk');
        if (!hasCredsMe) {
          await updateSessionState('connecting', {}, wsId);
        }
      }

  let { version } = await fetchLatestBaileysVersion().catch(() => ({ 
    version: [2, 3000, 1017531287] as [number, number, number], 
  }));

  const minVersion = [2, 3000, 1017531287];
  if (version[0] < minVersion[0] || (version[0] === minVersion[0] && version[1] < minVersion[1]) || (version[0] === minVersion[0] && version[1] === minVersion[1] && version[2] < minVersion[2])) {
    version = minVersion as [number, number, number];
  }

  const localSock = makeWASocket({
    version,
    logger: logger.child({ module: `baileys-${wsId.slice(0, 8)}` }),
    auth: authState.state,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
    keepAliveIntervalMs: 10_000,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    retryRequestDelayMs: 2500,
    markOnlineOnConnect: true,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
  });

  const currentSess: WorkspaceSession = {
    wsId,
    sock: localSock,
    authState,
    lastQrTime: 0,
  };
  activeSessions.set(wsId, currentSess);

  localSock.ev.on('creds.update', async () => {
    try {
      await authState.saveCreds();
      const hasUser = !!localSock.user?.id || !!(authState.state.creds as any)?.me?.id;
      if (hasUser) {
        await syncOpenSessionToDb(wsId, localSock, authState);
      }
    } catch (err) {
      logger.error({ err, workspaceId: wsId }, 'Failed to save creds to disk');
    }
  });

  localSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    console.log(`⚡ Connection state changed [${wsId.slice(0, 8)}]:`, connection || 'qr_event');
    logger.info({ update, workspaceId: wsId }, '🔌 Received connection update event');

    if (qr) {
      const isAlreadyPaired = !!(authState.state.creds as any)?.me?.id || !!localSock.user?.id;
      if (isAlreadyPaired) {
        logger.info({ workspaceId: wsId }, '🛡️ Guard: Ignoring residual QR event because session already has paired user credentials');
      } else {
        clearConnectingTimeout(wsId);
        startConnectingTimeout(wsId);

        const now = Date.now();
        if (now - currentSess.lastQrTime > 10_000) {
          currentSess.lastQrTime = now;
          logger.info({ workspaceId: wsId }, '📱 Storing fresh QR code in database...');
          console.log(`📱 Storing fresh QR code for workspace ${wsId.slice(0, 8)}`);
          await dbWrite(
            supabase
              .from('baileys_sessions')
              .upsert({
                user_id: wsId,
                workspace_id: wsId,
                qr_string: qr,
                qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
                conn_state: 'connecting',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' }),
            `upsert-qr-${wsId}`
          );
        }
      }
    }

    if (connection === 'open' || (localSock.user?.id && connection !== 'close')) {
      clearConnectingTimeout(wsId);

      // Guarantee local disk save
      try {
        await authState.saveCreds();
      } catch {}

      await syncOpenSessionToDb(wsId, localSock, authState);
    }

    if (connection === 'close') {
      clearConnectingTimeout(wsId);
      const error = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;
      const hasCredsMe = !!(authState.state.creds as any)?.me?.id;

      // 401 is ONLY a true logout if we do NOT have paired user creds
      const isExplicitLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isLoggedOut = isExplicitLoggedOut || (statusCode === 401 && !hasCredsMe);

      console.log(`🔌 Connection CLOSED [${wsId.slice(0, 8)}] — statusCode:`, statusCode, 'hasCredsMe:', hasCredsMe, 'isLoggedOut:', isLoggedOut);
      logger.error({ statusCode, isLoggedOut, hasCredsMe, message: error?.message, lastDisconnect, workspaceId: wsId }, '🔌 Connection closed details');

      if (!isLoggedOut) {
        // NON-LOGGED-OUT DISCONNECT (temporary network drop, code 515 stream restart)
        logger.info({ statusCode, workspaceId: wsId, hasCredsMe }, '♻️ Non-logged-out disconnect — auto-reconnecting in 1.5s with local disk auth...');
        console.log(`♻️ Auto-reconnecting socket for workspace ${wsId} in 1.5s (preserving session)...`);

        if (currentSess.reconnectTimer) clearTimeout(currentSess.reconnectTimer);
        currentSess.reconnectTimer = setTimeout(() => startBaileysSocket(false, wsId), 1500);
        return;
      }

      // EXPLICIT LOGOUT OR 401
      logger.warn({ workspaceId: wsId, statusCode }, '🚪 WhatsApp session LOGGED OUT / 401 — Performing disk & memory purge');
      
      try {
        (localSock.ev as any).removeAllListeners();
        (localSock.ws as any)?.close();
      } catch {}

      if (currentSess.reconnectTimer) clearTimeout(currentSess.reconnectTimer);
      if (currentSess.connectingTimeoutTimer) clearTimeout(currentSess.connectingTimeoutTimer);
      activeSessions.delete(wsId);
      purgeSessionDir(wsId);

      await supabase
        .from('baileys_sessions')
        .update({
          conn_state: 'disconnected',
          qr_string: null,
          qr_expires_at: null,
          phone_number: null,
          error_info: 'Logged out from mobile device — QR re-scan required',
          last_status_change: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`);

      setTimeout(() => startBaileysSocket(true, wsId), 1000);
    }
  });

  localSock.ev.on('messages.upsert', async ({ messages, type }: { messages: any[]; type: string }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const chatJid = msg.key.remoteJid!;
      const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? msg.message?.imageMessage?.caption ?? '[media]';

      logger.info({ workspaceId: wsId, chatJid, text }, '📩 Inbound message');
      await supabase.from('baileys_messages').insert({
        workspace_id: wsId,
        wa_message_id: msg.key.id,
        chat_jid: chatJid,
        direction: 'inbound',
        message_text: text,
        status: 'read',
        sent_at: new Date((msg.messageTimestamp as number) * 1000).toISOString(),
      });
    }
  });
    } finally {
      activeSocketStarts.delete(wsId);
    }
  })();

  activeSocketStarts.set(wsId, startPromise);
  return startPromise;
}

function getRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

// ─── Health Check & API Bridge HTTP Server ───────────────────────────────────
let healthServer: http.Server | null = null;

function startHealthServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    // ── CORS Headers ────────────────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url ?? '', `http://localhost:${PORT}`);

      if (req.method === 'GET' && parsedUrl.pathname === '/health') {
        const targetWs = parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;
        const { data } = await supabase
          .from('baileys_sessions')
          .select('conn_state, phone_number, last_connected')
          .eq('workspace_id', targetWs)
          .maybeSingle();

        const sess = activeSessions.get(targetWs);
        const socketAlive = !!sess?.sock;
        const socketReadyState = (sess?.sock as any)?.ws?.readyState;
        const socketAuthenticated = !!(sess?.sock as any)?.user?.id;
        const socketConnState = socketAuthenticated ? 'open' : (socketReadyState === 1 ? 'connecting' : (socketAlive ? 'connecting' : 'disconnected'));

        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          worker: 'baileys',
          workspace_id: targetWs,
          active_sessions_count: activeSessions.size,
          socket: socketAlive ? 'alive' : 'null',
          socket_conn_state: socketConnState,
          socket_authenticated: socketAuthenticated,
          phone_number: (sess?.sock as any)?.user?.id?.split(':')[0] ?? null,
          session: data,
        }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/trigger') {
        logger.info('Manual trigger hit — executing queue drain');
        runQueueDrain().catch(err => logger.error({ err }, 'Manual trigger queue drain error'));
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Queue drain triggered.' }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/init-qr') {
        const qsWorkspace = parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;
        const forceFresh = parsedUrl.searchParams.get('force') === 'true' || parsedUrl.searchParams.get('force_fresh') === 'true';
        const sess = activeSessions.get(qsWorkspace);
        const now = Date.now();

        if (sess?.sock && (sess.sock as any).user && (sess.sock as any).user.id) {
          logger.info({ workspace_id: qsWorkspace }, 'Session is ALREADY CONNECTED! Skipping reset on /init-qr.');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Workspace ${qsWorkspace} is already connected.` }));
          return;
        }

        const { data: dbSess } = await supabase
          .from('baileys_sessions')
          .select('conn_state, status, qr_string, updated_at')
          .or(`workspace_id.eq.${qsWorkspace},user_id.eq.${qsWorkspace}`)
          .maybeSingle();

        if (dbSess?.conn_state === 'open' || dbSess?.status === 'CONNECTED') {
          logger.info({ workspace_id: qsWorkspace }, 'DB session is ALREADY OPEN! Skipping reset on /init-qr.');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Workspace ${qsWorkspace} is already connected in DB.` }));
          return;
        }

        // DEBOUNCE ONLY IF VALID QR ALREADY EXISTS IN MEMORY/DB
        const validMemoryQr = !!(sess?.lastQrTime && (now - sess.lastQrTime < 20_000));
        const validDbQr = dbSess?.qr_string && dbSess?.updated_at && (now - new Date(dbSess.updated_at).getTime() < 20_000);

        if (!forceFresh && (validMemoryQr || validDbQr)) {
          logger.info({ workspace_id: qsWorkspace }, '⏳ Active QR pairing in progress with valid QR — Skipping re-trigger on /init-qr.');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Active QR pairing in progress.` }));
          return;
        }

        logger.info({ workspace_id: qsWorkspace }, '🔁 Initiating fresh QR pairing flow for workspace...');
        await initiateForceReset(qsWorkspace);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: `Pairing flow initialized for ${qsWorkspace}. QR code is being generated.` }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/force-reset') {
        const qsWorkspace = parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;
        logger.info({ workspace_id: qsWorkspace }, '🔴 Hard force-reset requested for workspace...');
        await initiateForceReset(qsWorkspace);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: `Hard reset complete for ${qsWorkspace}. Fresh QR will be generated in 1s.` }));
        return;
      }
      if (req.method === 'POST' && parsedUrl.pathname === '/send') {
        const bodyStr = await getRequestBody(req);
        const payload = JSON.parse(bodyStr);
        let targetWsId = payload.workspace_id || payload.workspaceId || payload.user_id || payload.userId || WORKSPACE_ID;

        if (!targetWsId || targetWsId.trim() === '' || targetWsId === 'null' || targetWsId === 'undefined') {
          console.error(`[Workflow Trigger Error] Missing user_id/workspace_id in payload for /send request (Contact: ${payload.to || payload.jid || 'unknown'}, Step ID: ${payload.step_id || payload.stepId || 'N/A'})`);
          logger.error({ payload }, '[Workflow Trigger Error] Missing user_id/workspace_id in payload');
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: `[Workflow Trigger Error] Missing user_id/workspace_id in payload: ${targetWsId}` }));
          return;
        }

        logger.info({ payload, workspaceId: targetWsId }, 'Received send message request');

        const targetSock = await getWorkspaceSocket(targetWsId);

        // ── Intercept: if rawButtons/buttons are present, force 'buttons' route ──
        if (Array.isArray(payload.rawButtons) && payload.rawButtons.length > 0) {
          payload.type = 'buttons';
        }
        if (Array.isArray(payload.buttons) && payload.buttons.length > 0) {
          payload.type = 'buttons';
        }

        const to = payload.to || payload.jid;
        const type = payload.type;
        const text = payload.text;
        const mediaUrl = payload.mediaUrl;
        const caption = payload.caption;
        const mimeType = payload.mimeType;
        const pollOptions = payload.pollOptions;
        const pollSelectableCount = payload.pollSelectableCount;

        if (!to) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing field: to or jid' }));
          return;
        }

        let waMessageId: string | null = null;
        const jid = to;

        switch (type) {
          case 'text':
            if (!text) throw new Error('Missing: text');
            waMessageId = await sendTextMessage(jid, text, targetWsId);
            break;
          case 'image':
          case 'video':
          case 'audio':
          case 'document':
            if (!mediaUrl || !mimeType) throw new Error('Missing: mediaUrl, mimeType');
            waMessageId = await sendMediaMessage(jid, mediaUrl, caption ?? '', mimeType, targetWsId);
            break;
          case 'poll':
            if (!text) throw new Error('Missing: text (poll name)');
            const pollResult = await targetSock.sendMessage(jid, {
              poll: {
                name: text,
                values: pollOptions || [],
                selectableCount: pollSelectableCount ?? 1
              }
            });
            waMessageId = pollResult?.key?.id ?? null;
            break;
          case 'buttons': {
            const { rawButtons, buttons: payloadButtons } = payload as any;
            const targetButtons = payloadButtons || rawButtons || [];
            if (!text) throw new Error('Missing: text (buttons body)');
            
            const actionLinksText = formatActionLinksText(targetButtons);
            const finalText = text + actionLinksText;

            if (mediaUrl && mediaUrl !== 'null' && mediaUrl.trim() !== '') {
              const mimeTypeDetect = mimeType || detectMimeTypeFromUrl(mediaUrl);
              waMessageId = await sendMediaMessage(jid, mediaUrl, finalText, mimeTypeDetect, targetWsId);
            } else {
              waMessageId = await sendTextMessage(jid, finalText, targetWsId);
            }
            break;
          }
          default:
            throw new Error(`Unsupported type: ${type}`);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, waMessageId }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/fetch-groups') {
        const bodyStr = await getRequestBody(req).catch(() => '{}');
        const payload = JSON.parse(bodyStr || '{}');
        const targetWsId = payload.workspace_id || payload.workspaceId || parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;

        logger.info({ workspaceId: targetWsId }, 'Fetch groups requested');

        const targetSock = await getWorkspaceSocket(targetWsId);

        try {
          const groupMap = await targetSock.groupFetchAllParticipating();
          const groups = Object.values(groupMap).map((g: any) => ({
            jid: g.id,
            display_name: g.subject || g.id.split('@')[0],
            participant_count: g.participants?.length ?? 0,
            is_group: true,
          }));

          const rows = groups.map((g: any) => ({
            workspace_id: targetWsId,
            jid: g.jid,
            display_name: g.display_name,
            is_group: true,
            updated_at: new Date().toISOString(),
          }));

          if (rows.length > 0) {
            await supabase
              .from('baileys_chats')
              .upsert(rows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
          }

          logger.info({ count: groups.length, workspaceId: targetWsId }, '✅ Groups fetched and synced');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, groups }));
        } catch (err: any) {
          logger.error({ err, workspaceId: targetWsId }, '❌ Failed to fetch groups');
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: err.message || 'Failed to fetch groups' }));
        }
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/send-group-alert') {
        const bodyStr = await getRequestBody(req);
        const payload = JSON.parse(bodyStr);
        const targetWsId = payload.workspace_id || payload.workspaceId || WORKSPACE_ID;

        logger.info({ payload, workspaceId: targetWsId }, 'Received send-group-alert request');

        const { groupId, leadData, templateStr } = payload;
        if (!groupId || !templateStr) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Missing required fields: groupId, templateStr' }));
          return;
        }

        try {
          const waMessageId = await sendGroupAlert(groupId, leadData || {}, templateStr, targetWsId);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, waMessageId }));
        } catch (err: any) {
          res.writeHead(500);
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));

    } catch (err: any) {
      logger.error({ err }, 'Error handling server request');
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
    }
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.fatal({ port: PORT }, `🔴 Port ${PORT} is already in use. Is another baileys-worker running?`);
      logger.fatal('Run: pm2 delete baileys-worker && pm2 start ecosystem.config.js');
      process.exit(1);
    } else {
      logger.error({ err }, '🔴 Health server encountered an error');
    }
  });

  server.on('listening', () => {
    logger.info({ port: PORT }, `🌐 Health server running on port ${PORT}`);
  });

  // Single attempt to bind — fail fast instead of looping
  try {
    server.listen(PORT);
  } catch (listenErr: any) {
    logger.fatal({ port: PORT, err: listenErr.message }, '🔴 Failed to bind health server');
    process.exit(1);
  }

  return server;
}

// ─── Dynamic Delayed-Check Scheduler ─────────────────────────────────────────
// Replaces the 5-second setInterval. Queries the earliest pending action whose
// next_retry_at has not yet passed, then sets a single setTimeout to fire
// exactly when that window opens. Eliminates constant polling egress.
let delayedCheckTimer: ReturnType<typeof setTimeout> | null = null;

async function scheduleNextDelayedCheck(): Promise<void> {
  if (delayedCheckTimer) {
    clearTimeout(delayedCheckTimer);
    delayedCheckTimer = null;
  }

  try {
    const now = new Date().toISOString();

    // 1. DRAIN OVERDUE/DUE ACTIONS FIRST: Check if any pending action is due now or in the past
    const { data: overdueAction } = await supabase
      .from('baileys_action_queue')
      .select('id')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .limit(1)
      .maybeSingle();

    if (overdueAction) {
      logger.info('⚡ Overdue or immediate pending action found — draining queue now');
      await runQueueDrain().catch(err => logger.error({ err }, 'Queue drain error'));
    }

    // 2. Query for next future action
    const { data: nextAction } = await supabase
      .from('baileys_action_queue')
      .select('next_retry_at')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('status', 'pending')
      .not('next_retry_at', 'is', null)
      .gt('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextAction?.next_retry_at) {
      const fireAt = new Date(nextAction.next_retry_at).getTime();
      const delayMs = Math.max(fireAt - Date.now(), 500); // at least 500ms
      logger.info({ delayMs, fireAt: nextAction.next_retry_at }, '⏱  Scheduling next delayed queue drain');
      delayedCheckTimer = setTimeout(async () => {
        delayedCheckTimer = null;
        await runQueueDrain().catch(err => logger.error({ err }, 'Delayed drain error'));
        await scheduleNextDelayedCheck();
      }, delayMs);
    } else {
      // Safety net: check again in 10 seconds
      delayedCheckTimer = setTimeout(async () => {
        delayedCheckTimer = null;
        await scheduleNextDelayedCheck();
      }, 10_000);
    }
  } catch (err) {
    logger.error({ err }, 'scheduleNextDelayedCheck error — retrying in 10s');
    delayedCheckTimer = setTimeout(() => {
      delayedCheckTimer = null;
      scheduleNextDelayedCheck();
    }, 10_000);
  }
}

// ─── triggerWorkflowsForLead ──────────────────────────────────────────────────
// Maps a newly inserted lead's source field → trigger_type and fires all
// matching enabled custom_workflows for that workspace.
async function triggerWorkflowsForLead(
  lead: Record<string, unknown>,
  workspaceId: string
): Promise<void> {
  try {
    const source = String(lead.source || 'manual').toLowerCase();

    // Map raw lead source → workflow trigger_type
    let triggerType: string;
    if (source === 'facebook' || source === 'meta' || source === 'facebook_lead') {
      triggerType = 'facebook_lead';
    } else if (source === 'google_sheets' || source === 'sheets') {
      triggerType = 'facebook_lead'; // Sheets leads re-use the same pipeline trigger
    } else if (source === 'webhook' || source === 'website' || source === 'wordpress') {
      triggerType = 'webhook';
    } else if (source === 'manual' || source === 'crm') {
      triggerType = 'crm_entry';
    } else {
      triggerType = 'crm_entry'; // default
    }

    // Fetch all enabled workflows matching this workspace + trigger
    const { data: workflows, error } = await supabase
      .from('custom_workflows')
      .select('id, name, trigger_type, trigger_config, steps')
      .eq('workspace_id', workspaceId)
      .eq('is_enabled', true)
      .eq('trigger_type', triggerType);

    if (error) {
      logger.error({ err: error.message, workspaceId, triggerType }, 'triggerWorkflowsForLead: DB query error');
      return;
    }

    if (!workflows || workflows.length === 0) {
      logger.debug({ workspaceId, triggerType, leadId: lead.id }, 'No matching workflows for lead trigger');
      return;
    }

    logger.info(
      { count: workflows.length, triggerType, leadId: lead.id, workspaceId },
      '⚡ Triggering custom workflows for new lead'
    );

    // Fire each workflow asynchronously without blocking the Realtime callback
    for (const wf of workflows) {
      (async () => {
        try {
          // Import the workflow engine dynamically (avoids circular dependency)
          const enginePath = '../src/lib/workflow-engine.js';
          const { executeWorkflow } = await import(enginePath);

          await executeWorkflow(
            supabase,
            {
              id: wf.id,
              workspace_id: workspaceId,
              name: wf.name,
              trigger_type: wf.trigger_type,
              trigger_config: wf.trigger_config || {},
              steps: wf.steps || [],
              is_enabled: true,
            },
            triggerType as any,
            lead // trigger payload
          );

          // Bump run stats
          await supabase.rpc('rpc_bump_workflow_run_stats', {
            p_workflow_id: wf.id,
            p_status: 'success',
          });

          logger.info({ workflowId: wf.id, workflowName: wf.name }, '✅ Workflow executed successfully');
        } catch (wfErr: unknown) {
          const errMsg = wfErr instanceof Error ? wfErr.message : String(wfErr);
          logger.error({ workflowId: wf.id, err: errMsg }, '❌ Workflow execution failed');

          // Bump failed stat
          try {
            await supabase.rpc('rpc_bump_workflow_run_stats', {
              p_workflow_id: wf.id,
              p_status: 'failed',
            });
          } catch {}
        }
      })();
    }
  } catch (err: unknown) {
    logger.error({ err }, 'triggerWorkflowsForLead: unexpected error');
  }
}

// ─── Supabase Realtime: Leads INSERT Listener ────────────────────────────────
// Subscribes to INSERT events on the `leads` table.
// The moment a new lead lands (from Facebook webhook, manual CRM entry, or Google Sheets
// ingestion), this fires triggerWorkflowsForLead immediately — zero polling.
function startLeadsRealtimeListener(): void {
  logger.info('📡 Subscribing to leads table realtime (INSERT)...');

  supabase
    .channel('leads_ingestion_pipeline')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
      },
      async (payload) => {
        const lead = payload.new as Record<string, unknown>;
        const leadWsId = (lead.workspace_id as string) || WORKSPACE_ID;
        logger.info(
          { leadId: lead.id, source: lead.source, name: lead.name, workspaceId: leadWsId },
          '🎯 Realtime: new lead inserted — triggering workflows'
        );
        await triggerWorkflowsForLead(lead, leadWsId);

        // Asynchronously trigger Google Contacts Ingest Sync
        (async () => {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const syncRes = await fetch(`${appUrl}/api/workflows/google-contacts/sync-lead`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ leadId: lead.id, workspaceId: leadWsId }),
            });
            if (syncRes.ok) {
              const resData = await syncRes.json();
              logger.info({ leadId: lead.id, resData }, 'Google Contacts sync triggered successfully.');
            } else {
              const errText = await syncRes.text();
              logger.warn({ leadId: lead.id, error: errText }, 'Google Contacts sync trigger response error.');
            }
          } catch (e: any) {
            logger.error({ leadId: lead.id, error: e.message }, 'Error triggering Google Contacts sync.');
          }
        })();
      }
    )
    .subscribe((status) => {
      logger.info({ status }, '📡 Leads realtime subscription status');
    });
}

// ─── Google Sheets Background Watcher ────────────────────────────────────────
// Polls every 60 seconds across all Google-connected workspaces.
// Detects newly appended rows (beyond the last known row count stored in
// integration_credentials.config.last_row_count), maps column headers to lead
// fields, and inserts new leads to kick off the realtime workflow pipeline.
async function runGoogleSheetsWatchCycle(): Promise<void> {
  try {
    // Fetch all google integrations that have a spreadsheet config
    const { data: integrations, error } = await supabase
      .from('integration_credentials')
      .select('user_id, access_token, refresh_token, config')
      .eq('provider', 'google')
      .eq('status', 'connected');

    if (error) {
      if (error.message?.includes('schema cache')) {
        logger.debug('integration_credentials not in schema cache — skipping Google Sheets watch');
        return;
      }
      logger.error({ err: error.message }, 'Google Sheets watcher: DB query error');
      return;
    }

    if (!integrations || integrations.length === 0) return;

    for (const integration of integrations) {
      const config = (integration.config as Record<string, any>) || {};
      if (!integration.access_token) continue;

      const activeSheetsList = config.active_sheets || {};
      const sheetsList = config.sheets || {};
      const activeSheets: { 
        spreadsheet_id: string; 
        name: string; 
        mappings: Record<string, string>; 
        last_row_count: number;
        composite_key?: string;
      }[] = [];

      if (Object.keys(activeSheetsList).length > 0) {
        Object.entries(activeSheetsList).forEach(([key, sheet]: [string, any]) => {
          if (sheet.enabled && sheet.sheet_name) {
            activeSheets.push({
              spreadsheet_id: sheet.spreadsheet_id || config.spreadsheet_id || '',
              name: sheet.sheet_name,
              mappings: sheet.mappings || { name: 'name', phone: 'phone', email: 'email' },
              last_row_count: sheet.last_row_count || 1,
              composite_key: key
            });
          }
        });
      } else if (Object.keys(sheetsList).length > 0) {
        Object.entries(sheetsList).forEach(([title, sheet]: [string, any]) => {
          if (sheet.enabled) {
            activeSheets.push({
              spreadsheet_id: config.spreadsheet_id || '',
              name: title,
              mappings: sheet.mappings || { name: 'name', phone: 'phone', email: 'email' },
              last_row_count: sheet.last_row_count || 1
            });
          }
        });
      } else if (config.spreadsheet_id) {
        // Fallback to legacy single sheet
        const sheetName = config.sheet_name || 'Sheet1';
        const lastRowCount = config.last_row_count || 1;
        activeSheets.push({
          spreadsheet_id: config.spreadsheet_id,
          name: sheetName,
          mappings: { name: 'name', phone: 'phone', email: 'email' },
          last_row_count: lastRowCount
        });
      }

      for (const activeSheet of activeSheets) {
        if (!activeSheet.spreadsheet_id) continue;
        try {
          // Fetch the spreadsheet values using correct spreadsheet ID
          const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSheet.spreadsheet_id}/values/${encodeURIComponent(activeSheet.name)}`;
          const res = await fetch(sheetsUrl, {
            headers: { Authorization: `Bearer ${integration.access_token}` },
          });

          if (!res.ok) {
            logger.warn(
              { workspaceId: integration.user_id, status: res.status, sheetName: activeSheet.name, spreadsheetId: activeSheet.spreadsheet_id },
              'Google Sheets API call failed for worksheet'
            );
            continue;
          }

          const sheetsData = await res.json() as { values?: string[][] };
          const rows = sheetsData.values || [];

          if (rows.length <= activeSheet.last_row_count) {
            continue;
          }

          // Row 0 = headers
          const headers: string[] = (rows[0] || []).map((h: string) => h.trim().toLowerCase());
          const newRows = rows.slice(activeSheet.last_row_count); // rows after last processed index

          logger.info(
            { workspaceId: integration.user_id, newRowCount: newRows.length, spreadsheetId: activeSheet.spreadsheet_id, sheetName: activeSheet.name },
            '📊 Google Sheets: new rows detected'
          );

          const leadsToInsert: Record<string, unknown>[] = [];
          const mapping = activeSheet.mappings;

          for (const row of newRows) {
            // Map columns to lead fields via header name matching
            const rowObj: Record<string, string> = {};
            headers.forEach((h, i) => { rowObj[h] = row[i] || ''; });

            let nameVal = '';
            let phoneVal = '';
            let emailVal = '';
            const customPayload: Record<string, string> = {};

            Object.entries(mapping).forEach(([field, headerCol]) => {
              const cleanHeader = String(headerCol || '').trim().toLowerCase();
              const matchedVal = rowObj[cleanHeader] || '';
              
              if (field === 'name') {
                nameVal = matchedVal;
              } else if (field === 'phone') {
                phoneVal = matchedVal;
              } else if (field === 'email') {
                emailVal = matchedVal;
              } else {
                // Custom mapping key (renamed/assigned by user)
                customPayload[field] = matchedVal;
              }
            });

            // Set fallbacks if not mapped or blank
            if (!nameVal) {
              nameVal = rowObj['name'] || rowObj['full name'] || rowObj['full_name'] || 
                        rowObj['client name'] || rowObj['lead name'] || `Sheet Lead`;
            }
            if (!phoneVal) {
              phoneVal = rowObj['phone'] || rowObj['mobile'] || rowObj['contact'] || rowObj['phone number'] || '';
            }
            if (!emailVal) {
              emailVal = rowObj['email'] || rowObj['email address'] || '';
            }

            leadsToInsert.push({
              workspace_id: integration.user_id,
              name: nameVal.trim(),
              phone: phoneVal.replace(/[^0-9]/g, ''),
              email: emailVal.trim(),
              source: 'google_sheets',
              status: 'new',
              raw_payload: {
                ...rowObj,
                ...customPayload
              },
            });
          }

          if (leadsToInsert.length > 0) {
            const { error: insertErr } = await supabase
              .from('leads')
              .insert(leadsToInsert);

            if (insertErr) {
              logger.error({ err: insertErr.message }, 'Google Sheets watcher: lead insert error');
            } else {
              logger.info(
                { count: leadsToInsert.length, workspaceId: integration.user_id, sheetName: activeSheet.name },
                '✅ Google Sheets leads ingested → Realtime pipeline will fire'
              );

              // Update last_row_count in config
              if (activeSheet.composite_key && config.active_sheets && config.active_sheets[activeSheet.composite_key]) {
                config.active_sheets[activeSheet.composite_key].last_row_count = rows.length;
              } else if (config.sheets && config.sheets[activeSheet.name]) {
                config.sheets[activeSheet.name].last_row_count = rows.length;
              } else {
                config.last_row_count = rows.length;
              }

              await supabase
                .from('integration_credentials')
                .update({ config })
                .eq('user_id', integration.user_id)
                .eq('provider', 'google');
            }
          }
        } catch (innerErr: unknown) {
          logger.error(
            { err: innerErr, workspaceId: integration.user_id, sheetName: activeSheet.name },
            'Google Sheets watcher: error processing sheet'
          );
        }
      }
    }
  } catch (err: unknown) {
    logger.error({ err }, 'runGoogleSheetsWatchCycle: unexpected error');
  }
}

function startGoogleSheetsWatcher(): void {
  logger.info('📊 Google Sheets watcher starting (60s interval)...');
  // Initial run after a short delay, then every 60s
  setTimeout(() => {
    runGoogleSheetsWatchCycle().catch(err => logger.error({ err }, 'Sheets initial watch error'));
    setInterval(() => {
      runGoogleSheetsWatchCycle().catch(err => logger.error({ err }, 'Sheets watch cycle error'));
    }, 60_000);
  }, 10_000);
}

// ─── Active Session Heartbeat (60s check for zombie sockets) ──────────────────
let heartbeatTimer: NodeJS.Timeout | null = null;

async function runSessionHeartbeatCheck(): Promise<void> {
  for (const [wsId, sess] of activeSessions.entries()) {
    try {
      const { data: dbSession } = await supabase
        .from('baileys_sessions')
        .select('conn_state, status, last_status_change')
        .eq('workspace_id', wsId)
        .maybeSingle();

      // Only check zombie state if DB believes the workspace session IS OPEN or CONNECTED.
      // If it's in 'connecting', 'qr_event', or 'disconnected', skip check to allow QR scanning to complete safely.
      if (dbSession?.conn_state !== 'open' && dbSession?.status !== 'CONNECTED') {
        continue;
      }

      // If connection state changed within the last 30 seconds, give the socket handshake time to settle
      if (dbSession.last_status_change) {
        const timeSinceChange = Date.now() - new Date(dbSession.last_status_change).getTime();
        if (timeSinceChange < 30_000) {
          continue;
        }
      }

      const targetSock = sess.sock;
      let isDead = false;
      let reason = '';

      if (!targetSock) {
        isDead = true;
        reason = 'Socket instance is null/undefined';
      } else if (!targetSock.user || !targetSock.user.id) {
        isDead = true;
        reason = 'Socket unauthenticated (sock.user missing)';
      } else {
        const wsState = (targetSock as any).ws?.readyState;
        if (wsState !== undefined && wsState !== 1) {
          isDead = true;
          reason = `WebSocket readyState is ${wsState} (not OPEN)`;
        }
      }

      if (isDead) {
        logger.error({ wsId, reason }, '🔴 [Heartbeat] Zombie WhatsApp session detected!');
        await dbWriteCritical(
          supabase
            .from('baileys_sessions')
            .update({
              conn_state: 'disconnected',
              phone_number: null,
              qr_string: null,
              creds_json: null,
              keys_json: null,
              error_info: `Zombie Session Heartbeat Failure: ${reason} — QR re-scan required`,
              last_status_change: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', wsId),
          `heartbeat-disconnect-${wsId}`
        );

        try {
          (targetSock.ev as any).removeAllListeners();
          targetSock.end(undefined);
        } catch {}
        activeSessions.delete(wsId);

        startBaileysSocket(false, wsId).catch(() => {});
      }
    } catch (err: any) {
      logger.error({ wsId, err: err?.message }, '⚠️ Error checking heartbeat for workspace');
    }
  }
}

function startSessionHeartbeat(): void {
  logger.info('💓 WhatsApp 60s Session Heartbeat starting...');
  setTimeout(() => {
    runSessionHeartbeatCheck().catch(err => logger.error({ err }, 'Initial heartbeat error'));
    heartbeatTimer = setInterval(() => {
      runSessionHeartbeatCheck().catch(err => logger.error({ err }, 'Session heartbeat error'));
    }, 60_000);
  }, 15_000);
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, `🛑 Received ${signal} — initiating graceful shutdown...`);

  if (healthServer) {
    healthServer.close(() => {
      logger.info('✅ Health server closed');
    });
  }

  for (const [wsId, sess] of activeSessions.entries()) {
    try {
      if (sess.reconnectTimer) clearTimeout(sess.reconnectTimer);
      if (sess.connectingTimeoutTimer) clearTimeout(sess.connectingTimeoutTimer);
      (sess.sock.ev as any)?.removeAllListeners();
      sess.sock.end(undefined);
    } catch {}
  }
  activeSessions.clear();

  if (delayedCheckTimer) { clearTimeout(delayedCheckTimer); delayedCheckTimer = null; }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }

  logger.info('👋 Goodbye. Multi-tenant worker shut down cleanly.');
  process.exit(0);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  logger.info('🔥 FW Core — Multi-Tenant Baileys Worker Starting...');

  healthServer = startHealthServer();

  startActionQueueListener();
  startLeadsRealtimeListener();

  startGoogleSheetsWatcher();
  startSessionHeartbeat();

  // Restore all existing active workspace sessions from DB at startup
  const { data: activeSessionsDb } = await supabase
    .from('baileys_sessions')
    .select('workspace_id, conn_state')
    .or('conn_state.eq.open,creds_json.neq.null');

  if (activeSessionsDb && activeSessionsDb.length > 0) {
    logger.info({ count: activeSessionsDb.length }, '🔁 Restoring active workspace sessions from DB...');
    for (const s of activeSessionsDb) {
      startBaileysSocket(false, s.workspace_id).catch(err => {
        logger.error({ err, workspaceId: s.workspace_id }, 'Failed to restore workspace session at startup');
      });
    }
  } else if (WORKSPACE_ID) {
    logger.info({ workspaceId: WORKSPACE_ID }, 'Starting default workspace socket...');
    startBaileysSocket(false, WORKSPACE_ID).catch(() => {});
  }

  await scheduleNextDelayedCheck();

/**
 * Background Self-Healing Poll: Checks active sessions every 10 seconds.
 * If socket has user JID but DB has phone_number NULL or conn_state != 'open', force sync!
 */
async function runSelfHealingSessionSync(): Promise<void> {
  for (const [wsId, sess] of activeSessions.entries()) {
    if (!wsId || wsId.trim() === '' || wsId === 'null' || wsId === 'undefined') continue;

    const hasUser = !!(sess.sock?.user?.id || (sess.sock?.user as any)?.jid);
    if (hasUser) {
      try {
        const { data: dbSess } = await supabase
          .from('baileys_sessions')
          .select('phone_number, conn_state')
          .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`)
          .maybeSingle();

        if (!dbSess || dbSess.conn_state !== 'open' || !dbSess.phone_number || dbSess.phone_number === 'null' || dbSess.phone_number === 'Connected Device') {
          console.log(`[Self-Healing Sync] Force-syncing active session for workspace: ${wsId}`);
          await syncOpenSessionToDb(wsId, sess.sock, sess.authState);
        }
      } catch {}
    }
  }
}

  setInterval(() => {
    runQueueDrain().catch(err => logger.error({ err }, 'Periodic queue drain error'));
    runSelfHealingSessionSync().catch(err => logger.error({ err }, 'Self healing session sync error'));
  }, 10_000);

  setInterval(() => {
    runSweeper().catch(err => logger.error({ err }, 'Sweeper cron error'));
  }, 60_000);

  logger.info('✅ Realtime listeners active. Dynamic delay scheduler + 10s queue drainer & self-healing syncer running. Sweeper (60s) active.');
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  logger.fatal({ err }, '💥 Worker crashed');
  process.exit(1);
});
