-- ==============================================================================
-- StudioCore: Post-Production & Client Audit History Database Schema
-- Run this script in the Supabase SQL Editor to enable full date-wise audit logs
-- ==============================================================================

-- 1. Create post_production_audit_logs Table
CREATE TABLE IF NOT EXISTS public.post_production_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    client_id TEXT,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_role TEXT DEFAULT 'Studio Member',
    actor_avatar TEXT,
    action_type TEXT NOT NULL, -- 'status_changed', 'assignee_changed', 'due_date_changed', 'comment_added', 'link_added', etc.
    deliverable_id TEXT,
    deliverable_title TEXT,
    category TEXT,
    segment TEXT,
    title TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_pp_audit_project_id ON public.post_production_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_pp_audit_client_id ON public.post_production_audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_pp_audit_workspace_id ON public.post_production_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pp_audit_created_at ON public.post_production_audit_logs(created_at DESC);

-- Enable RLS & Allow authenticated and service roles
ALTER TABLE public.post_production_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read post_production_audit_logs"
    ON public.post_production_audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert post_production_audit_logs"
    ON public.post_production_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow service_role all post_production_audit_logs"
    ON public.post_production_audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- 2. Create client_audit_logs Table (Universal Client Workspace Audit History)
CREATE TABLE IF NOT EXISTS public.client_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_email TEXT,
    actor_role TEXT DEFAULT 'Studio Member',
    module TEXT NOT NULL, -- 'overview', 'quotations', 'events', 'moodboard', 'tasks', 'post_production', 'finance'
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_audit_client_id ON public.client_audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_workspace_id ON public.client_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_created_at ON public.client_audit_logs(created_at DESC);

ALTER TABLE public.client_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read client_audit_logs"
    ON public.client_audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert client_audit_logs"
    ON public.client_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow service_role all client_audit_logs"
    ON public.client_audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- 3. Add clients_access and client_modules_access columns if not present
ALTER TABLE IF EXISTS public.studio_member_permissions 
ADD COLUMN IF NOT EXISTS clients_access TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS client_modules_access JSONB DEFAULT '["overview","quotations","events","moodboard","tasks","post_production","finance"]'::jsonb;

ALTER TABLE IF EXISTS public.member_permissions 
ADD COLUMN IF NOT EXISTS clients_access TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS client_modules_access JSONB DEFAULT '["overview","quotations","events","moodboard","tasks","post_production","finance"]'::jsonb;
