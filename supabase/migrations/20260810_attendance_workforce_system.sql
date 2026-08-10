-- ====================================================================
-- MIGRATION: ADVANCED ATTENDANCE & WORKFORCE MANAGEMENT SYSTEM
-- Migration File: supabase/migrations/20260810_attendance_workforce_system.sql
-- ====================================================================

-- 1. Attendance Settings
CREATE TABLE IF NOT EXISTS attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  require_selfie BOOLEAN DEFAULT true,
  require_geofence BOOLEAN DEFAULT true,
  grace_period_minutes INTEGER DEFAULT 15,
  default_shift_start TIME DEFAULT '09:30:00',
  default_shift_end TIME DEFAULT '18:30:00',
  half_day_threshold_hours NUMERIC DEFAULT 4.5,
  full_day_threshold_hours NUMERIC DEFAULT 8.0,
  overtime_threshold_hours NUMERIC DEFAULT 9.0,
  photo_retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Geofence Attendance Locations (Office, Studios, Venues)
CREATE TABLE IF NOT EXISTS attendance_locations (
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

-- 3. Work Shifts
CREATE TABLE IF NOT EXISTS attendance_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_overnight BOOLEAN DEFAULT false,
  grace_period_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Secure Employee Personal Attendance Links
CREATE TABLE IF NOT EXISTS attendance_member_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES fw_team_members(id) ON DELETE CASCADE,
  secure_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance Daily Records Master
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES fw_team_members(id) ON DELETE CASCADE,
  project_id UUID REFERENCES fw_projects(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'week_off'
  check_in_time TIMESTAMPTZ,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,
  check_in_accuracy NUMERIC,
  check_in_photo_path TEXT,
  check_in_location_id UUID REFERENCES attendance_locations(id) ON DELETE SET NULL,
  check_in_verified BOOLEAN DEFAULT false,
  check_in_geofence_status TEXT DEFAULT 'verified', -- 'verified', 'outside_geofence', 'overridden'
  check_out_time TIMESTAMPTZ,
  check_out_lat NUMERIC,
  check_out_lng NUMERIC,
  check_out_photo_path TEXT,
  check_out_verified BOOLEAN DEFAULT false,
  work_duration_minutes INTEGER DEFAULT 0,
  break_duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  early_checkout_minutes INTEGER DEFAULT 0,
  shift_id UUID REFERENCES attendance_shifts(id) ON DELETE SET NULL,
  device_info JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_member_date UNIQUE(member_id, date)
);

-- 6. Attendance Breaks
CREATE TABLE IF NOT EXISTS attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES fw_team_members(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  break_type TEXT DEFAULT 'lunch',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Leave Management Requests
CREATE TABLE IF NOT EXISTS attendance_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES fw_team_members(id) ON DELETE CASCADE,
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

-- 8. Attendance Correction Requests
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  member_id UUID NOT NULL REFERENCES fw_team_members(id) ON DELETE CASCADE,
  attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
  requested_check_in TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Holiday Calendar
CREATE TABLE IF NOT EXISTS attendance_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Audit Log
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  performed_by UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_att_records_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_att_records_member_date ON attendance_records(member_id, date);
CREATE INDEX IF NOT EXISTS idx_att_member_links_token ON attendance_member_links(secure_token);
CREATE INDEX IF NOT EXISTS idx_att_leaves_member ON attendance_leave_requests(member_id, status);

-- Row Level Security (RLS)
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_member_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Strict Isolation Policies (auth.uid() = user_id OR auth.uid() = workspace_id)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'attendance_settings', 'attendance_locations', 'attendance_shifts', 
    'attendance_member_links', 'attendance_records', 'attendance_breaks', 
    'attendance_leave_requests', 'attendance_corrections', 'attendance_holidays', 
    'attendance_audit_logs'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Strict user isolation for %I" ON %I;
      CREATE POLICY "Strict user isolation for %I" ON %I
      FOR ALL USING (auth.uid() = user_id OR auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
