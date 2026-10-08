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
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

// ─── Backblaze B2 S3 Client for Direct Media Streaming & Signed URLs ───────────
const b2S3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
  region: process.env.B2_REGION || 'eu-central-003',
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || '',
  },
});
const B2_WHATSAPP_BUCKET = process.env.B2_WHATSAPP_BUCKET_NAME || 'studiocore-whatsapp-media';

/**
 * Resolves any media URL, proxy URL (/api/media/...), or B2 file key to a direct Backblaze S3 pre-signed URL.
 * Valid for 2 hours (7200 seconds).
 * Ensures Baileys worker downloads directly from Backblaze B2 cloud storage without 404 or localhost dependency.
 */
async function resolveB2DirectFetchUrl(urlOrKey: string): Promise<string> {
  if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;

  let key = urlOrKey.trim();

  // If already a presigned B2 URL, return as is
  if (key.includes('backblazeb2.com') && key.includes('X-Amz-Signature')) {
    return key;
  }

  // If proxy URL (/api/media/... or http://.../api/media/...)
  if (key.includes('/api/media/')) {
    key = key.split('/api/media/')[1];
  }

  key = decodeURIComponent(key).replace(/^\/+/, '');

  // If it's an external URL (e.g. cloudinary, etc.) and not our proxy, return as is
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return urlOrKey;
  }

  // It's a B2 file key! Sign it directly with B2 client
  try {
    const cmd = new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: key,
    });
    const directSignedUrl = await getSignedUrl(b2S3Client, cmd, { expiresIn: 7200 });
    logger.info({ original: urlOrKey.slice(0, 80), key, directSignedUrl: directSignedUrl.slice(0, 80) }, '🔑 Resolved media to direct Backblaze S3 signed URL');
    return directSignedUrl;
  } catch (err: any) {
    logger.warn({ err: err?.message, key }, 'Failed to presign B2 URL, returning original');
    return urlOrKey;
  }
}

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

async function getWorkspaceSocket(wsId?: string | null): Promise<ReturnType<typeof makeWASocket>> {
  let resolvedWsId = wsId?.trim();

  // STRICT MULTI-TENANT ISOLATION: Never borrow another tenant's session!
  if (!resolvedWsId || resolvedWsId === 'null' || resolvedWsId === 'undefined') {
    if (WORKSPACE_ID) {
      resolvedWsId = WORKSPACE_ID;
    }
  }

  if (!resolvedWsId || resolvedWsId === 'null' || resolvedWsId === 'undefined') {
    throw new Error('WhatsApp is not connected yet. Workspace ID is required to access WhatsApp session.');
  }

  const effectiveId = resolvedWsId;

  // 1. Direct activeSessions lookup
  let sess = activeSessions.get(effectiveId);
  if (sess && sess.sock && sess.sock.user?.id) return sess.sock;

  // 2. Check DB session mapping for user_id or workspace_id
  let mappedId = effectiveId;
  try {
    const { data: dbSess } = await supabase
      .from('baileys_sessions')
      .select('user_id, workspace_id')
      .or(`user_id.eq.${effectiveId},workspace_id.eq.${effectiveId}`)
      .maybeSingle();

    if (dbSess) {
      mappedId = dbSess.user_id || dbSess.workspace_id || effectiveId;
      sess = activeSessions.get(mappedId);
      if (sess && sess.sock && sess.sock.user?.id) return sess.sock;
    }
  } catch {}

  const targetId = hasDiskSession(mappedId) ? mappedId : (hasDiskSession(effectiveId) ? effectiveId : mappedId);

  // 3. Auto-restore on-the-fly from disk session
  if (hasDiskSession(targetId)) {
    logger.info({ workspaceId: targetId }, '🔌 Disk credentials found — auto-restoring socket into memory on-the-fly...');
    await startBaileysSocket(false, targetId);
    sess = activeSessions.get(targetId) || activeSessions.get(effectiveId);
    if (sess && sess.sock && sess.sock.user?.id) return sess.sock;
  }

  // 4. Final attempt to restore socket
  logger.info({ workspaceId: targetId }, '🔌 Restoring socket from disk/DB creds...');
  await startBaileysSocket(false, targetId);
  sess = activeSessions.get(targetId) || activeSessions.get(effectiveId);

  // If session is currently reconnecting/handshaking with disk credentials, wait briefly for handshake
  if (sess && sess.sock && !sess.sock.user?.id && hasDiskSession(targetId)) {
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 500));
      sess = activeSessions.get(targetId) || activeSessions.get(effectiveId);
      if (sess?.sock?.user?.id) return sess.sock;
    }
  }

  if (!sess || !sess.sock || !sess.sock.user?.id) {
    throw new Error('WhatsApp is not connected. Please scan the QR code in WhatsApp Web Integration before sending messages.');
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
    if (btn.type === 'url' || btn.type === 'cta_url') {
      return `🔗 ${btn.text}: ${btn.value}`;
    }
    if (btn.type === 'phone' || btn.type === 'call' || btn.type === 'cta_call') {
      return `📞 ${btn.text}: ${btn.value}`;
    }
    if (btn.type === 'quick_reply') {
      return `💬 ${btn.text}`;
    }
    return null;
  }).filter(Boolean);
  return lines.length > 0 ? '\n\n' + lines.join('\n') : '';
}

/**
 * Modern Interactive Native Flow Buttons Dispatcher for WhatsApp / Baileys
 * =========================================================================
 * Formats buttons into WhatsApp Native Flow parameters:
 * - cta_url: URL Link Button
 * - quick_reply: Quick Reply Button
 * - cta_call: Call Button
 *
 * Wraps the interactive message inside viewOnceMessage and relays via sock.relayMessage
 * with a zero-regression fallback to standard sock.sendMessage.
 */
