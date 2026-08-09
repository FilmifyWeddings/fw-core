-- Migration: Authoritative Single Default Quotation Template System
-- Seeds FW-2WT85Y0 as the Global System Template and enforces single default per workspace.

-- 1. Ensure required columns exist on all quotation tables
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.quotation_templates ADD COLUMN IF NOT EXISTS is_system_template BOOLEAN DEFAULT false;

ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS user_id TEXT;

ALTER TABLE public.quotation_versions ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.quotation_versions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Backfill workspace_id / user_id if null
UPDATE public.quotation_templates
SET workspace_id = COALESCE(workspace_id, user_id, '00000000-0000-0000-0000-000000000000')
WHERE workspace_id IS NULL;

-- 3. Clean up multiple pre-existing defaults per workspace before index creation
WITH ranked_defaults AS (
    SELECT id, COALESCE(workspace_id, user_id) as tenant_id,
           ROW_NUMBER() OVER (PARTITION BY COALESCE(workspace_id, user_id) ORDER BY updated_at DESC) as rank_num
    FROM public.quotation_templates
    WHERE is_default = true AND (is_system_template IS NOT TRUE)
)
UPDATE public.quotation_templates
SET is_default = false
WHERE id IN (
    SELECT id FROM ranked_defaults WHERE rank_num > 1
);

-- 4. Create partial unique index: Only ONE template can have is_default = true per workspace
DROP INDEX IF EXISTS public.idx_single_default_template_per_workspace;
CREATE UNIQUE INDEX idx_single_default_template_per_workspace
ON public.quotation_templates (COALESCE(workspace_id, user_id))
WHERE (is_default = true AND (is_system_template IS NOT TRUE));

-- 5. Seed Global System Template FW-2WT85Y0
INSERT INTO public.quotation_templates (id, workspace_id, user_id, title, category, is_system_template, is_default, created_at, updated_at)
VALUES (
    'FW-2WT85Y0',
    'SYSTEM',
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

-- 6. Enable RLS
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- 7. Policies for quotation_templates
DROP POLICY IF EXISTS "Users can view own or system templates" ON public.quotation_templates;
CREATE POLICY "Users can view own or system templates" ON public.quotation_templates
    FOR SELECT USING (
        is_system_template = true 
        OR user_id::text = auth.uid()::text 
        OR workspace_id::text = auth.uid()::text
        OR user_id IS NULL 
        OR user_id::text = 'SYSTEM' 
        OR user_id::text = 'demo_user'
    );

DROP POLICY IF EXISTS "Users can insert own templates" ON public.quotation_templates;
CREATE POLICY "Users can insert own templates" ON public.quotation_templates
    FOR INSERT WITH CHECK (
        (user_id::text = auth.uid()::text OR workspace_id::text = auth.uid()::text OR user_id::text = 'demo_user')
        AND (is_system_template IS NOT TRUE)
    );

DROP POLICY IF EXISTS "Users can update own non-system templates" ON public.quotation_templates;
CREATE POLICY "Users can update own non-system templates" ON public.quotation_templates
    FOR UPDATE USING (
        (user_id::text = auth.uid()::text OR workspace_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
    );

DROP POLICY IF EXISTS "Users can delete own non-system templates" ON public.quotation_templates;
CREATE POLICY "Users can delete own non-system templates" ON public.quotation_templates
    FOR DELETE USING (
        (user_id::text = auth.uid()::text OR workspace_id::text = auth.uid()::text OR user_id::text = 'demo_user') 
        AND (is_system_template IS NOT TRUE AND user_id::text != 'SYSTEM')
    );
