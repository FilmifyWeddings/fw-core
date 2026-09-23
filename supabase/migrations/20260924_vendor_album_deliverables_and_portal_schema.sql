-- ==============================================================================
-- VENDOR & ALBUM DESIGNER DELIVERABLES, STATEMENTS & PORTAL SCHEMA
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates or upgrades the tables, constraints, indexes, and RLS policies for:
-- 1. partner_album_orders (Enhanced tracking for Album Designers & Printing Labs)
-- 2. vendor_statements (Itemized statements and invoices for vendors)
-- ==============================================================================

-- 1. Ensure partner_album_orders table exists with all required operational fields
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
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

-- Upgrade existing columns if partner_album_orders already existed previously
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'partner_email') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN partner_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'client_id') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN client_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'deliverable_id') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN deliverable_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'page_count') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN page_count INT NOT NULL DEFAULT 60;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'rate_per_page') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN rate_per_page NUMERIC(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'due_date') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN due_date TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'pdf_proof_url') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN pdf_proof_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'drive_folder_url') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN drive_folder_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_album_orders' AND column_name = 'comments') THEN
        ALTER TABLE public.partner_album_orders ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Vendor Consolidated Statements & Invoices Table
CREATE TABLE IF NOT EXISTS public.vendor_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
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

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pao_ws_partner ON public.partner_album_orders(workspace_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_pao_partner_email ON public.partner_album_orders(partner_email);
CREATE INDEX IF NOT EXISTS idx_pao_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_pao_status ON public.partner_album_orders(order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_statements_ws_vendor ON public.vendor_statements(workspace_id, vendor_id);

-- 4. Multi-Tenant Row Level Security (RLS)
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_statements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partner_album_orders' AND policyname = 'partner_album_orders_all_access') THEN
        CREATE POLICY "partner_album_orders_all_access" ON public.partner_album_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_statements' AND policyname = 'vendor_statements_all_access') THEN
        CREATE POLICY "vendor_statements_all_access" ON public.vendor_statements FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
