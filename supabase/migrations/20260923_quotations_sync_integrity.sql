-- ==============================================================================
-- Migration: Quotation Titles, Preview Tokens, Post-Production & Finance Integrity
-- Description: Ensures safe indexes and schema integrity across quotations,
--              CRM leads, post-production deliverables, and client finance records.
-- ==============================================================================

-- 1. Ensure fast lookup indexes for quotation versions and public previews
CREATE INDEX IF NOT EXISTS idx_quotation_docs_template_id ON quotation_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_quotation_docs_lead_id ON quotation_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotation_docs_created_at ON quotation_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_public_token ON quotations(public_token);
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON quotations(client_id);

-- 2. Post-Production Indexes
CREATE INDEX IF NOT EXISTS idx_pp_projects_client_id ON post_production_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliverables_project_id ON post_production_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliverables_segment ON post_production_deliverables(segment);

-- 3. Finance Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_client_finance_client_id ON client_finance_records(client_id);
CREATE INDEX IF NOT EXISTS idx_client_finance_status ON client_finance_records(payment_status);

-- 4. Safe column checks
DO $$
BEGIN
  -- Ensure quotation_documents has lead_id and version
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotation_documents' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE quotation_documents ADD COLUMN lead_id text;
  END IF;

  -- Ensure quotations has public_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE quotations ADD COLUMN public_token text;
  END IF;

  -- Ensure client_finance_records has milestones
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_finance_records' AND column_name = 'milestones'
  ) THEN
    ALTER TABLE client_finance_records ADD COLUMN milestones jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
