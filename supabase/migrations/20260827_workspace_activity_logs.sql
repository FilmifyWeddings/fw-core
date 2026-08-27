-- =========================================================================
-- WORKSPACE AUDIT & ACTIVITY LOGS SYSTEM
-- Logs every action, change, edit, and assignment by date, time & team member
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.workspace_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(100),
  module VARCHAR(100) NOT NULL, -- 'LEADS', 'TEAM_MANAGER', 'QUOTATIONS', 'FINANCE', 'TEAM', 'SETTINGS'
  action VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for rapid real-time audit queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_ws ON public.workspace_activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.workspace_activity_logs(workspace_id, module, created_at DESC);

-- Enable RLS
ALTER TABLE public.workspace_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read workspace_activity_logs" ON public.workspace_activity_logs;
    CREATE POLICY "Allow authenticated read workspace_activity_logs"
      ON public.workspace_activity_logs FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "Allow authenticated insert workspace_activity_logs" ON public.workspace_activity_logs;
    CREATE POLICY "Allow authenticated insert workspace_activity_logs"
      ON public.workspace_activity_logs FOR INSERT
      TO authenticated
      WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    -- Continue safely
END $$;
