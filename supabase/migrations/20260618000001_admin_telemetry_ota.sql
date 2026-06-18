-- Migration: Create OTA version control and user telemetry metrics tables
-- Strict RLS policies isolation and Super Admin control boundaries applied

-- 1. App Versions Table (OTA engine)
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number TEXT NOT NULL UNIQUE,
    release_notes TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    deployed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Law 1)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to app_versions so frontend client can check active version
CREATE POLICY "Allow public read access to app_versions" 
    ON public.app_versions 
    FOR SELECT 
    USING (true);

-- Allow only Super Admin to insert/update/delete versions directly (checks JWT email)
CREATE POLICY "Super Admins can modify app_versions"
    ON public.app_versions
    FOR ALL
    USING (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com');

-- Enable Supabase Realtime for app_versions table to trigger client guards
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'app_versions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_versions;
    END IF;
END $$;


-- 2. User Telemetry Metrics Table
CREATE TABLE IF NOT EXISTS public.user_telemetry_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    active_sub_apps JSONB NOT NULL DEFAULT '[]'::jsonb,
    r2_storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    last_active_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Law 1)
ALTER TABLE public.user_telemetry_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own telemetry metrics
CREATE POLICY "Users can manage their own telemetry"
    ON public.user_telemetry_metrics
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Super Admins can select all telemetry metrics
CREATE POLICY "Super Admins can view all telemetry"
    ON public.user_telemetry_metrics
    FOR SELECT
    USING (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com');


-- 3. Seed Initial Version
INSERT INTO public.app_versions (version_number, release_notes, is_active)
VALUES ('v1.0.0', 'Initial release of BHAMSTRA Core Operations Platform with Lead Ingestion, WhatsApp Web Socket gateway, and Workspace sync.', true)
ON CONFLICT (version_number) DO NOTHING;
