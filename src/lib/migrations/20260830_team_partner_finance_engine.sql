-- ==============================================================================
-- TEAM & PARTNER FINANCIAL & EVENT COMPENSATION ENGINE MIGRATION
-- Workspace Isolation & Row Level Security (RLS) Active
-- ==============================================================================

-- 1. Team Event Payouts (Freelancer & Gig Crew Event-wise Tracking)
CREATE TABLE IF NOT EXISTS public.team_event_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    project_id TEXT,
    sub_event_id TEXT,
    client_name TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    role TEXT NOT NULL,
    agreed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Team Payout Individual Transactions Log
CREATE TABLE IF NOT EXISTS public.team_payout_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    payout_id UUID REFERENCES public.team_event_payouts(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL DEFAULT 'UPI' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    reference_no TEXT,
    notes TEXT,
    finance_expense_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Partner Album & Printing Orders (Sheet-wise Lab Tracking)
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    partner_id TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_id TEXT,
    album_type TEXT NOT NULL DEFAULT 'Standard Photobook',
    sheet_count INT NOT NULL DEFAULT 30,
    rate_per_sheet NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    order_status TEXT NOT NULL DEFAULT 'DESIGNING' CHECK (order_status IN ('DESIGNING', 'PRINTING', 'BINDING', 'DISPATCHED', 'DELIVERED')),
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID')),
    order_date TEXT NOT NULL,
    delivery_date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Team Monthly Salary & Incentives (In-House Staff Payroll)
CREATE TABLE IF NOT EXISTS public.team_salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    month_year TEXT NOT NULL, -- Format: YYYY-MM (e.g. 2026-08)
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    incentive_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_payable NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID')),
    paid_date TEXT,
    payment_mode TEXT DEFAULT 'Bank Transfer',
    reference_no TEXT,
    notes TEXT,
    finance_expense_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.team_event_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_salary_records ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DO $$
BEGIN
  -- team_event_payouts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_event_payouts' AND policyname = 'team_event_payouts_all') THEN
    CREATE POLICY "team_event_payouts_all" ON public.team_event_payouts
    FOR ALL USING (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )) WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
  END IF;

  -- team_payout_transactions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_payout_transactions' AND policyname = 'team_payout_transactions_all') THEN
    CREATE POLICY "team_payout_transactions_all" ON public.team_payout_transactions
    FOR ALL USING (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )) WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
  END IF;

  -- partner_album_orders policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_album_orders' AND policyname = 'partner_album_orders_all') THEN
    CREATE POLICY "partner_album_orders_all" ON public.partner_album_orders
    FOR ALL USING (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )) WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
  END IF;

  -- team_salary_records policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_salary_records' AND policyname = 'team_salary_records_all') THEN
    CREATE POLICY "team_salary_records_all" ON public.team_salary_records
    FOR ALL USING (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )) WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
  END IF;
END $$;

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_team_event_payouts_ws_member ON public.team_event_payouts(workspace_id, member_id);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_ws_partner ON public.partner_album_orders(workspace_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_team_salary_records_ws_member ON public.team_salary_records(workspace_id, member_id);
