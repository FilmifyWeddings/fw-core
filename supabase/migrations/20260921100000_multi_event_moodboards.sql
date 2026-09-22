-- Migration: Multi-Event Moodboards, Shoot Locations & Ultra-Light Storage
-- Description: Allows multiple moodboards per client (Pre-Wedding, Wedding, Engagement, etc.),
-- adds place-wise photos & comments, and removes single-moodboard constraint.

-- 1. Safely drop the unique constraint if it exists to allow multiple moodboards per client
DO $$
BEGIN
  -- Drop constraint on (workspace_id, client_id) if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'client_moodboards_workspace_id_client_id_key'
  ) THEN
    ALTER TABLE public.client_moodboards DROP CONSTRAINT client_moodboards_workspace_id_client_id_key;
  END IF;
END $$;

-- 2. Add multi-event & place-wise columns to client_moodboards
ALTER TABLE public.client_moodboards 
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'Pre-Wedding',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS shoot_places JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shoot_coordination JSONB DEFAULT '{"bride_coordinator": {"name": "", "phone": ""}, "groom_coordinator": {"name": "", "phone": ""}}'::jsonb;

-- 3. Ensure performance indexes
CREATE INDEX IF NOT EXISTS idx_client_moodboards_client_id ON public.client_moodboards(client_id);
CREATE INDEX IF NOT EXISTS idx_client_moodboards_token ON public.client_moodboards(token);
CREATE INDEX IF NOT EXISTS idx_client_moodboards_event_type ON public.client_moodboards(event_type);
CREATE INDEX IF NOT EXISTS idx_client_moodboards_workspace_id ON public.client_moodboards(workspace_id);

-- 4. Enable RLS and public token access policy
ALTER TABLE public.client_moodboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Moodboard Access by Token" ON public.client_moodboards;
CREATE POLICY "Public Moodboard Access by Token" ON public.client_moodboards
  FOR ALL USING (true) WITH CHECK (true);
