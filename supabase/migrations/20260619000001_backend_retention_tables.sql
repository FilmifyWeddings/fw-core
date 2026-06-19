-- Migration: Backend Retention Tables & 3-Tier Multi-Tenancy Architecture
-- Enforces data isolation and permanent storage lock (Law 1 & Mandate Compliance)

-- 1. Tenant Storage Tiers table
CREATE TABLE IF NOT EXISTS public.tenant_storage_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    allowed_storage_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB default
    used_storage_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Law 1)
ALTER TABLE public.tenant_storage_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant storage tiers isolation" ON public.tenant_storage_tiers;
CREATE POLICY "Tenant storage tiers isolation" ON public.tenant_storage_tiers
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);


-- 2. Client Quotations table (Client/Project Level)
CREATE TABLE IF NOT EXISTS public.client_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_id UUID NOT NULL, -- References lead/client entity
    event_structures JSONB NOT NULL DEFAULT '[]'::jsonb, -- Multi-day events structures
    deliverables_count INTEGER NOT NULL DEFAULT 0,
    template_choice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for fast project queries
CREATE INDEX IF NOT EXISTS idx_client_quotations_tenant_client ON public.client_quotations(tenant_id, client_id);

-- Enable RLS (Law 1)
ALTER TABLE public.client_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant client quotations isolation" ON public.client_quotations;
CREATE POLICY "Tenant client quotations isolation" ON public.client_quotations
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);


-- 3. Client Comments / Audits table (Team/Author Level)
CREATE TABLE IF NOT EXISTS public.client_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_id UUID NOT NULL, -- References lead/client entity
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Author of comment
    comment_text TEXT NOT NULL,
    alert_flag BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for fast comment queries
CREATE INDEX IF NOT EXISTS idx_client_comments_tenant_client ON public.client_comments(tenant_id, client_id);

-- Enable RLS (Law 1)
ALTER TABLE public.client_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant client comments isolation" ON public.client_comments;
CREATE POLICY "Tenant client comments isolation" ON public.client_comments
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);


-- 4. Team Tasks table (Team/Author Level)
CREATE TABLE IF NOT EXISTS public.team_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_id UUID NOT NULL, -- References lead/client entity
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Assigned Team Member
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    overdue_alert BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for fast task allocation queries
CREATE INDEX IF NOT EXISTS idx_team_tasks_tenant_client ON public.team_tasks(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_to ON public.team_tasks(assigned_to);

-- Enable RLS (Law 1)
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant team tasks isolation" ON public.team_tasks;
CREATE POLICY "Tenant team tasks isolation" ON public.team_tasks
    FOR ALL USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);
