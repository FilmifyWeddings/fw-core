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

import { supabaseAdmin } from './supabase.js';

// ── Configuration Constants ───────────────────────────────────────────────────
const MAX_RETRIES = 5;            // After 5 attempts → permanently FAILED
const BASE_DELAY_MS = 15_000;     // 15 seconds base backoff delay
const BACKOFF_MULTIPLIER = 4;     // Exponential factor (4x per retry)
const JITTER_CAP_MS = 5_000;      // Random jitter ceiling (0–5s, prevents thundering herd)
const PROCESSING_LOCK_TTL_MS = 60_000; // 60s lock timeout (prevents zombie locks)
const WA_MIN_DELAY_MS = 10_000;   // Law 5: minimum 10s between WhatsApp messages
const WA_MAX_DELAY_MS = 30_000;   // Law 5: maximum 30s between WhatsApp messages

// ── Types ─────────────────────────────────────────────────────────────────────
export interface QueueAction {
  id: string;
  workspace_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  priority: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  attempt_count: number;
  failure_reason?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface ProcessorResult {
  success: boolean;
  skipped?: boolean;
  waMessageId?: string | null;
  error?: string;
}

export type ProcessOutcome = 'done' | 'failed' | 'skipped' | 'noop';

// Action handler function signature — implemented by the worker
export type ActionHandler = (action: QueueAction) => Promise<ProcessorResult>;

// ── In-memory workspace processing locks ─────────────────────────────────────
// Prevents concurrent processing of the same workspace's queue
const workspaceLocks = new Map<string, number>(); // workspace_id → lock expiry timestamp

function acquireLock(workspaceId: string): boolean {
  const now = Date.now();
  const existingLock = workspaceLocks.get(workspaceId);
  if (existingLock && existingLock > now) {
    return false; // Workspace is already being processed
  }
  workspaceLocks.set(workspaceId, now + PROCESSING_LOCK_TTL_MS);
  return true;
}

function releaseLock(workspaceId: string): void {
  workspaceLocks.delete(workspaceId);
}

// ── Exponential Backoff Calculator ────────────────────────────────────────────
/**
 * Computes the next retry timestamp using exponential backoff with jitter.
 *
 * @param attemptCount - Number of attempts already made (0-indexed)
 * @returns ISO timestamp of when the next retry should be attempted
 */
export function computeNextRetryAt(attemptCount: number): string {
  const jitter = Math.floor(Math.random() * JITTER_CAP_MS);
  const delayMs = BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount) + jitter;
  const nextRetryAt = new Date(Date.now() + delayMs);
  return nextRetryAt.toISOString();
}

/**
 * Returns a human-readable description of the current backoff delay.
 */
export function describeBackoff(attemptCount: number): string {
  const delayMs = BASE_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount);
  if (delayMs < 60_000) return `${Math.round(delayMs / 1000)}s`;
  if (delayMs < 3_600_000) return `${Math.round(delayMs / 60_000)}min`;
  return `${Math.round(delayMs / 3_600_000)}h`;
}

// ── Anti-ban WhatsApp Delay (Law 5) ──────────────────────────────────────────
/**
 * Waits a configurable delay between WhatsApp message dispatches.
 * Defaults to a randomized 10-30s delay. Can be overridden via action payload.delayMs.
 * Prevents account banning from bulk sending patterns.
 */
