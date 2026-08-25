-- ========================================================================================
-- MASTER SCHEMA MIGRATION: COMPLETE WORKFORCE, SMART GEOFENCING & BIOMETRIC ATTENDANCE
-- File: supabase/migrations/20260825_master_workforce_attendance_full_schema.sql
-- ========================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 1. TEAM MEMBERS (fw_team_members) — Nullable Email & Enterprise Geofencing Columns
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.fw_team_members 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN email SET DEFAULT NULL;

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
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 2. ATTENDANCE SETTINGS
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  require_selfie BOOLEAN DEFAULT true,
  require_geofence BOOLEAN DEFAULT true,
  grace_period_minutes INTEGER DEFAULT 15,
  default_shift_start TIME DEFAULT '10:00:00',
  default_shift_end TIME DEFAULT '19:00:00',
  half_day_threshold_hours NUMERIC DEFAULT 4.0,
  full_day_threshold_hours NUMERIC DEFAULT 8.0,
  overtime_threshold_hours NUMERIC DEFAULT 9.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_attendance_settings_user UNIQUE(user_id)
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 3. GEOFENCE LOCATIONS (Offices, Studios, Shoot Venues)
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters NUMERIC DEFAULT 150,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 4. WORK SHIFTS
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '10:00:00',
  end_time TIME NOT NULL DEFAULT '19:00:00',
  is_overnight BOOLEAN DEFAULT false,
  grace_period_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 5. STAFF ROLES CATALOG
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_role UNIQUE (workspace_id, role_name)
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 6. COMPANY HOLIDAYS & FESTIVE CALENDAR
-- ────────────────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 7. SECURE MEMBER ATTENDANCE LINKS (Personal Punch Portal URL)
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_member_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES public.fw_team_members(id) ON DELETE CASCADE,
  secure_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 8. ATTENDANCE RECORDS (Daily Master Punch Log with Biometrics & GPS)
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES public.fw_team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'week_off'
  check_in_time TIMESTAMPTZ,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  check_in_accuracy NUMERIC,
  check_in_photo_path TEXT,
  check_in_selfie TEXT,
  check_in_location_id UUID REFERENCES public.attendance_locations(id) ON DELETE SET NULL,
  check_in_verified BOOLEAN DEFAULT false,
  check_in_geofence_status TEXT DEFAULT 'verified', -- 'verified', 'outside_geofence'
  check_out_time TIMESTAMPTZ,
  check_out_lat NUMERIC,
  check_out_lng NUMERIC,
  check_out_accuracy NUMERIC,
  check_out_photo_path TEXT,
  check_out_selfie TEXT,
  check_out_verified BOOLEAN DEFAULT false,
  work_duration_minutes INTEGER DEFAULT 0,
  total_work_minutes INTEGER DEFAULT 0,
  break_duration_minutes INTEGER DEFAULT 0,
  total_pause_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  auto_checkout BOOLEAN DEFAULT false,
  device_info JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_member_date UNIQUE(member_id, date)
);

-- If attendance_records already existed, ensure all modern columns exist:
ALTER TABLE IF EXISTS public.attendance_records
  ADD COLUMN IF NOT EXISTS check_in_selfie TEXT,
  ADD COLUMN IF NOT EXISTS check_out_selfie TEXT,
  ADD COLUMN IF NOT EXISTS total_work_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pause_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_checkout BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS check_out_accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 9. ATTENDANCE BREAKS
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES public.fw_team_members(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  break_type TEXT DEFAULT 'lunch',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 10. ATTENDANCE PAUSE LOGS (Out-of-Bounds Auto-Pauses)
-- ────────────────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 11. LEAVE MANAGEMENT REQUESTS
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES public.fw_team_members(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'casual', -- 'casual', 'sick', 'paid', 'unpaid', 'half_day', 'emergency'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 12. PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fw_team_members_user_ws ON public.fw_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_member_date ON public.attendance_records(member_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON public.attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_locations_user ON public.attendance_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_links_token ON public.attendance_member_links(secure_token);
CREATE INDEX IF NOT EXISTS idx_staff_roles_ws ON public.staff_roles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_ws_date ON public.company_holidays(workspace_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_att_pause_logs_record ON public.attendance_pause_logs(attendance_record_id);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 13. ENABLE ROW LEVEL SECURITY & OPEN POLICIES
-- ────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_member_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_pause_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_leave_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'attendance_settings',
    'attendance_locations',
    'attendance_shifts',
    'attendance_member_links',
    'attendance_records',
    'attendance_breaks',
    'attendance_pause_logs',
    'staff_roles',
    'company_holidays',
    'attendance_leave_requests'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_tenant_all" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "%s_tenant_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 14. SUPABASE STORAGE BUCKETS SETUP ('avatars' & 'attendance-selfies')
-- ────────────────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-selfies', 'attendance-selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage open upload and read policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
  CREATE POLICY "Public Access to Avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Public Access to Attendance Selfies" ON storage.objects;
  CREATE POLICY "Public Access to Attendance Selfies" ON storage.objects FOR ALL USING (bucket_id = 'attendance-selfies') WITH CHECK (bucket_id = 'attendance-selfies');
END $$;
