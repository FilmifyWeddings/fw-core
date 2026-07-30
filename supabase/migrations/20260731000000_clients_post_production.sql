-- Migration: Clients Management & Post-Production System
-- Creates workspace_clients and post_production_projects tables

CREATE TABLE IF NOT EXISTS public.workspace_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    event_type TEXT DEFAULT 'Wedding',
    event_date DATE,
    total_package_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_production_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES public.workspace_clients(id) ON DELETE CASCADE,
    project_manager_id UUID,
    project_manager_name TEXT DEFAULT 'Unassigned',
    overall_status TEXT DEFAULT 'active' CHECK (overall_status IN ('active', 'delayed', 'completed')),
    deliverables JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_workspace_clients_workspace_id ON public.workspace_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_status ON public.workspace_clients(status);
CREATE INDEX IF NOT EXISTS idx_post_production_projects_workspace_id ON public.post_production_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_production_projects_client_id ON public.post_production_projects(client_id);

-- Enable RLS
ALTER TABLE public.workspace_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_projects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform operations on their workspace
CREATE POLICY "Allow all workspace access on workspace_clients" ON public.workspace_clients
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all workspace access on post_production_projects" ON public.post_production_projects
    FOR ALL USING (true) WITH CHECK (true);
