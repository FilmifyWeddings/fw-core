-- ==============================================================================
-- MIGRATION: WORKSPACE / USER SCOPING, MULTI-TENANT ISOLATION & PERFORMANCE INDICES
-- ==============================================================================

-- 1. Ensure user_id & workspace_id columns exist on assignments and payouts
ALTER TABLE public.fw_assignments 
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.fw_assignments 
ADD COLUMN IF NOT EXISTS workspace_id UUID;

ALTER TABLE public.team_event_payouts 
ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.team_event_payouts 
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- 2. Backfill user_id and workspace_id in fw_assignments from parent fw_projects directly
UPDATE public.fw_assignments a
SET user_id = p.user_id,
    workspace_id = COALESCE(a.workspace_id, p.user_id)
FROM public.fw_projects p
WHERE a.project_id::text = p.id::text 
  AND (a.user_id IS NULL OR a.workspace_id IS NULL);

-- 3. Backfill user_id and workspace_id in team_event_payouts from parent fw_projects
UPDATE public.team_event_payouts tep
SET user_id = p.user_id,
    workspace_id = COALESCE(tep.workspace_id, p.user_id)
FROM public.fw_projects p
WHERE tep.project_id::text = p.id::text 
  AND (tep.user_id IS NULL OR tep.workspace_id IS NULL);

-- 4. High-performance indexes for zero-lag filtering
CREATE INDEX IF NOT EXISTS idx_fw_assignments_user_member 
ON public.fw_assignments (user_id, assigned_member_id);

CREATE INDEX IF NOT EXISTS idx_fw_assignments_ws_member 
ON public.fw_assignments (workspace_id, assigned_member_id);

CREATE INDEX IF NOT EXISTS idx_tep_user_member 
ON public.team_event_payouts (user_id, member_id);

CREATE INDEX IF NOT EXISTS idx_tep_ws_member 
ON public.team_event_payouts (workspace_id, member_id);
