"use strict";
/**
 * ============================================================
 * BRAHMASTRA ASYNC QUEUE PROCESSOR — src/lib/queue-processor.ts
 * ============================================================
 *
 * Law 3 Compliance: Robust Asynchronous Background Worker Engine
 *
 * ARCHITECTURE:
 *   Next.js API Route (202 Accepted)
 *        ↓  INSERT into baileys_action_queue
 *   Supabase Realtime triggers this processor
 *        ↓  Processes action step-by-step
 *   On failure → logs error, increments retry_count,
 *                computes exponential backoff → reschedules
 *        ↓  After MAX_RETRIES → marks as permanently FAILED
 *
 * EXPONENTIAL BACKOFF FORMULA:
 *   cooldown_ms = BASE_DELAY_MS * (BACKOFF_MULTIPLIER ^ attempt_count)
 *   + jitter(0..JITTER_CAP_MS)
 *
 *   attempt 1 → ~15s
 *   attempt 2 → ~60s
 *   attempt 3 → ~240s (4 min)
 *   attempt 4 → ~960s (16 min)
 *   attempt 5 → ~3840s (64 min) → then FAILED
 *
 * LAW 5 COMPLIANCE (Anti-ban):
 *   - Per-workspace message dispatch is rate-limited to 1 message
 *     every 10–30 seconds (randomized delay per Law 5)
 *   - A workspace-level processing lock prevents concurrent
 *     duplicate processors from running simultaneously.
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeNextRetryAt = computeNextRetryAt;
exports.describeBackoff = describeBackoff;
exports.applyWhatsAppRateLimit = applyWhatsAppRateLimit;
exports.processQueueAction = processQueueAction;
exports.drainQueue = drainQueue;
exports.sweepExpiredRetries = sweepExpiredRetries;
exports.getQueueStats = getQueueStats;
const supabase_1 = require("./supabase");
// ── Configuration Constants ───────────────────────────────────────────────────
const MAX_RETRIES = 5; // After 5 attempts → permanently FAILED
const BASE_DELAY_MS = 15_000; // 15 seconds base backoff delay
const BACKOFF_MULTIPLIER = 4; // Exponential factor (4x per retry)
const JITTER_CAP_MS = 5_000; // Random jitter ceiling (0–5s, prevents thundering herd)
const PROCESSING_LOCK_TTL_MS = 60_000; // 60s lock timeout (prevents zombie locks)
const WA_MIN_DELAY_MS = 10_000; // Law 5: minimum 10s between WhatsApp messages
const WA_MAX_DELAY_MS = 30_000; // Law 5: maximum 30s between WhatsApp messages
// ── In-memory workspace processing locks ─────────────────────────────────────
// Prevents concurrent processing of the same workspace's queue
const workspaceLocks = new Map(); // workspace_id → lock expiry timestamp
function acquireLock(workspaceId) {
    const now = Date.now();
    const existingLock = workspaceLocks.get(workspaceId);
    if (existingLock && existingLock > now) {
        return false; // Workspace is already being processed
    }
    workspaceLocks.set(workspaceId, now + PROCESSING_LOCK_TTL_MS);
    return true;
}
function releaseLock(workspaceId) {
    workspaceLocks.delete(workspaceId);
}
// ── Exponential Backoff Calculator ────────────────────────────────────────────
/**
 * Computes the next retry timestamp using exponential backoff with jitter.
 *
 * @param attemptCount - Number of attempts already made (0-indexed)
 * @returns ISO timestamp of when the next retry should be attempted
 */
function computeNextRetryAt(attemptCount) {
    const jitter = Math.floor(Math.random() * JITTER_CAP_MS);
    const delayMs = BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount) + jitter;
    const nextRetryAt = new Date(Date.now() + delayMs);
    return nextRetryAt.toISOString();
}
/**
 * Returns a human-readable description of the current backoff delay.
 */
function describeBackoff(attemptCount) {
    const delayMs = BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount);
    if (delayMs < 60_000)
        return `${Math.round(delayMs / 1000)}s`;
    if (delayMs < 3_600_000)
        return `${Math.round(delayMs / 60_000)}min`;
    return `${Math.round(delayMs / 3_600_000)}h`;
}
// ── Anti-ban WhatsApp Delay (Law 5) ──────────────────────────────────────────
/**
 * Waits a random 10–30 second delay between WhatsApp message dispatches.
 * Prevents account banning from bulk sending patterns.
 */
