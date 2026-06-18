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
    // Verify connection is alive and open
    if (sock && sock.ws && sock.ws.readyState === 1) { // 1 === OPEN
      return sock;
    }
    console.log(`[manager] Socket for ${workspaceId} is dead/closing. Recreating...`);
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
      console.log(`[manager] WhatsApp socket closed for workspace ${workspaceId}. Code: ${statusCode}`);
      
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
  const { authDir, hasExistingCreds } = await hydrateCredsFromSupabase(supabaseAdmin, workspaceId);

  if (!hasExistingCreds) {
    return { success: false, error: 'No active session. Please scan QR code first.' };
  }

  try {
    const sock = await getOrCreateSocket(supabaseAdmin, workspaceId);
    const jid = normalizeJid(payload.to);
    
    // Dynamically fetch WAMessageContent builders
    const { default: makeWASocket } = await import('@whiskeysockets/baileys') as any;
    let msgContent: WAMessageContent;

    switch (payload.type) {
      case 'image':
        msgContent = {
          image: { url: payload.mediaUrl! },
          caption: payload.caption ?? '',
        };
        break;
      case 'video':
        msgContent = {
          video: { url: payload.mediaUrl! },
          caption: payload.caption ?? '',
        };
        break;
      case 'audio':
        msgContent = {
          audio: { url: payload.mediaUrl! },
          mimetype: payload.mimeType ?? 'audio/mpeg',
          ptt: false,
        };
        break;
      case 'document':
        msgContent = {
          document: { url: payload.mediaUrl! },
          mimetype: payload.mimeType ?? 'application/pdf',
          fileName: payload.fileName ?? 'file',
        };
        break;
      case 'poll':
        msgContent = {
          poll: {
            name: payload.text!,
            values: payload.pollOptions || [],
            selectableCount: payload.pollSelectableCount ?? 1
          }
        };
        break;
      default: // text
        msgContent = { text: payload.text! };
    }

    const result = await sock.sendMessage(jid, msgContent);
    const waMessageId = result?.key?.id ?? null;

    // Update DB: message status → sent
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
  } catch (err: any) {
    console.error('[send] Error sending message via manager:', err.message);
    
    // Fallback: if getOrCreateSocket failed, we fall back to spinning up a quick temporary socket to send the message
    return new Promise<HydrationResult>(async (resolve) => {
      let sock: BaileysSocket | null = null;
      let credsSaved = false;
      let resolved = false;
      let timeoutHandle: ReturnType<typeof setTimeout>;
      let credsSavePromise: Promise<void> | null = null;

      const cleanResolve = async (result: HydrationResult) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);

        // Save any creds mutations before exit
        if (!credsSaved) {
          await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
        }

        // Gracefully destroy socket
        try { sock?.end(undefined); } catch { /* already closed */ }

        resolve(result);
      };

      // Timeout guard — Vercel has execution limits
      timeoutHandle = setTimeout(() => {
        cleanResolve({ success: false, error: 'Timeout: message send exceeded time limit' });
      }, timeoutMs);

      try {
        const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } =
          await import('@whiskeysockets/baileys') as any;
        const pino = (await import('pino') as any).default;
        const logger = pino({ level: 'silent' });

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
          generateHighQualityLinkPreview: false,
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

        // ── creds.update: Save to /tmp + Supabase ──
        sock.ev.on('creds.update', () => {
          saveCreds(); // saves to /tmp
          credsSavePromise = persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
          credsSaved = true;
        });

        // ── connection.update: Wait for 'open' then send ──
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }: { connection: any; lastDisconnect: any }) => {
          if (connection === 'open') {
            console.log('[send-fallback] Connection open — sending message...');

            try {
              const jid = normalizeJid(payload.to);
              let msgContent: WAMessageContent;

              switch (payload.type) {
                case 'image':
                  msgContent = {
                    image: { url: payload.mediaUrl! },
                    caption: payload.caption ?? '',
                  };
                  break;
                case 'video':
                  msgContent = {
                    video: { url: payload.mediaUrl! },
                    caption: payload.caption ?? '',
                  };
                  break;
                case 'audio':
                  msgContent = {
                    audio: { url: payload.mediaUrl! },
                    mimetype: payload.mimeType ?? 'audio/mpeg',
                    ptt: false,
                  };
                  break;
                case 'document':
                  msgContent = {
                    document: { url: payload.mediaUrl! },
                    mimetype: payload.mimeType ?? 'application/pdf',
                    fileName: payload.fileName ?? 'file',
                  };
                  break;
                default: // text
                  msgContent = { text: payload.text! };
              }

              const result = await sock!.sendMessage(jid, msgContent);
              const waMessageId = result?.key?.id ?? null;

              // Update DB: message status → sent
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

              // Await any pending credentials save
              if (credsSavePromise) {
                await credsSavePromise;
              }
              await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);

              await cleanResolve({ success: true, waMessageId: waMessageId ?? undefined });
            } catch (sendErr) {
              const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
              console.error('[send-fallback] Send error:', errMsg);
              if (credsSavePromise) {
                await credsSavePromise;
              }
              await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
              await cleanResolve({ success: false, error: errMsg });
            }
          }

          if (connection === 'close') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            if (!resolved) {
              if (credsSavePromise) {
                await credsSavePromise;
              }
              await persistCredsToSupabase(supabaseAdmin, workspaceId, authDir);
              await cleanResolve({
                success: false,
                error: `Connection closed unexpectedly. Code: ${statusCode}`,
              });
            }
          }
        });
      } catch (initErr) {
        const errMsg = initErr instanceof Error ? initErr.message : String(initErr);
        console.error('[send-fallback] Init error:', errMsg);
        await cleanResolve({ success: false, error: errMsg });
      }
    });
  }
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
