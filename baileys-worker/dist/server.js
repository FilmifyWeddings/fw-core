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
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, proto, useMultiFileAuthState, Browsers, } from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';
// Polyfill WebSocket globally for Supabase Realtime in Node.js < 22
globalThis.WebSocket = ws;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ─── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    transport: { target: 'pino-pretty' },
});
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
        }
        catch (err) {
            logger.warn({ err, path: p }, 'Failed to load environment path');
        }
    }
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
function formatActionLinksText(rawButtons) {
    if (!rawButtons || rawButtons.length === 0)
        return '';
    const lines = rawButtons.map((btn) => {
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
    // ── ACTION LINKS (URL / Phone — text-formatted for reliable delivery) ────
    const rawButtons = tpl.tpl_buttons || [];
    const actionLinksText = formatActionLinksText(rawButtons);
    const finalBody = (body || '') + actionLinksText;
    if (actionLinksText) {
        logger.info({ to, linkCount: rawButtons.length }, '📤 Sending template with action links as text');
    }
    // ── MEDIA (with or without action links) ─────────────────────────────────
    if (tpl.media_url) {
        const mimeType = detectMimeTypeFromUrl(tpl.media_url);
        return sendMediaMessage(to, tpl.media_url, finalBody, mimeType);
    }
    // ── PLAIN TEXT ────────────────────────────────────────────────────────────
    return sendTextMessage(to, finalBody);
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
/**
 * Parses a dynamic lead alert template and sends it to a WhatsApp group.
 * Placeholders: {{created_time}}, {{full_name}}, {{shoot_type}}, {{location}},
 *               {{budget}}, {{phone}}, {{email}}, {{source}}, etc.
 */
async function sendGroupAlert(groupId, leadData, templateStr) {
    if (!sock)
        throw new Error('Socket not connected');
    if (!templateStr || !templateStr.trim()) {
        throw new Error('Template string is empty');
    }
    const replaceFn = (match, key) => {
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
        const aliasMap = {
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
    const result = await sock.sendMessage(groupId, { text: formatted });
    const waMessageId = result?.key?.id ?? null;
    logger.info({ groupId, waMessageId }, '📤 Group lead alert sent');
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
        case 'group_lead_alert': {
            const { groupId, leadData, templateStr } = action.payload;
            waMessageId = await sendGroupAlert(groupId, leadData, templateStr);
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
// ─── Supabase Realtime: baileys_action_queue Listener ────────────────────────
// Triggers an immediate drain when a new action is inserted.
// No polling interval — Realtime drives instant actions;
// scheduleNextDelayedCheck() handles time-delayed nodes.
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
        // If this action has a future next_retry_at it's a delayed node — reschedule
        if (action.next_retry_at && new Date(action.next_retry_at) > new Date()) {
            logger.info({ actionId: action.id, type: action.action_type, next_retry_at: action.next_retry_at }, '⏱  Delayed action inserted — rescheduling next check');
            await scheduleNextDelayedCheck();
            return;
        }
        logger.info({ actionId: action.id, type: action.action_type }, '🎯 Realtime trigger — draining queue immediately');
        await runQueueDrain();
        // After drain, reschedule in case delayed actions remain
        await scheduleNextDelayedCheck();
    })
        .subscribe((status) => {
        logger.info({ status }, '📡 baileys_action_queue realtime subscription status');
    });
    // Startup drain: catch any pending actions that arrived while worker was offline
    logger.info('📋 Running startup queue drain...');
    runQueueDrain().then(() => scheduleNextDelayedCheck());
}
// ─── Main: Initialize Baileys Socket ─────────────────────────────────────────
async function startBaileysSocket() {
    logger.info('🚀 Starting Baileys socket...');
    await updateSessionState('connecting');
    const authDir = getAuthPath(WORKSPACE_ID);
    // Programmatically wipe stuck session state: clear creds.json before loading multi-file auth
    const credsPath = path.join(authDir, 'creds.json');
    if (fs.existsSync(credsPath)) {
        try {
            fs.unlinkSync(credsPath);
            logger.info('🗑️ Stuck session credentials wiped from auth directory to ensure fresh handshake.');
        }
        catch (e) {
            logger.error({ err: e }, 'Failed to wipe stuck credentials during startup');
        }
    }
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    let { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1017531287],
        isLatest: false
    }));
    // Force latest WhatsApp Web version if the dynamically fetched one is older than our high fallback
    const minVersion = [2, 3000, 1017531287];
    if (version[0] < minVersion[0] || (version[0] === minVersion[0] && version[1] < minVersion[1]) || (version[0] === minVersion[0] && version[1] === minVersion[1] && version[2] < minVersion[2])) {
        version = minVersion;
        isLatest = true;
    }
    logger.info({ version, isLatest }, '📦 WhatsApp Web version (enforced high-version fallback)');
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
        browser: Browsers.appropriate('Edge'),
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
            // Sniff outgoing native flow button payloads (e.g. from WhatsBoost)
            if (msg.key.fromMe) {
                const msgStr = msg.message ? JSON.stringify(msg.message, null, 2) : null;
                if (msgStr && (msgStr.includes('nativeFlowMessage') || msgStr.includes('interactiveMessage'))) {
                    logger.info({ rawPayload: msg.message }, '🔍 DETECTED OUTGOING NATIVE FLOW PAYLOAD');
                    console.log("================= DETECTED OUTGOING PAYLOAD =================");
                    console.log(msgStr);
                    console.log("=============================================================");
                }
                continue;
            }
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
                    case 'buttons': {
                        // Action links (URL / Phone) — text-formatted for reliable delivery
                        const { rawButtons, buttons: payloadButtons } = payload;
                        const targetButtons = payloadButtons || rawButtons || [];
                        if (!text)
                            throw new Error('Missing: text (buttons body)');
                        const actionLinksText = formatActionLinksText(targetButtons);
                        const finalText = text + actionLinksText;
                        if (mediaUrl && mediaUrl !== 'null' && mediaUrl.trim() !== '') {
                            const mimeTypeDetect = mimeType || detectMimeTypeFromUrl(mediaUrl);
                            waMessageId = await sendMediaMessage(jid, mediaUrl, finalText, mimeTypeDetect);
                        }
                        else {
                            waMessageId = await sendTextMessage(jid, finalText);
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
                logger.info('Fetch groups requested');
                if (!sock) {
                    res.writeHead(503);
                    res.end(JSON.stringify({ success: false, error: 'WhatsApp socket not connected' }));
                    return;
                }
                try {
                    const groupMap = await sock.groupFetchAllParticipating();
                    const groups = Object.values(groupMap).map((g) => ({
                        jid: g.id,
                        display_name: g.subject || g.id.split('@')[0],
                        participant_count: g.participants?.length ?? 0,
                        is_group: true,
                    }));
                    // Upsert into baileys_chats for persistence
                    const rows = groups.map((g) => ({
                        workspace_id: WORKSPACE_ID,
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
                    logger.info({ count: groups.length }, '✅ Groups fetched and synced');
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, groups }));
                }
                catch (err) {
                    logger.error({ err }, '❌ Failed to fetch groups');
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: err.message || 'Failed to fetch groups' }));
                }
                return;
            }
            if (req.method === 'POST' && parsedUrl.pathname === '/send-group-alert') {
                const bodyStr = await getRequestBody(req);
                const payload = JSON.parse(bodyStr);
                logger.info({ payload }, 'Received send-group-alert request');
                if (!sock) {
                    res.writeHead(503);
                    res.end(JSON.stringify({ success: false, error: 'WhatsApp socket not connected' }));
                    return;
                }
                const { groupId, leadData, templateStr } = payload;
                if (!groupId || !templateStr) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, error: 'Missing required fields: groupId, templateStr' }));
                    return;
                }
                try {
                    const waMessageId = await sendGroupAlert(groupId, leadData || {}, templateStr);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, waMessageId }));
                }
                catch (err) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
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
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            logger.error({ port: PORT }, `⚠️ Port ${PORT} is already in use by a lingering process. Health server could not bind, but WhatsApp socket will remain active.`);
        }
        else {
            logger.error({ err }, '🔴 Health server encountered an error');
        }
    });
    server.listen(PORT, () => {
        logger.info({ port: PORT }, `🌐 Health server running on port ${PORT}`);
    });
}
// ─── Dynamic Delayed-Check Scheduler ─────────────────────────────────────────
// Replaces the 5-second setInterval. Queries the earliest pending action whose
// next_retry_at has not yet passed, then sets a single setTimeout to fire
// exactly when that window opens. Eliminates constant polling egress.
let delayedCheckTimer = null;
async function scheduleNextDelayedCheck() {
    if (delayedCheckTimer) {
        clearTimeout(delayedCheckTimer);
        delayedCheckTimer = null;
    }
    try {
        const now = new Date().toISOString();
        const { data: nextAction } = await supabase
            .from('baileys_action_queue')
            .select('next_retry_at')
            .eq('workspace_id', WORKSPACE_ID)
            .eq('status', 'pending')
            .not('next_retry_at', 'is', null)
            .gt('next_retry_at', now)
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
        }
        else {
            // No delayed actions pending — check again in 5 minutes as a safety net
            delayedCheckTimer = setTimeout(async () => {
                delayedCheckTimer = null;
                await scheduleNextDelayedCheck();
            }, 5 * 60 * 1000);
        }
    }
    catch (err) {
        logger.error({ err }, 'scheduleNextDelayedCheck error — retrying in 60s');
        delayedCheckTimer = setTimeout(() => {
            delayedCheckTimer = null;
            scheduleNextDelayedCheck();
        }, 60_000);
    }
}
// ─── triggerWorkflowsForLead ──────────────────────────────────────────────────
// Maps a newly inserted lead's source field → trigger_type and fires all
// matching enabled custom_workflows for that workspace.
async function triggerWorkflowsForLead(lead, workspaceId) {
    try {
        const source = String(lead.source || 'manual').toLowerCase();
        // Map raw lead source → workflow trigger_type
        let triggerType;
        if (source === 'facebook' || source === 'meta' || source === 'facebook_lead') {
            triggerType = 'facebook_lead';
        }
        else if (source === 'google_sheets' || source === 'sheets') {
            triggerType = 'facebook_lead'; // Sheets leads re-use the same pipeline trigger
        }
        else if (source === 'webhook' || source === 'website' || source === 'wordpress') {
            triggerType = 'webhook';
        }
        else if (source === 'manual' || source === 'crm') {
            triggerType = 'crm_entry';
        }
        else {
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
        logger.info({ count: workflows.length, triggerType, leadId: lead.id, workspaceId }, '⚡ Triggering custom workflows for new lead');
        // Fire each workflow asynchronously without blocking the Realtime callback
        for (const wf of workflows) {
            (async () => {
                try {
                    // Import the workflow engine dynamically (avoids circular dependency)
                    const enginePath = '../src/lib/workflow-engine.js';
                    const { executeWorkflow } = await import(enginePath);
                    await executeWorkflow(supabase, {
                        id: wf.id,
                        workspace_id: workspaceId,
                        name: wf.name,
                        trigger_type: wf.trigger_type,
                        trigger_config: wf.trigger_config || {},
                        steps: wf.steps || [],
                        is_enabled: true,
                    }, triggerType, lead // trigger payload
                    );
                    // Bump run stats
                    await supabase.rpc('rpc_bump_workflow_run_stats', {
                        p_workflow_id: wf.id,
                        p_status: 'success',
                    });
                    logger.info({ workflowId: wf.id, workflowName: wf.name }, '✅ Workflow executed successfully');
                }
                catch (wfErr) {
                    const errMsg = wfErr instanceof Error ? wfErr.message : String(wfErr);
                    logger.error({ workflowId: wf.id, err: errMsg }, '❌ Workflow execution failed');
                    // Bump failed stat
                    try {
                        await supabase.rpc('rpc_bump_workflow_run_stats', {
                            p_workflow_id: wf.id,
                            p_status: 'failed',
                        });
                    }
                    catch { }
                }
            })();
        }
    }
    catch (err) {
        logger.error({ err }, 'triggerWorkflowsForLead: unexpected error');
    }
}
// ─── Supabase Realtime: Leads INSERT Listener ────────────────────────────────
// Subscribes to INSERT events on the `leads` table.
// The moment a new lead lands (from Facebook webhook, manual CRM entry, or Google Sheets
// ingestion), this fires triggerWorkflowsForLead immediately — zero polling.
function startLeadsRealtimeListener() {
    logger.info('📡 Subscribing to leads table realtime (INSERT)...');
    supabase
        .channel('leads_ingestion_pipeline')
        .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `workspace_id=eq.${WORKSPACE_ID}`,
    }, async (payload) => {
        const lead = payload.new;
        logger.info({ leadId: lead.id, source: lead.source, name: lead.name }, '🎯 Realtime: new lead inserted — triggering workflows');
        await triggerWorkflowsForLead(lead, WORKSPACE_ID);
        // Asynchronously trigger Google Contacts Ingest Sync
        (async () => {
            try {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const syncRes = await fetch(`${appUrl}/api/workflows/google-contacts/sync-lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadId: lead.id, workspaceId: WORKSPACE_ID }),
                });
                if (syncRes.ok) {
                    const resData = await syncRes.json();
                    logger.info({ leadId: lead.id, resData }, 'Google Contacts sync triggered successfully.');
                }
                else {
                    const errText = await syncRes.text();
                    logger.warn({ leadId: lead.id, error: errText }, 'Google Contacts sync trigger response error.');
                }
            }
            catch (e) {
                logger.error({ leadId: lead.id, error: e.message }, 'Error triggering Google Contacts sync.');
            }
        })();
    })
        .subscribe((status) => {
        logger.info({ status }, '📡 Leads realtime subscription status');
    });
}
// ─── Google Sheets Background Watcher ────────────────────────────────────────
// Polls every 60 seconds across all Google-connected workspaces.
// Detects newly appended rows (beyond the last known row count stored in
// integration_credentials.config.last_row_count), maps column headers to lead
// fields, and inserts new leads to kick off the realtime workflow pipeline.
async function runGoogleSheetsWatchCycle() {
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
        if (!integrations || integrations.length === 0)
            return;
        for (const integration of integrations) {
            const config = integration.config || {};
            if (!integration.access_token)
                continue;
            const activeSheetsList = config.active_sheets || {};
            const sheetsList = config.sheets || {};
            const activeSheets = [];
            if (Object.keys(activeSheetsList).length > 0) {
                Object.entries(activeSheetsList).forEach(([key, sheet]) => {
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
            }
            else if (Object.keys(sheetsList).length > 0) {
                Object.entries(sheetsList).forEach(([title, sheet]) => {
                    if (sheet.enabled) {
                        activeSheets.push({
                            spreadsheet_id: config.spreadsheet_id || '',
                            name: title,
                            mappings: sheet.mappings || { name: 'name', phone: 'phone', email: 'email' },
                            last_row_count: sheet.last_row_count || 1
                        });
                    }
                });
            }
            else if (config.spreadsheet_id) {
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
                if (!activeSheet.spreadsheet_id)
                    continue;
                try {
                    // Fetch the spreadsheet values using correct spreadsheet ID
                    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeSheet.spreadsheet_id}/values/${encodeURIComponent(activeSheet.name)}`;
                    const res = await fetch(sheetsUrl, {
                        headers: { Authorization: `Bearer ${integration.access_token}` },
                    });
                    if (!res.ok) {
                        logger.warn({ workspaceId: integration.user_id, status: res.status, sheetName: activeSheet.name, spreadsheetId: activeSheet.spreadsheet_id }, 'Google Sheets API call failed for worksheet');
                        continue;
                    }
                    const sheetsData = await res.json();
                    const rows = sheetsData.values || [];
                    if (rows.length <= activeSheet.last_row_count) {
                        continue;
                    }
                    // Row 0 = headers
                    const headers = (rows[0] || []).map((h) => h.trim().toLowerCase());
                    const newRows = rows.slice(activeSheet.last_row_count); // rows after last processed index
                    logger.info({ workspaceId: integration.user_id, newRowCount: newRows.length, spreadsheetId: activeSheet.spreadsheet_id, sheetName: activeSheet.name }, '📊 Google Sheets: new rows detected');
                    const leadsToInsert = [];
                    const mapping = activeSheet.mappings;
                    for (const row of newRows) {
                        // Map columns to lead fields via header name matching
                        const rowObj = {};
                        headers.forEach((h, i) => { rowObj[h] = row[i] || ''; });
                        let nameVal = '';
                        let phoneVal = '';
                        let emailVal = '';
                        const customPayload = {};
                        Object.entries(mapping).forEach(([field, headerCol]) => {
                            const cleanHeader = String(headerCol || '').trim().toLowerCase();
                            const matchedVal = rowObj[cleanHeader] || '';
                            if (field === 'name') {
                                nameVal = matchedVal;
                            }
                            else if (field === 'phone') {
                                phoneVal = matchedVal;
                            }
                            else if (field === 'email') {
                                emailVal = matchedVal;
                            }
                            else {
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
                        }
                        else {
                            logger.info({ count: leadsToInsert.length, workspaceId: integration.user_id, sheetName: activeSheet.name }, '✅ Google Sheets leads ingested → Realtime pipeline will fire');
                            // Update last_row_count in config
                            if (activeSheet.composite_key && config.active_sheets && config.active_sheets[activeSheet.composite_key]) {
                                config.active_sheets[activeSheet.composite_key].last_row_count = rows.length;
                            }
                            else if (config.sheets && config.sheets[activeSheet.name]) {
                                config.sheets[activeSheet.name].last_row_count = rows.length;
                            }
                            else {
                                config.last_row_count = rows.length;
                            }
                            await supabase
                                .from('integration_credentials')
                                .update({ config })
                                .eq('user_id', integration.user_id)
                                .eq('provider', 'google');
                        }
                    }
                }
                catch (innerErr) {
                    logger.error({ err: innerErr, workspaceId: integration.user_id, sheetName: activeSheet.name }, 'Google Sheets watcher: error processing sheet');
                }
            }
        }
    }
    catch (err) {
        logger.error({ err }, 'runGoogleSheetsWatchCycle: unexpected error');
    }
}
function startGoogleSheetsWatcher() {
    logger.info('📊 Google Sheets watcher starting (60s interval)...');
    // Initial run after a short delay, then every 60s
    setTimeout(() => {
        runGoogleSheetsWatchCycle().catch(err => logger.error({ err }, 'Sheets initial watch error'));
        setInterval(() => {
            runGoogleSheetsWatchCycle().catch(err => logger.error({ err }, 'Sheets watch cycle error'));
        }, 60_000);
    }, 10_000);
}
// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function main() {
    logger.info('🔥 FW Core — Baileys Worker Starting...');
    logger.info({ workspaceId: WORKSPACE_ID }, '🏢 Workspace');
    startHealthServer();
    // ── Supabase Realtime: queue + leads listeners ──
    startActionQueueListener();
    startLeadsRealtimeListener();
    // ── Google Sheets background watcher (60s polling) ──
    startGoogleSheetsWatcher();
    // ── Start WhatsApp Baileys socket ──
    await startBaileysSocket();
    // ── Dynamic delayed-check scheduler replaces the old 5s setInterval ──
    // Only delayed-node actions need a timer; instant actions are driven by Realtime.
    await scheduleNextDelayedCheck();
    // ── Sweeper: recover stuck 'processing' rows every 60 seconds ──
    setInterval(() => {
        runSweeper().catch(err => logger.error({ err }, 'Sweeper cron error'));
    }, 60_000);
    logger.info('✅ Realtime listeners active. Dynamic delay scheduler running. Sweeper (60s) active.');
    logger.info('✅ Polling setInterval REMOVED — egress now driven by Realtime + scheduleNextDelayedCheck.');
}
main().catch((err) => {
    logger.fatal({ err }, '💥 Worker crashed');
    process.exit(1);
});
