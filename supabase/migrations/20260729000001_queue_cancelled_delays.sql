-- ============================================================
-- QUEUE: Add cancelled status & user-configurable delay support
-- ============================================================

-- 1. Add 'cancelled' as a valid status for baileys_action_queue
ALTER TABLE baileys_action_queue
  DROP CONSTRAINT IF EXISTS baileys_action_queue_status_check;

ALTER TABLE baileys_action_queue
  ADD CONSTRAINT baileys_action_queue_status_check
  CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled'));

-- 2. Add skippable / cancelled indexes
CREATE INDEX IF NOT EXISTS idx_baileys_queue_cancelled
  ON baileys_action_queue (workspace_id) WHERE status = 'cancelled';

-- 3. Allow 'cancelled' as queue action type (for skipping)
-- No enum change needed — action_type is TEXT in the constraint

-- 4. Add index for bulk resend queries (date range + status)
CREATE INDEX IF NOT EXISTS idx_baileys_queue_bulk_resend
  ON baileys_action_queue (workspace_id, created_at, status)
  WHERE status IN ('pending', 'failed');
