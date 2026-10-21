-- =========================================================================
-- STUDIOCORE: POST-PRODUCTION CARD AUDIT & CHANGE HISTORY LOGS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.post_production_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT,
    project_id TEXT NOT NULL,
    client_id TEXT,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    actor_avatar TEXT,
    action_type TEXT NOT NULL, -- 'stage_change', 'status_change', 'deliverable_assigned', 'pm_assigned', 'deliverable_added', 'deliverable_deleted', 'note_updated', 'date_changed'
    deliverable_id TEXT,
    deliverable_title TEXT,
    category TEXT,
    segment TEXT,
    title TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for instant 0ms lookups by project card and date
CREATE INDEX IF NOT EXISTS idx_pp_audit_project_id ON public.post_production_audit_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pp_audit_workspace_id ON public.post_production_audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pp_audit_action_type ON public.post_production_audit_logs(action_type);

-- RLS Security Policies
ALTER TABLE public.post_production_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_production_audit_logs' 
      AND policyname = 'Allow authenticated users full access to pp audit logs'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to pp audit logs"
      ON public.post_production_audit_logs FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
