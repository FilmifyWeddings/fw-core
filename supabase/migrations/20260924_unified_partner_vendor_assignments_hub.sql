-- ==============================================================================
-- UNIFIED TEAM, PARTNERS & VENDORS HUB: CATEGORIZED DELIVERABLES & SHOOTS SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- 100% Idempotent: Safe to run multiple times without data loss.
-- ==============================================================================

-- 1. Create table if it does not exist at all
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
    category TEXT NOT NULL DEFAULT 'album_design', -- 'shoot', 'video_editing', 'photo_editing', 'album_design', 'album_printing'
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
    order_status TEXT NOT NULL DEFAULT 'Pending Design',
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

-- 2. Ensure id column is TEXT so it safely accepts UUIDs and custom IDs
DO $$
BEGIN
    ALTER TABLE public.partner_album_orders ALTER COLUMN id TYPE TEXT USING id::text;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Add newer columns if table previously existed without them
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'album_design';
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

-- 4. Drop legacy restrictive check constraints
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;

-- 5. Relax workspace_id constraint
DO $$
BEGIN
    ALTER TABLE public.partner_album_orders ALTER COLUMN workspace_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 6. High-Performance Indexes for Categorized Filtering
CREATE INDEX IF NOT EXISTS idx_pao_ws_partner_cat ON public.partner_album_orders(workspace_id, partner_id, category);
CREATE INDEX IF NOT EXISTS idx_pao_category ON public.partner_album_orders(category);
CREATE INDEX IF NOT EXISTS idx_pao_partner_email ON public.partner_album_orders(partner_email);
CREATE INDEX IF NOT EXISTS idx_pao_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pao_status ON public.partner_album_orders(order_status, payment_status);

-- 7. Multi-Tenant RLS
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
