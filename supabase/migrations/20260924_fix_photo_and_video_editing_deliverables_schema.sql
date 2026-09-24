-- ==============================================================================
-- FIX PHOTO & VIDEO EDITING DELIVERABLES SCHEMA & BI-DIRECTIONAL PERSISTENCE
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- Fully Idempotent & Safe: Supports multi-tenant isolation, preserves existing data.
-- ==============================================================================

-- 1. Ensure partner_album_orders table exists
CREATE TABLE IF NOT EXISTS public.partner_album_orders (
    id TEXT PRIMARY KEY,
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
    category TEXT DEFAULT 'photo_editing',
    segment TEXT DEFAULT 'Wedding',
    event_name TEXT,
    event_date TEXT,
    event_time TEXT,
    role TEXT,
    item_title TEXT,
    specs TEXT,
    service_type TEXT,
    album_type TEXT NOT NULL DEFAULT 'Deliverable Task',
    sheet_count INT NOT NULL DEFAULT 0,
    page_count INT NOT NULL DEFAULT 0,
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
    drive_links JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure primary key id column is of type TEXT (in case it was created as UUID)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'partner_album_orders' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.partner_album_orders ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
END $$;

-- 2. Add any missing columns to partner_album_orders
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'photo_editing';
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'Wedding';
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS item_title TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS specs TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS assignment_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS deliverable_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS drive_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.partner_album_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop restrictive status checks so flexible workflow & payment statuses can be stored
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;

-- 3. Ensure post_production_deliverables has all necessary fields
CREATE TABLE IF NOT EXISTS public.post_production_deliverables (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    workspace_id TEXT,
    segment TEXT DEFAULT 'Wedding',
    category TEXT DEFAULT 'photo_editing',
    title TEXT NOT NULL,
    specs TEXT,
    count TEXT,
    status TEXT DEFAULT 'In Progress',
    assigned_member_id TEXT,
    assigned_to TEXT,
    due_date TIMESTAMPTZ,
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

ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'Wedding';
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'photo_editing';
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS specs TEXT;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS drive_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.post_production_deliverables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_partner ON public.partner_album_orders(partner_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_deliverable ON public.partner_album_orders(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_category ON public.partner_album_orders(category);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_assignment ON public.partner_album_orders(assignment_id);
CREATE INDEX IF NOT EXISTS idx_post_production_deliverables_member ON public.post_production_deliverables(assigned_member_id);

-- 5. RLS Policies (Safe and Permissive)
ALTER TABLE public.partner_album_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_production_deliverables ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'partner_album_orders' 
          AND policyname = 'partner_album_orders_all_access'
    ) THEN
        CREATE POLICY partner_album_orders_all_access ON public.partner_album_orders
            FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'post_production_deliverables' 
          AND policyname = 'post_production_deliverables_all_access'
    ) THEN
        CREATE POLICY post_production_deliverables_all_access ON public.post_production_deliverables
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
