-- ========================================================================================
-- ENTERPRISE SUPABASE DATA PERSISTENCE, MULTI-TENANT ISOLATION & ZERO DATA LOSS SCHEMA
-- Migration: 20260826_enterprise_data_persistence_and_multi_tenant_isolation.sql
-- ========================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 1. META INTEGRATION & PERMANENT PAGE TOKENS PIPELINE
-- ────────────────────────────────────────────────────────────────────────────────────────

-- 1.1 Meta Integrations (User connection level)
CREATE TABLE IF NOT EXISTS public.meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  facebook_user_id TEXT NOT NULL,
  user_name TEXT,
  long_lived_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, facebook_user_id)
);

-- 1.2 Meta Connected Pages (Permanent Page Access Token level)
CREATE TABLE IF NOT EXISTS public.meta_connected_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  integration_id UUID REFERENCES public.meta_integrations(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  permanent_page_token TEXT NOT NULL,
  is_webhook_subscribed BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, page_id)
);

-- 1.3 Meta Lead Forms
CREATE TABLE IF NOT EXISTS public.meta_lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  page_id TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT,
  status TEXT DEFAULT 'ACTIVE',
  is_enabled BOOLEAN DEFAULT false,
  is_sync_enabled BOOLEAN DEFAULT false,
  total_leads_count INT DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, form_id)
);

ALTER TABLE public.meta_lead_forms
  ADD COLUMN IF NOT EXISTS is_sync_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.fb_lead_forms
  ADD COLUMN IF NOT EXISTS is_sync_enabled BOOLEAN DEFAULT false;

-- 1.4 Lead Distribution Settings
CREATE TABLE IF NOT EXISTS public.lead_distribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  form_id TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  owners JSONB DEFAULT '[]'::jsonb,
  strategy TEXT DEFAULT 'round_robin',
  last_assigned_index INT DEFAULT -1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, form_id)
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 2. CRM LEADS TABLE (Zero Duplication, Multi-Field Support)
-- ────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  tenant_id UUID,
  meta_lead_id TEXT UNIQUE,
  form_id TEXT,
  source_form_id TEXT,
  form_tag TEXT,
  name TEXT,
  full_name TEXT,
  phone TEXT,
  phone_number TEXT,
  email TEXT,
  city TEXT,
  location TEXT,
  event_date TEXT,
  budget TEXT,
  source TEXT DEFAULT 'Facebook Ads',
  status TEXT DEFAULT 'new',
  score INT DEFAULT 0,
  score_reason TEXT,
  whatsapp_group_id UUID,
  raw_field_data JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  raw_meta_payload JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all enterprise columns exist on leads if table was already created
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS meta_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS form_id TEXT,
  ADD COLUMN IF NOT EXISTS source_form_id TEXT,
  ADD COLUMN IF NOT EXISTS form_tag TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS event_date TEXT,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Facebook Ads',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_reason TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_group_id UUID,
  ADD COLUMN IF NOT EXISTS raw_field_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_meta_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Deduplication index for Meta leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_lead_id 
  ON public.leads(meta_lead_id) 
  WHERE meta_lead_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 3. STAFF MEMBERS & ATTENDANCE GEOFENCE CONFIGURATIONS
-- ────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT DEFAULT NULL,
  role_id UUID,
  lat DOUBLE PRECISION DEFAULT 19.0596,
  lng DOUBLE PRECISION DEFAULT 72.8295,
  radius_meters INT DEFAULT 100,
  location_name TEXT DEFAULT 'Main Studio / Remote',
  shift_start TIME DEFAULT '10:00:00',
  shift_end TIME DEFAULT '19:00:00',
  weekly_offs JSONB DEFAULT '["Sun"]'::jsonb,
  daily_rate NUMERIC DEFAULT 0,
  monthly_salary NUMERIC DEFAULT 0,
  is_geofence_exempt BOOLEAN DEFAULT false,
  notes JSONB DEFAULT '{}'::jsonb,
  custom_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role_id UUID,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 19.0596,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 72.8295,
  ADD COLUMN IF NOT EXISTS radius_meters INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT 'Main Studio / Remote',
  ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS shift_end TIME DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS weekly_offs JSONB DEFAULT '["Sun"]'::jsonb,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_geofence_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Attendance Daily Shift Logs
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  staff_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  checkin_time TIMESTAMPTZ,
  checkin_selfie_url TEXT,
  checkin_lat DOUBLE PRECISION,
  checkin_lng DOUBLE PRECISION,
  checkout_time TIMESTAMPTZ,
  checkout_selfie_url TEXT,
  checkout_lat DOUBLE PRECISION,
  checkout_lng DOUBLE PRECISION,
  status TEXT DEFAULT 'Present',
  late_minutes INT DEFAULT 0,
  total_work_minutes INT DEFAULT 0,
  total_pause_minutes INT DEFAULT 0,
  is_auto_checkout BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, log_date)
);

