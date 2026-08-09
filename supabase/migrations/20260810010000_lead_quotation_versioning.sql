-- Migration: Lead Quotation Versioning, Backfill, and Duplicate Protection Index
-- Description: Ensures top-level lead_id and lead_version columns exist on quotation_documents,
-- performs a safe backfill from content_json, and creates performance & unique constraint indexes.

-- 1. Add top-level columns if not existing
ALTER TABLE public.quotation_documents
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_version INTEGER;

-- 2. Safe Backfill from content_json (Do not overwrite existing non-null top-level values)
UPDATE public.quotation_documents
SET 
  lead_id = COALESCE(lead_id, content_json->>'lead_id'),
  lead_version = COALESCE(lead_version, (content_json->>'lead_version')::INTEGER)
WHERE 
  (lead_id IS NULL AND content_json->>'lead_id' IS NOT NULL)
  OR (lead_version IS NULL AND content_json->>'lead_version' IS NOT NULL);

-- 3. Performance Index
CREATE INDEX IF NOT EXISTS idx_quotation_documents_lead_version 
  ON public.quotation_documents(workspace_id, lead_id, lead_version);

-- 4. Unique Partial Index for Concurrency & Duplicate Version Protection
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lead_quotation_version 
  ON public.quotation_documents(workspace_id, lead_id, lead_version)
  WHERE lead_id IS NOT NULL AND lead_version IS NOT NULL;
