-- ====================================================================
-- MIGRATION: GEOFENCE EXEMPTION, COMPENSATION & PAYROLL COLUMNS
-- Migration File: supabase/migrations/20260825_attendance_geofence_exemption_and_payroll.sql
-- ====================================================================

-- 1. Ensure columns exist on fw_team_members
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS is_geofence_exempt BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS geofence_required BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'daily';
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '10:00:00';
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '19:00:00';
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS weekly_offs TEXT[] DEFAULT ARRAY['Sun'];
ALTER TABLE IF EXISTS fw_team_members ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure columns exist on attendance_records
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS early_arrival_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS early_checkout_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS total_pause_minutes INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS check_in_geofence_status TEXT DEFAULT 'verified';
ALTER TABLE IF EXISTS attendance_records ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;

-- 3. Indexes for fast payroll & monthly timesheet queries
CREATE INDEX IF NOT EXISTS idx_fw_team_members_user_id ON fw_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_member_date ON attendance_records(member_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date);
