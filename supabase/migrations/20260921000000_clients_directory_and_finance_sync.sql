-- Migration: Clients Directory, Status & Finance Rollover Sync
-- Adds missing columns and indexes to workspace_clients and ensures schema consistency

-- 1. Ensure columns on workspace_clients
ALTER TABLE public.workspace_clients 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    ADD COLUMN IF NOT EXISTS project_manager_id UUID,
    ADD COLUMN IF NOT EXISTS project_manager_name TEXT,
    ADD COLUMN IF NOT EXISTS project_manager_email TEXT,
    ADD COLUMN IF NOT EXISTS project_manager_phone TEXT;

-- 2. Performance indexes for fast querying and portal lookups
CREATE INDEX IF NOT EXISTS idx_workspace_clients_status ON public.workspace_clients(status);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_pm_id ON public.workspace_clients(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_workspace_id ON public.workspace_clients(workspace_id);
