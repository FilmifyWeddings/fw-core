-- ====================================================================
-- MIGRATION: ENTERPRISE ATTENDANCE, SMART GEOFENCING & STAFF ENGINE
-- Migration File: supabase/migrations/20260825_enterprise_attendance_geofencing.sql
-- ====================================================================

-- 1. Extend fw_team_members with Enterprise HR & Geofencing fields
ALTER TABLE IF EXISTS public.fw_team_members
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS role_id UUID,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT 19.0596,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT 72.8295,
  ADD COLUMN IF NOT EXISTS radius_meters NUMERIC DEFAULT 150,
  ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT 'Studio Main Office',
  ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS weekly_offs JSONB DEFAULT '["Sun"]'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- 2. Staff Roles Catalog
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_role UNIQUE (workspace_id, role_name)
);

-- 3. Company Holidays & Festive Calendar
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID NOT NULL,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_holiday_date UNIQUE (workspace_id, holiday_date)
);

-- 4. Extend attendance_records with Biometric & Work/Pause counters
ALTER TABLE IF EXISTS public.attendance_records
  ADD COLUMN IF NOT EXISTS check_in_selfie TEXT,
  ADD COLUMN IF NOT EXISTS check_out_selfie TEXT,
  ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pause_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_checkout BOOLEAN DEFAULT false;

-- 5. Attendance Pause & Out-of-Bounds Logs
CREATE TABLE IF NOT EXISTS public.attendance_pause_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID NOT NULL,
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.fw_team_members(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  reason TEXT DEFAULT 'Out of Bounds (Geofence Auto-Pause)',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_staff_roles_ws ON public.staff_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_ws_date ON public.company_holidays(workspace_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_att_pause_logs_record ON public.attendance_pause_logs(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_fw_team_members_user_ws ON public.fw_team_members(user_id);

-- Enable RLS
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_pause_logs ENABLE ROW LEVEL SECURITY;

-- Allow Workspace access policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['staff_roles', 'company_holidays', 'attendance_pause_logs']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_all" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%s_tenant_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
