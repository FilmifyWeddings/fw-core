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

-- Project Manager columns on fw_projects
ALTER TABLE IF EXISTS public.fw_projects ADD COLUMN IF NOT EXISTS project_manager_id TEXT;
ALTER TABLE IF EXISTS public.fw_projects ADD COLUMN IF NOT EXISTS project_manager_name TEXT;

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

-- 5. Row Level Security Policies
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
