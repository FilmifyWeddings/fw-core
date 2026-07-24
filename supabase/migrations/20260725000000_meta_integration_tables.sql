-- Migration: Fix Postgres Error 42830 for Meta Integration Tables (fb_page_configs & fb_lead_forms)

CREATE TABLE IF NOT EXISTS public.fb_page_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id TEXT,
    page_id TEXT UNIQUE NOT NULL,
    page_name TEXT NOT NULL,
    page_category TEXT,
    page_access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure UNIQUE constraint on fb_page_configs(page_id) if table existed prior
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fb_page_configs_page_id_key'
    ) THEN
        ALTER TABLE public.fb_page_configs ADD CONSTRAINT fb_page_configs_page_id_key UNIQUE (page_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create fb_lead_forms referencing fb_page_configs(page_id)
CREATE TABLE IF NOT EXISTS public.fb_lead_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id TEXT,
    page_id TEXT REFERENCES public.fb_page_configs(page_id) ON DELETE CASCADE,
    form_id TEXT UNIQUE NOT NULL,
    form_name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    leads_count INT DEFAULT 0,
    created_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and Grant Access
ALTER TABLE public.fb_page_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_lead_forms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access on fb_page_configs'
    ) THEN
        CREATE POLICY "Allow service role full access on fb_page_configs" ON public.fb_page_configs FOR ALL USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow service role full access on fb_lead_forms'
    ) THEN
        CREATE POLICY "Allow service role full access on fb_lead_forms" ON public.fb_lead_forms FOR ALL USING (true);
    END IF;
END $$;