export async function applyWhatsAppRateLimit(customDelayMs?: number): Promise<void> {
  const delay = customDelayMs ?? (WA_MIN_DELAY_MS + Math.floor(Math.random() * (WA_MAX_DELAY_MS - WA_MIN_DELAY_MS)));
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Safely cancels a queue item without ever getting trapped in 'processing' if the
 * live DB CHECK constraint rejects status = 'cancelled'. Falls back to deleting
 * the obsolete queue row cleanly.
 */
async function cancelOrDeleteQueueAction(actionId: string, reason: string): Promise<void> {
  const { error: cancelErr } = await supabaseAdmin
    .from('baileys_action_queue')
    .update({
      status: 'cancelled',
      error_message: reason,
      failure_reason: reason,
      processed_at: new Date().toISOString(),
    })
    .eq('id', actionId);

  if (cancelErr) {
    console.warn(`[QueueProcessor] Update to 'cancelled' rejected for ${actionId} (${cancelErr.message}). Deleting obsolete queue row...`);
    const { error: delErr } = await supabaseAdmin
      .from('baileys_action_queue')
      .delete()
      .eq('id', actionId);

    if (delErr) {
      console.error(`[QueueProcessor] Failed to delete obsolete action ${actionId}:`, delErr.message);
    }
  }
}

// ── Core Queue Processing Engine ──────────────────────────────────────────────
/**
 * Processes a single action from the queue with full error handling,
 * retry logic, and failure_reason logging.
 *
 * @param action - The queue action to process
 * @param handler - The function that actually executes the action (WhatsApp socket, etc.)
 */
export async function processQueueAction(
  action: QueueAction,
  handler: ActionHandler
): Promise<ProcessOutcome> {
  const { id, workspace_id, attempt_count } = action;
  const newAttemptCount = attempt_count + 1;

  // ── Step 1: Mark as PROCESSING (optimistic lock in DB) ────────────────────
  const { data: claimedRows, error: lockError } = await supabaseAdmin
    .from('baileys_action_queue')
    .update({
      status: 'processing',
      attempt_count: newAttemptCount,
      processed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending') // Only claim if still pending (prevents race conditions)
    .select('id');           // Returns the row only if the update affected it

  if (lockError) {
    console.error(`[QueueProcessor] Failed to claim action ${id}:`, lockError.message);
    return 'noop';
  }

  // If 0 rows returned, another processor already claimed this action — skip it
  if (!claimedRows || claimedRows.length === 0) {
    console.warn(`[QueueProcessor] Action ${id} already claimed by another processor — skipping.`);
    return 'noop';
  }

  // ── Step 2: Skip cancelled actions ────────────────────────────────────────
  const { data: recheckStatus } = await supabaseAdmin
    .from('baileys_action_queue')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (!recheckStatus || recheckStatus.status === 'cancelled') {
    await supabaseAdmin.from('live_logs').insert({
      workspace_id,
      event_type: 'queue_action_skipped',
      message: `⏭️ Action ${action.action_type} [${id}] was cancelled — skipping.`,
      metadata: { action_id: id, action_type: action.action_type },
    });
    return 'skipped';
  }

  // ── Step 2.5: Pre-Flight Integrity Check (Never dispatch to deleted/stopped/already-sent logs) ──
  const p = (action.payload || {}) as Record<string, any>;
  const wfLogId = p.workflowLogId || p.logId;
  const leadId = p.leadId || p.lead_id;

  if (wfLogId) {
    const { data: wfLog, error: wfLogErr } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, status, error_message')
      .eq('id', wfLogId)
      .maybeSingle();

    if (!wfLogErr) {
      const isAlreadySent = wfLog && ['sent', 'delivered', 'read'].includes(wfLog.status);
      const isStoppedOrCancelled =
        !wfLog ||
        wfLog.status === 'stopped' ||
        wfLog.status === 'cancelled' ||
        wfLog.error_message === 'STOPPED' ||
        wfLog.error_message === 'Cancelled by user stop action.';

      if (isStoppedOrCancelled || isAlreadySent) {
        const reason = !wfLog
          ? 'Workflow log deleted'
          : isAlreadySent
            ? `Workflow log already ${wfLog.status}`
            : 'Workflow log stopped or cancelled';
        console.warn(`[QueueProcessor] Action ${id} workflow log ${wfLogId}: ${reason}. Skipping.`);
        await cancelOrDeleteQueueAction(id, reason);
        return 'skipped';
      }
    }
  }

  if (leadId) {
    const { data: leadCheck, error: leadCheckErr } = await supabaseAdmin
      .from('leads')
      .select('id, raw_payload')
      .eq('id', leadId)
      .maybeSingle();

    if (!leadCheckErr && !leadCheck) {
      console.warn(`[QueueProcessor] Action ${id} lead ${leadId} was deleted from CRM. Cancelling dispatch.`);
      await cancelOrDeleteQueueAction(id, 'Lead was deleted from CRM');
      return 'skipped';
    }

    const leadRaw = (leadCheck as any)?.raw_payload;
    if (leadRaw?.stop_followup === true || leadRaw?.workflow_status === 'stopped') {
      console.warn(`[QueueProcessor] Action ${id} lead ${leadId} follow-up stopped in CRM. Skipping.`);
      await cancelOrDeleteQueueAction(id, 'Lead follow-up stopped in CRM');
      return 'skipped';
    }
  }

  try {
    // ── Step 3: Execute the action via the provided handler ──────────────────
    const result = await handler(action);

    if (!result.success) {
      throw new Error(result.error || 'Handler returned failure without error message');
    }

    // If handler skipped execution cleanly (e.g. stopped lead/workflow), do NOT mark as 'done' or 'sent'
    if (result.skipped) {
      return 'skipped';
    }

    // ── Step 4: Mark as DONE ─────────────────────────────────────────────────
    // The handler (executeAction) may have already written 'done' to the DB as an
    // ACID guarantee immediately after sock.sendMessage succeeded. Check first.
    const { data: currentRow } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (currentRow && currentRow.status !== 'done') {
      await supabaseAdmin
        .from('baileys_action_queue')
        .update({
          status: 'done',
          result_message_id: result.waMessageId ?? null,
          failure_reason: null,
        })
        .eq('id', id);
    }

    if (wfLogId) {
      try {
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wfLogId);
      } catch (logErr) {
        console.warn(`[QueueProcessor] Failed to update workflow log sent status:`, logErr);
      }
    }

    // Log success to live_logs
    await supabaseAdmin.from('live_logs').insert({
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

    return 'done';
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);

    const isTransientError =
      errMsg.includes('[Transient Socket Error') ||
      errMsg.includes('428') ||
      errMsg.includes('515') ||
      errMsg.toLowerCase().includes('connection closed') ||
      errMsg.toLowerCase().includes('not connected') ||
      errMsg.toLowerCase().includes('timed out') ||
      errMsg.toLowerCase().includes('timeout') ||
      errMsg.toLowerCase().includes('socket closed') ||
      errMsg.toLowerCase().includes('socket is closed') ||
      errMsg.toLowerCase().includes('econnreset') ||
      errMsg.toLowerCase().includes('fetch failed');

    // ── Safe Transient Retry: Give socket time to reconnect without failing message ──
    if (isTransientError && newAttemptCount < MAX_RETRIES) {
      const retryDelayMs = Math.min(60_000, 15_000 * Math.pow(2, newAttemptCount - 1));
      const nextRetryIso = new Date(Date.now() + retryDelayMs).toISOString();

      console.warn(`[QueueProcessor] ⚠️ Transient socket glitch for action ${id}. Retrying ${newAttemptCount}/${MAX_RETRIES} in ${retryDelayMs / 1000}s...`);

      await supabaseAdmin
        .from('baileys_action_queue')
        .update({
          status: 'pending',
          next_retry_at: nextRetryIso,
          failure_reason: `[Attempt ${newAttemptCount}/${MAX_RETRIES}] Retrying in ${retryDelayMs / 1000}s: ${errMsg.slice(0, 120)}`,
        })
        .eq('id', id);

      // Keep workflow log in 'pending' state — DO NOT fail it!
      return 'failed';
    }

    // ── Step 4: Permanent FAILURE (after MAX_RETRIES or non-retriable error) ────
    await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'failed',
        error_message: errMsg,
        failure_reason: `[Attempt ${newAttemptCount}/${MAX_RETRIES}] ${errMsg}`,
        next_retry_at: null,
      })
      .eq('id', id);

    if (wfLogId) {
      try {
        await supabaseAdmin
          .from('whatsapp_workflow_logs')
          .update({
            status: 'failed',
            error_message: errMsg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wfLogId);
      } catch (logErr) {
        console.warn(`[QueueProcessor] Failed to update workflow log failed status:`, logErr);
      }
    }

    // Log failure to live_logs
    await supabaseAdmin.from('live_logs').insert({
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

    console.error(
      `[QueueProcessor] ❌ FAILED — Action ${id} (${action.action_type}) failed at attempt ${newAttemptCount}. ` +
      `Status set to 'failed'. Manual retry required. Error: ${errMsg}`
    );
    return 'failed';
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
export async function drainQueue(
  workspaceId: string,
  handler: ActionHandler,
  batchSize = 5
): Promise<void> {
  if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
    return;
  }

  // Acquire workspace-level processing lock
  if (!acquireLock(workspaceId)) {
    return; // Another drain cycle is already running for this workspace
  }

  try {
    // Pre-flight check: if workspace session is disconnected, pause dispatches
    const { data: session } = await supabaseAdmin
      .from('baileys_sessions')
      .select('conn_state, status')
      .or(`workspace_id.eq.${workspaceId},user_id.eq.${workspaceId}`)
      .maybeSingle();

    if (session?.conn_state !== 'open' && session?.status !== 'open' && session?.status !== 'CONNECTED') {
      console.warn(`[QueueProcessor] ⏸️ WhatsApp session is not open for workspace ${workspaceId} (conn_state: ${session?.conn_state ?? 'none'}, status: ${session?.status ?? 'none'}) — pausing queue dispatches.`);
      return;
    }

    const now = new Date().toISOString();
    console.log("Worker polling at", now);

    // Fetch pending actions that are due (respects priority, scheduled time, and backoff)
    const { data: actions, error } = await supabaseAdmin
      .from('baileys_action_queue')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`) // Due for processing
      .order('priority', { ascending: true }) // High priority (e.g. Welcome / manual retry) first
      .order('next_retry_at', { ascending: true, nullsFirst: true }) // Earliest scheduled / most overdue first
      .order('created_at', { ascending: true }) // FIFO tie-breaker within same priority & time
      .limit(batchSize);

    if (error) {
      console.error(`[QueueProcessor] Poll error for workspace ${workspaceId}:`, error.message);
      return;
    }

    const tasksCount = actions ? actions.length : 0;
    console.log("Found pending tasks:", tasksCount);

    if (!actions || actions.length === 0) return; // Nothing to process

    console.log(`[QueueProcessor] 🎯 Processing ${actions.length} actions for workspace ${workspaceId}`);

    let needsCooldown = false;
    let lastDelayMs: number | undefined;

    // Process actions sequentially (not parallel) to respect WhatsApp rate limits
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i] as QueueAction;
      const isWhatsAppAction = [
        'send_text',
        'send_image',
        'send_video',
        'send_document',
        'send_audio',
        'send_media',
        'send_template',
        'send_poll',
        'send_buttons',
        'group_dispatch',
        'group_lead_alert',
      ].includes(action.action_type);

      // Sleep ONLY before a subsequent WhatsApp send if an earlier action in this batch actually dispatched
      if (needsCooldown && isWhatsAppAction) {
        await applyWhatsAppRateLimit(lastDelayMs);
        needsCooldown = false;
        lastDelayMs = undefined;
      }

      // Skip cancelled items without sleeping
      const { data: skipCheck } = await supabaseAdmin
        .from('baileys_action_queue')
        .select('status')
        .eq('id', action.id)
        .maybeSingle();
      if (!skipCheck || skipCheck.status === 'cancelled') continue;

      const outcome = await processQueueAction(action, handler);

      if (outcome === 'done' && isWhatsAppAction) {
        needsCooldown = true;
        const userDelayMs = (action.payload as any)?.delayMs;
        lastDelayMs = userDelayMs ? Number(userDelayMs) : undefined;
      }
    }

  } finally {
    releaseLock(workspaceId); // Always release lock, even on unhandled errors
  }
}

// ── Retry-Due Action Sweeper ──────────────────────────────────────────────────
/**
 * Sweeps the queue to find orphaned 'processing' actions (worker crashed/constraint error)
 * and either removes obsolete/stopped rows, fails exhausted rows (>= MAX_RETRIES),
 * or resets retriable rows to 'pending'.
 *
 * Run this on a slower interval (e.g. every 60 seconds).
 *
 * @param workspaceId - Workspace to sweep
 */
export async function sweepExpiredRetries(workspaceId: string): Promise<number> {
  if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
    return 0;
  }

  // Safety net for orphaned 'processing' rows (worker crashed or update failed mid-action)
  const STUCK_PROCESSING_TIMEOUT = new Date(Date.now() - PROCESSING_LOCK_TTL_MS * 2).toISOString();

  const { data: stuckActions, error } = await supabaseAdmin
    .from('baileys_action_queue')
    .select('id, attempt_count, failure_reason, payload')
    .eq('workspace_id', workspaceId)
    .eq('status', 'processing')
    .lt('processed_at', STUCK_PROCESSING_TIMEOUT); // Stuck for >2x lock TTL

  if (error || !stuckActions || stuckActions.length === 0) return 0;

  // Inspect referenced workflow logs so deleted/stopped/already-sent rows never loop or get flipped to 'failed'
  const wfLogIds = Array.from(
    new Set(
      stuckActions
        .map((a: any) => a?.payload?.workflowLogId || a?.payload?.logId)
        .filter((v: any) => typeof v === 'string' && v.length > 0)
    )
  );

  const wfLogMap = new Map<string, { id: string; status: string; error_message: string | null }>();
  let wfLogsFetchOk = true;
  if (wfLogIds.length > 0) {
    const { data: wfLogs, error: wfLogsErr } = await supabaseAdmin
      .from('whatsapp_workflow_logs')
      .select('id, status, error_message')
      .in('id', wfLogIds);
    if (wfLogsErr) {
      wfLogsFetchOk = false;
      console.warn('[QueueProcessor] Sweeper workflow log lookup warning:', wfLogsErr.message);
    } else {
      for (const l of wfLogs || []) {
        wfLogMap.set(l.id, l as any);
      }
    }
  }

  const obsoleteActions: Array<{ id: string; reason: string }> = [];
  const exhaustedIds: string[] = [];
  const retriableIds: string[] = [];

  for (const a of stuckActions as any[]) {
    const wfLogId = a?.payload?.workflowLogId || a?.payload?.logId;
    if (wfLogId && wfLogsFetchOk) {
      const wfLog = wfLogMap.get(wfLogId);
      if (!wfLog) {
        obsoleteActions.push({ id: a.id, reason: 'Sweeper cleanup: workflow log deleted' });
        continue;
      }
      if (['sent', 'delivered', 'read'].includes(wfLog.status)) {
        obsoleteActions.push({ id: a.id, reason: `Sweeper cleanup: workflow log already ${wfLog.status}` });
        continue;
      }
      if (
        wfLog.status === 'stopped' ||
        wfLog.status === 'cancelled' ||
        wfLog.error_message === 'STOPPED' ||
        wfLog.error_message === 'Cancelled by user stop action.'
      ) {
        obsoleteActions.push({ id: a.id, reason: 'Sweeper cleanup: workflow log stopped/cancelled' });
        continue;
      }
    }

    if ((a.attempt_count || 0) >= MAX_RETRIES) {
      exhaustedIds.push(a.id);
    } else {
      retriableIds.push(a.id);
    }
  }

  let handledCount = 0;

  for (const obs of obsoleteActions) {
    await cancelOrDeleteQueueAction(obs.id, obs.reason);
    handledCount++;
  }

  if (exhaustedIds.length > 0) {
    const failMsg = `Worker timed out after ${MAX_RETRIES} attempts. Marked failed by sweeper.`;
    const { error: failErr } = await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'failed',
        error_message: failMsg,
        failure_reason: failMsg,
        next_retry_at: null,
      })
      .in('id', exhaustedIds);

    if (failErr) {
      console.error('[QueueProcessor] Sweeper fail update error:', failErr.message);
    } else {
      handledCount += exhaustedIds.length;
      console.warn(`[QueueProcessor] ❌ Sweeper permanently failed ${exhaustedIds.length} exhausted stuck actions (>= ${MAX_RETRIES} attempts) for workspace ${workspaceId}`);
    }
  }

  if (retriableIds.length > 0) {
    const { error: resetError } = await supabaseAdmin
      .from('baileys_action_queue')
      .update({
        status: 'pending',
        failure_reason: 'Worker process crashed or timed out. Auto-recovered by sweeper.',
        next_retry_at: computeNextRetryAt(1),
      })
      .in('id', retriableIds);

    if (resetError) {
      console.error('[QueueProcessor] Sweeper reset error:', resetError.message);
    } else {
      handledCount += retriableIds.length;
      console.warn(`[QueueProcessor] 🧹 Sweeper recovered ${retriableIds.length} retriable stuck actions for workspace ${workspaceId}`);
    }
  }

  return handledCount;
}

// ── Queue Statistics Helper ───────────────────────────────────────────────────
/**
 * Returns queue health metrics for the admin dashboard.
 */
export async function getQueueStats(workspaceId: string): Promise<{
  pending: number;
  processing: number;
  done: number;
  failed: number;
  nextAction?: { action_type: string; next_retry_at: string | null };
}> {
  if (!workspaceId || workspaceId.trim() === '' || workspaceId === 'null' || workspaceId === 'undefined') {
    return { pending: 0, processing: 0, done: 0, failed: 0 };
  }
  const { data } = await supabaseAdmin
    .from('baileys_action_queue')
    .select('status, action_type, next_retry_at')
    .eq('workspace_id', workspaceId);

  const rows = data || [];
  return {
    pending: rows.filter((r: any) => r.status === 'pending').length,
    processing: rows.filter((r: any) => r.status === 'processing').length,
    done: rows.filter((r: any) => r.status === 'done').length,
    failed: rows.filter((r: any) => r.status === 'failed').length,
    nextAction: rows.find((r: any) => r.status === 'pending'),
  };
}
