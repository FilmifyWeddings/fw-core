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

// ─── Load Creds from Supabase → /tmp ─────────────────────────────────────────
export async function hydrateCredsFromSupabase(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<{ authDir: string; hasExistingCreds: boolean }> {
  const authDir = getTmpAuthPath(workspaceId);

  const { data, error } = await supabaseAdmin
    .from('baileys_sessions')
    .select('creds_json, keys_json')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[hydrate] Supabase fetch error:', error.message);
    return { authDir, hasExistingCreds: false };
  }

  let hasExistingCreds = false;

  if (data?.creds_json) {
    try {
      // Write creds.json to /tmp
      fs.writeFileSync(path.join(authDir, 'creds.json'), data.creds_json, 'utf-8');
      hasExistingCreds = true;

      // Write any key files back too
      if (data.keys_json) {
        const keysMap = JSON.parse(data.keys_json) as Record<string, unknown>;
        for (const [filename, content] of Object.entries(keysMap)) {
          fs.writeFileSync(
            path.join(authDir, filename),
            typeof content === 'string' ? content : JSON.stringify(content),
            'utf-8'
          );
        }
      }
      console.log('[hydrate] Credentials loaded from Supabase → /tmp ✅');
    } catch (e) {
      console.error('[hydrate] Failed to write creds to /tmp:', e);
    }
  } else {
    console.log('[hydrate] No existing credentials — fresh session, QR needed');
  }

  return { authDir, hasExistingCreds };
}

// ─── Save Updated Creds back to Supabase ─────────────────────────────────────
export async function persistCredsToSupabase(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  authDir: string
): Promise<void> {
  try {
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const credsJson = fs.readFileSync(credsPath, 'utf-8');

    // Collect all key files (everything except creds.json)
    const keysObj: Record<string, unknown> = {};
    const files = fs.readdirSync(authDir).filter(f => f !== 'creds.json');
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(authDir, file), 'utf-8');
        try { keysObj[file] = JSON.parse(content); } catch { keysObj[file] = content; }
      } catch { /* skip unreadable files */ }
    }
    const { error } = await supabaseAdmin
      .from('baileys_sessions')
      .upsert({
        workspace_id: workspaceId,
        creds_json: credsJson,
        keys_json: JSON.stringify(keysObj),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });

    if (error) {
      console.error('[persist] Supabase save error:', error.message);
    } else {
      console.log('[persist] Credentials saved to Supabase ✅');
    }
  } catch (e: any) {
    console.error('[persist] Failed to persist credentials:', e.message);
  }
}

export function normalizeJid(to: string): string {
  if (to.includes('@')) return to;
  // Strip non-digits and append WhatsApp suffix
  const digits = to.replace(/\D/g, '');
  return `${digits}@s.whatsapp.net`;
}

