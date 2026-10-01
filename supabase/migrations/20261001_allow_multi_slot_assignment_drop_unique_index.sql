-- ==============================================================================
-- Migration: 20261001_allow_multi_slot_assignment_drop_unique_index.sql
-- Description:
-- Drops restrictive partial unique index on fw_assignments and team_event_payouts
-- that prevented assigning the same crew member to multiple roles/slots in the
-- same sub-event (e.g. Traditional Videographer AND Drone Pilot, or TV and TV 2).
-- ==============================================================================

-- 1. Drop partial unique index on fw_assignments (sub_event_id, assigned_member_id)
DROP INDEX IF EXISTS public.idx_fw_assignments_sub_event_member;

-- 2. Drop unique index on team_event_payouts (sub_event_id, member_id) if it exists
DROP INDEX IF EXISTS public.idx_tep_sub_event_member;

-- 3. Ensure non-unique performance indexes exist for fast filtering without blocking duplicate slot assignments
CREATE INDEX IF NOT EXISTS idx_fw_assignments_sub_event_member_lookup 
ON public.fw_assignments (sub_event_id, assigned_member_id);

CREATE INDEX IF NOT EXISTS idx_tep_sub_event_member_lookup 
ON public.team_event_payouts (sub_event_id, member_id);