async function applyWhatsAppRateLimit() {
    const delay = WA_MIN_DELAY_MS + Math.floor(Math.random() * (WA_MAX_DELAY_MS - WA_MIN_DELAY_MS));
    await new Promise(resolve => setTimeout(resolve, delay));
}
// ── Core Queue Processing Engine ──────────────────────────────────────────────
/**
 * Processes a single action from the queue with full error handling,
 * retry logic, and failure_reason logging.
 *
 * @param action - The queue action to process
 * @param handler - The function that actually executes the action (WhatsApp socket, etc.)
 */
async function processQueueAction(action, handler) {
    const { id, workspace_id, attempt_count } = action;
    const newAttemptCount = attempt_count + 1;
    // ── Step 1: Mark as PROCESSING (optimistic lock in DB) ────────────────────
    const { data: claimedRows, error: lockError } = await supabase_1.supabaseAdmin
        .from('baileys_action_queue')
        .update({
        status: 'processing',
        attempt_count: newAttemptCount,
        processed_at: new Date().toISOString(),
    })
        .eq('id', id)
        .eq('status', 'pending') // Only claim if still pending (prevents race conditions)
        .select('id'); // Returns the row only if the update affected it
    if (lockError) {
        console.error(`[QueueProcessor] Failed to claim action ${id}:`, lockError.message);
        return;
    }
    // If 0 rows returned, another processor already claimed this action — skip it
    if (!claimedRows || claimedRows.length === 0) {
        console.warn(`[QueueProcessor] Action ${id} already claimed by another processor — skipping.`);
        return;
    }
    try {
        // ── Step 2: Execute the action via the provided handler ──────────────────
        const result = await handler(action);
        if (!result.success) {
            throw new Error(result.error || 'Handler returned failure without error message');
        }
        // ── Step 3: Mark as DONE ─────────────────────────────────────────────────
        // The handler (executeAction) may have already written 'done' to the DB as an
        // ACID guarantee immediately after sock.sendMessage succeeded. Check first.
        const { data: currentRow } = await supabase_1.supabaseAdmin
            .from('baileys_action_queue')
            .select('status')
            .eq('id', id)
            .maybeSingle();
        if (currentRow?.status !== 'done') {
            await supabase_1.supabaseAdmin
                .from('baileys_action_queue')
                .update({
                status: 'done',
                result_message_id: result.waMessageId ?? null,
                failure_reason: null,
            })
                .eq('id', id);
        }
        // Log success to live_logs
        await supabase_1.supabaseAdmin.from('live_logs').insert({
            workspace_id,
            event_type: 'queue_action_done',
            message: `Action ${action.action_type} [${id}] completed successfully.`,
            metadata: {
                action_id: id,
                action_type: action.action_type,
                wa_message_id: result.waMessageId,
                attempts: newAttemptCount,
            },
        });
    }
    catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // ── Step 4: Permanent FAILURE — no auto-retry ────────────────────────────
        // Per architecture decision: failed actions must be manually retried via the UI.
        // Auto-retry caused infinite loop bugs when messages were sent but DB write failed.
        await supabase_1.supabaseAdmin
            .from('baileys_action_queue')
            .update({
            status: 'failed',
            failure_reason: `[Attempt ${newAttemptCount}/${MAX_RETRIES}] ${errMsg}`,
            next_retry_at: null,
        })
            .eq('id', id);
        // Log failure to live_logs
        await supabase_1.supabaseAdmin.from('live_logs').insert({
            workspace_id,
            event_type: 'queue_action_failed',
            message: `❌ Action ${action.action_type} [${id}] failed after attempt ${newAttemptCount}. Manual retry required.`,
            metadata: {
                action_id: id,
                action_type: action.action_type,
                payload: action.payload,
                error: errMsg,
                total_attempts: newAttemptCount,
            },
        });
        console.error(`[QueueProcessor] ❌ FAILED — Action ${id} (${action.action_type}) failed at attempt ${newAttemptCount}. ` +
            `Status set to 'failed'. Manual retry required. Error: ${errMsg}`);
    }
}
// ── Polling-Based Queue Drainer ───────────────────────────────────────────────
/**
 * Polls the baileys_action_queue for pending actions that are due for processing.
 * Respects next_retry_at for exponential backoff scheduling.
 * Applies workspace-level locks to prevent concurrent processing.
 *
 * Call this function on a setInterval (e.g. every 5 seconds) inside the worker.
 *
 * @param workspaceId - The workspace to drain queue for
 * @param handler - The action handler (WhatsApp socket dispatcher)
 * @param batchSize - Max actions to process per poll cycle (default: 3)
 */
