-- ==============================================================================
-- WORKSPACE QUOTATION SETTINGS & DELIVERABLES MIGRATION
-- Workspace Isolation & Row Level Security (RLS) Active
-- ==============================================================================

-- 1. Create workspace_quotation_settings table
CREATE TABLE IF NOT EXISTS public.workspace_quotation_settings (
    workspace_id UUID PRIMARY KEY,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.workspace_quotation_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for workspace_quotation_settings
DROP POLICY IF EXISTS "Users can view their workspace quotation settings" ON public.workspace_quotation_settings;
CREATE POLICY "Users can view their workspace quotation settings"
ON public.workspace_quotation_settings FOR SELECT
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert their workspace quotation settings" ON public.workspace_quotation_settings;
CREATE POLICY "Users can insert their workspace quotation settings"
ON public.workspace_quotation_settings FOR INSERT
WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their workspace quotation settings" ON public.workspace_quotation_settings;
CREATE POLICY "Users can update their workspace quotation settings"
ON public.workspace_quotation_settings FOR UPDATE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their workspace quotation settings" ON public.workspace_quotation_settings;
CREATE POLICY "Users can delete their workspace quotation settings"
ON public.workspace_quotation_settings FOR DELETE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));
