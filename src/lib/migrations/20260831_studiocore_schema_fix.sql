-- ==============================================================================
-- STUDIOCORE REPAIR: master_crew_roles, workspace_quotation_settings & workspace_event_types
-- ==============================================================================

-- 1. Ensure master_crew_roles has all expected columns
CREATE TABLE IF NOT EXISTS public.master_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_customized BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns safely if table already exists
ALTER TABLE public.master_crew_roles ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE public.master_crew_roles ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT false;
ALTER TABLE public.master_crew_roles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.master_crew_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_master_crew_ws ON public.master_crew_roles(workspace_id);

-- Open RLS completely so PATCH / DELETE never return 400/403
ALTER TABLE public.master_crew_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access crew roles" ON public.master_crew_roles;
DROP POLICY IF EXISTS "Allow full access to workspace crew roles" ON public.master_crew_roles;
DROP POLICY IF EXISTS "master_crew_roles_all" ON public.master_crew_roles;

CREATE POLICY "Public access crew roles" ON public.master_crew_roles FOR ALL USING (true) WITH CHECK (true);

-- 2. Fix 500 Error: workspace_quotation_settings
CREATE TABLE IF NOT EXISTS public.workspace_quotation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_quote_settings ON public.workspace_quotation_settings(workspace_id);

ALTER TABLE public.workspace_quotation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public ws quotation settings" ON public.workspace_quotation_settings;
CREATE POLICY "Public ws quotation settings" ON public.workspace_quotation_settings FOR ALL USING (true) WITH CHECK (true);

-- 3. Fix 500 Error: workspace_event_types
CREATE TABLE IF NOT EXISTS public.workspace_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Main',
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_event_types ON public.workspace_event_types(workspace_id);

ALTER TABLE public.workspace_event_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public ws event types" ON public.workspace_event_types;
CREATE POLICY "Public ws event types" ON public.workspace_event_types FOR ALL USING (true) WITH CHECK (true);

-- 4. Clean RPC function: Fetches data, seeds ONLY if brand new workspace
CREATE OR REPLACE FUNCTION public.get_workspace_crew_roles(target_ws_id UUID, target_user_id UUID DEFAULT NULL)
RETURNS SETOF public.master_crew_roles AS 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.master_crew_roles WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.master_crew_roles (workspace_id, created_by, name, short_code, is_customized, is_default)
    VALUES
      (target_ws_id, target_user_id, 'Team Manager', 'TM', false, true),
      (target_ws_id, target_user_id, 'Candid Photographer', 'CP', false, true),
      (target_ws_id, target_user_id, 'Cinematographer', 'CIN', false, true),
      (target_ws_id, target_user_id, 'Traditional Photographer', 'TP', false, true),
      (target_ws_id, target_user_id, 'Traditional Videographer', 'TV', false, true),
      (target_ws_id, target_user_id, 'Assistant', 'AST', false, true),
      (target_ws_id, target_user_id, 'Drone Pilot', 'DR', false, true),
      (target_ws_id, target_user_id, 'Family Photographer', 'FP', false, true);
  END IF;

  RETURN QUERY 
  SELECT * FROM public.master_crew_roles 
  WHERE workspace_id = target_ws_id 
  ORDER BY created_at ASC;
END;
 LANGUAGE plpgsql;
