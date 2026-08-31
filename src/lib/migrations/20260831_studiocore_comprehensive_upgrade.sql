-- =========================================================================
-- StudioCore Comprehensive Upgrade: Isolated Master Crew Roles (RPC Auto-Seed & ID CRUD)
-- Migration Date: 2026-08-31
-- =========================================================================

-- 1. Master Crew Roles Table: Primary key ID pe based (name unique constraint removed)
CREATE TABLE IF NOT EXISTS public.master_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove conflicting name uniqueness constraint if it exists
ALTER TABLE public.master_crew_roles DROP CONSTRAINT IF EXISTS master_crew_roles_workspace_id_name_key;
ALTER TABLE public.master_crew_roles DROP CONSTRAINT IF EXISTS master_crew_roles_workspace_id_name_idx;

-- Fast index by workspace
CREATE INDEX IF NOT EXISTS master_crew_roles_ws_idx ON public.master_crew_roles(workspace_id);

-- 2. Auto-seed RPC Function: Jab bhi koi workspace fetch kare aur DB empty ho, yeh DB me insert karega
CREATE OR REPLACE FUNCTION public.get_or_seed_workspace_crew_roles(target_ws_id UUID)
RETURNS SETOF public.master_crew_roles AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.master_crew_roles WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.master_crew_roles (workspace_id, name, short_code)
    VALUES
      (target_ws_id, 'Team Manager', 'TM'),
      (target_ws_id, 'Candid Photographer', 'CP'),
      (target_ws_id, 'Cinematographer', 'CIN'),
      (target_ws_id, 'Traditional Photographer', 'TP'),
      (target_ws_id, 'Traditional Videographer', 'TV'),
      (target_ws_id, 'Assistant', 'AST'),
      (target_ws_id, 'Drone Pilot', 'DR'),
      (target_ws_id, 'Family Photographer', 'FP');
  END IF;

  RETURN QUERY 
  SELECT * FROM public.master_crew_roles 
  WHERE workspace_id = target_ws_id 
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 3. Seed all existing workspaces right now
DO $$
DECLARE
  ws RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    FOR ws IN SELECT id FROM public.workspaces LOOP
      PERFORM public.get_or_seed_workspace_crew_roles(ws.id);
    END LOOP;
  END IF;
END $$;

-- 4. Update Events & Sub-events Table for Overnight Multi-Day, 12h Format & TBD Dates
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

-- 5. Update Quotations Table to support explicit Toggle Unmarking
ALTER TABLE IF EXISTS public.quotations ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- 6. Event Drafts Cache Table (Prevents accidental loss on refresh/close)
CREATE TABLE IF NOT EXISTS public.event_form_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  lead_id UUID,
  draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_form_drafts_ws_user_idx ON public.event_form_drafts(workspace_id, user_id);

-- 7. Row Level Security Policies
ALTER TABLE public.master_crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'master_crew_roles' AND policyname = 'master_crew_roles_all') THEN
    CREATE POLICY "master_crew_roles_all" ON public.master_crew_roles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_form_drafts' AND policyname = 'event_form_drafts_all') THEN
    CREATE POLICY "event_form_drafts_all" ON public.event_form_drafts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
