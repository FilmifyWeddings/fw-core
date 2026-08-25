-- ====================================================================
-- MIGRATION: MAKE EMAIL NULLABLE IN FW_TEAM_MEMBERS & SAFE DEFAULTS
-- Migration File: supabase/migrations/20260825_fix_fw_team_members_nullable_email.sql
-- ====================================================================

-- 1. Drop NOT NULL constraint on email column if exists
ALTER TABLE IF EXISTS public.fw_team_members 
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN email SET DEFAULT NULL;

-- 2. Clean up any existing empty strings to NULL for database cleanliness
UPDATE public.fw_team_members 
SET email = NULL 
WHERE email IS NOT NULL AND TRIM(email) = '';

-- 3. Ensure staff_roles table exists and has proper unique constraint
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  workspace_id UUID NOT NULL,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_workspace_role UNIQUE (workspace_id, role_name)
);

-- Enable RLS & policies for staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "staff_roles_tenant_all" ON public.staff_roles;
  CREATE POLICY "staff_roles_tenant_all" ON public.staff_roles FOR ALL USING (true) WITH CHECK (true);
END $$;
