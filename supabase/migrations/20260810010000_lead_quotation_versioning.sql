-- Migration: Lead Quotation Versioning & Title Persistence
-- Description: Ensures lead_id, lead_version, and version columns exist on quotation_documents and quotations tables,
-- and adds performance index for lead quotation history queries.

-- 1. Ensure columns exist on quotation_documents
ALTER TABLE public.quotation_documents
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS lead_version INT,
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Create index on quotation_documents for fast version lookup
CREATE INDEX IF NOT EXISTS idx_quotation_docs_lead_version 
  ON public.quotation_documents(workspace_id, lead_id, lead_version);

-- 3. Ensure columns exist on quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS client_id TEXT;
