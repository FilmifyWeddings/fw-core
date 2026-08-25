-- ====================================================================
-- MIGRATION: FINANCE HANDLED BY & PAYMENT TERMS 3D MILESTONES SCHEMA
-- Migration File: supabase/migrations/20260825_finance_handled_by_and_payment_terms.sql
-- ====================================================================

-- 1. Ensure columns exist on workspace_clients
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS handled_by TEXT;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Ensure columns exist on client_finance_records
ALTER TABLE IF EXISTS client_finance_records ADD COLUMN IF NOT EXISTS handled_by TEXT;
ALTER TABLE IF EXISTS client_finance_records ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS client_finance_records ADD COLUMN IF NOT EXISTS milestones JSONB DEFAULT '[]'::jsonb;

-- 3. Create workspace_finance_settings table for user-isolated finance configurations
CREATE TABLE IF NOT EXISTS workspace_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID,
  payment_milestone_templates TEXT[] DEFAULT ARRAY['Token Amount', 'Advance Amount', 'On Wedding Day'],
  team_members TEXT[] DEFAULT ARRAY['Self (Studio Owner)'],
  custom_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_workspace_finance_settings_user UNIQUE (user_id)
);

-- 4. Enable Row Level Security (RLS) on workspace_finance_settings
ALTER TABLE workspace_finance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own workspace_finance_settings" ON workspace_finance_settings;
CREATE POLICY "Users can manage their own workspace_finance_settings"
ON workspace_finance_settings
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = workspace_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_clients_handled_by ON workspace_clients(handled_by);
CREATE INDEX IF NOT EXISTS idx_client_finance_records_handled_by ON client_finance_records(handled_by);
CREATE INDEX IF NOT EXISTS idx_workspace_finance_settings_user_id ON workspace_finance_settings(user_id);
