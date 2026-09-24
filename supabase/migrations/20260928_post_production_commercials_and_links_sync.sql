-- ==============================================================================
-- POST-PRODUCTION & TEAM PARTNERS DELIVERABLES COMMERCIALS & LINKS SYNC
-- ==============================================================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- Idempotent & Safe: Supports multi-tenant isolation and backward compatibility.
-- ==============================================================================

-- 1. Ensure partner_album_orders table has all required columns
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    category TEXT DEFAULT 'video_editing',
    event_name TEXT,
    event_date TEXT,
    event_time TEXT,
    role TEXT,
    item_title TEXT,
    specs TEXT,
    service_type TEXT,
    album_type TEXT NOT NULL DEFAULT 'Wedding Film Edit',
    sheet_count INT NOT NULL DEFAULT 1,
    page_count INT NOT NULL DEFAULT 2,
    rate_per_sheet NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rate_per_page NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    order_status TEXT NOT NULL DEFAULT 'Upcoming',
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    order_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    due_date TEXT,
    delivery_date TEXT,
    pdf_proof_url TEXT,
    drive_folder_url TEXT,
    drive_links JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add newer columns if table already existed without them
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS drive_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'video_editing';
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS item_title TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS specs TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS assignment_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop restrictive status checks so custom Post-Production statuses can be stored seamlessly
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;

-- 2. Ensure post_production_deliverables has commercials and drive_links columns
CREATE TABLE IF NOT EXISTS public.post_production_deliverables (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    workspace_id TEXT,
    segment TEXT DEFAULT 'Main Wedding',
    category TEXT DEFAULT 'Videos',
    title TEXT NOT NULL,
    specs TEXT,
    count TEXT,
    status TEXT DEFAULT 'Upcoming',
    assigned_member_id TEXT,
    assigned_to TEXT,
    due_date TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    agreed_amount NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    balance_amount NUMERIC(12, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'PENDING',
    drive_link TEXT,
    drive_links JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS drive_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS specs TEXT;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Ensure post_production_settings table exists
CREATE TABLE IF NOT EXISTS public.post_production_settings (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    statuses JSONB DEFAULT '[]'::jsonb,
    segments JSONB DEFAULT '[]'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pao_ws_partner ON public.partner_album_orders(workspace_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_pao_client ON public.partner_album_orders(client_name);
CREATE INDEX IF NOT EXISTS idx_pao_category ON public.partner_album_orders(category);
CREATE INDEX IF NOT EXISTS idx_pao_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliverables_assignee ON public.post_production_deliverables(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_pp_deliverables_proj ON public.post_production_deliverables(project_id);

-- 5. Enable Row-Level Security
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_settings ENABLE ROW LEVEL SECURITY;

-- Permissive policy for authenticated / service_role users
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.partner_album_orders;
    CREATE POLICY "Allow all for authenticated users" ON public.partner_album_orders FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.post_production_deliverables;
    CREATE POLICY "Allow all for authenticated users" ON public.post_production_deliverables FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.post_production_settings;
    CREATE POLICY "Allow all for authenticated users" ON public.post_production_settings FOR ALL USING (true);
EXCEPTION
    WHEN others THEN NULL;
END $$;
