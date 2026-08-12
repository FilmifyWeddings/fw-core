-- =====================================================================
-- MIGRATION: 20260813000000_strict_meta_tenant_isolation_rls.sql
-- Description: Hardens Row Level Security (RLS) policies on Meta Integration tables
--              (fb_page_configs, fb_lead_forms, fb_form_mappings) to guarantee
--              strict multi-tenant isolation.
-- =====================================================================

-- 1. Enable RLS
ALTER TABLE IF EXISTS public.fb_page_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fb_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fb_form_mappings ENABLE ROW LEVEL SECURITY;

-- 2. Drop old permissive policies
DROP POLICY IF EXISTS "Allow service role full access on fb_page_configs" ON public.fb_page_configs;
DROP POLICY IF EXISTS "Allow service role full access on fb_lead_forms" ON public.fb_lead_forms;
DROP POLICY IF EXISTS "Allow service role full access on fb_form_mappings" ON public.fb_form_mappings;
DROP POLICY IF EXISTS "Tenant isolation for fb_page_configs" ON public.fb_page_configs;
DROP POLICY IF EXISTS "Tenant isolation for fb_lead_forms" ON public.fb_lead_forms;
DROP POLICY IF EXISTS "Tenant isolation for fb_form_mappings" ON public.fb_form_mappings;

-- 3. Strict Tenant Isolation Policies
-- Authenticated users may ONLY view, insert, update, or delete rows matching their auth.uid()
CREATE POLICY "Tenant isolation for fb_page_configs"
  ON public.fb_page_configs
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = workspace_id)
  WITH CHECK (auth.uid()::text = workspace_id);

CREATE POLICY "Tenant isolation for fb_lead_forms"
  ON public.fb_lead_forms
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = workspace_id)
  WITH CHECK (auth.uid()::text = workspace_id);

CREATE POLICY "Tenant isolation for fb_form_mappings"
  ON public.fb_form_mappings
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = workspace_id)
  WITH CHECK (auth.uid()::text = workspace_id);
