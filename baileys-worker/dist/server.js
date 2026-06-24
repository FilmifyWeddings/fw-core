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
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, proto, useMultiFileAuthState, prepareWAMessageMedia, generateWAMessageFromContent, } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';
// Polyfill WebSocket globally for Supabase Realtime in Node.js < 22
globalThis.WebSocket = ws;
// Initialize dotenv configuration
config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
});
// ─── Config ──────────────────────────────────────────────────────────────────
// Load from parent .env.local if present (Next.js config location)
try {
    const parentEnvPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(parentEnvPath)) {
        config({ path: parentEnvPath });
        logger.info('✅ Loaded env from parent .env.local');
    }
}
catch (e) {
    logger.warn('Failed to load parent .env.local');
}
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKSPACE_ID = process.env.WORKER_WORKSPACE_ID || '37c63a54-d4f1-4b99-b546-3d965cd23a37';
const PORT = parseInt(process.env.WORKER_PORT ?? '3002', 10); // use WORKER_PORT to avoid collision with Next.js on 3000
const AUTH_ROOT = '/var/www/fw-core/.baileys_auth';
function getAuthPath(workspaceId) {
    let root = AUTH_ROOT;
    try {
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
    }
    catch (e) {
        root = path.join(__dirname, '.baileys_auth');
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root, { recursive: true });
        }
    }
    return path.join(root, workspaceId);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WORKSPACE_ID) {
    logger.fatal('Missing required env vars: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKER_WORKSPACE_ID');
    process.exit(1);
}
// ─── Supabase Admin Client ────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
        transport: ws,
    },
});
// (In-Memory Store chat cache removed to comply with ESM build of @whiskeysockets/baileys)
// ─── Active Socket Reference ─────────────────────────────────────────────────
let sock = null;
let reconnectTimer = null;
// ─── Session State Helpers ────────────────────────────────────────────────────
async function updateSessionState(state, extras = {}) {
    await supabase
        .from('baileys_sessions')
        .upsert({
        workspace_id: WORKSPACE_ID,
        conn_state: state,
        ...extras,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });
}
function formatNativeFlowButtons(rawButtons) {
    return (rawButtons || []).map((btn) => {
        const type = btn.type || '';
        if (type === 'quick_reply') {
            return {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.label || '',
                    id: btn.value || btn.id || ''
                })
            };
        }
        if (type === 'url') {
            return {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.label || 'Link',
                    url: btn.value || '',
                    merchant_url: btn.value || ''
                })
            };
        }
        if (type === 'phone' || type === 'call') {
            return {
                name: "cta_call",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.label || 'Call',
                    phone_number: btn.value || ''
                })
            };
        }
        return null;
    }).filter(Boolean);
}
// ─── Media Helpers ──────────────────────────────────────────────────────────
function detectMimeTypeFromUrl(url) {
    const clean = url.toLowerCase().split('?')[0].split('#')[0];
    if (clean.endsWith('.mp4') || clean.endsWith('.m4v') || clean.includes('.mp4'))
        return 'video/mp4';
    if (clean.endsWith('.webm'))
        return 'video/webm';
    if (clean.endsWith('.mov'))
        return 'video/quicktime';
    if (clean.endsWith('.mp3'))
        return 'audio/mpeg';
    if (clean.endsWith('.ogg') || clean.endsWith('.oga'))
        return 'audio/ogg';
    if (clean.endsWith('.m4a'))
        return 'audio/mp4';
    if (clean.endsWith('.wav'))
        return 'audio/wav';
    if (clean.endsWith('.pdf'))
        return 'application/pdf';
    if (clean.endsWith('.png'))
        return 'image/png';
    if (clean.endsWith('.webp'))
        return 'image/webp';
    if (clean.endsWith('.gif'))
        return 'image/gif';
    if (clean.endsWith('.svg'))
        return 'image/svg+xml';
    if (clean.endsWith('.bmp'))
        return 'image/bmp';
    if (clean.endsWith('.jpg') || clean.endsWith('.jpeg'))
        return 'image/jpeg';
    if (clean.endsWith('.txt') || clean.endsWith('.csv'))
        return 'text/plain';
    if (clean.endsWith('.doc') || clean.endsWith('.docx'))
        return 'application/msword';
    if (clean.endsWith('.xls') || clean.endsWith('.xlsx'))
        return 'application/vnd.ms-excel';
    return 'image/jpeg';
}
function detectMediaCategory(mimeType) {
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.startsWith('video/'))
        return 'video';
    if (mimeType.startsWith('audio/'))
        return 'audio';
    return 'document';
}
async function downloadMediaAsBuffer(mediaSource, overrideMimeType, maxRetries = 2) {
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
        }
        catch (err) {
            logger.error({ path: mediaSource, error: err.message }, '❌ Failed to read local media file');
            throw err;
        }
    }
    // ── HTTP/HTTPS URL: download via fetch ──
    let lastError = null;
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
        }
        catch (err) {
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
async function sendTextMessage(to, text) {
    if (!sock)
        throw new Error('Socket not connected');
    const result = await sock.sendMessage(to, { text });
    return result?.key?.id ?? null;
}
async function sendMediaMessage(to, mediaUrl, caption, mimeType) {
    if (!sock)
        throw new Error('Socket not connected');
    const mediaCategory = detectMediaCategory(mimeType);
    // Download media to buffer first — avoids VPS→URL network issues
    const { buffer, mimeType: resolvedMime } = await downloadMediaAsBuffer(mediaUrl, mimeType);
    const finalCategory = detectMediaCategory(resolvedMime);
    let result;
    if (finalCategory === 'image') {
        result = await sock.sendMessage(to, { image: buffer, caption, mimetype: resolvedMime });
    }
    else if (finalCategory === 'video') {
        result = await sock.sendMessage(to, { video: buffer, caption, mimetype: resolvedMime });
    }
    else if (finalCategory === 'audio') {
        result = await sock.sendMessage(to, { audio: buffer, mimetype: resolvedMime, ptt: false });
    }
    else {
        result = await sock.sendMessage(to, {
            document: buffer,
            mimetype: resolvedMime,
            fileName: caption || 'file',
        });
    }
    return result?.key?.id ?? null;
}
async function sendTemplateMessage(to, templateId, variables) {
    let tpl = null;
    // 1. Query tenant_whatsapp_templates first (new schema with type/buttons/payload_json)
    const { data: tenantTpl } = await supabase
        .from('tenant_whatsapp_templates')
        .select('body_text, media_url_payload, type, buttons, payload_json')
        .eq('id', templateId)
        .eq('tenant_id', WORKSPACE_ID)
        .maybeSingle();
    if (tenantTpl) {
        const pj = tenantTpl.payload_json || {};
        const mediaUrl = tenantTpl.media_url_payload || pj.mediaUrl || null;
        let mediaType = null;
        if (mediaUrl) {
            mediaType = detectMediaCategory(detectMimeTypeFromUrl(mediaUrl));
        }
        tpl = {
            body_text: tenantTpl.body_text || pj.body || pj.question || '',
            media_url: mediaUrl,
            media_type: mediaType,
            tpl_type: tenantTpl.type || null,
            tpl_buttons: tenantTpl.buttons || [],
            tpl_payload: pj,
        };
    }
    else {
        // 2. Fallback to legacy whatsapp_templates
        const { data: legacyTpl } = await supabase
            .from('whatsapp_templates')
            .select('payload, type, buttons')
            .eq('id', templateId)
            .eq('workspace_id', WORKSPACE_ID)
            .maybeSingle();
        if (legacyTpl) {
            const payloadObj = legacyTpl.payload || {};
            const legacyMediaUrl = payloadObj.mediaUrl || null;
            let legacyMediaType = null;
            if (legacyMediaUrl) {
                legacyMediaType = detectMediaCategory(detectMimeTypeFromUrl(legacyMediaUrl));
            }
            tpl = {
                body_text: payloadObj.body || payloadObj.question || '',
                media_url: legacyMediaUrl,
                media_type: legacyMediaType,
                tpl_type: legacyTpl.type || null,
                tpl_buttons: legacyTpl.buttons || [],
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
            .eq('workspace_id', WORKSPACE_ID)
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
    if (!tpl)
        throw new Error(`Template ${templateId} not found`);
    // Replace placeholders (supports {{key}} and {key})
    let body = tpl.body_text;
    if (body) {
        const replaceFn = (match, key) => {
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
            if (normalizedKey === 'facebook_lead_id') {
                return variables['lead_id'] || variables['facebook_lead_id'] || '';
            }
            if (normalizedKey === 'form_name') {
                return variables['form_name'] || '';
            }
            if (normalizedKey === 'campaign_name') {
                return variables['campaign_name'] || '';
            }
            if (normalizedKey === 'platform') {
                return variables['platform'] || '';
            }
            return '';
        };
        body = body.replace(/\{\{([^{}]+)\}\}/g, replaceFn);
        body = body.replace(/\{([^{}]+)\}/g, replaceFn);
    }
    if (!sock)
        throw new Error('Socket not connected');
    const tplType = tpl.tpl_type || (tpl.media_url ? 'media' : 'text');
    const pj = tpl.tpl_payload || {};
    const footer = pj.footer || '';
    // ── LIST message ────────────────────────────────────────────────────────────
    if (tplType === 'list') {
        const sections = pj.sections || [];
        const buttonText = pj.buttonText || pj.button_text || 'Options';
        const result = await sock.sendMessage(to, {
            listMessage: {
                title: body,
                description: footer,
                buttonText,
                footerText: footer,
                listType: 1,
                sections,
            }
        });
        return result?.key?.id ?? null;
    }
    // ── POLL message ─────────────────────────────────────────────────────────────
    if (tplType === 'poll') {
        const pollOpts = (pj.options || []).map((o) => (typeof o === 'string' ? o : o.text));
        const allowMultiple = !!(pj.allowMultiple || pj.multipleAnswers);
        const result = await sock.sendMessage(to, {
            poll: {
                name: body,
                values: pollOpts,
                selectableCount: allowMultiple ? pollOpts.length : 1,
            }
        });
        return result?.key?.id ?? null;
    }
    // ── BUTTONS (Quick Reply / URL / Phone) ───────────────────────────────────
    const rawButtons = tpl.tpl_buttons || [];
    if (rawButtons.length > 0) {
        const nativeFlowButtons = formatNativeFlowButtons(rawButtons);
        let headerStructure = { hasMediaAttachment: false };
        const hasValidMedia = tpl.media_url && tpl.media_url !== 'null' && tpl.media_url.trim() !== '';
        if (hasValidMedia) {
            const isVideo = tpl.media_type === 'video' || (tpl.media_url && tpl.media_url.toLowerCase().endsWith('.mp4'));
            try {
                // Download media to buffer first — eliminates VPS→URL network issues
                const detectedMime = detectMimeTypeFromUrl(tpl.media_url);
                const { buffer, mimeType: resolvedMime } = await downloadMediaAsBuffer(tpl.media_url, detectedMime);
                const finalIsVideo = resolvedMime.startsWith('video/');
                logger.info({ to, mediaUrl: tpl.media_url.slice(0, 80), resolvedMime, bufferSize: buffer.length }, '📤 Preparing WAMessageMedia for template interactive message');
                const mediaUploaded = await prepareWAMessageMedia(finalIsVideo
                    ? { video: buffer, mimetype: resolvedMime }
                    : { image: buffer, mimetype: resolvedMime }, { upload: sock.waUploadToServer, logger });
                headerStructure = {
                    title: body || "",
                    hasMediaAttachment: true,
                    ...(finalIsVideo ? { videoMessage: mediaUploaded.videoMessage } : { imageMessage: mediaUploaded.imageMessage })
                };
            }
            catch (mediaErr) {
                logger.error({ to, error: mediaErr.message }, '❌ Failed to prepare media for template buttons — sending without media');
                headerStructure = { title: body || "", hasMediaAttachment: false };
            }
        }
        else {
            headerStructure = {
                title: "",
                hasMediaAttachment: false
            };
        }
        logger.info({ to, nativeFlowButtons, headerStructure, footer: footer || "" }, '📤 Sending template interactiveMessage');
        // Use generateWAMessageFromContent to bypass generateWAMessageContent
        // which doesn't recognize viewOnceMessage and falls through to prepareWAMessageMedia
        const messageContent = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: headerStructure,
                        body: { text: body || "" },
                        footer: { text: footer || "" },
                        nativeFlowMessage: {
                            buttons: nativeFlowButtons,
                            messageParamsVersion: 1
                        }
                    }
                }
            }
        };
        const userJid = sock.user?.id || '';
        const waMessage = generateWAMessageFromContent(to, messageContent, { userJid });
        await sock.relayMessage(to, waMessage.message, { messageId: waMessage.key.id });
        return waMessage.key.id ?? null;
    }
    // ── MEDIA (no buttons) ────────────────────────────────────────────────────
    if (tpl.media_url) {
        const mimeType = detectMimeTypeFromUrl(tpl.media_url);
        return sendMediaMessage(to, tpl.media_url, body, mimeType);
    }
    // ── PLAIN TEXT ────────────────────────────────────────────────────────────
    return sendTextMessage(to, body);
}
async function dispatchGroupCard(groupJid, leadData) {
    if (!sock)
        throw new Error('Socket not connected');
    const name = leadData.name ?? 'New Lead';
    const source = leadData.source ?? 'Unknown';
    const phone = leadData.phone ?? '—';
    const email = leadData.email ?? '—';
    const card = `🎯 *NEW LEAD ALERT*\n\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `📧 *Email:* ${email}\n` +
        `🔗 *Source:* ${source}\n` +
        `🕐 *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
        `_FW Core — Automated Lead Alert_`;
    await sock.sendMessage(groupJid, { text: card });
    logger.info({ groupJid, name }, '📤 Group dispatch sent');
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
async function executeAction(action) {
    if (!sock)
        throw new Error('WhatsApp socket is not connected. Cannot process action.');
    let waMessageId = null;
    // ── Dispatch: throws on failure so the processor marks it 'failed' ──────────
    switch (action.action_type) {
        case 'send_text': {
            const { to, text } = action.payload;
            waMessageId = await sendTextMessage(to, text);
            break;
        }
        case 'send_media': {
            const { to, mediaUrl, caption, mimeType } = action.payload;
            waMessageId = await sendMediaMessage(to, mediaUrl, caption, mimeType);
            break;
        }
        case 'send_template': {
            const { to, templateId, variables } = action.payload;
            waMessageId = await sendTemplateMessage(to, templateId, variables);
            break;
        }
        case 'group_dispatch': {
            const { groupJid, leadData } = action.payload;
            await dispatchGroupCard(groupJid, leadData);
            break;
        }
        default:
            logger.warn({ type: action.action_type }, 'Unknown action type — skipping');
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
        }
        else {
            logger.info({ actionId: action.id, type: action.action_type, waMessageId }, '✅ Action executed and status=done written immediately');
        }
    }
    catch (dbWriteErr) {
        // DB write failed but message was already sent — log and continue.
        // The processor's status check in processQueueAction will not re-queue because
        // we still return { success: true } here.
        logger.error({ actionId: action.id, err: dbWriteErr }, '⚠️  ACID done-write threw unexpectedly. Message was sent.');
    }
    return { success: true, waMessageId };
}
// ─── Queue Drain Wrapper (calls the processor engine) ─────────────────────────
async function runQueueDrain() {
    if (!sock) {
        logger.debug('Socket not ready — skipping queue drain');
        return;
    }
    try {
        const importPath = '../src/lib/queue-processor.js';
        const { drainQueue } = await import(importPath);
        await drainQueue(WORKSPACE_ID, executeAction, 3);
    }
    catch (err) {
        logger.error({ err }, 'Queue drain error');
    }
}
async function runSweeper() {
    try {
        const importPath = '../src/lib/queue-processor.js';
        const { sweepExpiredRetries } = await import(importPath);
        const recovered = await sweepExpiredRetries(WORKSPACE_ID);
        if (recovered > 0)
            logger.info({ recovered }, '🧹 Sweeper recovered stuck actions');
    }
    catch (err) {
        logger.error({ err }, 'Sweeper error');
    }
}
// ─── Supabase Realtime Subscription ─────────────────────────────────────────
// Realtime triggers an immediate drain when a new action is inserted.
// The 5-second polling interval below is the safety net for missed events.
function startActionQueueListener() {
    logger.info('📡 Subscribing to baileys_action_queue realtime...');
    supabase
        .channel('baileys_worker_queue')
        .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'baileys_action_queue',
        filter: `workspace_id=eq.${WORKSPACE_ID}`,
    }, async (payload) => {
        const action = payload.new;
        if (action.status !== 'pending')
            return;
        logger.info({ actionId: action.id, type: action.action_type }, '🎯 Realtime trigger — draining queue');
        // Trigger a queue drain instead of processing single action inline
        // This ensures retry-eligible actions are also picked up in the same sweep
        await runQueueDrain();
    })
        .subscribe((status) => {
        logger.info({ status }, '📡 Realtime subscription status');
    });
    // Startup drain: catch any pending actions that arrived while worker was offline
    logger.info('📋 Running startup queue drain...');
    runQueueDrain();
}
// ─── Main: Initialize Baileys Socket ─────────────────────────────────────────
async function startBaileysSocket() {
    logger.info('🚀 Starting Baileys socket...');
    await updateSessionState('connecting');
    const authDir = getAuthPath(WORKSPACE_ID);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info({ version, isLatest }, '📦 WhatsApp Web version');
    sock = makeWASocket({
        version,
        logger: logger.child({ module: 'baileys' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: 'keys' })),
        },
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false,
    });
    // Store binding removed
    // ── Event: creds.update — save creds on every update ──
    sock.ev.on('creds.update', () => {
        saveCreds();
    });
    // ── Event: connection.update — handle QR, open, close ──
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        // New QR code generated — save to DB so UI can display it
        if (qr) {
            logger.info('📱 New QR code generated');
            await supabase
                .from('baileys_sessions')
                .upsert({
                workspace_id: WORKSPACE_ID,
                qr_string: qr,
                qr_expires_at: new Date(Date.now() + 60_000).toISOString(), // expires in 60s
                conn_state: 'connecting',
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
        }
        if (connection === 'open') {
            logger.info('✅ WhatsApp connected!');
            const phoneNumber = sock?.user?.id?.split(':')[0] ?? null;
            await supabase
                .from('baileys_sessions')
                .upsert({
                workspace_id: WORKSPACE_ID,
                conn_state: 'open',
                qr_string: null, // Clear QR after connect
                phone_number: phoneNumber,
                last_connected: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id' });
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const isReplaced = statusCode === DisconnectReason.connectionReplaced;
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
            const shouldReconnect = !isLoggedOut && !isReplaced;
            logger.warn({ statusCode, shouldReconnect }, '🔌 Connection closed');
            await updateSessionState('disconnected');
            if (isLoggedOut) {
                logger.warn('🚪 Logged out (401). Wiping credentials folder and triggering fresh QR...');
                const authDir = getAuthPath(WORKSPACE_ID);
                if (fs.existsSync(authDir)) {
                    try {
                        fs.rmSync(authDir, { recursive: true, force: true });
                    }
                    catch (e) {
                        logger.error({ err: e }, 'Failed to wipe auth folder');
                    }
                }
                await supabase
                    .from('baileys_sessions')
                    .update({
                    conn_state: 'disconnected',
                    qr_string: null,
                    qr_expires_at: null,
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                    .eq('workspace_id', WORKSPACE_ID);
                if (reconnectTimer)
                    clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(startBaileysSocket, 1000);
            }
            else if (shouldReconnect) {
                logger.info('♻️  Reconnecting in 5s...');
                if (reconnectTimer)
                    clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(startBaileysSocket, 5_000);
            }
            else {
                if (isReplaced) {
                    logger.warn('⚠️ Connection replaced. Another socket has taken over. Stopping auto-reconnect.');
                }
            }
        }
    });
    // ── Event: messages.upsert — save inbound messages ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify')
            return;
        for (const msg of messages) {
            if (msg.key.fromMe)
                continue; // Skip our own messages
            const chatJid = msg.key.remoteJid;
            const text = msg.message?.conversation ??
                msg.message?.extendedTextMessage?.text ??
                msg.message?.imageMessage?.caption ??
                '[media]';
            logger.info({ chatJid, text }, '📩 Inbound message');
            // Save to baileys_messages
            await supabase.from('baileys_messages').insert({
                workspace_id: WORKSPACE_ID,
                wa_message_id: msg.key.id,
                chat_jid: chatJid,
                direction: 'inbound',
                message_text: text,
                status: 'read',
                sent_at: new Date(msg.messageTimestamp * 1000).toISOString(),
            });
            // ─── Click-to-WhatsApp Ad Lead Parser Hook ───
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const isAdReferral = contextInfo?.sourceType === 'ad' ||
                contextInfo?.referredImageUrl ||
                text.toLowerCase().includes('saw this on facebook') ||
                text.toLowerCase().includes('saw this on instagram') ||
                text.toLowerCase().includes('click to whatsapp') ||
                text.toLowerCase().includes('ad_id');
            if (isAdReferral) {
                logger.info({ chatJid }, '🎯 Click-to-WhatsApp Ad Referral Ingress detected!');
                const phoneNumber = chatJid.split('@')[0];
                // Check if lead already exists to avoid duplicate card ingestion
                const { data: existingLead } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('workspace_id', WORKSPACE_ID)
                    .eq('phone', phoneNumber)
                    .maybeSingle();
                if (!existingLead) {
                    // Auto-create lead card
                    const { data: newLead } = await supabase
                        .from('leads')
                        .insert({
                        workspace_id: WORKSPACE_ID,
                        name: msg.pushName || `WA Ad Lead (${phoneNumber.slice(-4)})`,
                        phone: phoneNumber,
                        source: 'whatsapp_ad',
                        status: 'new',
                        score: 'High-Value 🔥',
                        score_reason: 'Automated Click-to-WhatsApp Ad Lead Ingest.',
                        raw_payload: {
                            message_text: text,
                            ad_context: contextInfo ?? {}
                        }
                    })
                        .select('id')
                        .single();
                    if (newLead) {
                        // Write live activity log
                        await supabase.from('live_logs').insert({
                            workspace_id: WORKSPACE_ID,
                            lead_id: newLead.id,
                            event_type: 'webhook_ingested',
                            message: `Lead auto-created from Click-to-WhatsApp Ad: "${msg.pushName || phoneNumber}". Score: High-Value 🔥.`,
                            metadata: { source: 'whatsapp_ad' }
                        });
                        logger.info({ leadId: newLead.id }, '✅ Lead card successfully auto-created.');
                    }
                }
            }
            // Update chat last message
            await supabase
                .from('baileys_chats')
                .upsert({
                workspace_id: WORKSPACE_ID,
                jid: chatJid,
                last_message: text.slice(0, 100),
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'workspace_id, jid' });
        }
    });
    // ── Event: messages.update — Blue Tick / Delivery status ──
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (!update.update.status)
                continue;
            const waStatus = update.update.status;
            // WhatsApp status codes: 2 = sent, 3 = delivered, 4 = read
            let dbStatus = null;
            const extras = {};
            if (waStatus === proto.WebMessageInfo.Status.DELIVERY_ACK) {
                dbStatus = 'delivered';
                extras.delivered_at = new Date().toISOString();
            }
            else if (waStatus === proto.WebMessageInfo.Status.READ) {
                dbStatus = 'read';
                extras.read_at = new Date().toISOString();
            }
            else if (waStatus === proto.WebMessageInfo.Status.SERVER_ACK) {
                dbStatus = 'sent';
            }
            if (dbStatus && update.key.id) {
                await supabase
                    .from('baileys_messages')
                    .update({ status: dbStatus, ...extras })
                    .eq('wa_message_id', update.key.id);
                logger.debug({ msgId: update.key.id, status: dbStatus }, '📊 Status updated');
            }
        }
    });
    // ── Event: chats.set — Bulk sync chat list on connect ──
    sock.ev.on('chats.set', async ({ chats }) => {
        if (!chats || !chats.length)
            return;
        logger.info({ count: chats.length }, '📂 Syncing chat list...');
        const rows = chats.slice(0, 200).map((chat) => ({
            workspace_id: WORKSPACE_ID,
            jid: chat.id,
            display_name: chat.name ?? chat.id.split('@')[0],
            is_group: chat.id.endsWith('@g.us'),
            unread_count: chat.unreadCount ?? 0,
            last_message: chat.lastMessage ?? null,
            updated_at: new Date().toISOString(),
        }));
        await supabase
            .from('baileys_chats')
            .upsert(rows, { onConflict: 'workspace_id, jid', ignoreDuplicates: false });
    });
}
function getRequestBody(req) {
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
function startHealthServer() {
    const server = http.createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
            const parsedUrl = new URL(req.url ?? '', `http://localhost:${PORT}`);
            if (req.method === 'GET' && parsedUrl.pathname === '/health') {
                const { data } = await supabase
                    .from('baileys_sessions')
                    .select('conn_state, phone_number, last_connected')
                    .eq('workspace_id', WORKSPACE_ID)
                    .maybeSingle();
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'ok',
                    worker: 'baileys',
                    socket: sock ? 'alive' : 'null',
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
                logger.info('Wiping session and initiating fresh QR pairing flow...');
                // 1. Close current socket
                if (sock) {
                    try {
                        sock.end(undefined);
                    }
                    catch { }
                    sock = null;
                }
                // 2. Wipe auth folder
                const authDir = getAuthPath(WORKSPACE_ID);
                if (fs.existsSync(authDir)) {
                    try {
                        fs.rmSync(authDir, { recursive: true, force: true });
                    }
                    catch (e) {
                        logger.error({ err: e }, 'Failed to wipe auth folder on init-qr');
                    }
                }
                // 3. Mark state as connecting
                await supabase
                    .from('baileys_sessions')
                    .upsert({
                    workspace_id: WORKSPACE_ID,
                    conn_state: 'connecting',
                    qr_string: null,
                    qr_expires_at: null,
                    phone_number: null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'workspace_id' });
                // 4. Start new socket
                if (reconnectTimer)
                    clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(startBaileysSocket, 1000);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Pairing flow initialized. QR code is being generated.' }));
                return;
            }
            if (req.method === 'POST' && parsedUrl.pathname === '/send') {
                const bodyStr = await getRequestBody(req);
                const payload = JSON.parse(bodyStr);
                logger.info({ payload }, 'Received send message request');
                if (!sock) {
                    res.writeHead(503);
                    res.end(JSON.stringify({ success: false, error: 'WhatsApp socket not connected' }));
                    return;
                }
                // ── Intercept: if rawButtons/buttons are present, force 'buttons' route ──
                // Prevents type:"image"/"video"/"document" from bypassing the proto builder
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
                let waMessageId = null;
                const jid = to;
                switch (type) {
                    case 'text':
                        if (!text)
                            throw new Error('Missing: text');
                        waMessageId = await sendTextMessage(jid, text);
                        break;
                    case 'image':
                    case 'video':
                    case 'audio':
                    case 'document':
                        if (!mediaUrl || !mimeType)
                            throw new Error('Missing: mediaUrl, mimeType');
                        waMessageId = await sendMediaMessage(jid, mediaUrl, caption ?? '', mimeType);
                        break;
                    case 'poll':
                        if (!text)
                            throw new Error('Missing: text (poll name)');
                        const pollResult = await sock.sendMessage(jid, {
                            poll: {
                                name: text,
                                values: pollOptions || [],
                                selectableCount: pollSelectableCount ?? 1
                            }
                        });
                        waMessageId = pollResult?.key?.id ?? null;
                        break;
                    case 'list': {
                        // Interactive List Message
                        const { listButtonText, listSections, footer: listFooter } = payload;
                        if (!text)
                            throw new Error('Missing: text (list title)');
                        const listResult = await sock.sendMessage(jid, {
                            listMessage: {
                                title: text,
                                description: listFooter || '',
                                buttonText: listButtonText || 'Options',
                                footerText: listFooter || '',
                                listType: 1,
                                sections: listSections || [],
                            }
                        });
                        waMessageId = listResult?.key?.id ?? null;
                        break;
                    }
                    case 'buttons': {
                        // Interactive Quick-Reply / URL / Phone buttons
                        const { rawButtons, buttons: payloadButtons, footer: btnFooter } = payload;
                        const targetButtons = payloadButtons || rawButtons || [];
                        if (!text)
                            throw new Error('Missing: text (buttons body)');
                        const nativeFlowButtons = formatNativeFlowButtons(targetButtons);
                        let headerStructure = { hasMediaAttachment: false };
                        const hasValidMedia = mediaUrl && mediaUrl !== 'null' && mediaUrl.trim() !== '';
                        if (hasValidMedia) {
                            try {
                                const detectedMime = mimeType || detectMimeTypeFromUrl(mediaUrl);
                                const { buffer, mimeType: resolvedMime } = await downloadMediaAsBuffer(mediaUrl, detectedMime);
                                const finalIsVideo = resolvedMime.startsWith('video/');
                                logger.info({ jid, mediaUrl: mediaUrl.slice(0, 80), resolvedMime, bufferSize: buffer.length }, '📤 Preparing WAMessageMedia for interactive message');
                                const mediaUploaded = await prepareWAMessageMedia(finalIsVideo
                                    ? { video: buffer, mimetype: resolvedMime }
                                    : { image: buffer, mimetype: resolvedMime }, { upload: sock.waUploadToServer, logger });
                                headerStructure = {
                                    title: text || "",
                                    hasMediaAttachment: true,
                                    ...(finalIsVideo ? { videoMessage: mediaUploaded.videoMessage } : { imageMessage: mediaUploaded.imageMessage })
                                };
                            }
                            catch (mediaErr) {
                                logger.error({ jid, error: mediaErr.message }, '❌ Failed to prepare media for interactive message — sending without media');
                                headerStructure = { title: "", hasMediaAttachment: false };
                            }
                        }
                        else {
                            headerStructure = {
                                title: "",
                                hasMediaAttachment: false
                            };
                        }
                        logger.info({ jid, nativeFlowButtons, headerStructure, footer: btnFooter || "" }, '📤 Sending unified interactiveMessage');
                        // Use generateWAMessageFromContent to bypass generateWAMessageContent
                        // which doesn't recognize viewOnceMessage and falls through to prepareWAMessageMedia
                        const messageContent = {
                            viewOnceMessage: {
                                message: {
                                    interactiveMessage: {
                                        header: headerStructure,
                                        body: { text: text || "" },
                                        footer: { text: btnFooter || "" },
                                        nativeFlowMessage: {
                                            buttons: nativeFlowButtons,
                                            messageParamsVersion: 1
                                        }
                                    }
                                }
                            }
                        };
                        const userJid = sock.user?.id || '';
                        const waMessage = generateWAMessageFromContent(jid, messageContent, { userJid });
                        await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
                        waMessageId = waMessage.key.id ?? null;
                        break;
                    }
                    default:
                        throw new Error(`Unsupported type: ${type}`);
                }
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, waMessageId }));
                return;
            }
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
        catch (err) {
            logger.error({ err }, 'Error handling server request');
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }));
        }
    });
    server.listen(PORT, () => {
        logger.info({ port: PORT }, `🌐 Health server running on port ${PORT}`);
    });
}
// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function main() {
    logger.info('🔥 FW Core — Baileys Worker Starting...');
    logger.info({ workspaceId: WORKSPACE_ID }, '🏢 Workspace');
    startHealthServer();
    startActionQueueListener();
    await startBaileysSocket();
    // ── Polling interval: drain queue every 5 seconds (safety net for missed Realtime events)
    setInterval(() => {
        runQueueDrain().catch(err => logger.error({ err }, 'Polling drain error'));
    }, 5_000);
    // ── Sweeper: recover stuck 'processing' rows every 60 seconds
    setInterval(() => {
        runSweeper().catch(err => logger.error({ err }, 'Sweeper cron error'));
    }, 60_000);
    logger.info('✅ Queue polling (5s) and sweeper (60s) active.');
}
main().catch((err) => {
    logger.fatal({ err }, '💥 Worker crashed');
    process.exit(1);
});
