-- ============================================================
-- BRAHMASTRA QUEUE RESILIENCE MIGRATION
-- Migration: 20260618000003_queue_resilience.sql
-- Law 3 Compliance: Adds retry/backoff columns to queue tables
-- ============================================================

-- ── ADD RESILIENCE COLUMNS TO baileys_action_queue ────────────────────────────

-- failure_reason: stores the exact error string from the last failed attempt
ALTER TABLE public.baileys_action_queue
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- next_retry_at: timestamp for when exponential backoff retry should fire
ALTER TABLE public.baileys_action_queue
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- processed_at: when the worker last touched this action (for stuck-action detection)
-- (may already exist in some environments; IF NOT EXISTS guard handles it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'baileys_action_queue' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.baileys_action_queue ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;
END$$;

-- ── INDEXING FOR RETRY SWEEPER ────────────────────────────────────────────────

-- Index for drainQueue: pending + due for processing (next_retry_at ≤ now OR null)
CREATE INDEX IF NOT EXISTS idx_baileys_queue_retry_due
  ON public.baileys_action_queue(workspace_id, next_retry_at NULLS FIRST, priority)
  WHERE status = 'pending';

-- Index for sweepExpiredRetries: stuck processing rows (worker crash recovery)
CREATE INDEX IF NOT EXISTS idx_baileys_queue_stuck_processing
  ON public.baileys_action_queue(workspace_id, processed_at)
  WHERE status = 'processing';

-- ── ADD RESILIENCE COLUMNS TO queue_messages (WhastBoost drip engine) ─────────

-- failure_reason column for the WhatsApp drip queue
ALTER TABLE public.queue_messages
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- next_retry_at for exponential backoff in drip message retries
ALTER TABLE public.queue_messages
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Index for drip queue polling (respects next_retry_at backoff)
CREATE INDEX IF NOT EXISTS idx_queue_messages_retry_due
  ON public.queue_messages(workspace_id, next_retry_at NULLS FIRST, scheduled_for)
  WHERE status IN ('pending', 'failed');

-- ── EXTEND status CHECK CONSTRAINTS ──────────────────────────────────────────
-- Add 'retrying' as a valid status for visibility in UI dashboards

-- For baileys_action_queue: already has CHECK constraint
-- We cannot easily ALTER a CHECK constraint in PostgreSQL without dropping it.
-- Instead, we use a separate audit column to signal retry state via failure_reason.
-- The 'pending' status IS used for retrying (reset by processor after failure).
-- This is intentional: simplicity over complexity.

-- ── GRANT SERVICE ROLE FULL ACCESS (for sweeper background job) ───────────────
-- Service role policy already exists on baileys_action_queue from prior migration.
-- The new columns are automatically covered by the existing FOR ALL policy.

-- ── USEFUL ADMIN QUERY: Queue Health Dashboard ────────────────────────────────
-- Run in Supabase SQL Editor to see queue health per workspace:
--
-- SELECT
--   workspace_id,
--   status,
--   COUNT(*) AS count,
--   AVG(attempt_count) AS avg_attempts,
--   MAX(attempt_count) AS max_attempts,
--   MIN(next_retry_at) AS soonest_retry
-- FROM public.baileys_action_queue
-- GROUP BY workspace_id, status
-- ORDER BY workspace_id, status;