async function drainQueue(workspaceId, handler, batchSize = 3) {
    // Acquire workspace-level processing lock
    if (!acquireLock(workspaceId)) {
        return; // Another drain cycle is already running for this workspace
    }
    try {
        const now = new Date().toISOString();
        console.log("Worker polling at", now);
        // Fetch pending actions that are due (respects next_retry_at backoff)
        const { data: actions, error } = await supabase_1.supabaseAdmin
            .from('baileys_action_queue')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'pending')
            .or(`next_retry_at.is.null,next_retry_at.lte.${now}`) // Due for processing
            .order('priority', { ascending: true }) // High priority (1) first
            .order('created_at', { ascending: true }) // FIFO within same priority
            .limit(batchSize);
        if (error) {
            console.error(`[QueueProcessor] Poll error for workspace ${workspaceId}:`, error.message);
            return;
        }
        const tasksCount = actions ? actions.length : 0;
        console.log("Found pending tasks:", tasksCount);
        if (!actions || actions.length === 0)
            return; // Nothing to process
        console.log(`[QueueProcessor] 🎯 Processing ${actions.length} actions for workspace ${workspaceId}`);
        // Process actions sequentially (not parallel) to respect WhatsApp rate limits
        for (const action of actions) {
            await processQueueAction(action, handler);
            // Apply Law 5 anti-ban delay between WhatsApp message dispatches
            const isWhatsAppAction = ['send_text', 'send_media', 'send_template', 'group_dispatch'].includes(action.action_type);
            if (isWhatsAppAction && actions.indexOf(action) < actions.length - 1) {
                await applyWhatsAppRateLimit();
            }
        }
    }
    finally {
        releaseLock(workspaceId); // Always release lock, even on unhandled errors
    }
}
// ── Retry-Due Action Sweeper ──────────────────────────────────────────────────
/**
 * Sweeps the queue to find failed actions whose next_retry_at has passed
 * and resets them to 'pending' so the main drainer picks them up.
 *
 * Run this on a slower interval (e.g. every 60 seconds).
 *
 * @param workspaceId - Workspace to sweep
 */
async function sweepExpiredRetries(workspaceId) {
    const now = new Date().toISOString();
    // Note: drainQueue already handles next_retry_at via the .or() filter.
    // This sweeper is a safety net for orphaned 'processing' rows (worker crashed mid-action).
    const STUCK_PROCESSING_TIMEOUT = new Date(Date.now() - PROCESSING_LOCK_TTL_MS * 2).toISOString();
    const { data: stuckActions, error } = await supabase_1.supabaseAdmin
        .from('baileys_action_queue')
        .select('id, attempt_count, failure_reason')
        .eq('workspace_id', workspaceId)
        .eq('status', 'processing')
        .lt('processed_at', STUCK_PROCESSING_TIMEOUT); // Stuck for >2x lock TTL
    if (error || !stuckActions || stuckActions.length === 0)
        return 0;
    // Reset stuck 'processing' rows back to 'pending' for retry
    const stuckIds = stuckActions.map(a => a.id);
    const { error: resetError } = await supabase_1.supabaseAdmin
        .from('baileys_action_queue')
        .update({
        status: 'pending',
        failure_reason: 'Worker process crashed or timed out. Auto-recovered by sweeper.',
        next_retry_at: computeNextRetryAt(1),
    })
        .in('id', stuckIds);
    if (resetError) {
        console.error('[QueueProcessor] Sweeper reset error:', resetError.message);
        return 0;
    }
    console.warn(`[QueueProcessor] 🧹 Sweeper recovered ${stuckIds.length} stuck actions for workspace ${workspaceId}`);
    return stuckIds.length;
}
// ── Queue Statistics Helper ───────────────────────────────────────────────────
/**
 * Returns queue health metrics for the admin dashboard.
 */
async function getQueueStats(workspaceId) {
    const { data } = await supabase_1.supabaseAdmin
        .from('baileys_action_queue')
        .select('status, action_type, next_retry_at')
        .eq('workspace_id', workspaceId);
    const rows = data || [];
    return {
        pending: rows.filter(r => r.status === 'pending').length,
        processing: rows.filter(r => r.status === 'processing').length,
        done: rows.filter(r => r.status === 'done').length,
        failed: rows.filter(r => r.status === 'failed').length,
        nextAction: rows.find(r => r.status === 'pending'),
    };
}
