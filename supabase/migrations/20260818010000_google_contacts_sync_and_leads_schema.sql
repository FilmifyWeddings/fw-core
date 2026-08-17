-- ====================================================================================
-- MIGRATION: Google Contacts Real-Time Sync, Schema Integrity & Multi-Tenant Logging
-- Date: 18 August 2026
-- Description:
-- 1. Adds explicit Google Contacts columns to public.leads (google_synced, google_contact_id, google_synced_at)
-- 2. Ensures public.integration_credentials supports all provider types without check constraint blocks
-- 3. Ensures public.live_logs supports multi-tenant audit logs with proper indexing
-- 4. Ensures strict Row Level Security (RLS) on all tables
-- ====================================================================================

-- ── 1. LEADS TABLE EXTENSIONS ────────────────────────────────────────────────────────
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS google_synced BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS google_contact_id TEXT,
    ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;

-- Performance Indexes for Leads Table
CREATE INDEX IF NOT EXISTS idx_leads_workspace_google_synced 
    ON public.leads(workspace_id, google_synced);

CREATE INDEX IF NOT EXISTS idx_leads_google_contact_id 
    ON public.leads(google_contact_id);

-- ── 2. INTEGRATION CREDENTIALS EXTENSIONS & REPAIR ───────────────────────────────────
DO $$
BEGIN
    -- Drop old check constraint if it exists to allow distinct Google & WhatsApp providers
    ALTER TABLE public.integration_credentials 
    DROP CONSTRAINT IF EXISTS integration_credentials_provider_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.integration_credentials 
    ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS account_id TEXT,
    ADD COLUMN IF NOT EXISTS scope TEXT,
    ADD COLUMN IF NOT EXISTS token_type TEXT,
    ADD COLUMN IF NOT EXISTS expiry_date BIGINT;

-- Performance Indexes for Integration Credentials
CREATE INDEX IF NOT EXISTS idx_integration_credentials_user_provider 
    ON public.integration_credentials(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_status 
    ON public.integration_credentials(status);

-- ── 3. LIVE ACTIVITY LOGS TABLE INTEGRITY & PERFORMANCE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes for Live Logs
CREATE INDEX IF NOT EXISTS idx_live_logs_workspace_event_created 
    ON public.live_logs(workspace_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_logs_lead_id 
    ON public.live_logs(lead_id);

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_logs ENABLE ROW LEVEL SECURITY;

-- Leads RLS Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leads' 
        AND policyname = 'Tenant leads isolation'
    ) THEN
        CREATE POLICY "Tenant leads isolation" 
            ON public.leads 
            FOR ALL 
            USING (auth.uid() = workspace_id) 
            WITH CHECK (auth.uid() = workspace_id);
    END IF;
END $$;

-- Integration Credentials RLS Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'integration_credentials' 
        AND policyname = 'Users can manage their own credentials'
    ) THEN
        CREATE POLICY "Users can manage their own credentials" 
            ON public.integration_credentials 
            FOR ALL 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Live Logs RLS Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'live_logs' 
        AND policyname = 'Tenant live logs isolation'
    ) THEN
        CREATE POLICY "Tenant live logs isolation" 
            ON public.live_logs 
            FOR ALL 
            USING (auth.uid() = workspace_id) 
            WITH CHECK (auth.uid() = workspace_id);
    END IF;
END $$;
