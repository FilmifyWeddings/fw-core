-- ==============================================================================
-- StudioCore Gallery Storage Pipeline, Folder Structure & 180-Day Auto-Purge
-- Migration: 20261118000000_gallery_storage_pipeline_and_auto_purge.sql
-- ==============================================================================

-- 1. Ensure storage_used_bytes, status, expired_at, scheduled_purge_at on workspaces
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_purge_at TIMESTAMPTZ;

-- 2. Ensure storage_used_bytes, status, expired_at, scheduled_purge_at on event_galleries
ALTER TABLE public.event_galleries
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_purge_at TIMESTAMPTZ;

-- 3. Ensure thumb_key, folder_id on gallery_photos and ensure nullable original_key
ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS thumb_key TEXT,
  ADD COLUMN IF NOT EXISTS folder_id UUID;

DO $$ 
BEGIN 
  ALTER TABLE public.gallery_photos ALTER COLUMN original_key DROP NOT NULL;
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Ensure updated_at on gallery_collections and create gallery_folders view
ALTER TABLE public.gallery_collections 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE VIEW public.gallery_folders AS 
SELECT 
  id,
  gallery_id AS event_id,
  gallery_id,
  name,
  slug,
  sort_order,
  created_at,
  updated_at
FROM public.gallery_collections;

-- 5. Create Purge Audit Logs table for automated 6-month lifecycle purging
CREATE TABLE IF NOT EXISTS public.gallery_purge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  event_id UUID,
  gallery_title TEXT,
  purged_files_count INT DEFAULT 0,
  purged_bytes_freed BIGINT DEFAULT 0,
  purged_prefixes TEXT[],
  reason TEXT DEFAULT '6_month_expiry_retention_elapsed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Performance indexes for 6-month expiry auto-purge queries
CREATE INDEX IF NOT EXISTS idx_event_galleries_purge_lookup 
  ON public.event_galleries (status, expired_at, scheduled_purge_at);

CREATE INDEX IF NOT EXISTS idx_workspaces_purge_lookup 
  ON public.workspaces (status, expired_at, scheduled_purge_at);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_folder_id 
  ON public.gallery_photos (folder_id);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_keys 
  ON public.gallery_photos (thumb_key, preview_key);
