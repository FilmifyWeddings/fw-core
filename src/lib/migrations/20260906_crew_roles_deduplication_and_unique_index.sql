-- ==============================================================================
-- MIGRATION: CREW ROLES DEDUPLICATION, HARMONIZATION & UNIQUE CONSTRAINT
-- ==============================================================================

-- 1. Deduplicate existing rows in public.master_crew_roles
-- Retain the earliest created row for each (workspace_id, LOWER(TRIM(name)))
DELETE FROM public.master_crew_roles
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY workspace_id, LOWER(TRIM(name))
             ORDER BY created_at ASC, id ASC
           ) AS rnum
    FROM public.master_crew_roles
  ) t
  WHERE t.rnum > 1
);

-- 2. Harmonize default short codes for known core roles
UPDATE public.master_crew_roles
SET short_code = 'TV'
WHERE LOWER(TRIM(name)) = 'traditional videographer' AND short_code != 'TV';

UPDATE public.master_crew_roles
SET short_code = 'TP'
WHERE LOWER(TRIM(name)) = 'traditional photographer' AND short_code != 'TP';

UPDATE public.master_crew_roles
SET short_code = 'CV'
WHERE LOWER(TRIM(name)) IN ('cinematographer', 'cinematic videographer') AND short_code != 'CV';

UPDATE public.master_crew_roles
SET short_code = 'CP'
WHERE LOWER(TRIM(name)) = 'candid photographer' AND short_code != 'CP';

UPDATE public.master_crew_roles
SET short_code = 'DP'
WHERE LOWER(TRIM(name)) = 'drone pilot' AND short_code != 'DP';

UPDATE public.master_crew_roles
SET short_code = 'AS'
WHERE LOWER(TRIM(name)) = 'assistant' AND short_code != 'AS';

UPDATE public.master_crew_roles
SET short_code = 'TM'
WHERE LOWER(TRIM(name)) = 'team manager' AND short_code != 'TM';

UPDATE public.master_crew_roles
SET short_code = 'FP'
WHERE LOWER(TRIM(name)) = 'family photographer' AND short_code != 'FP';

-- 3. Enforce unique index on (workspace_id, LOWER(TRIM(name))) to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_master_crew_roles_ws_lower_name 
ON public.master_crew_roles (workspace_id, LOWER(TRIM(name)));

-- 4. Update get_workspace_crew_roles RPC to be idempotent and return deduplicated roles
CREATE OR REPLACE FUNCTION public.get_workspace_crew_roles(target_ws_id UUID, target_user_id UUID DEFAULT NULL)
RETURNS SETOF public.master_crew_roles AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.master_crew_roles WHERE workspace_id = target_ws_id) THEN
    INSERT INTO public.master_crew_roles (workspace_id, created_by, name, short_code, is_customized)
    VALUES
      (target_ws_id, target_user_id, 'Team Manager', 'TM', false),
      (target_ws_id, target_user_id, 'Candid Photographer', 'CP', false),
      (target_ws_id, target_user_id, 'Cinematographer', 'CV', false),
      (target_ws_id, target_user_id, 'Traditional Photographer', 'TP', false),
      (target_ws_id, target_user_id, 'Traditional Videographer', 'TV', false),
      (target_ws_id, target_user_id, 'Assistant', 'AS', false),
      (target_ws_id, target_user_id, 'Drone Pilot', 'DP', false),
      (target_ws_id, target_user_id, 'Family Photographer', 'FP', false)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY 
  SELECT DISTINCT ON (LOWER(TRIM(name))) * 
  FROM public.master_crew_roles 
  WHERE workspace_id = target_ws_id 
  ORDER BY LOWER(TRIM(name)), created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. Safe Remapping: Remap any corrupted fw_assignments where a videographer member was assigned to 'Traditional Photographer' / 'TP'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fw_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fw_team_members') THEN
    UPDATE public.fw_assignments a
    SET required_role = 'Traditional Videographer'
    FROM public.fw_team_members m
    WHERE a.assigned_member_id::text = m.id::text
      AND a.required_role IN ('Traditional Photographer', 'TP')
      AND (
        m.primary_role ILIKE '%traditional videographer%'
        OR m.primary_role ILIKE '%videographer%'
        OR m.primary_role ILIKE '%tv%'
      );
  END IF;
END $$;

-- Also align corresponding team_event_payouts records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_event_payouts')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fw_team_members') THEN
    UPDATE public.team_event_payouts p
    SET role = 'Traditional Videographer'
    FROM public.fw_team_members m
    WHERE p.member_id::text = m.id::text
      AND p.role IN ('Traditional Photographer', 'TP')
      AND (
        m.primary_role ILIKE '%traditional videographer%'
        OR m.primary_role ILIKE '%videographer%'
        OR m.primary_role ILIKE '%tv%'
      );
  END IF;
END $$;
