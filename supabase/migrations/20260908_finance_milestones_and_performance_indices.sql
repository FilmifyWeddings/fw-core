-- ==============================================================================
-- MIGRATION: FINANCE MILESTONES, PAYMENT SCOPING & PERFORMANCE INDEXES
-- ==============================================================================

-- 1. Performance Indexes on client_finance_records
-- Milestones are stored as JSONB in client_finance_records.milestones.
-- A GIN index enables ultra-fast JSONB queries and milestone filtering.
CREATE INDEX IF NOT EXISTS idx_client_finance_records_milestones_gin 
ON public.client_finance_records USING gin (milestones);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_user_ws 
ON public.client_finance_records (user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_client_id 
ON public.client_finance_records (client_id);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_payment_status 
ON public.client_finance_records (payment_status);

CREATE INDEX IF NOT EXISTS idx_client_finance_records_created_at 
ON public.client_finance_records (created_at DESC);

-- 2. Performance Indexes on finance_transactions (for instant Date-Range Scope Filtering)
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date_scope 
ON public.finance_transactions (workspace_id, payment_date DESC, type);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date 
ON public.finance_transactions (user_id, payment_date DESC);

-- 3. Idempotent Schema Guards for Standalone Milestones Tables (if present in custom setups)
DO $$
BEGIN
  -- Check and add remarks/notes to fw_milestones if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fw_milestones') THEN
    ALTER TABLE public.fw_milestones ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE public.fw_milestones ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;

  -- Check and add remarks/notes to fw_project_milestones if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fw_project_milestones') THEN
    ALTER TABLE public.fw_project_milestones ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE public.fw_project_milestones ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;

  -- Check and add remarks/notes to project_milestones if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_milestones') THEN
    ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE public.project_milestones ADD COLUMN IF NOT EXISTS notes TEXT;
  END IF;
END $$;
