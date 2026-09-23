-- ==============================================================================
-- UNIFIED TEAM, PARTNERS, VENDORS & SHOOTS BACKEND SCHEMA (100% IDEMPOTENT)
-- ==============================================================================
-- Run this complete script in Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- Safe to run multiple times without any data loss.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: partner_album_orders (Unified Deliverables & Shoots Orders Hub)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id TEXT PRIMARY KEY DEFAULT ('order_' || gen_random_uuid()::text),
    workspace_id TEXT,
    partner_id TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    partner_email TEXT,
    client_id TEXT,
    client_name TEXT NOT NULL,
    project_id TEXT,
    deliverable_id TEXT,
    assignment_id TEXT,
    payout_id TEXT,
    category TEXT NOT NULL DEFAULT 'album_design', -- 'shoot', 'video_editing', 'photo_editing', 'album_design', 'album_printing'
    event_name TEXT,
    event_date TEXT,
    event_time TEXT,
    role TEXT,
    item_title TEXT,
    specs TEXT,
    service_type TEXT,
    album_type TEXT NOT NULL DEFAULT 'Luxury Photobook',
    sheet_count INT NOT NULL DEFAULT 30,
    page_count INT NOT NULL DEFAULT 60,
    rate_per_sheet NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rate_per_page NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    order_status TEXT NOT NULL DEFAULT 'In Progress',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    order_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    due_date TEXT,
    delivery_date TEXT,
    pdf_proof_url TEXT,
    drive_folder_url TEXT,
    notes TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure id column is TEXT so it safely accepts UUIDs and custom prefix IDs
DO $$
BEGIN
    ALTER TABLE public.partner_album_orders ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Idempotent Column Additions for partner_album_orders
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'album_design';
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS assignment_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS item_title TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS specs TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS partner_email TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS deliverable_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS page_count INT DEFAULT 60;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS rate_per_page NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS pdf_proof_url TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop legacy check constraints if any existed
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;

-- Relax workspace_id NOT NULL constraint
DO $$
BEGIN
    ALTER TABLE public.partner_album_orders ALTER COLUMN workspace_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Indexes for partner_album_orders
CREATE INDEX IF NOT EXISTS idx_pao_ws_partner_cat ON public.partner_album_orders(workspace_id, partner_id, category);
CREATE INDEX IF NOT EXISTS idx_pao_category ON public.partner_album_orders(category);
CREATE INDEX IF NOT EXISTS idx_pao_assignment_id ON public.partner_album_orders(assignment_id);
CREATE INDEX IF NOT EXISTS idx_pao_payout_id ON public.partner_album_orders(payout_id);
CREATE INDEX IF NOT EXISTS idx_pao_partner_email ON public.partner_album_orders(partner_email);
CREATE INDEX IF NOT EXISTS idx_pao_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pao_status ON public.partner_album_orders(order_status, payment_status);

-- Enable RLS & Universal policy
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access to partner_album_orders" ON public.partner_album_orders;
    DROP POLICY IF EXISTS "Allow all operations for authenticated workspace" ON public.partner_album_orders;
    
    CREATE POLICY "Allow all operations for authenticated workspace" 
    ON public.partner_album_orders 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
END $$;


-- ------------------------------------------------------------------------------
-- 2. TABLE: fw_assignments (Financial & Commercials Synchronization Columns)
-- ------------------------------------------------------------------------------
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_fw_assignments_payment_status ON public.fw_assignments(payment_status);


-- ------------------------------------------------------------------------------
-- 3. TABLE: team_event_payouts (Crew Payouts & Sync Hub)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_event_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT,
    user_id TEXT,
    member_id TEXT NOT NULL,
    member_name TEXT,
    project_id TEXT,
    sub_event_id TEXT,
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotent Column Additions for team_event_payouts
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS member_id TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS sub_event_id TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.team_event_payouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Unique composite index for sub_event_id + member_id to support atomic upserts
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tep_sub_event_member ON public.team_event_payouts(sub_event_id, member_id);
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE public.team_event_payouts ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all operations for team_event_payouts" ON public.team_event_payouts;
    CREATE POLICY "Allow all operations for team_event_payouts" 
    ON public.team_event_payouts 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
END $$;


-- ------------------------------------------------------------------------------
-- 4. TABLE: post_production_reminders (Alerts & Notes Reminders)
-- ------------------------------------------------------------------------------
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
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotent Column Additions for post_production_reminders
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS reminder_text TEXT;
ALTER TABLE public.post_production_reminders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Make sure title or reminder_text is nullable so both work seamlessly
DO $$
BEGIN
    ALTER TABLE public.post_production_reminders ALTER COLUMN title DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

ALTER TABLE public.post_production_reminders ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all access to post_production_reminders" ON public.post_production_reminders;
    CREATE POLICY "Allow all access to post_production_reminders" 
    ON public.post_production_reminders 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
SELECT 'Unified Team, Partners, Vendors & Shoots Schema successfully synced!' as status;
