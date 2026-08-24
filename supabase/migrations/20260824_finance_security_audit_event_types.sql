-- ====================================================================
-- MIGRATION: FINANCE SECURITY VAULT, AUDIT LOGS & EVENT TYPES
-- Migration File: supabase/migrations/20260824_finance_security_audit_event_types.sql
-- ====================================================================

-- 1. Finance Security Settings (PIN & Password Protection)
CREATE TABLE IF NOT EXISTS public.finance_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  user_id UUID,
  is_locked BOOLEAN DEFAULT false,
  pin_hash TEXT,
  admin_email TEXT,
  master_password_hash TEXT,
  session_timeout_minutes INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Finance Audit Logs (Real-time Financial Activity Tracking)
CREATE TABLE IF NOT EXISTS public.finance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  client_id UUID REFERENCES public.workspace_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  log_type TEXT NOT NULL CHECK (log_type IN ('INCOME', 'EXPENSE', 'ADJUSTMENT', 'SECURITY')),
  amount NUMERIC DEFAULT 0,
  actor_name TEXT NOT NULL DEFAULT 'Admin',
  description TEXT NOT NULL,
  payment_mode TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Dynamic Event Types (Custom Event Categories per Workspace)
CREATE TABLE IF NOT EXISTS public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#f59e0b',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Pre-seed Default Event Types Function (Helper for new and existing workspaces)
CREATE OR REPLACE FUNCTION public.seed_default_event_types(p_workspace_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.event_types (workspace_id, name, color, is_default)
  VALUES
    (p_workspace_id, 'Wedding Photography', '#f59e0b', true),
    (p_workspace_id, 'Pre-Wedding Shoot', '#ec4899', true),
    (p_workspace_id, 'Engagement & Roka', '#8b5cf6', true),
    (p_workspace_id, 'Reception & Dinner', '#3b82f6', true),
    (p_workspace_id, 'Haldi & Mehndi', '#eab308', true),
    (p_workspace_id, 'Sangeet & Cocktail', '#f97316', true),
    (p_workspace_id, 'Corporate & Commercial', '#10b981', true),
    (p_workspace_id, 'Birthday & Anniversary', '#06b6d4', true),
    (p_workspace_id, 'Maternity & Baby Shower', '#14b8a6', true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_finance_security_workspace ON public.finance_security_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_workspace ON public.finance_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_client ON public.finance_audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_finance_audit_created ON public.finance_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_types_workspace ON public.event_types(workspace_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.finance_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on finance_security_settings" ON public.finance_security_settings;
CREATE POLICY "Allow all access on finance_security_settings" ON public.finance_security_settings
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on finance_audit_logs" ON public.finance_audit_logs;
CREATE POLICY "Allow all access on finance_audit_logs" ON public.finance_audit_logs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on event_types" ON public.event_types;
CREATE POLICY "Allow all access on event_types" ON public.event_types
  FOR ALL USING (true) WITH CHECK (true);
