-- Migration: Fix Quotation Documents FK & Lead Quotation Contract
-- Description: Safely drops obsolete FK constraint quotation_documents_template_id_fkey
-- allowing quotation_documents to store document snapshots for both templates and lead quotation instances (FW-Q-XXXXXX)
-- without violating foreign key constraints or cluttering quotation_templates.

-- 1. Safely drop foreign key constraint on quotation_documents if exists
ALTER TABLE public.quotation_documents
  DROP CONSTRAINT IF EXISTS quotation_documents_template_id_fkey;

-- 2. Ensure columns on quotation_documents exist and have proper defaults
ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.quotation_documents ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Create performance index on quotation_documents(template_id)
CREATE INDEX IF NOT EXISTS idx_quotation_documents_template_id ON public.quotation_documents(template_id);
