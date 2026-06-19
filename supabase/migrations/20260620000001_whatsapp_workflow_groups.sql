-- ==========================================================================
-- Migration: 20260620000001_whatsapp_workflow_groups.sql
-- BRAHMASTRA LAW 1 ENFORCED: Multi-Tenant RLS on all tables
-- BRAHMASTRA BACKEND RETENTION LAW: No memory-only states
-- ==========================================================================

-- 1. Create whatsapp_contact_groups table
CREATE TABLE IF NOT EXISTS public.whatsapp_contact_groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name        TEXT NOT NULL,
  group_description TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can SELECT own contact groups"
  ON public.whatsapp_contact_groups FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenant can INSERT own contact groups"
  ON public.whatsapp_contact_groups FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can UPDATE own contact groups"
  ON public.whatsapp_contact_groups FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can DELETE own contact groups"
  ON public.whatsapp_contact_groups FOR DELETE
  USING (tenant_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_wa_contact_groups_tenant
  ON public.whatsapp_contact_groups (tenant_id);


-- 2. Alter leads Table: Add a nullable whatsapp_group_id foreign key referencing whatsapp_contact_groups(id)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS whatsapp_group_id UUID REFERENCES public.whatsapp_contact_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_group_id
  ON public.leads (whatsapp_group_id);


-- 3. Create whatsapp_custom_workflows table
CREATE TABLE IF NOT EXISTS public.whatsapp_custom_workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_name     TEXT NOT NULL,
  target_group_id   UUID REFERENCES public.whatsapp_contact_groups(id) ON DELETE SET NULL,
  workflow_steps    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- workflow_steps schema: [{ template_id, template_name, delay_value, delay_unit, sort_index }]
  execution_count   INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_custom_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can SELECT own custom workflows"
  ON public.whatsapp_custom_workflows FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenant can INSERT own custom workflows"
  ON public.whatsapp_custom_workflows FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can UPDATE own custom workflows"
  ON public.whatsapp_custom_workflows FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can DELETE own custom workflows"
  ON public.whatsapp_custom_workflows FOR DELETE
  USING (tenant_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_wa_custom_workflows_tenant
  ON public.whatsapp_custom_workflows (tenant_id);

CREATE INDEX IF NOT EXISTS idx_wa_custom_workflows_group
  ON public.whatsapp_custom_workflows (target_group_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_wa_custom_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_custom_workflows_updated_at ON public.whatsapp_custom_workflows;
CREATE TRIGGER trg_wa_custom_workflows_updated_at
  BEFORE UPDATE ON public.whatsapp_custom_workflows
  FOR EACH ROW EXECUTE FUNCTION update_wa_custom_workflows_updated_at();