async function sendInteractiveTemplateMessage(
  sock: any,
  toJid: string,
  bodyText: string,
  footerText: string = "",
  buttonsList: Array<{ id: string; type: 'cta_url' | 'quick_reply' | 'cta_call' | 'url' | 'phone'; text: string; value: string }>,
  mediaUrl?: string
): Promise<{ success: boolean; messageId: string }> {
  // If no buttons exist, fallback to regular message
  if (!buttonsList || buttonsList.length === 0) {
    const res = await sock.sendMessage(toJid, { text: bodyText });
    return { success: true, messageId: res?.key?.id || '' };
  }

  const actionBlocks = (buttonsList || []).map((btn: any) => {
    if (btn.type === 'cta_url' || btn.type === 'url') {
      return `🌐 *${btn.text}*\n👉 ${btn.value}`;
    }
    if (btn.type === 'cta_call' || btn.type === 'phone' || (btn.type as any) === 'call') {
      const cleanPhone = String(btn.value || '').replace(/[^0-9+]/g, '');
      return `📞 *${btn.text}*\n👉 tel:${cleanPhone}`;
    }
    return `⚡ *[ ${String(btn.text || '').toUpperCase()} ]*`;
  }).join('\n\n');

  const cardMessage = `${bodyText || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n${actionBlocks}\n━━━━━━━━━━━━━━━━━━━━${footerText ? `\n_${footerText}_` : ''}`;

  if (mediaUrl && mediaUrl !== 'null' && mediaUrl.trim() !== '') {
    const mimeType = detectMimeTypeFromUrl(mediaUrl);
    const mediaId = await sendMediaMessage(toJid, mediaUrl, cardMessage, mimeType);
    return { success: true, messageId: mediaId || '' };
  }

  const sentResult = await sock.sendMessage(toJid, {
    text: cardMessage
  });

  console.log(`✅ Action card message delivered to ${toJid}, ID:`, sentResult?.key?.id);
  return { success: true, messageId: sentResult?.key?.id || '' };
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
  // If mediaSource is a B2 proxy path (/api/media/...) or B2 file key, resolve directly to Backblaze S3 pre-signed URL
  if (
    mediaSource.includes('/api/media/') ||
    (!mediaSource.startsWith('http://') &&
     !mediaSource.startsWith('https://') &&
     !mediaSource.startsWith('/tmp') &&
     !mediaSource.startsWith('./') &&
     !mediaSource.startsWith('../') &&
     !mediaSource.includes('\\'))
  ) {
    mediaSource = await resolveB2DirectFetchUrl(mediaSource);
  } else if (mediaSource.startsWith('/api/') || mediaSource.startsWith('/api')) {
    const appBase = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    mediaSource = `${appBase}${mediaSource}`;
  }

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
  wsId = WORKSPACE_ID,
  fileName?: string
): Promise<string | null> {
  const targetSock = await getWorkspaceSocket(wsId);
  if (!targetSock?.user?.id) {
    throw new Error('WhatsApp is not connected. Please scan the QR code in WhatsApp Web Integration before sending messages.');
  }

  const resolvedUrl = await resolveB2DirectFetchUrl(mediaUrl);
  const mediaCategory = detectMediaCategory(mimeType);

  // 1. Documents / PDFs: Direct B2 / HTTP streaming to save RAM
  if (mediaCategory === 'document' || mimeType === 'application/pdf') {
    if (typeof resolvedUrl === 'string' && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'))) {
      try {
        const streamResult = await targetSock.sendMessage(to, {
          document: { url: resolvedUrl },
          mimetype: mimeType || 'application/pdf',
          fileName: fileName || caption || 'document.pdf',
          caption: caption || undefined,
        } as any);
        return streamResult?.key?.id ?? null;
      } catch (streamErr: any) {
        logger.warn({ err: streamErr?.message, resolvedUrl }, 'Direct B2 document streaming failed, falling back to buffer download');
      }
    }
  }

  // 2. Download media to buffer
  const { buffer, mimeType: resolvedMime } = await downloadMediaAsBuffer(resolvedUrl, mimeType);
  const finalCategory = detectMediaCategory(resolvedMime);

  let result;
  try {
    if (finalCategory === 'image') {
      let finalBuffer = buffer;
      let finalMime = resolvedMime || 'image/jpeg';

      // WhatsApp phone apps require genuine JPEG/PNG for photo messages (WebP is rejected or displays blank)
      if (finalMime === 'image/webp' || resolvedUrl.toLowerCase().includes('.webp') || mimeType === 'image/webp') {
        try {
          const sharp = (await import('sharp')).default;
          finalBuffer = await sharp(buffer).jpeg({ quality: 85, progressive: true }).toBuffer();
          finalMime = 'image/jpeg';
          logger.info({ to }, '🖼️ Successfully converted WebP image to standard JPEG for WhatsApp delivery');
        } catch (sharpErr: any) {
          logger.warn({ err: sharpErr?.message }, '⚠️ Sharp WebP to JPEG conversion failed, sending original buffer');
        }
      }

      result = await targetSock.sendMessage(to, {
        image: finalBuffer,
        caption: caption || undefined,
        mimetype: finalMime,
      } as any);
    } else if (finalCategory === 'video') {
      if (buffer.length > 16 * 1024 * 1024) {
        logger.warn({ to, sizeMb: (buffer.length / (1024 * 1024)).toFixed(1) }, '⚠️ Video exceeds WhatsApp 16 MB playable limit, sending as document');
        result = await targetSock.sendMessage(to, {
          document: buffer,
          mimetype: resolvedMime || 'video/mp4',
          fileName: fileName || 'video.mp4',
          caption: caption || undefined,
        } as any);
      } else {
        result = await targetSock.sendMessage(to, { video: buffer, caption: caption || undefined, mimetype: resolvedMime } as any);
      }
    } else if (finalCategory === 'audio') {
      result = await targetSock.sendMessage(to, { audio: buffer, mimetype: resolvedMime, ptt: false } as any);
    } else {
      result = await targetSock.sendMessage(to, {
        document: buffer,
        mimetype: resolvedMime || 'application/pdf',
        fileName: fileName || caption || 'document.pdf',
        caption: caption || undefined,
      } as any);
    }
  } catch (sendErr: any) {
    logger.error({ err: sendErr?.message, to, wsId }, 'Error sending media message via WhatsApp');
    throw new Error(sendErr?.message || 'Failed to dispatch media message via WhatsApp');
  }
  return result?.key?.id ?? null;
}

