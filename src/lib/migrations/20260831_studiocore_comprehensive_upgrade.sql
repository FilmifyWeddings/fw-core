-- =========================================================================
-- StudioCore Comprehensive Upgrade: Roles, Overnight Events & Drafts
-- Migration Date: 2026-08-31
-- =========================================================================

-- 1. Master Crew Roles Table (Unique Short Code per Workspace)
CREATE TABLE IF NOT EXISTS public.master_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  category TEXT DEFAULT 'Photography',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS master_crew_roles_ws_idx ON public.master_crew_roles(workspace_id);

-- Also ensure workspace_crew_roles exists
CREATE TABLE IF NOT EXISTS public.workspace_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  category TEXT DEFAULT 'Photography',
  is_default BOOLEAN DEFAULT false,
  display_order INT DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS workspace_crew_roles_ws_idx ON public.workspace_crew_roles(workspace_id);

-- 2. Update Events & Sub-events Table for Overnight Multi-Day, 12h Format & TBD Dates
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS is_date_tbd BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS is_overnight BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS start_time_12h TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS end_time_12h TEXT;

ALTER TABLE IF EXISTS public.fw_sub_events ADD COLUMN IF NOT EXISTS is_date_tbd BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.fw_sub_events ADD COLUMN IF NOT EXISTS is_overnight BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.fw_sub_events ADD COLUMN IF NOT EXISTS end_date TEXT;
ALTER TABLE IF EXISTS public.fw_sub_events ADD COLUMN IF NOT EXISTS start_time_12h TEXT;
ALTER TABLE IF EXISTS public.fw_sub_events ADD COLUMN IF NOT EXISTS end_time_12h TEXT;
ALTER TABLE IF EXISTS public.fw_sub_events ALTER COLUMN event_date DROP NOT NULL;

-- Project Manager columns on fw_projects
ALTER TABLE IF EXISTS public.fw_projects ADD COLUMN IF NOT EXISTS project_manager_id TEXT;
ALTER TABLE IF EXISTS public.fw_projects ADD COLUMN IF NOT EXISTS project_manager_name TEXT;
ALTER TABLE IF EXISTS public.fw_projects ALTER COLUMN main_date DROP NOT NULL;

-- 3. Update Quotations Table to support explicit Toggle Unmarking
ALTER TABLE IF EXISTS public.quotations ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- 4. Event Drafts Cache Table (Prevents accidental loss on refresh/close)
CREATE TABLE IF NOT EXISTS public.event_form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  user_id UUID,
  lead_id UUID,
  draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_form_drafts_ws_user_idx ON public.event_form_drafts(workspace_id, user_id);

-- 6. Helper to seed default 9 roles into any workspace that doesn't have them
CREATE OR REPLACE FUNCTION public.seed_default_workspace_crew_roles(ws_id UUID)
RETURNS VOID AS $$
BEGIN
  IF ws_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.workspace_crew_roles (workspace_id, name, short_code, category, is_default, display_order)
  VALUES
    (ws_id, 'Team Manager', 'TM', 'Management', true, 1),
    (ws_id, 'Traditional Photographer', 'TP', 'Photography', true, 2),
    (ws_id, 'Traditional Videographer', 'TV', 'Cinematography', true, 3),
    (ws_id, 'Candid Photographer', 'CP', 'Photography', true, 4),
    (ws_id, 'Cinematographer', 'CV', 'Cinematography', true, 5),
    (ws_id, 'Assistant', 'AS', 'Assistance', true, 6),
    (ws_id, 'Drone Pilot', 'DP', 'Drone', true, 7),
    (ws_id, 'Family Photographer', 'FP', 'Photography', true, 8),
    (ws_id, 'Reels Creator', 'RC', 'Social Media', true, 9)
  ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Automatically seed for all existing workspaces in database
DO $$
DECLARE
  ws RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    FOR ws IN SELECT id FROM public.workspaces LOOP
      PERFORM public.seed_default_workspace_crew_roles(ws.id);
    END LOOP;
  END IF;
END $$;
