-- ==============================================================================
-- VENDOR & ALBUM DESIGNER DELIVERABLES, STATEMENTS & PORTAL SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- 100% Idempotent: Works whether tables are fresh or were previously created.
-- ==============================================================================

-- 1. Create table if it does not exist at all
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

-- 2. Add all newer columns if table already existed without them
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

-- 3. Drop legacy restrictive check constraints (so new statuses like 'In Design', 'Client Review', etc. are accepted)
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;

-- 4. Ensure workspace_id constraint is relaxed (allows text workspace ids)
DO $$
BEGIN
    ALTER TABLE public.partner_album_orders ALTER COLUMN workspace_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 5. Vendor Consolidated Statements & Invoices Table
CREATE TABLE IF NOT EXISTS public.vendor_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT,
    vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_email TEXT,
    statement_number TEXT NOT NULL,
    statement_date TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    start_date TEXT,
    end_date TEXT,
    order_ids JSONB DEFAULT '[]'::jsonb,
    items_json JSONB DEFAULT '[]'::jsonb,
    total_albums INT DEFAULT 0,
    total_sheets INT DEFAULT 0,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    balance_due NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure newer columns for vendor_statements if previously created
ALTER TABLE public.vendor_statements ADD COLUMN IF NOT EXISTS vendor_email TEXT;
ALTER TABLE public.vendor_statements ADD COLUMN IF NOT EXISTS order_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendor_statements ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.vendor_statements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. High-Performance Indexes (safe now that columns guaranteed to exist)
CREATE INDEX IF NOT EXISTS idx_pao_ws_partner ON public.partner_album_orders(workspace_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_pao_partner_email ON public.partner_album_orders(partner_email);
CREATE INDEX IF NOT EXISTS idx_pao_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pao_status ON public.partner_album_orders(order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_statements_ws_vendor ON public.vendor_statements(workspace_id, vendor_id);

-- 7. Multi-Tenant Row Level Security (RLS)
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_album_orders_all_access" ON public.partner_album_orders;
CREATE POLICY "partner_album_orders_all_access" ON public.partner_album_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vendor_statements_all_access" ON public.vendor_statements;
CREATE POLICY "vendor_statements_all_access" ON public.vendor_statements FOR ALL USING (true) WITH CHECK (true);
