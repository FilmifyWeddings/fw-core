-- Migration: Add segment, deliverable fields, and relax constraints for partner_album_orders
-- Allows multi-segment assignments (Wedding, Pre-Wedding, etc.), custom deliverable titles, and empty/custom statuses.

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

-- Drop check constraint on order_status if it exists to allow customizable statuses & empty/none
DO $$
BEGIN
  ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_order_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop check constraint on payment_status if it exists
DO $$
BEGIN
  ALTER TABLE public.partner_album_orders DROP CONSTRAINT IF EXISTS partner_album_orders_payment_status_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create index on segment for ultra-fast filtering
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_segment ON public.partner_album_orders(segment);
CREATE INDEX IF NOT EXISTS idx_partner_album_orders_category ON public.partner_album_orders(category);
