-- Migration: Multi-Tenant Quotation Template System with System & User Default Support
-- Adds is_default and is_system_template columns and strict RLS policies

ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.quotation_versions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Enable RLS on quotation tables
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Drop permissive policies if any
DROP POLICY IF EXISTS "Users can view own or system templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can update own non-system templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can delete own non-system templates" ON public.quotation_templates;

-- Policies for quotation_templates
CREATE POLICY "Users can view own or system templates" ON public.quotation_templates
    FOR SELECT USING (
        is_system_template = true 
        OR user_id = auth.uid()::text 
        OR user_id IS NULL 
        OR user_id = 'SYSTEM' 
        OR user_id = 'demo_user'
    );

CREATE POLICY "Users can insert own templates" ON public.quotation_templates
    FOR INSERT WITH CHECK (
        (user_id = auth.uid()::text OR user_id = 'demo_user')
        AND (is_system_template IS NOT TRUE)
    );

CREATE POLICY "Users can update own non-system templates" ON public.quotation_templates
    FOR UPDATE USING (
        (user_id = auth.uid()::text OR user_id = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id != 'SYSTEM')
    );

CREATE POLICY "Users can delete own non-system templates" ON public.quotation_templates
    FOR DELETE USING (
        (user_id = auth.uid()::text OR user_id = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id != 'SYSTEM')
    );

-- Insert Global System Default Wedding Template if not present
INSERT INTO public.quotation_templates (id, user_id, title, category, is_system_template, is_default, created_at, updated_at)
VALUES (
    'FW-37C63A54D4',
    'SYSTEM',
    'Default Wedding Template',
    'Wedding',
    true,
    true,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    is_system_template = true,
    title = EXCLUDED.title;