// ─── PERSISTENT WORKER CONNECTION MANAGER (RENDER.COM 24/7) ───────────────────
export async function getOrCreateSocket(
  supabaseAdmin: SupabaseClient,
  workspaceId: string
): Promise<any> {
  if (globalSockets.has(workspaceId)) {
    const sock = globalSockets.get(workspaceId);
    // Verify connection is alive, open, or connecting (readyState: 0=CONNECTING, 1=OPEN)
    // If it's still connecting or initializing, do NOT recreate it to prevent race condition reconnect loops.
    if (sock && (!sock.ws || sock.ws.readyState === 1 || sock.ws.readyState === 0)) {
      return sock;
    }
    console.log(`[manager] Socket for ${workspaceId} is dead/closing (ws: ${!!sock.ws}, readyState: ${sock.ws?.readyState}). Recreating...`);
    try { sock.end(undefined); } catch {}
    globalSockets.delete(workspaceId);
  }

  // Load credentials from Supabase to /tmp
  const { authDir, hasExistingCreds } = await hydrateCredsFromSupabase(supabaseAdmin, workspaceId);
  if (!hasExistingCreds) {
    throw new Error('No active credentials. Scan QR first.');
  }

  const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } =
    await import('@whiskeysockets/baileys') as any;
  const pino = (await import('pino') as any).default;
  const logger = pino({ level: 'silent' });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    downloadHistoryWithMediaFiles: false,
    receivedPendingNotifications: false,
    manageIntegrity: false,
    forceConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: true,
    retryRequestDelayMs: 2000,
  });

  sock.ev.on('creds.update', async () => {
    saveCreds();
    await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }: any) => {
    if (connection === 'open') {
      console.log(`[manager] WhatsApp socket opened for workspace ${workspaceId} ✅`);
      const phoneNumber = sock?.user?.id?.split(':')[0] ?? '';
      await supabaseAdmin
        .from('baileys_sessions')
        .upsert({
          workspace_id: workspaceId,
          conn_state: 'open',
          qr_string: null,
          phone_number: phoneNumber,
          last_connected: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log(`[manager] WhatsApp socket closed for workspace ${workspaceId}. Code: ${statusCode}, Error:`, lastDisconnect?.error);

      if (statusCode === 401) {
        console.log(`[manager] Credentials rejected for ${workspaceId}. Resetting session...`);
        globalSockets.delete(workspaceId);
        try {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true });
          }
        } catch {}
        await supabaseAdmin
          .from('baileys_sessions')
          .upsert({
            workspace_id: workspaceId,
            conn_state: 'disconnected',
            qr_string: null,
            creds_json: null,
            keys_json: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id' });
      } else if (statusCode === 440) {
        console.warn(`[manager] Connection replaced (Code 440) for workspace ${workspaceId}. Another socket took over. Stopping auto-reconnect.`);
        globalSockets.delete(workspaceId);
        await supabaseAdmin
          .from('baileys_sessions')
          .upsert({
            workspace_id: workspaceId,
            conn_state: 'disconnected',
            qr_string: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id' });
      } else {
        // Schedule silent reconnect
        console.log(`[manager] Scheduling silent reconnect for workspace ${workspaceId} in 5s...`);
        globalSockets.delete(workspaceId);
        setTimeout(() => {
          getOrCreateSocket(supabaseAdmin, workspaceId).catch(err => {
            console.error(`[manager] Reconnect failed for workspace ${workspaceId}:`, err.message);
          });
        }, 5000);
      }
    }
  });

  globalSockets.set(workspaceId, sock);
  return sock;
}

export async function autoReconnectSessions(supabaseAdmin: SupabaseClient) {
  try {
    console.log('[manager] Bootup auto-reconnect: Fetching active sessions from Supabase...');
    const { data: sessions, error } = await supabaseAdmin
      .from('baileys_sessions')
      .select('workspace_id')
      .eq('conn_state', 'open');

    if (error) {
      console.error('[manager] Error fetching active sessions:', error.message);
      return;
    }

    if (!sessions || sessions.length === 0) {
      console.log('[manager] No active sessions found to reconnect.');
      return;
    }

    console.log(`[manager] Found ${sessions.length} active sessions to reconnect.`);
    for (const session of sessions) {
      console.log(`[manager] Reconnecting workspace ${session.workspace_id}...`);
      getOrCreateSocket(supabaseAdmin, session.workspace_id).catch(err => {
        console.error(`[manager] Failed to reconnect workspace ${session.workspace_id}:`, err.message);
      });
    }
  } catch (e: any) {
    console.error('[manager] Critical error during auto-reconnect:', e.message);
  }
}

// ─── CORE: Send Message via On-Demand Hydration ───────────────────────────────
export async function sendMessageServerless(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  payload: SendPayload,
  timeoutMs = 25_000
): Promise<HydrationResult> {
  const { hasExistingCreds } = await hydrateCredsFromSupabase(supabaseAdmin, workspaceId);

  if (!hasExistingCreds) {
    return { success: false, error: 'No active session. Please scan QR code first.' };
  }

  // ── Helper: Build message content from payload ────────────────────────────
  function buildMsgContent(p: SendPayload): WAMessageContent {
    switch (p.type) {
      case 'image':
        return { image: { url: p.mediaUrl! }, caption: p.caption ?? '' };
      case 'video':
        return { video: { url: p.mediaUrl! }, caption: p.caption ?? '' };
      case 'audio':
        return { audio: { url: p.mediaUrl! }, mimetype: p.mimeType ?? 'audio/mpeg', ptt: false };
      case 'document':
        return { document: { url: p.mediaUrl! }, mimetype: p.mimeType ?? 'application/pdf', fileName: p.fileName ?? 'file' };
      case 'poll':
        return { poll: { name: p.text!, values: p.pollOptions || [], selectableCount: p.pollSelectableCount ?? 1 } };
      default:
        return { text: p.text! };
    }
  }

  // ── Helper: Try to send via a connected socket ────────────────────────────
  async function trySend(sock: BaileysSocket): Promise<HydrationResult> {
    const jid = normalizeJid(payload.to);
    const msgContent = buildMsgContent(payload);
    const result = await sock.sendMessage(jid, msgContent);
    const waMessageId = result?.key?.id ?? null;

    if (waMessageId) {
      await supabaseAdmin
        .from('baileys_messages')
        .update({ status: 'sent', wa_message_id: waMessageId })
        .eq('workspace_id', workspaceId)
        .eq('chat_jid', jid)
        .eq('status', 'queued')
        .order('created_at', { ascending: false })
        .limit(1);
    }
    return { success: true, waMessageId: waMessageId ?? undefined };
  }

  // ── Attempt 1: Use primary persistent socket ──────────────────────────────
  try {
    const sock = await getOrCreateSocket(supabaseAdmin, workspaceId);
    return await trySend(sock);
  } catch (err: any) {
    console.error('[send] Primary socket send failed:', err.message);
  }

  // ── Attempt 2: SAFE RETRY — Wait for the manager socket to recover ────────
  // ⚠️  DO NOT spawn a new fallback socket here.
  // Spawning a second socket causes Code 440 (connectionReplaced) because
  // WhatsApp only allows ONE active web session per account at a time.
  // The manager's connection.update handler already schedules a 5s reconnect —
  // we just need to poll until globalSockets has a live open socket again.
  console.log(`[send] Waiting for manager socket to recover (workspace ${workspaceId})...`);

  const startTime = Date.now();
  const POLL_INTERVAL_MS = 1_200;
  const WAIT_TIMEOUT_MS = Math.min(timeoutMs, 18_000); // max 18s wait

  while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    const existingSock = globalSockets.get(workspaceId);
    if (existingSock && existingSock.ws && existingSock.ws.readyState === 1) {
      try {
        console.log(`[send] Socket recovered! Retrying send for workspace ${workspaceId}...`);
        return await trySend(existingSock);
      } catch (retryErr: any) {
        console.error('[send] Retry send also failed:', retryErr.message);
        return { success: false, error: `Send failed after socket recovery: ${retryErr.message}` };
      }
    }
  }

  console.error(`[send] Manager socket did not recover within ${WAIT_TIMEOUT_MS}ms`);
  return {
    success: false,
    error: 'WhatsApp is reconnecting. Please wait 5–10 seconds and try again.',
  };
}