-- Ensure fw_team_members table has nullable email and geofence exemption
CREATE TABLE IF NOT EXISTS public.fw_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  phone_number TEXT,
  whatsapp_number TEXT,
  email TEXT DEFAULT NULL,
  role TEXT,
  role_id UUID,
  avatar_url TEXT,
  latitude NUMERIC DEFAULT 19.0596,
  longitude NUMERIC DEFAULT 72.8295,
  radius_meters NUMERIC DEFAULT 150,
  location_name TEXT DEFAULT 'Studio Main Office',
  shift_start TIME DEFAULT '10:00:00',
  shift_end TIME DEFAULT '19:00:00',
  weekly_offs JSONB DEFAULT '["Sun"]'::jsonb,
  daily_rate NUMERIC DEFAULT 0,
  monthly_salary NUMERIC DEFAULT 0,
  is_geofence_exempt BOOLEAN DEFAULT false,
  custom_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  status TEXT DEFAULT 'Active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.fw_team_members 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN email SET DEFAULT NULL;

ALTER TABLE IF EXISTS public.fw_team_members
  ADD COLUMN IF NOT EXISTS is_geofence_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS role_id UUID,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC DEFAULT 0;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 4. FINANCE HANDLED BY & PAYMENT SCHEDULE STEPS
-- ────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  handled_by_options JSONB DEFAULT '["Sahil Dhonde", "Sushant Nawale", "Production Head", "Accounts Team"]'::jsonb,
  payment_term_steps JSONB DEFAULT '[
    {"step_name": "Token Amount", "percentage": 10},
    {"step_name": "Advance Amount", "percentage": 40},
    {"step_name": "On Wedding Day", "percentage": 40},
    {"step_name": "Final Delivery", "percentage": 10}
  ]'::jsonb,
  currency TEXT DEFAULT 'INR',
  gst_percentage NUMERIC DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_payment_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  client_id UUID,
  quotation_id UUID,
  step_name TEXT NOT NULL,
  percentage NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES & MULTI-TENANT ISOLATION
-- ────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_connected_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payment_milestones ENABLE ROW LEVEL SECURITY;

DO $rls$
BEGIN
  -- meta_integrations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meta_integrations' AND policyname = 'Users can manage their workspace meta integrations') THEN
    CREATE POLICY "Users can manage their workspace meta integrations"
      ON public.meta_integrations FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  -- meta_connected_pages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meta_connected_pages' AND policyname = 'Users can manage their workspace meta pages') THEN
    CREATE POLICY "Users can manage their workspace meta pages"
      ON public.meta_connected_pages FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  -- meta_lead_forms
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meta_lead_forms' AND policyname = 'Users can manage their workspace lead forms') THEN
    CREATE POLICY "Users can manage their workspace lead forms"
      ON public.meta_lead_forms FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  -- leads
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Users can manage their workspace leads') THEN
    CREATE POLICY "Users can manage their workspace leads"
      ON public.leads FOR ALL
      USING (auth.uid() = workspace_id OR auth.uid() = tenant_id)
      WITH CHECK (auth.uid() = workspace_id OR auth.uid() = tenant_id);
  END IF;

  -- staff_members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_members' AND policyname = 'Users can manage their workspace staff members') THEN
    CREATE POLICY "Users can manage their workspace staff members"
      ON public.staff_members FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  -- attendance_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_logs' AND policyname = 'Users can manage their workspace attendance logs') THEN
    CREATE POLICY "Users can manage their workspace attendance logs"
      ON public.attendance_logs FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;

  -- fw_team_members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_team_members' AND policyname = 'Users can manage their workspace team members') THEN
    CREATE POLICY "Users can manage their workspace team members"
      ON public.fw_team_members FOR ALL
      USING (auth.uid() = workspace_id OR auth.uid() = user_id)
      WITH CHECK (auth.uid() = workspace_id OR auth.uid() = user_id);
  END IF;

  -- workspace_finance_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_finance_settings' AND policyname = 'Users can manage their workspace finance settings') THEN
    CREATE POLICY "Users can manage their workspace finance settings"
      ON public.workspace_finance_settings FOR ALL
      USING (auth.uid() = workspace_id)
      WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $rls$;

-- ────────────────────────────────────────────────────────────────────────────────────────
-- 6. HIGH-PERFORMANCE MULTI-TENANT B-TREE INDEXES
-- ────────────────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_meta_integrations_ws ON public.meta_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_connected_pages_ws ON public.meta_connected_pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_connected_pages_page_id ON public.meta_connected_pages(page_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_forms_ws ON public.meta_lead_forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_lead_forms_form_id ON public.meta_lead_forms(form_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_members_ws ON public.staff_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_staff_date ON public.attendance_logs(staff_id, log_date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_ws ON public.attendance_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_team_members_ws ON public.fw_team_members(workspace_id);
