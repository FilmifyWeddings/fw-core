-- ==============================================================================
-- MASTER CREW ROLES: Clean Table, Open RLS Policy & Auto-Seeding RPC Function
-- ==============================================================================

-- 1. Table structure with user_id and workspace_id
CREATE TABLE IF NOT EXISTS public.master_crew_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  created_by UUID,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  is_customized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_master_crew_ws ON public.master_crew_roles(workspace_id);

-- Disable strict RLS blocking to ensure edits/deletes never fail silently
ALTER TABLE public.master_crew_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to workspace crew roles" ON public.master_crew_roles;
DROP POLICY IF EXISTS "master_crew_roles_all" ON public.master_crew_roles;

CREATE POLICY "Allow full access to workspace crew roles" 
ON public.master_crew_roles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Clean RPC function: Fetches data, seeds ONLY if brand new workspace
CREATE OR REPLACE FUNCTION public.get_workspace_crew_roles(target_ws_id UUID, target_user_id UUID DEFAULT NULL)
RETURNS SETOF public.master_crew_roles AS 
BEGIN
  -- Agar is workspace ke paas 1 bhi record nahi hai, tabhi default seed karein
  IF NOT EXISTS (SELECT 1 FROM public.master_crew_roles WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.master_crew_roles (workspace_id, created_by, name, short_code, is_customized)
    VALUES
      (target_ws_id, target_user_id, 'Team Manager', 'TM', false),
      (target_ws_id, target_user_id, 'Candid Photographer', 'CP', false),
      (target_ws_id, target_user_id, 'Cinematographer', 'CIN', false),
      (target_ws_id, target_user_id, 'Traditional Photographer', 'TP', false),
      (target_ws_id, target_user_id, 'Traditional Videographer', 'TV', false),
      (target_ws_id, target_user_id, 'Assistant', 'AST', false),
      (target_ws_id, target_user_id, 'Drone Pilot', 'DR', false),
      (target_ws_id, target_user_id, 'Family Photographer', 'FP', false);
  END IF;

  -- User ke existing (edited/customized) records hi return karein
  RETURN QUERY 
  SELECT * FROM public.master_crew_roles 
  WHERE workspace_id = target_ws_id 
  ORDER BY created_at ASC;
END;
 LANGUAGE plpgsql;
