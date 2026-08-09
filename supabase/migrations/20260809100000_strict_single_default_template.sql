-- Migration: Authoritative Single Default Quotation Template System
-- Seeds FW-2WT85Y0 as the Global System Template and enforces single default per workspace.

-- 1. Ensure required columns exist
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.quotation_versions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Clean up multiple pre-existing defaults per workspace before index creation
WITH ranked_defaults AS (
    SELECT id, workspace_id,
           ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY updated_at DESC) as rank_num
    FROM public.quotation_templates
    WHERE is_default = true AND (is_system_template IS NOT TRUE)
)
UPDATE public.quotation_templates
SET is_default = false
WHERE id IN (
    SELECT id FROM ranked_defaults WHERE rank_num > 1
);

-- 3. Create partial unique index: Only ONE template can have is_default = true per workspace
DROP INDEX IF EXISTS public.idx_single_default_template_per_workspace;
CREATE UNIQUE INDEX idx_single_default_template_per_workspace
ON public.quotation_templates (workspace_id)
WHERE (is_default = true AND (is_system_template IS NOT TRUE));

-- 4. Seed Global System Template FW-2WT85Y0
INSERT INTO public.quotation_templates (id, user_id, title, category, is_system_template, is_default, created_at, updated_at)
VALUES (
    'FW-2WT85Y0',
    'SYSTEM',
    'System Default Wedding Template',
    'Wedding',
    true,
    false,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    is_system_template = true,
    title = EXCLUDED.title;

-- 5. Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- 6. Policies for quotation_templates
DROP POLICY IF EXISTS "Users can view own or system templates" ON public.quotation_templates;
CREATE POLICY "Users can view own or system templates" ON public.quotation_templates
    FOR SELECT USING (
        is_system_template = true 
        OR user_id::text = auth.uid()::text 
        OR user_id IS NULL 
        OR user_id::text = 'SYSTEM' 
        OR user_id::text = 'demo_user'
    );

DROP POLICY IF EXISTS "Users can insert own templates" ON public.quotation_templates;
CREATE POLICY "Users can insert own templates" ON public.quotation_templates
    FOR INSERT WITH CHECK (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user')
        AND (is_system_template IS NOT TRUE)
    );

DROP POLICY IF EXISTS "Users can update own non-system templates" ON public.quotation_templates;
CREATE POLICY "Users can update own non-system templates" ON public.quotation_templates
    FOR UPDATE USING (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
    );

DROP POLICY IF EXISTS "Users can delete own non-system templates" ON public.quotation_templates;
CREATE POLICY "Users can delete own non-system templates" ON public.quotation_templates
    FOR DELETE USING (
        (user_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
    );
