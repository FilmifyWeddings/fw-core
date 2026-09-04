-- ========================================================================================
-- MIGRATION: ATTENDANCE AUDIT TIMELINE, TIMING METRICS & PAYROLL REPAIR
-- File: supabase/migrations/20260904_attendance_audit_timeline_and_payroll_fix.sql
-- ========================================================================================

-- 1. Ensure attendance_logs has audit metrics and selfie columns
ALTER TABLE IF EXISTS public.attendance_logs
  ADD COLUMN IF NOT EXISTS early_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS punch_in_selfie TEXT,
  ADD COLUMN IF NOT EXISTS punch_out_selfie TEXT;

-- 2. Ensure indexes exist for fast member_id and date queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_member_date ON public.attendance_logs(member_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON public.attendance_logs(date);

-- 3. Ensure fw_team_members has all attendance & compensation fields
ALTER TABLE IF EXISTS public.fw_team_members
  ADD COLUMN IF NOT EXISTS is_geofence_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS weekly_offs JSONB DEFAULT '["Sun"]'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;
