-- ============================================================
-- WA INSTANCE STATUS & ALERTS
-- Enhances baileys_sessions with richer status tracking and
-- adds a wa_instance_alerts table for real-time user alerts.
-- ============================================================

-- 1. Add 'expired' to connection state enum
DO $$ BEGIN
  ALTER TYPE baileys_conn_state ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add columns for richer status tracking
ALTER TABLE baileys_sessions
  ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_info TEXT,
  ADD COLUMN IF NOT EXISTS reconnect_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS browser_info TEXT DEFAULT 'Ubuntu, Chrome, 20.0.0';

-- 3. Instance alerts table for real-time user notifications
CREATE TABLE IF NOT EXISTS wa_instance_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,
  alert_type       TEXT NOT NULL CHECK (alert_type IN ('disconnected', 'reconnected', 'qr_expired', 'session_expired', 'error')),
  message          TEXT NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  metadata         JSONB DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_wa_alerts_unread
  ON wa_instance_alerts (workspace_id, is_read, created_at DESC);

-- RLS
ALTER TABLE wa_instance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own alerts"
  ON wa_instance_alerts FOR SELECT
  USING (workspace_id = auth.uid());
CREATE POLICY "Users can update own alerts"
  ON wa_instance_alerts FOR UPDATE
  USING (workspace_id = auth.uid());
CREATE POLICY "Service role can insert alerts"
  ON wa_instance_alerts FOR INSERT
  WITH CHECK (true);

-- Grant service_role bypass
CREATE POLICY "Service role full access alerts"
  ON wa_instance_alerts
  USING (true)
  WITH CHECK (true);

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE wa_instance_alerts;

-- 4. Enable realtime for baileys_sessions (for navbar badge)
ALTER PUBLICATION supabase_realtime ADD TABLE baileys_sessions;

-- 5. Index for admin instance listing
CREATE INDEX IF NOT EXISTS idx_baileys_sessions_conn_state
  ON baileys_sessions (conn_state, updated_at DESC);
