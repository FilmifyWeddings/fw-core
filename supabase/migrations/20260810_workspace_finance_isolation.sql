-- ====================================================================
-- MIGRATION: WORKSPACE FINANCE SUITE & EXPENSES MULTI-TENANT ISOLATION
-- Migration File: supabase/migrations/20260810_workspace_finance_isolation.sql
-- ====================================================================

-- 1. Client Finance Records (Pricing Breakdown & Milestone Schedule)
CREATE TABLE IF NOT EXISTS client_finance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  workspace_id UUID DEFAULT auth.uid(),
  client_id UUID REFERENCES workspace_clients(id) ON DELETE CASCADE,
  base_package_price NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  accommodation_charges NUMERIC DEFAULT 0,
  travel_charges NUMERIC DEFAULT 0,
  additional_charges NUMERIC DEFAULT 0,
  subtotal_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  final_total_amount NUMERIC DEFAULT 0,
  received_amount NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  milestones JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Finance Expenses & Team Payouts
CREATE TABLE IF NOT EXISTS finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  workspace_id UUID DEFAULT auth.uid(),
  client_id UUID REFERENCES workspace_clients(id) ON DELETE CASCADE,
  expense_type TEXT DEFAULT 'project_expense',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  paid_to TEXT,
  payment_mode TEXT DEFAULT 'UPI',
  status TEXT DEFAULT 'paid',
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_finance_records_user_id ON client_finance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_records_workspace_id ON client_finance_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_records_client_id ON client_finance_records(client_id);

CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_workspace_id ON finance_expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_client_id ON finance_expenses(client_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE client_finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Strict user isolation for client_finance_records" ON client_finance_records;
CREATE POLICY "Strict user isolation for client_finance_records"
ON client_finance_records
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = workspace_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);

DROP POLICY IF EXISTS "Strict user isolation for finance_expenses" ON finance_expenses;
CREATE POLICY "Strict user isolation for finance_expenses"
ON finance_expenses
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = workspace_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);
