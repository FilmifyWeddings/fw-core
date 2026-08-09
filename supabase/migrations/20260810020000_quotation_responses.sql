-- Migration: Create public.quotation_responses table for client preview interactions
-- Description: Stores client acceptance and budget discussion responses linked to workspace, lead, quotation, version, and public token.

CREATE TABLE IF NOT EXISTS public.quotation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id TEXT NOT NULL,
  quotation_id TEXT NOT NULL,
  lead_version INTEGER NOT NULL,
  public_token TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('accepted', 'budget_discussion')),
  budget_amount NUMERIC(12, 2) DEFAULT NULL,
  client_name TEXT DEFAULT NULL,
  client_notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique partial index to ensure acceptance is idempotent (prevents duplicate acceptance rows per quotation instance)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_quotation_response_accept 
  ON public.quotation_responses(quotation_id, response_type) 
  WHERE response_type = 'accepted';

-- Performance index for fast history lookups
CREATE INDEX IF NOT EXISTS idx_quotation_responses_lead_version
  ON public.quotation_responses(workspace_id, lead_id, lead_version);
