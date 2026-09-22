-- Migration: 20260925_team_manager_all_history_and_audit.sql
-- Description: Ensures fw_project_activity_logs table exists and is fully equipped for Workspace-wide Team Manager History & Audit logging.

-- 1. Create table if not already existing
CREATE TABLE IF NOT EXISTS public.fw_project_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    sub_event_id UUID,
    workspace_id UUID,
    project_name TEXT,
    actor_id UUID,
    actor_name TEXT NOT NULL,
    actor_role TEXT,
    actor_avatar TEXT,
    action_type TEXT NOT NULL,
    event_title TEXT,
    target_member_id UUID,
    target_member_name TEXT,
    target_member_avatar TEXT,
    target_role TEXT,
    description TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add any missing columns dynamically if table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'workspace_id') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN workspace_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'project_name') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN project_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'target_member_id') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN target_member_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'target_member_name') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN target_member_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'target_member_avatar') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN target_member_avatar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'target_role') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN target_role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fw_project_activity_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.fw_project_activity_logs ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fw_pal_project_id ON public.fw_project_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_fw_pal_workspace_id ON public.fw_project_activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_pal_created_at ON public.fw_project_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fw_pal_target_member_id ON public.fw_project_activity_logs(target_member_id);
CREATE INDEX IF NOT EXISTS idx_fw_pal_action_type ON public.fw_project_activity_logs(action_type);

-- 4. Enable RLS and create permissive policy for authenticated workspace members
ALTER TABLE public.fw_project_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_project_activity_logs' AND policyname = 'Allow all access to fw_project_activity_logs') THEN
        CREATE POLICY "Allow all access to fw_project_activity_logs" ON public.fw_project_activity_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
