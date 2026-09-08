-- Migration: Dynamic custom segments and category configuration for Post-Production
-- Date: 2026-09-08

-- 1. Support dynamic custom segments and enabled categories on deliverables
ALTER TABLE public.post_production_deliverables 
ADD COLUMN IF NOT EXISTS segment_order INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- 2. Store project-level post-production section configuration (enabled segments/categories)
CREATE TABLE IF NOT EXISTS public.post_production_project_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.fw_projects(id) ON DELETE CASCADE,
    enabled_segments JSONB DEFAULT '["Wedding"]'::jsonb, -- Array of active segment names
    disabled_categories JSONB DEFAULT '{}'::jsonb,      -- e.g. {"Wedding": ["Albums"], "Pre-Wedding": ["Videos"]}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_project_post_config UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_pp_project_config ON public.post_production_project_config(project_id);

-- RLS
ALTER TABLE public.post_production_project_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages post config" ON public.post_production_project_config;
CREATE POLICY "Owner manages post config" 
ON public.post_production_project_config FOR ALL TO authenticated 
USING (true) WITH CHECK (true);
