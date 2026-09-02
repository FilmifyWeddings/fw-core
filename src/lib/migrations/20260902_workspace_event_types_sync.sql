-- =========================================================
-- WORKSPACE EVENT TYPES SYNC & PERSISTENCE ENGINE
-- =========================================================

-- 1. Ensure Table Structure
CREATE TABLE IF NOT EXISTS public.workspace_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_workspace_event_types_name UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_ws_event_types_wsid ON public.workspace_event_types(workspace_id);

-- 2. Row Level Security Policies
ALTER TABLE public.workspace_event_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS Allow all access to workspace_event_types ON public.workspace_event_types;
CREATE POLICY Allow all access to workspace_event_types ON public.workspace_event_types FOR ALL USING (true) WITH CHECK (true);

-- 3. RPC Function: Auto-seed defaults ONLY on first fetch
CREATE OR REPLACE FUNCTION public.get_workspace_event_types(target_ws_id UUID, target_user_id UUID DEFAULT NULL)
RETURNS SETOF public.workspace_event_types AS 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspace_event_types WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.workspace_event_types (workspace_id, name, category, is_default, display_order)
    VALUES
      (target_ws_id, 'Wedding', 'Main Wedding', true, 0),
      (target_ws_id, 'Reception', 'Main Wedding', true, 1),
      (target_ws_id, 'Engagement', 'Pre-Wedding', true, 2),
      (target_ws_id, 'Haldi', 'Pre-Wedding', true, 3),
      (target_ws_id, 'Mehendi', 'Pre-Wedding', true, 4),
      (target_ws_id, 'Sangeet', 'Pre-Wedding', true, 5),
      (target_ws_id, 'Pre-Wedding Shoot', 'Shoots', true, 6),
      (target_ws_id, 'Post-Wedding Shoot', 'Shoots', true, 7),
      (target_ws_id, 'Maternity Shoot', 'Shoots', false, 8),
      (target_ws_id, 'Birthday Party', 'Party', false, 9),
      (target_ws_id, 'Baby Shower', 'Party', false, 10),
      (target_ws_id, 'Corporate Event', 'General', false, 11)
    ON CONFLICT (workspace_id, name) DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT * FROM public.workspace_event_types
  WHERE workspace_id = target_ws_id
  ORDER BY display_order ASC, name ASC;
END;
 LANGUAGE plpgsql SECURITY DEFINER;