// ─── CORE: Generate QR Code via On-Demand Socket ─────────────────────────────
/**
 * Initializes a socket to get a QR code.
 * Saves QR string to Supabase so the UI can poll and display it.
 * On successful connection (QR scanned), saves creds and marks session open.
 *
 * This runs in a long-lived (up to 55s) Vercel function with streaming response.
 */
export async function generateQrServerless(
  supabaseAdmin: SupabaseClient,
  workspaceId: string,
  onQr: (qrString: string) => void,
  onConnected: (phoneNumber: string) => void,
  onError: (msg: string) => void,
  timeoutMs = 55_000
): Promise<void> {
  const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } =
    await import('@whiskeysockets/baileys') as any;
  const pino = (await import('pino') as any).default;
  const fs = await import('fs');
  const path = await import('path');

  const logger = pino({ level: 'silent' });
  const authDir = getTmpAuthPath(workspaceId);

  // Clear old creds so we get a fresh QR
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true });
      fs.mkdirSync(authDir, { recursive: true });
    }
  } catch { /* ignore */ }

  await supabaseAdmin
    .from('baileys_sessions')
    .upsert({
      workspace_id: workspaceId,
      conn_state: 'connecting',
      creds_json: null,
      keys_json: null,
      qr_string: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });

  return new Promise<void>(async (resolve) => {
    let sock: BaileysSocket | null = null;
    let done = false;
    let credsSavePromise: Promise<void> | null = null;
    let hasOpened = false;

    const finish = async () => {
      if (done) return;
      done = true;
      try { sock?.end(undefined); } catch { /* already closed */ }
      resolve();
    };

    setTimeout(async () => {
      if (!done) {
        onError('QR session timed out. Please try again.');
        await supabaseAdmin
          .from('baileys_sessions')
          .update({ conn_state: 'disconnected', qr_string: null })
          .eq('workspace_id', workspaceId);
        await finish();
      }
    }, timeoutMs);

    async function connect() {
      if (done) return;
      try {
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
          version,
          logger,
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
          },
          printQRInTerminal: false,
          markOnlineOnConnect: false,
          syncFullHistory: false,
          shouldSyncHistoryMessage: () => false,
          downloadHistoryWithMediaFiles: false,
          receivedPendingNotifications: false,
          manageIntegrity: false,
          forceConnect: true,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
          keepAliveIntervalMs: 30000,
          emitOwnEvents: true,
          retryRequestDelayMs: 2000,
        });

        sock.ev.on('creds.update', async () => {
          saveCreds();

          // Immediate token eviction if successfully paired
          const credsPath = path.join(authDir, 'creds.json');
          if (fs.existsSync(credsPath)) {
            try {
              const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
              if (creds?.me?.id) {
                console.log(`[generateQrServerless] creds.update has valid me.id (${creds.me.id}). Saving and scheduling close...`);
                hasOpened = true;

                await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);

                const phoneNumber = creds.me.id.split(':')[0] || '';
                await supabaseAdmin
                  .from('baileys_sessions')
                  .upsert({
                    workspace_id: workspaceId,
                    conn_state: 'open',
                    qr_string: null,
                    phone_number: phoneNumber,
                    last_connected: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'workspace_id' });

                onConnected(phoneNumber);
                
                // Delay closure by 3 seconds to let the cryptographic handshake finalize
                setTimeout(async () => {
                  await finish();
                }, 3000);
                return;
              }
            } catch (e) {
              console.error('[generateQrServerless] creds.update check error:', e);
            }
          }

          credsSavePromise = persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }: { connection: any; qr: any; lastDisconnect: any }) => {
          if (qr) {
            // New QR code generated — write to Supabase + fire callback
            const expiresAt = new Date(Date.now() + 60_000).toISOString();
            await supabaseAdmin
              .from('baileys_sessions')
              .upsert({
                workspace_id: workspaceId,
                qr_string: qr,
                qr_expires_at: expiresAt,
                conn_state: 'connecting',
                updated_at: new Date().toISOString(),
              }, { onConflict: 'workspace_id' });

            onQr(qr);
          }

          if (connection === 'open') {
            hasOpened = true;
            const phoneNumber = sock?.user?.id?.split(':')[0] ?? '';
            
            // Wait for any active credentials commit to Supabase first
            if (credsSavePromise) {
              console.log('[generateQrServerless] Awaiting pending credentials save...');
              await credsSavePromise;
            }
            await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);

            await supabaseAdmin
              .from('baileys_sessions')
              .upsert({
                workspace_id: workspaceId,
                conn_state: 'open',
                qr_string: null,
                phone_number: phoneNumber,
                last_connected: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: 'workspace_id' });

            onConnected(phoneNumber);
            await finish();
          }

          if (connection === 'close') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            console.log(`[generateQrServerless] Connection closed. Code: ${statusCode}`);

            // If it's a restart required (515) or non-401 error, and we haven't timed out, retry!
            const shouldRetry = statusCode !== 401 && !done;
            if (shouldRetry) {
              console.log(`[generateQrServerless] Restart/reconnect required (Code: ${statusCode}). Retrying in 1.5s...`);
              setTimeout(() => {
                connect().catch(err => {
                  console.error('[generateQrServerless] Reconnect failed during retry:', err);
                  onError(`Reconnect failed: ${err.message}`);
                  finish();
                });
              }, 1500);
              return;
            }

            if (!hasOpened) {
              console.log(`[generateQrServerless] Connection closed before opening. Resetting session to disconnected.`);
              
              // Clear auth files to prevent dirty reconnect attempts
              try {
                if (fs.existsSync(authDir)) {
                  fs.rmSync(authDir, { recursive: true });
                }
              } catch (e) {
                console.error('[generateQrServerless] Clear auth dir error:', e);
              }

              // DB update to trigger a clean session reset state
              await supabaseAdmin
                .from('baileys_sessions')
                .upsert({
                  workspace_id: workspaceId,
                  conn_state: 'disconnected',
                  qr_string: null,
                  qr_expires_at: null,
                  creds_json: null,
                  keys_json: null,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'workspace_id' });

              onError(`Connection failed or timed out. Code: ${statusCode}`);
            } else {
              console.log(`[generateQrServerless] Connection closed after success. No reset required.`);
            }
            await finish();
          }
        });
      } catch (err) {
        console.error('[generateQrServerless] Error during setup:', err);
        // Aggressive database state reset on exception if not retrying
        try {
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true });
          }
        } catch {}
        await supabaseAdmin
          .from('baileys_sessions')
          .upsert({
            workspace_id: workspaceId,
            conn_state: 'disconnected',
            qr_string: null,
            qr_expires_at: null,
            creds_json: null,
            keys_json: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'workspace_id' });
        onError(`Setup error: ${err instanceof Error ? err.message : String(err)}`);
        await finish();
      }
    }

    // Trigger initial connection
    connect().catch(err => {
      console.error('[generateQrServerless] Initial connect error:', err);
      onError(`Initial connection failed: ${err.message}`);
      finish();
    });
  });
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
        type: mediaType as any,
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
      const workspaceIds = Array.from(new Set(pendingItems.map(item => item.workspace_id)));

      for (const workspaceId of workspaceIds) {
        // Verify socket is in globalSockets, if not try to wake it up if the session is open
        if (!globalSockets.has(workspaceId)) {
          const { data: session } = await supabaseAdmin
            .from('baileys_sessions')
            .select('conn_state')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

          if (session?.conn_state === 'open') {
            console.log(`[poller] Found pending actions for offline workspace ${workspaceId}. Waking up socket...`);
            await getOrCreateSocket(supabaseAdmin, workspaceId).catch(err => {
              console.error(`[poller] Failed to auto-wake socket for workspace ${workspaceId}:`, err.message);
            });
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
