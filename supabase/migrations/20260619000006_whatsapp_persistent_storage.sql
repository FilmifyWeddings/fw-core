-- ==========================================================================
-- Migration: 20260619000006_whatsapp_persistent_storage.sql
-- BRAHMASTRA LAW 1 ENFORCED: Multi-Tenant RLS on all tables
-- BRAHMASTRA BACKEND RETENTION LAW: No memory-only states
-- ==========================================================================

-- -------------------------------------------------------
-- TABLE 1: tenant_whatsapp_templates
-- Replaces ephemeral in-memory template states.
-- Scoped per tenant_id.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_whatsapp_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name     TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'wedding', -- 'wedding' | 'pre-wedding' | 'commercial' | 'custom'
  body_text         TEXT,
  media_url_payload TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.tenant_whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can SELECT own templates"
  ON public.tenant_whatsapp_templates FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenant can INSERT own templates"
  ON public.tenant_whatsapp_templates FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can UPDATE own templates"
  ON public.tenant_whatsapp_templates FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can DELETE own templates"
  ON public.tenant_whatsapp_templates FOR DELETE
  USING (tenant_id = auth.uid());

-- Index for fast lookups by tenant
CREATE INDEX IF NOT EXISTS idx_tenant_wa_templates_tenant_id
  ON public.tenant_whatsapp_templates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_wa_templates_category
  ON public.tenant_whatsapp_templates (tenant_id, category);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_tenant_wa_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_wa_templates_updated_at ON public.tenant_whatsapp_templates;
CREATE TRIGGER trg_tenant_wa_templates_updated_at
  BEFORE UPDATE ON public.tenant_whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION update_tenant_wa_templates_updated_at();


-- -------------------------------------------------------
-- TABLE 2: whatsapp_workflow_sequences
-- Tracks automated triggers for welcome_messages and followup_intervals
-- linked to explicit shoot categories.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_workflow_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_type   TEXT NOT NULL DEFAULT 'welcome',   -- 'welcome' | 'followup'
  shoot_type      TEXT NOT NULL DEFAULT 'all',        -- 'wedding' | 'commercial' | 'all'
  is_active       BOOLEAN NOT NULL DEFAULT false,
  steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Steps JSONB schema: [{ template_id, template_name, delay_seconds, day }]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sequence_type, shoot_type)
);

-- RLS
ALTER TABLE public.whatsapp_workflow_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can SELECT own sequences"
  ON public.whatsapp_workflow_sequences FOR SELECT
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenant can INSERT own sequences"
  ON public.whatsapp_workflow_sequences FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can UPDATE own sequences"
  ON public.whatsapp_workflow_sequences FOR UPDATE
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenant can DELETE own sequences"
  ON public.whatsapp_workflow_sequences FOR DELETE
  USING (tenant_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wa_workflow_tenant_id
  ON public.whatsapp_workflow_sequences (tenant_id);

CREATE INDEX IF NOT EXISTS idx_wa_workflow_type_shoot
  ON public.whatsapp_workflow_sequences (tenant_id, sequence_type, shoot_type);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_wa_workflow_sequences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_workflow_sequences_updated_at ON public.whatsapp_workflow_sequences;
CREATE TRIGGER trg_wa_workflow_sequences_updated_at
  BEFORE UPDATE ON public.whatsapp_workflow_sequences
  FOR EACH ROW EXECUTE FUNCTION update_wa_workflow_sequences_updated_at();
