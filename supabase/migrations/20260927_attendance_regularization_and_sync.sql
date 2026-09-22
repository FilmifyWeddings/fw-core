-- =========================================================================================
-- MIGRATION: 20260927_attendance_regularization_and_sync.sql
-- Description:
--   1. Syncs all Freelancer classifications from workspace_members into fw_team_members so
--      freelancers never default to or remain as 'IN_HOUSE'.
--   2. Ensures proper indexes on attendance_records and attendance_logs for robust manual
--      regularization upserts by Admin.
-- =========================================================================================

-- 1. Sync Freelancer classification from workspace_members to fw_team_members
UPDATE public.fw_team_members tm
SET primary_type = wm.primary_type,
    member_types = wm.member_types
FROM public.workspace_members wm
WHERE (tm.id = wm.id OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER(wm.email)))
  AND wm.primary_type = 'FREELANCER'
  AND (tm.primary_type IS DISTINCT FROM 'FREELANCER' OR tm.member_types IS DISTINCT FROM ARRAY['FREELANCER']);

-- 2. Explicitly ensure Swapnil Tikate is marked as FREELANCER
UPDATE public.fw_team_members
SET primary_type = 'FREELANCER',
    member_types = ARRAY['FREELANCER']
WHERE name ILIKE '%Swapnil%' OR email = 'asfbasdnasdj@gmail.com';

-- 3. Ensure unique constraint on attendance_records for conflict-free upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_records_member_date_key'
  ) THEN
    -- If duplicate rows exist for any (member_id, date), keep the latest one
    DELETE FROM public.attendance_records a
    USING public.attendance_records b
    WHERE a.id < b.id
      AND a.member_id = b.member_id
      AND a.date = b.date;

    ALTER TABLE public.attendance_records
    ADD CONSTRAINT attendance_records_member_date_key UNIQUE (member_id, date);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: create unique index if constraint creation fails
  CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_member_date_unique
  ON public.attendance_records(member_id, date);
END $$;

-- 4. Index on attendance_logs for fast lookup by member and date
CREATE INDEX IF NOT EXISTS idx_attendance_logs_member_date
ON public.attendance_logs(member_id, date);

-- 5. Index on attendance_records for date ranges
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_range
ON public.attendance_records(member_id, date);