async function sendTemplateMessage(
  to: string,
  templateId: string,
  variables: Record<string, string>,
  wsId = WORKSPACE_ID,
  fallbackTemplateName?: string
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

  // 4. Resilient Fallback: If not found by ID within wsId, check tenant_whatsapp_templates globally by ID
  if (!tpl && templateId) {
    const { data: globalTenantTpl } = await supabase
      .from('tenant_whatsapp_templates')
      .select('body_text, media_url_payload, type, buttons, payload_json')
      .eq('id', templateId)
      .maybeSingle();

    if (globalTenantTpl) {
      const pj = (globalTenantTpl.payload_json as any) || {};
      const mediaUrl = globalTenantTpl.media_url_payload || pj.mediaUrl || null;
      let mediaType: string | null = null;
      if (mediaUrl) mediaType = detectMediaCategory(detectMimeTypeFromUrl(mediaUrl));
      tpl = {
        body_text: globalTenantTpl.body_text || pj.body || pj.question || '',
        media_url: mediaUrl,
        media_type: mediaType,
        tpl_type: (globalTenantTpl as any).type || null,
        tpl_buttons: (globalTenantTpl as any).buttons || [],
        tpl_payload: pj,
      };
    }
  }

  // 5. Resilient Fallback: If not found by ID, look up by template_name
  const nameToSearch = fallbackTemplateName || (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId) ? templateId : null);
  if (!tpl && nameToSearch) {
    // 5a. Check tenant_whatsapp_templates by template_name within wsId
    const { data: nameTpl } = await supabase
      .from('tenant_whatsapp_templates')
      .select('body_text, media_url_payload, type, buttons, payload_json, id')
      .eq('template_name', nameToSearch)
      .eq('tenant_id', wsId)
      .maybeSingle();

    if (nameTpl) {
      const pj = (nameTpl.payload_json as any) || {};
      const mediaUrl = nameTpl.media_url_payload || pj.mediaUrl || null;
      let mediaType: string | null = null;
      if (mediaUrl) mediaType = detectMediaCategory(detectMimeTypeFromUrl(mediaUrl));
      tpl = {
        body_text: nameTpl.body_text || pj.body || pj.question || '',
        media_url: mediaUrl,
        media_type: mediaType,
        tpl_type: (nameTpl as any).type || null,
        tpl_buttons: (nameTpl as any).buttons || [],
        tpl_payload: pj,
      };
      logger.info({ wsId, templateId, fallbackTemplateName, resolvedId: nameTpl.id }, '✅ Auto-resolved template by template_name in tenant_whatsapp_templates');
    } else {
      // 5b. Check whatsapp_templates by name
      const { data: legacyNameTpl } = await supabase
        .from('whatsapp_templates')
        .select('payload, type, buttons, id')
        .eq('name', nameToSearch)
        .eq('workspace_id', wsId)
        .maybeSingle();

      if (legacyNameTpl) {
        const payloadObj = (legacyNameTpl.payload as any) || {};
        const legacyMediaUrl = payloadObj.mediaUrl || null;
        let legacyMediaType: string | null = null;
        if (legacyMediaUrl) legacyMediaType = detectMediaCategory(detectMimeTypeFromUrl(legacyMediaUrl));
        tpl = {
          body_text: payloadObj.body || payloadObj.question || '',
          media_url: legacyMediaUrl,
          media_type: legacyMediaType,
          tpl_type: (legacyNameTpl as any).type || null,
          tpl_buttons: (legacyNameTpl as any).buttons || [],
          tpl_payload: payloadObj,
        };
        logger.info({ wsId, templateId, fallbackTemplateName, resolvedId: legacyNameTpl.id }, '✅ Auto-resolved template by name in whatsapp_templates');
      }
    }
  }

  // 6. Case-insensitive name search fallback across tenant
  if (!tpl && nameToSearch) {
    const { data: ilikeTpl } = await supabase
      .from('tenant_whatsapp_templates')
      .select('body_text, media_url_payload, type, buttons, payload_json, id')
      .ilike('template_name', nameToSearch)
      .eq('tenant_id', wsId)
      .maybeSingle();

    if (ilikeTpl) {
      const pj = (ilikeTpl.payload_json as any) || {};
      const mediaUrl = ilikeTpl.media_url_payload || pj.mediaUrl || null;
      let mediaType: string | null = null;
      if (mediaUrl) mediaType = detectMediaCategory(detectMimeTypeFromUrl(mediaUrl));
      tpl = {
        body_text: ilikeTpl.body_text || pj.body || pj.question || '',
        media_url: mediaUrl,
        media_type: mediaType,
        tpl_type: (ilikeTpl as any).type || null,
        tpl_buttons: (ilikeTpl as any).buttons || [],
        tpl_payload: pj,
      };
      logger.info({ wsId, templateId, fallbackTemplateName, resolvedId: ilikeTpl.id }, '✅ Auto-resolved template by ilike template_name');
    }
  }

  if (!tpl) throw new Error(`Template ${templateId} not found`);

  // Replace placeholders (supports {{key}} and {key})
  let body = tpl.body_text;
  if (body) {
    const replaceFn = (match: string, rawKey: string) => {
      const key = rawKey.trim();
      const normalizedKey = key.toLowerCase();

      // 1. Time / Date
      if (normalizedKey === 'created_time' || normalizedKey === 'timestamp') {
        if (variables.created_time) return String(variables.created_time);
        if (variables.timestamp) {
          try {
            return new Date(variables.timestamp).toLocaleString('en-IN', {
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
        return variables.current_date || new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
      }

      // 2. Direct property matches (case-insensitive)
      const varKeys = Object.keys(variables);
      const directMatch = varKeys.find(k => k.toLowerCase() === normalizedKey);
      if (directMatch && variables[directMatch] !== undefined && variables[directMatch] !== null && String(variables[directMatch]).trim() !== '') {
        return String(variables[directMatch]);
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
        const foundKey = varKeys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (foundKey && variables[foundKey] !== undefined && variables[foundKey] !== null && String(variables[foundKey]).trim() !== '') {
          return String(variables[foundKey]);
        }
      }

      // 4. Nested field_data array check (Facebook / Meta Lead Ad structure)
      if (Array.isArray((variables as any).field_data)) {
        for (const item of (variables as any).field_data) {
          const itemKey = (item.name || '').toLowerCase();
          if (itemKey === normalizedKey || aliases.some(a => a.toLowerCase() === itemKey)) {
            const val = Array.isArray(item.values) ? item.values[0] : item.values;
            if (val) return String(val);
          }
        }
      }

      // 5. Nested raw_payload check
      if ((variables as any).raw_payload && typeof (variables as any).raw_payload === 'object') {
        const rawKeys = Object.keys((variables as any).raw_payload);
        for (const alias of [normalizedKey, ...aliases]) {
          const found = rawKeys.find(k => k.toLowerCase() === alias.toLowerCase());
          if (found && (variables as any).raw_payload[found] != null && String((variables as any).raw_payload[found]).trim() !== '') {
            return String((variables as any).raw_payload[found]);
          }
        }
      }

      return match;
    };

    body = body.replace(/\{\{([^{}]+)\}\}/g, replaceFn).replace(/\{([^{}]+)\}/g, replaceFn);
  }

  // ── POLL TEMPLATE ────────────────────────────────────────────────────────
  if (tpl.tpl_type === 'poll' || (tpl.tpl_payload && (tpl.tpl_payload.pollOptions || tpl.tpl_payload.options))) {
    const rawOpts = tpl.tpl_payload.pollOptions || tpl.tpl_payload.options || [];
    const cleanOpts: string[] = (Array.isArray(rawOpts) ? rawOpts : [])
      .map((o: any) => typeof o === 'string' ? o.trim() : (o?.text || o?.value || o?.option || '').trim())
      .filter((s: string) => s.length > 0);

    if (cleanOpts.length < 2) {
      if (cleanOpts.length === 1) cleanOpts.push('No / Other');
      else cleanOpts.push('Yes', 'No');
    }

    const allowMultiple = tpl.tpl_payload.allowMultipleChoice ?? tpl.tpl_payload.allowMultiple ?? false;
    const safeSelectableCount = allowMultiple
      ? cleanOpts.length
      : Math.min(1, cleanOpts.length);

    try {
      const result = await targetSock.sendMessage(to, {
        poll: {
          name: body || 'Poll',
          values: cleanOpts,
          selectableCount: safeSelectableCount,
        }
      });
      return result?.key?.id ?? null;
    } catch (pollErr: any) {
      logger.warn({ err: pollErr?.message }, '⚠️ Poll dispatch failed, falling back to clean text dispatch');
      const textPoll = `${body || 'Poll'}\n\n` + cleanOpts.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      const result = await targetSock.sendMessage(to, { text: textPoll });
      return result?.key?.id ?? null;
    }
  }

  // ── ACTION BUTTONS (Interactive Native Flow with graceful text fallback) ────
  const rawButtons: any[] = tpl.tpl_buttons || [];
  if (rawButtons.length > 0) {
    try {
      logger.info({ to, buttonCount: rawButtons.length }, '📤 Sending template with interactive native flow buttons');
      const interactiveMediaUrl = tpl.media_url ? await resolveB2DirectFetchUrl(tpl.media_url) : undefined;
      const interactiveRes = await sendInteractiveTemplateMessage(
        targetSock,
        to,
        body || '',
        tpl.tpl_payload?.footer || '',
        rawButtons,
        interactiveMediaUrl
      );
      if (interactiveRes?.messageId) {
        return interactiveRes.messageId;
      }
    } catch (interactiveErr: any) {
      logger.warn({ err: interactiveErr?.message }, '⚠️ Interactive buttons relay failed, falling back to clean text dispatch');
    }
  }

  const actionLinksText = formatActionLinksText(rawButtons);
  const finalBody = (body || '') + actionLinksText;

  if (actionLinksText) {
    logger.info({ to, linkCount: rawButtons.length }, '📤 Sending template with action links as text fallback');
  }

  // ── MEDIA (with or without action links) ─────────────────────────────────
  if (tpl.media_url) {
    const directMediaUrl = await resolveB2DirectFetchUrl(tpl.media_url);
    const mimeType = detectMimeTypeFromUrl(directMediaUrl || tpl.media_url);
    return sendMediaMessage(to, directMediaUrl || tpl.media_url, finalBody, mimeType, wsId);
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

    // 1. Time fields
    if (normalizedKey === 'created_time' || normalizedKey === 'timestamp') {
      return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    // 2. Client fields — check leadData properties (case-insensitive)
    const leadKeys = Object.keys(leadData);
    const matchedKey = leadKeys.find(k => k.toLowerCase() === normalizedKey);
    if (matchedKey !== undefined && leadData[matchedKey] !== undefined && leadData[matchedKey] !== null && String(leadData[matchedKey]).trim() !== '') {
      return String(leadData[matchedKey]);
    }

    // 3. Common alias mappings
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
      score: ['score', 'lead_score'],
      status: ['status', 'lead_status'],
    };

    const aliases = aliasMap[normalizedKey] || [normalizedKey];
    for (const alias of aliases) {
      const found = leadKeys.find(k => k.toLowerCase() === alias.toLowerCase());
      if (found !== undefined && leadData[found] !== undefined && leadData[found] !== null && String(leadData[found]).trim() !== '') {
        return String(leadData[found]);
      }
    }

    // 4. Check nested field_data array
    if (Array.isArray(leadData.field_data)) {
      for (const item of leadData.field_data) {
        const itemKey = (item.name || '').toLowerCase();
        if (itemKey === normalizedKey || aliases.some(a => a.toLowerCase() === itemKey)) {
          const val = Array.isArray(item.values) ? item.values[0] : item.values;
          if (val) return String(val);
        }
      }
    }

    // 5. Check raw_payload nested object
    if (leadData.raw_payload && typeof leadData.raw_payload === 'object') {
      const rp = leadData.raw_payload;
      const rpKeys = Object.keys(rp);
      for (const alias of [normalizedKey, ...aliases]) {
        const found = rpKeys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (found !== undefined && rp[found] !== undefined && rp[found] !== null && String(rp[found]).trim() !== '') {
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
  // Extract workspace / user ID from action payload safely
  let targetWsId =
    action.workspace_id ||
    (action as any).user_id ||
    (action as any).workspaceId ||
    (action as any).userId ||
    (action.payload as any)?.workspace_id ||
    (action.payload as any)?.workspaceId ||
    (action.payload as any)?.user_id ||
    (action.payload as any)?.userId;

  // IF still missing, fetch the workspace_id/user_id directly from DB for this action row before calling getWorkspaceSocket
  if (!targetWsId && action.id) {
    try {
      const { data: actionRow } = await supabase
        .from('baileys_action_queue')
        .select('workspace_id, user_id')
        .eq('id', action.id)
        .maybeSingle();

      targetWsId = actionRow?.workspace_id || actionRow?.user_id;
    } catch (dbErr) {
      logger.error({ actionId: action.id, err: dbErr }, 'Error fetching targetWsId from DB');
    }
  }

  // IF targetWsId is missing/empty, do NOT borrow another workspace's session!
  if (!targetWsId || targetWsId.trim() === '' || targetWsId === 'null' || targetWsId === 'undefined') {
    logger.error({ actionId: action.id, action }, '[QueueProcessor Trace Error] Missing user_id/workspace_id in action payload');
    throw new Error(`[QueueProcessor Error] Missing user_id/workspace_id for action ${action.id}`);
  }

  console.log(`[QueueProcessor Trace] Processing action ${action.id} with resolved targetWsId: ${targetWsId}`);

  // Pre-flight check: If workflow log or lead was deleted, abort dispatch immediately
  const actPayload = (action.payload || {}) as Record<string, any>;
  const checkLogId = actPayload.workflowLogId;
  const checkLeadId = actPayload.leadId || actPayload.lead_id;

  if (checkLogId) {
    const { data: wfLog } = await supabase
      .from('whatsapp_workflow_logs')
      .select('id, status')
      .eq('id', checkLogId)
      .maybeSingle();

    if (!wfLog || wfLog.status === 'stopped' || wfLog.status === 'cancelled') {
      logger.info({ actionId: action.id, checkLogId }, '🛑 Workflow log cancelled or deleted. Skipping dispatch.');
      return { success: true, waMessageId: null };
    }
  }

  if (checkLeadId) {
    const { data: leadRow } = await supabase
      .from('leads')
      .select('id')
      .eq('id', checkLeadId)
      .maybeSingle();

    if (!leadRow) {
      logger.info({ actionId: action.id, checkLeadId }, '🛑 Lead was deleted from CRM. Skipping dispatch.');
      return { success: true, waMessageId: null };
    }
  }

  let targetSock: ReturnType<typeof makeWASocket>;

  try {
    targetSock = await getWorkspaceSocket(targetWsId);
  } catch (err: any) {
    logger.error({ actionId: action.id, workspaceId: targetWsId, err: err?.message || err }, '🔴 [Pre-Send Check] Workspace socket is unauthenticated or missing.');
    throw new Error(`Workspace ${targetWsId} socket not ready: ${err?.message || err}`);
  }

  let waMessageId: string | null = null;

  try {
    // ── Dispatch: throws on failure so the processor marks it 'failed' ──────────
    switch (action.action_type) {
      case 'send_text': {
        const { to, text } = action.payload as { to: string; text: string };
        waMessageId = await sendTextMessage(to, text, targetWsId);
        break;
      }
      case 'send_image':
      case 'send_video':
      case 'send_document':
      case 'send_audio':
      case 'send_media': {
        const payload = action.payload as any;
        const to = payload.to;

        // Resolve any Backblaze B2 URLs or keys to direct signed URLs
        let targetDocUrl = payload.document?.url;
        let targetImgUrl = payload.image?.url;
        let targetMediaUrl = payload.mediaUrl;

        if (targetDocUrl) targetDocUrl = await resolveB2DirectFetchUrl(targetDocUrl);
        if (targetImgUrl) targetImgUrl = await resolveB2DirectFetchUrl(targetImgUrl);
        if (targetMediaUrl) targetMediaUrl = await resolveB2DirectFetchUrl(targetMediaUrl);

        // Requirement 3: Stream directly from Backblaze B2 Signed URLs without keeping large buffers in RAM
        if (targetDocUrl) {
          const targetSock = await getWorkspaceSocket(targetWsId);
          const result = await targetSock.sendMessage(to, {
            document: { url: targetDocUrl },
            fileName: payload.fileName || payload.caption || 'document.pdf',
            mimetype: payload.mimetype || payload.mimeType || 'application/pdf',
            caption: payload.caption || undefined,
          } as any);
          waMessageId = result?.key?.id ?? null;
        } else if (targetImgUrl) {
          const mime = payload.mimetype || payload.mimeType || 'image/jpeg';
          waMessageId = await sendMediaMessage(to, targetImgUrl, payload.caption, mime, targetWsId, payload.fileName);
        } else {
          const { caption, mimeType, fileName } = payload;
          waMessageId = await sendMediaMessage(to, targetMediaUrl, caption, mimeType, targetWsId, fileName);
        }
        break;
      }
      case 'send_template': {
        const payload = action.payload as any;
        const to = payload.to;
        const templateId = payload.templateId || payload.template_id;
        const fallbackName = payload.template_name || payload.templateName;
        const variables = payload.variables || payload.leadData || {};
        waMessageId = await sendTemplateMessage(to, templateId, variables, targetWsId, fallbackName);
        break;
      }
      case 'send_poll': {
        const payload = action.payload as any;
        const to = payload.to;
        const text = payload.text;
        const rawOpts = payload.pollOptions || payload.options || [];
        const cleanOpts: string[] = (Array.isArray(rawOpts) ? rawOpts : [])
          .map((o: any) => typeof o === 'string' ? o.trim() : (o?.text || o?.value || o?.option || '').trim())
          .filter((s: string) => s.length > 0);
        if (cleanOpts.length < 2) {
          if (cleanOpts.length === 1) cleanOpts.push('No / Other');
          else cleanOpts.push('Yes', 'No');
        }
        const safeSelectableCount = Math.min(Math.max(1, payload.pollSelectableCount || 1), cleanOpts.length);
        const sock = await getWorkspaceSocket(targetWsId);
        try {
          const pollResult = await sock.sendMessage(to, {
            poll: { name: text, values: cleanOpts, selectableCount: safeSelectableCount }
          });
          waMessageId = pollResult?.key?.id ?? null;
        } catch (pollErr: any) {
          const textPoll = `${text}\n\n` + cleanOpts.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
          const textRes = await sock.sendMessage(to, { text: textPoll });
          waMessageId = textRes?.key?.id ?? null;
        }
        break;
      }
      case 'send_buttons': {
        const payload = action.payload as any;
        const to = payload.to;
        const text = payload.text;
        const rawButtons = payload.rawButtons || payload.buttons || [];
        const footer = payload.footer || '';
        const buttonsList = rawButtons || [];
        const actionBlocks = buttonsList.map((btn: any) => {
          if (btn.type === 'cta_url' || btn.type === 'url') {
            return `🌐 *${btn.text}*\n👉 ${btn.value}`;
          }
          if (btn.type === 'cta_call' || btn.type === 'phone' || btn.type === 'call') {
            const cleanPhone = String(btn.value || '').replace(/[^0-9+]/g, '');
            return `📞 *${btn.text}*\n👉 tel:${cleanPhone}`;
          }
          return `⚡ *[ ${String(btn.text || '').toUpperCase()} ]*`;
        }).join('\n\n');
        const cardMessage = `${text || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n${actionBlocks}\n━━━━━━━━━━━━━━━━━━━━${footer ? `\n_${footer}_` : ''}`;
        const sock = await getWorkspaceSocket(targetWsId);
        const sentResult = await sock.sendMessage(to, { text: cardMessage });
        waMessageId = sentResult?.key?.id ?? null;
        break;
      }
      case 'group_dispatch':
      case 'group_lead_alert': {
        const payload = action.payload as any;
        const targetGroup = payload.groupId || payload.groupJid || payload.to || '';
        const leadData = payload.leadData || payload.variables || {};
        const templateId = payload.templateId || payload.template_id;
        const templateName = payload.template_name || payload.templateName;

        if (templateId) {
          logger.info({ targetGroup, templateId, workspaceId: targetWsId }, '📤 Dispatching user-configured Group Template');
          waMessageId = await sendTemplateMessage(targetGroup, templateId, leadData, targetWsId, templateName);
        } else if (payload.templateStr) {
          logger.info({ targetGroup, workspaceId: targetWsId }, '📤 Dispatching dynamic Group Alert template');
          waMessageId = await sendGroupAlert(targetGroup, leadData, payload.templateStr, targetWsId);
        } else {
          logger.info({ targetGroup, workspaceId: targetWsId }, '📤 Dispatching fallback lead card (no template specified)');
          await dispatchGroupCard(targetGroup, leadData, targetWsId);
        }
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
            status: 'disconnected',
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
      const sess = activeSessions.get(wsId);
      // Guard: Only drain queue if this worker has an authenticated live socket for this workspace
      if (!sess?.sock?.user?.id) continue;
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

    if (hasDiskSession(wsId) || cur?.conn_state === 'open' || (cur?.creds_json && cur.creds_json !== 'null')) {
      logger.info({ workspaceId: wsId }, '⏰ Watchdog: session already open, disk credentials exist, or creds saved — skipping force-reset.');
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
    .update({
      conn_state: 'connecting',
      status: 'disconnected',
      qr_string: null,
      qr_expires_at: null,
      phone_number: null,
      creds_json: null,
      keys_json: null,
      updated_at: new Date().toISOString(),
    })
    .or(`workspace_id.eq.${wsId},user_id.eq.${wsId}`);

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

      if (forceFresh) {
        logger.info({ workspaceId: wsId }, '🔄 Force-fresh mode: purging local session dir and initializing fresh auth');
        purgeSessionDir(wsId);
        getSessionDir(wsId); // Guarantee directory re-creation immediately after purge
        await updateSessionState('connecting', { status: 'disconnected', phone_number: null, qr_string: null }, wsId);
      } else {
        getSessionDir(wsId); // Guarantee directory exists
      }

      const authState = await useSupabaseAuthState(supabase, wsId);
      const hasCredsMe = !forceFresh && !!(authState.state.creds as any)?.me?.id;

      if (!forceFresh) {
        logger.info({ workspaceId: wsId, hasCredsMe }, '🧠 Reconnect mode: loading file-based auth state from local disk');
        if (!hasCredsMe) {
          await updateSessionState('connecting', { status: 'disconnected', phone_number: null }, wsId);
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
      const hasUser = !!localSock.user?.id;
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
      const isAlreadyPaired = !!localSock.user?.id;
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
                status: 'disconnected',
                phone_number: null,
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

      // ── AUTO-SYNC ALL PARTICIPATING WHATSAPP GROUPS ON CONNECT ──
      // Whenever a user connects or reconnects, auto-discover and sync all their groups to baileys_chats
      // so their group names and group JIDs are instantly available in StudioCore without any error!
      setTimeout(async () => {
        try {
          logger.info({ workspaceId: wsId }, '🔄 Auto-fetching all participating WhatsApp groups on connect...');
          const groupMap = await localSock.groupFetchAllParticipating();
          const groups = Object.values(groupMap).map((g: any) => ({
            jid: g.id,
            display_name: g.subject || g.id.split('@')[0],
            participant_count: g.participants?.length ?? 0,
            is_group: true,
          }));

          const rows = groups.map((g: any) => ({
            workspace_id: wsId,
            jid: g.jid,
            display_name: g.display_name,
            is_group: true,
            updated_at: new Date().toISOString(),
          }));

          if (rows.length > 0) {
            await supabase
              .from('baileys_chats')
              .upsert(rows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
            logger.info({ count: rows.length, workspaceId: wsId }, '✅ Auto-synced WhatsApp groups into database successfully');
          }
        } catch (groupErr: any) {
          logger.warn({ err: groupErr?.message, workspaceId: wsId }, '⚠️ Auto group sync on connect skipped/delayed');
        }
      }, 3000);
    }

    if (connection === 'close') {
      clearConnectingTimeout(wsId);
      const error = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;
      const hasCredsMe = !!(authState.state.creds as any)?.me?.id;

      // If we have paired user creds on disk, auto-reconnect on transient drops (network drop, 515 restart required, 428, etc.)
      const isLoggedOutFromPhone = statusCode === DisconnectReason.loggedOut && !hasCredsMe;

      console.log(`🔌 Connection CLOSED [${wsId.slice(0, 8)}] — statusCode:`, statusCode, 'hasCredsMe:', hasCredsMe, 'isLoggedOutFromPhone:', isLoggedOutFromPhone);
      logger.error({ statusCode, isLoggedOutFromPhone, hasCredsMe, message: error?.message, lastDisconnect, workspaceId: wsId }, '🔌 Connection closed details');

      if (!isLoggedOutFromPhone) {
        logger.info({ statusCode, workspaceId: wsId, hasCredsMe }, '♻️ Non-logged-out disconnect — auto-reconnecting in 2s with local disk auth...');
        console.log(`♻️ Auto-reconnecting socket for workspace ${wsId} in 2s (preserving session)...`);

        if (currentSess.reconnectTimer) clearTimeout(currentSess.reconnectTimer);
        currentSess.reconnectTimer = setTimeout(() => startBaileysSocket(false, wsId), 2000);
        return;
      }

      // Explicit logout from WhatsApp mobile app (where creds were wiped/invalidated by phone unpair)
      logger.warn({ workspaceId: wsId, statusCode }, '🚪 WhatsApp session unlinked from device — cleaning in-memory socket');
      
      try {
        (localSock.ev as any).removeAllListeners();
        (localSock.ws as any)?.close();
      } catch {}

      if (currentSess.reconnectTimer) clearTimeout(currentSess.reconnectTimer);
      if (currentSess.connectingTimeoutTimer) clearTimeout(currentSess.connectingTimeoutTimer);
      activeSessions.delete(wsId);

      // NOTE: We do NOT call purgeSessionDir here to protect against false positives!
      // Disk purge is strictly reserved for explicit user-initiated Force Reset (/force-reset).

      await supabase
        .from('baileys_sessions')
        .update({
          conn_state: 'disconnected',
          status: 'disconnected',
          qr_string: null,
          qr_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .or(`user_id.eq.${wsId},workspace_id.eq.${wsId}`);

      // NOTE: We do NOT auto-restart in forceFresh loop.
      // Sockets should only be spawned on user demand (e.g., viewing WhatsApp Web dashboard).
    }
  });

  localSock.ev.on('messages.upsert', async ({ messages, type }: { messages: any[]; type: string }) => {
    // CRITICAL DATA SAVER: Only process real-time notifications ('notify').
    // Completely ignore historical sync backfills ('append') which would flood the database with thousands of past messages.
    if (type !== 'notify') return;

    for (const msg of messages) {
      const chatJid = msg.key?.remoteJid;
      if (!chatJid || chatJid === 'status@broadcast') continue;

      const isOutbound = !!msg.key?.fromMe;
      const isGroup = chatJid.endsWith('@g.us');

      // CRITICAL: Skip all group incoming chatter! Only log outbound CRM actions directed at groups.
      if (isGroup && !isOutbound) continue;

      const text = msg.message?.conversation ?? 
                   msg.message?.extendedTextMessage?.text ?? 
                   msg.message?.imageMessage?.caption ?? 
                   (msg.message?.imageMessage ? '[image]' : msg.message?.documentMessage ? '[document]' : msg.message?.audioMessage ? '[audio]' : '[media]');
      
      const sentAt = new Date(Number(msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString();

      logger.info({ workspaceId: wsId, chatJid, isOutbound, text }, `📩 WhatsApp message ${isOutbound ? 'OUTBOUND' : 'INBOUND'}`);

      // 1. Insert or update baileys_messages (CRM outbound delivery logs & 1-on-1 direct lead communications)
      try {
        await (supabase.from('baileys_messages') as any).upsert({
          workspace_id: wsId,
          wa_message_id: msg.key?.id,
          chat_jid: chatJid,
          direction: isOutbound ? 'outbound' : 'inbound',
          message_text: text,
          status: isOutbound ? 'sent' : 'read',
          sent_at: sentAt,
        }, { onConflict: 'workspace_id,wa_message_id' });
      } catch (err: any) {
        // Fallback to normal insert if onConflict is not configured on wa_message_id
        await (supabase.from('baileys_messages') as any).insert({
          workspace_id: wsId,
          wa_message_id: msg.key?.id,
          chat_jid: chatJid,
          direction: isOutbound ? 'outbound' : 'inbound',
          message_text: text,
          status: isOutbound ? 'sent' : 'read',
          sent_at: sentAt,
        });
      }

      // 2. If it's a group and outbound, update last message in baileys_chats
      if (isGroup && isOutbound) {
        try {
          await (supabase.from('baileys_chats') as any).upsert({
            workspace_id: wsId,
            jid: chatJid,
            is_group: true,
            last_message: text,
            last_message_at: sentAt,
            updated_at: new Date().toISOString(),
          }, { 
            onConflict: 'workspace_id, jid', 
            ignoreDuplicates: false 
          });
        } catch (_) {}
      }
    }
  });

  localSock.ev.on('messages.update', async (updates: any[]) => {
    for (const update of updates) {
      const waId = update.key?.id;
      const statusNum = update.update?.status;
      if (!waId) continue;

      let statusStr: string | null = null;
      if (statusNum === 2) statusStr = 'sent'; // SERVER_ACK (single tick)
      else if (statusNum === 3) statusStr = 'delivered'; // DELIVERY_ACK (double tick)
      else if (statusNum === 4) statusStr = 'read'; // READ (blue tick)
      else if (statusNum === 5) statusStr = 'played';

      logger.info({ workspaceId: wsId, waId, statusNum, statusStr }, '📬 WhatsApp message receipt status update');

      if (statusStr) {
        const updateData: any = { status: statusStr };
        if (statusStr === 'delivered') updateData.delivered_at = new Date().toISOString();
        if (statusStr === 'read') updateData.read_at = new Date().toISOString();

        try {
          await supabase
            .from('baileys_messages')
            .update(updateData)
            .eq('workspace_id', wsId)
            .eq('wa_message_id', waId);
        } catch (_) {}
      }
    }
  });

  // Listen for real-time group metadata updates (e.g. group name changed, new group created)
  localSock.ev.on('groups.update', async (groupUpdates: any[]) => {
    for (const update of groupUpdates) {
      if (!update.id) continue;
      const patch: any = {
        workspace_id: wsId,
        jid: update.id,
        is_group: true,
        updated_at: new Date().toISOString(),
      };
      if (update.subject) {
        patch.display_name = update.subject;
      }
      try {
        await (supabase.from('baileys_chats') as any).upsert(patch, {
          onConflict: 'workspace_id, jid',
          ignoreDuplicates: false,
        });
      } catch (_) {}
    }
  });

  localSock.ev.on('group-participants.update', async ({ id }: any) => {
    if (!id) return;
    try {
      const meta = await localSock.groupMetadata(id);
      if (meta) {
        await (supabase.from('baileys_chats') as any).upsert({
          workspace_id: wsId,
          jid: id,
          display_name: meta.subject || id.split('@')[0],
          participant_count: meta.participants?.length ?? 0,
          is_group: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id, jid',
          ignoreDuplicates: false,
        });
      }
    } catch (_) {}
  });

  // Real-time listener for newly created or joined WhatsApp groups
  localSock.ev.on('groups.upsert', async (newGroups: any[]) => {
    for (const group of newGroups) {
      if (!group.id) continue;
      try {
        await (supabase.from('baileys_chats') as any).upsert({
          workspace_id: wsId,
          jid: group.id,
          display_name: group.subject || group.id.split('@')[0],
          participant_count: group.participants?.length ?? 0,
          is_group: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id, jid',
          ignoreDuplicates: false,
        });
        logger.info({ jid: group.id, subject: group.subject }, '✨ Realtime new WhatsApp group synced');
      } catch (_) {}
    }
  });

  // Real-time listener for chats upsert to catch group creations
  localSock.ev.on('chats.upsert', async (chats: any[]) => {
    for (const chat of chats) {
      if (!chat.id || !chat.id.endsWith('@g.us')) continue;
      try {
        await (supabase.from('baileys_chats') as any).upsert({
          workspace_id: wsId,
          jid: chat.id,
          display_name: chat.name || chat.subject || chat.id.split('@')[0],
          is_group: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id, jid',
          ignoreDuplicates: false,
        });
      } catch (_) {}
    }
  });

  // History sync listeners - ONLY preserve Groups for workflows; strictly ignore personal chats and contacts
  localSock.ev.on('messaging-history.set' as any, async ({ chats: histChats }: any) => {
    try {
      if (histChats && histChats.length > 0) {
        const groupRows = histChats
          .filter((c: any) => c.id?.endsWith('@g.us'))
          .map((c: any) => ({
            workspace_id: wsId,
            jid: c.id,
            display_name: c.name || c.subject || c.id.split('@')[0],
            unread_count: 0,
            is_group: true,
            updated_at: new Date().toISOString(),
          }));

        if (groupRows.length > 0) {
          await (supabase.from('baileys_chats') as any).upsert(groupRows, {
            onConflict: 'workspace_id, jid',
            ignoreDuplicates: false,
          });
          logger.info({ count: groupRows.length, workspaceId: wsId }, '✅ Synced WhatsApp groups from history');
        }
      }
    } catch (_) {}
  });

  localSock.ev.on('contacts.set' as any, async () => {
    // No-op: Do not dump user personal contacts into database
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
        if (!targetWs || targetWs === 'null' || targetWs === 'undefined') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', worker: 'baileys', active_sessions_count: activeSessions.size }));
          return;
        }

        const { data } = await supabase
          .from('baileys_sessions')
          .select('conn_state, phone_number, last_connected')
          .or(`workspace_id.eq.${targetWs},user_id.eq.${targetWs}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let sess = activeSessions.get(targetWs);

        // If not in memory but disk session exists, auto-restore socket into memory in background!
        if ((!sess || !(sess.sock as any)?.user?.id) && hasDiskSession(targetWs)) {
          startBaileysSocket(false, targetWs).catch(() => {});
          sess = activeSessions.get(targetWs);
        }

        const socketAlive = !!sess?.sock;
        const socketReadyState = (sess?.sock as any)?.ws?.readyState;
        const socketAuthenticated = !!(sess?.sock as any)?.user?.id;
        const socketConnState = socketAuthenticated ? 'open' : (socketReadyState === 1 ? 'connecting' : (socketAlive ? 'connecting' : 'disconnected'));

        const authenticatedPhone = (sess?.sock as any)?.user?.id ? (sess?.sock as any).user.id.split(':')[0].replace(/\D/g, '') : null;
        const effectivePhone = authenticatedPhone || data?.phone_number || null;
        const isEffectiveConnected = socketAuthenticated || (data?.conn_state === 'open' && !!data?.phone_number);

        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          worker: 'baileys',
          workspace_id: targetWs,
          active_sessions_count: activeSessions.size,
          socket: socketAlive ? 'alive' : 'null',
          socket_conn_state: isEffectiveConnected ? 'open' : socketConnState,
          socket_authenticated: isEffectiveConnected,
          phone_number: effectivePhone,
          session: data,
        }));
        return;
      }

      if (req.method === 'GET' && parsedUrl.pathname === '/check-phone') {
        const targetWs = parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;
        const phone = parsedUrl.searchParams.get('phone');
        if (!phone) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing phone' }));
          return;
        }
        try {
          const targetSock = await getWorkspaceSocket(targetWs);
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const jid = `${cleanPhone}@s.whatsapp.net`;
          const results = await targetSock.onWhatsApp(jid);
          res.writeHead(200);
          res.end(JSON.stringify({ phone, jid, results }));
        } catch (checkErr: any) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: checkErr.message }));
        }
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

        // 1. If already connected in memory:
        if (!forceFresh && sess?.sock && (sess.sock as any).user && (sess.sock as any).user.id) {
          const p = (sess.sock as any).user.id.split(':')[0].replace(/\D/g, '');
          logger.info({ workspace_id: qsWorkspace }, 'Session is ALREADY CONNECTED! Skipping reset on /init-qr.');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, isConnected: true, phone: p, message: `Workspace ${qsWorkspace} is already connected.` }));
          return;
        }

        // 2. If disk credentials exist and not forceFresh, restore socket instead of throwing it away!
        if (!forceFresh && hasDiskSession(qsWorkspace)) {
          logger.info({ workspace_id: qsWorkspace }, 'Disk credentials exist — restoring existing session instead of new QR');
          startBaileysSocket(false, qsWorkspace).catch(() => {});
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, restoring: true, message: `Restoring existing session for ${qsWorkspace}.` }));
          return;
        }

        // 3. If DB already has open session with phone number:
        const { data: dbSess } = await supabase
          .from('baileys_sessions')
          .select('conn_state, status, phone_number, qr_string, updated_at')
          .or(`workspace_id.eq.${qsWorkspace},user_id.eq.${qsWorkspace}`)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!forceFresh && dbSess?.conn_state === 'open' && dbSess?.phone_number) {
          logger.info({ workspace_id: qsWorkspace }, 'DB shows session open — skipping force-reset.');
          startBaileysSocket(false, qsWorkspace).catch(() => {});
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, isConnected: true, phone: dbSess.phone_number }));
          return;
        }

        // 4. Debounce if valid QR already exists
        const validMemoryQr = !!(sess?.lastQrTime && (now - sess.lastQrTime < 20_000));
        const validDbQr = dbSess?.qr_string && dbSess?.updated_at && (now - new Date(dbSess.updated_at).getTime() < 20_000);

        if (!forceFresh && (validMemoryQr || validDbQr)) {
          logger.info({ workspace_id: qsWorkspace }, '⏳ Active QR pairing in progress with valid QR — Skipping re-trigger on /init-qr.');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Active QR pairing in progress.` }));
          return;
        }

        // 5. If forceFresh was explicitly passed, initiate force reset. Otherwise, start socket cleanly!
        if (forceFresh) {
          logger.info({ workspace_id: qsWorkspace }, '🔴 Hard force-fresh requested — purging session and starting clean socket...');
          await initiateForceReset(qsWorkspace);
        } else {
          logger.info({ workspace_id: qsWorkspace }, '🚀 Starting Baileys socket for QR pairing...');
          startBaileysSocket(false, qsWorkspace).catch(err => {
            logger.error({ err, workspaceId: qsWorkspace }, 'Failed to start socket on /init-qr');
          });
        }

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

        let targetSock: ReturnType<typeof makeWASocket>;
        try {
          targetSock = await getWorkspaceSocket(targetWsId);
        } catch (sockErr: any) {
          logger.warn({ err: sockErr?.message, workspaceId: targetWsId }, '⚠️ /send: Socket not connected');
          res.writeHead(400);
          res.end(JSON.stringify({ 
            success: false, 
            error: sockErr?.message || 'WhatsApp is not connected. Please scan the QR code in WhatsApp Web Integration before sending messages.' 
          }));
          return;
        }

        if (!targetSock?.user?.id) {
          res.writeHead(400);
          res.end(JSON.stringify({ 
            success: false, 
            error: 'WhatsApp is not connected. Please scan the QR code in WhatsApp Web Integration before sending messages.' 
          }));
          return;
        }

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
          case 'poll': {
            if (!text) throw new Error('Missing: text (poll name)');
            const rawOpts = pollOptions || payload.options || [];
            const cleanOpts: string[] = (Array.isArray(rawOpts) ? rawOpts : [])
              .map((o: any) => typeof o === 'string' ? o.trim() : (o?.text || o?.value || o?.option || '').trim())
              .filter((s: string) => s.length > 0);

            if (cleanOpts.length < 2) {
              if (cleanOpts.length === 1) cleanOpts.push('No / Other');
              else cleanOpts.push('Yes', 'No');
            }

            const safeSelectableCount = Math.min(
              Math.max(1, pollSelectableCount || 1),
              cleanOpts.length
            );

            try {
              const pollResult = await targetSock.sendMessage(jid, {
                poll: {
                  name: text,
                  values: cleanOpts,
                  selectableCount: safeSelectableCount
                }
              });
              waMessageId = pollResult?.key?.id ?? null;
            } catch (pollErr: any) {
              logger.warn({ err: pollErr?.message }, '⚠️ /send Poll dispatch failed, falling back to clean text dispatch');
              const textPoll = `${text}\n\n` + cleanOpts.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
              const textRes = await targetSock.sendMessage(jid, { text: textPoll });
              waMessageId = textRes?.key?.id ?? null;
            }
            break;
          }
          case 'buttons': {
            const rawButtons = payload.rawButtons || payload.buttons || [];
            const footer = payload.footer || '';
            const buttonsList = rawButtons || [];

            const actionBlocks = buttonsList.map((btn: any) => {
              if (btn.type === 'cta_url' || btn.type === 'url') {
                return `🌐 *${btn.text}*\n👉 ${btn.value}`;
              }
              if (btn.type === 'cta_call' || btn.type === 'phone' || btn.type === 'call') {
                const cleanPhone = String(btn.value || '').replace(/[^0-9+]/g, '');
                return `📞 *${btn.text}*\n👉 tel:${cleanPhone}`;
              }
              return `⚡ *[ ${String(btn.text || '').toUpperCase()} ]*`;
            }).join('\n\n');

            const cardMessage = `${text || ''}\n\n━━━━━━━━━━━━━━━━━━━━\n${actionBlocks}\n━━━━━━━━━━━━━━━━━━━━${footer ? `\n_${footer}_` : ''}`;

            if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.trim() !== '' && mediaUrl !== 'null') {
              const detectedMime = mimeType || detectMimeTypeFromUrl(mediaUrl);
              logger.info({ jid, mediaUrl: mediaUrl.slice(0, 80), detectedMime }, '📤 Sending action card message WITH media attachment');
              waMessageId = await sendMediaMessage(jid, mediaUrl, cardMessage, detectedMime, targetWsId);
            } else {
              const sentResult = await targetSock.sendMessage(jid, {
                text: cardMessage
              });
              logger.info({ jid, id: sentResult?.key?.id }, '✅ Action card message delivered');
              waMessageId = sentResult?.key?.id ?? null;
            }
            break;
          }
          default:
            throw new Error(`Unsupported type: ${type}`);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, waMessageId, messageId: waMessageId }));
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/fetch-groups') {
        const bodyStr = await getRequestBody(req).catch(() => '{}');
        const payload = JSON.parse(bodyStr || '{}');
        let targetWsId = payload.workspace_id || payload.workspaceId || parsedUrl.searchParams.get('workspace_id') || WORKSPACE_ID;

        if (!targetWsId || targetWsId.trim() === '' || targetWsId === 'null' || targetWsId === 'undefined') {
          if (activeSessions.size > 0) {
            targetWsId = Array.from(activeSessions.keys())[0];
          }
        }

        logger.info({ workspaceId: targetWsId }, 'Fetch groups requested');

        let groups: any[] = [];

        try {
          const targetSock = await getWorkspaceSocket(targetWsId);
          const groupMap = await targetSock.groupFetchAllParticipating();
          groups = Object.values(groupMap).map((g: any) => ({
            jid: g.id,
            display_name: g.subject || g.id.split('@')[0],
            participant_count: g.participants?.length ?? 0,
            is_group: true,
          }));

          const rows = groups.map((g: any) => ({
            workspace_id: targetWsId || WORKSPACE_ID,
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
          return;
        } catch (sockErr: any) {
          logger.warn({ err: sockErr?.message, workspaceId: targetWsId }, '⚠️ Live groupFetchAllParticipating failed, checking DB cache...');

          // Fallback to cached groups from database
          try {
            const { data: dbGroups } = await supabase
              .from('baileys_chats')
              .select('jid, display_name, participant_count, is_group')
              .eq('is_group', true)
              .order('display_name', { ascending: true });

            if (dbGroups && dbGroups.length > 0) {
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, groups: dbGroups, cached: true }));
              return;
            }
          } catch (_) {}

          res.writeHead(200);
          res.end(JSON.stringify({ 
            success: false, 
            error: sockErr?.message || 'WhatsApp is not connected. Please scan the QR code to connect.' 
          }));
          return;
        }
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
      const targetSock = sess.sock;

      // Only check zombie state if THIS worker actually has/had authenticated credentials for this session.
      // If targetSock.user is missing because credentials belong to another worker or were not loaded locally, skip!
      if (!targetSock?.user?.id && !hasDiskSession(wsId)) {
        continue;
      }

      const { data: dbSession } = await supabase
        .from('baileys_sessions')
        .select('conn_state, status, updated_at')
        .eq('workspace_id', wsId)
        .maybeSingle();

      // Only check zombie state if DB believes the workspace session IS OPEN or CONNECTED.
      // If it's in 'connecting', 'qr_event', or 'disconnected', skip check to allow QR scanning to complete safely.
      if (dbSession?.conn_state !== 'open' && dbSession?.status !== 'CONNECTED') {
        continue;
      }

      // If connection state changed within the last 30 seconds, give the socket handshake time to settle
      if (dbSession.updated_at) {
        const timeSinceChange = Date.now() - new Date(dbSession.updated_at).getTime();
        if (timeSinceChange < 30_000) {
          continue;
        }
      }

      let isDead = false;
      let reason = '';

      if (!targetSock) {
        isDead = true;
        reason = 'Socket instance is null/undefined';
      } else {
        const wsState = (targetSock as any).ws?.readyState;
        if (wsState !== undefined && wsState !== 1) {
          isDead = true;
          reason = `WebSocket readyState is ${wsState} (not OPEN)`;
        }
      }

      if (isDead) {
        logger.warn({ wsId, reason }, '⚠️ [Heartbeat] WhatsApp socket closed/unready — attempting graceful reconnect');
        try {
          (targetSock.ev as any).removeAllListeners();
          targetSock.end(undefined);
        } catch {}
        activeSessions.delete(wsId);

        // Attempt reconnection using disk session
        if (hasDiskSession(wsId)) {
          startBaileysSocket(false, wsId).catch(() => {});
        }
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

  // Restore existing active workspace sessions ONLY if local disk credentials exist
  const { data: activeSessionsDb } = await supabase
    .from('baileys_sessions')
    .select('workspace_id, user_id, conn_state, phone_number')
    .or('conn_state.eq.open,phone_number.neq.null');

  if (activeSessionsDb && activeSessionsDb.length > 0) {
    logger.info({ count: activeSessionsDb.length }, '🔁 Checking workspace sessions to restore from disk...');
    for (const s of activeSessionsDb) {
      const targetWs = s.workspace_id || s.user_id;
      if (!targetWs) continue;
      if (hasDiskSession(targetWs)) {
        logger.info({ workspaceId: targetWs }, 'Restoring local workspace session from disk...');
        startBaileysSocket(false, targetWs).catch(err => {
          logger.error({ err, workspaceId: targetWs }, 'Failed to restore workspace session at startup');
        });
      } else {
        logger.info({ workspaceId: targetWs }, 'Skipping startup restore: no local disk session found (prevents unprompted QR generation)');
      }
    }
  } else if (WORKSPACE_ID && hasDiskSession(WORKSPACE_ID)) {
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
