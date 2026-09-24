-- Migration: Complete Segment-Wise Deliverables & Multi-Segment Persistence for partner_album_orders
-- Date: 2026-09-24

-- 1. Ensure all columns exist on partner_album_orders
ALTER TABLE public.partner_album_orders 
  ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'Wedding',
  ADD COLUMN IF NOT EXISTS item_title TEXT,
  ADD COLUMN IF NOT EXISTS specs TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS event_date TEXT,
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS due_date TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'video_editing',
  ADD COLUMN IF NOT EXISTS drive_links JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS partner_email TEXT,
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS deliverable_id TEXT,
  ADD COLUMN IF NOT EXISTS assignment_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_id TEXT;

-- 2. Drop legacy restrictive check constraints on order_status and payment_status
DO $$
BEGIN
  ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 3. Update existing records with segment derived from album_type or item_title
UPDATE public.partner_album_orders
SET segment = 'Pre-Wedding'
WHERE (album_type ILIKE '%pre-wedding%' OR album_type ILIKE '%pre wedding%' OR item_title ILIKE '%pre-wedding%' OR item_title ILIKE '%pre wedding%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Reception'
WHERE (album_type ILIKE '%reception%' OR item_title ILIKE '%reception%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Engagement'
WHERE (album_type ILIKE '%engagement%' OR album_type ILIKE '%ring ceremony%' OR item_title ILIKE '%engagement%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Sangeet'
WHERE (album_type ILIKE '%sangeet%' OR item_title ILIKE '%sangeet%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Haldi'
WHERE (album_type ILIKE '%haldi%' OR item_title ILIKE '%haldi%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Mehndi'
WHERE (album_type ILIKE '%mehndi%' OR album_type ILIKE '%mehendi%' OR item_title ILIKE '%mehndi%')
  AND (segment IS NULL OR segment = 'Wedding');

UPDATE public.partner_album_orders
SET segment = 'Cocktail'
WHERE (album_type ILIKE '%cocktail%' OR item_title ILIKE '%cocktail%')
  AND (segment IS NULL OR segment = 'Wedding');

-- 4. Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_segment ON public.partner_album_orders(segment);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_category ON public.partner_album_orders(category);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_client_name ON public.partner_album_orders(client_name);
