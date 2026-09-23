-- ==============================================================================
-- TEAM & PARTNERS REMINDERS, SHOOTS & FINANCIALS PERSISTENCE SCHEMA
-- ==============================================================================
-- 100% Idempotent: Run in Supabase SQL Editor (Safe to run multiple times).
-- ==============================================================================

-- 1. Table: post_production_reminders (Alerts & Notifications Hub)
CREATE TABLE IF NOT EXISTS public.post_production_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT,
    deliverable_id TEXT NOT NULL,
    project_id TEXT,
    recipient_id TEXT,
    recipient_name TEXT,
    title TEXT,
    reminder_text TEXT,
    reminder_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'dismissed'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS reminder_text TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

DO $$
BEGIN
    ALTER TABLE public.post_production_reminders ALTER COLUMN title DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE public.post_production_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to post_production_reminders" ON public.post_production_reminders;
CREATE POLICY "Allow all access to post_production_reminders" ON public.post_production_reminders FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ppr_status_at ON public.post_production_reminders(status, reminder_at);


-- 2. Table: partner_album_orders (Shoot Details & Comments Persistence)
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id TEXT PRIMARY KEY DEFAULT ('order_' || gen_random_uuid()::text),
    workspace_id TEXT,
    partner_id TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'shoot',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    order_status TEXT NOT NULL DEFAULT 'In Progress',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    order_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS assignment_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for authenticated workspace" ON public.partner_album_orders;
CREATE POLICY "Allow all operations for authenticated workspace" ON public.partner_album_orders FOR ALL USING (true) WITH CHECK (true);


-- 3. Table: fw_assignments (Financials Sync)
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS notes TEXT;


-- 4. Table: team_event_payouts (Payouts Sync)
CREATE TABLE IF NOT EXISTS public.team_event_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT,
    user_id TEXT,
    member_id TEXT NOT NULL,
    member_name TEXT,
    client_name TEXT,
    event_name TEXT,
    event_date TEXT,
    role TEXT,
    agreed_amount NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    balance_amount NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    payment_date TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

ALTER TABLE public.team_event_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for team_event_payouts" ON public.team_event_payouts;
CREATE POLICY "Allow all operations for team_event_payouts" ON public.team_event_payouts FOR ALL USING (true) WITH CHECK (true);

SELECT 'Team reminders, shoots and financials schema synced successfully!' as result;
