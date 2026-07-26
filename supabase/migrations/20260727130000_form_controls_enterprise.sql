-- ================================================================
-- Migration: Form Controls Enterprise Features
-- File: 20260727130000_form_controls_enterprise.sql
-- ================================================================

-- 1. Add is_enabled column to fb_lead_forms (for per-form toggle)
ALTER TABLE public.fb_lead_forms
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- 2. Unique constraint on fb_lead_forms (required for UPSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fb_lead_forms_workspace_form_key'
  ) THEN
    ALTER TABLE public.fb_lead_forms
      ADD CONSTRAINT fb_lead_forms_workspace_form_key UNIQUE (workspace_id, form_id);
  END IF;
END;
$$;

-- 3. Unique constraint on fb_form_mappings (required for UPSERT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fb_form_mappings_workspace_form_key'
  ) THEN
    ALTER TABLE public.fb_form_mappings
      ADD CONSTRAINT fb_form_mappings_workspace_form_key UNIQUE (workspace_id, form_id);
  END IF;
END;
$$;

-- 4. Create fb_sync_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.fb_sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL,
  form_id         TEXT NOT NULL,
  form_name       TEXT,
  page_id         TEXT,
  page_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'running',  -- running | complete | failed
  imported_count  INTEGER DEFAULT 0,
  skipped_count   INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  total_fetched   INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  error_message   TEXT,
  initiated_by    UUID,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast workspace + form lookups
CREATE INDEX IF NOT EXISTS idx_fb_sync_logs_workspace_form
  ON public.fb_sync_logs (workspace_id, form_id, started_at DESC);

-- 5. Add leadgen_id index to leads for fast duplicate checks
-- leads.raw_payload is JSONB, add a functional index on leadgen_id
CREATE INDEX IF NOT EXISTS idx_leads_leadgen_id
  ON public.leads ((raw_payload->>'leadgen_id'))
  WHERE source = 'Facebook Lead Ads';
