-- Migration: Multi-Tenant Quotation Template System (Lightweight Zero-Lock Version)
-- Executed instantly without heavy table column alterations

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

-- Drop old policies if any
DROP POLICY IF EXISTS "Users can view own or system templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can update own non-system templates" ON public.quotation_templates;
DROP POLICY IF EXISTS "Users can delete own non-system templates" ON public.quotation_templates;

-- Policies for quotation_templates (with explicit user_id::text casting)
CREATE POLICY "Users can view own or system templates" ON public.quotation_templates
    FOR SELECT USING (
        is_system_template = true 
        OR user_id::text = auth.uid()::text 
        OR user_id IS NULL 
        OR user_id::text = 'SYSTEM' 
        OR user_id::text = 'demo_user'
    );

CREATE POLICY "Users can insert own templates" ON public.quotation_templates
    FOR INSERT WITH CHECK (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user')
        AND (is_system_template IS NOT TRUE)
    );

CREATE POLICY "Users can update own non-system templates" ON public.quotation_templates
    FOR UPDATE USING (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
    );

CREATE POLICY "Users can delete own non-system templates" ON public.quotation_templates
    FOR DELETE USING (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
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
