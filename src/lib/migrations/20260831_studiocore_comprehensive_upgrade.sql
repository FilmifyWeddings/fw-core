-- =========================================================================
-- StudioCore Comprehensive Upgrade: Isolated Master Crew Roles, Overnight & Drafts
-- Migration Date: 2026-08-31
-- =========================================================================

-- 1. Ensure master_crew_roles table has correct schema & workspace isolation
CREATE TABLE IF NOT EXISTS public.master_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  category TEXT DEFAULT 'Photography',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS master_crew_roles_ws_idx ON public.master_crew_roles(workspace_id);

-- Also ensure workspace_crew_roles exists for backward compatibility
CREATE TABLE IF NOT EXISTS public.workspace_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
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

-- 2. Function to seed default crew roles for any workspace that doesn't have them yet
CREATE OR REPLACE FUNCTION public.seed_default_crew_for_workspace(target_ws_id UUID)
RETURNS void AS $$
BEGIN
  IF target_ws_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.master_crew_roles WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.master_crew_roles (workspace_id, name, short_code, category)
    VALUES
      (target_ws_id, 'Team Manager', 'TM', 'Management'),
      (target_ws_id, 'Candid Photographer', 'CP', 'Photography'),
      (target_ws_id, 'Cinematographer', 'CIN', 'Cinematography'),
      (target_ws_id, 'Traditional Photographer', 'TP', 'Photography'),
      (target_ws_id, 'Traditional Videographer', 'TV', 'Cinematography'),
      (target_ws_id, 'Assistant', 'AST', 'Assistance'),
      (target_ws_id, 'Drone Pilot', 'DR', 'Drone'),
      (target_ws_id, 'Family Photographer', 'FP', 'Photography')
    ON CONFLICT (workspace_id, name) DO NOTHING;

    INSERT INTO public.workspace_crew_roles (workspace_id, name, short_code, category, is_default, display_order)
    VALUES
      (target_ws_id, 'Team Manager', 'TM', 'Management', true, 1),
      (target_ws_id, 'Candid Photographer', 'CP', 'Photography', true, 2),
      (target_ws_id, 'Cinematographer', 'CIN', 'Cinematography', true, 3),
      (target_ws_id, 'Traditional Photographer', 'TP', 'Photography', true, 4),
      (target_ws_id, 'Traditional Videographer', 'TV', 'Cinematography', true, 5),
      (target_ws_id, 'Assistant', 'AST', 'Assistance', true, 6),
      (target_ws_id, 'Drone Pilot', 'DR', 'Drone', true, 7),
      (target_ws_id, 'Family Photographer', 'FP', 'Photography', true, 8)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger for all FUTURE newly created workspaces
CREATE OR REPLACE FUNCTION public.on_workspace_created_seed_crew()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_default_crew_for_workspace(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workspace_seed_crew ON public.workspaces;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    CREATE TRIGGER trg_workspace_seed_crew
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.on_workspace_created_seed_crew();
  END IF;
END $$;

-- 4. Seed all EXISTING workspaces right now (One-time migration)
DO $$
DECLARE
  ws RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    FOR ws IN SELECT id FROM public.workspaces LOOP
      PERFORM public.seed_default_crew_for_workspace(ws.id);
    END LOOP;
  END IF;
END $$;

-- 5. Update Events & Sub-events Table for Overnight Multi-Day, 12h Format & TBD Dates
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

-- 6. Update Quotations Table to support explicit Toggle Unmarking
ALTER TABLE IF EXISTS public.quotations ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- 7. Event Drafts Cache Table (Prevents accidental loss on refresh/close)
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

-- 8. Row Level Security Policies
ALTER TABLE public.master_crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_crew_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_drafts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'master_crew_roles' AND policyname = 'master_crew_roles_all') THEN
    CREATE POLICY "master_crew_roles_all" ON public.master_crew_roles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_crew_roles' AND policyname = 'workspace_crew_roles_all') THEN
    CREATE POLICY "workspace_crew_roles_all" ON public.workspace_crew_roles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_form_drafts' AND policyname = 'event_form_drafts_all') THEN
    CREATE POLICY "event_form_drafts_all" ON public.event_form_drafts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
