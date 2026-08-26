-- =========================================================================
-- ENTERPRISE MULTI-TENANT RBAC & MEMBER CLASSIFICATION UPGRADE
-- Adds member_types (IN_HOUSE, FREELANCER, PARTNER) & Granular Permissions
-- =========================================================================

-- 1. Upgrade workspace_members table
ALTER TABLE IF EXISTS public.workspace_members 
  ADD COLUMN IF NOT EXISTS member_types TEXT[] DEFAULT '{"IN_HOUSE"}',
  ADD COLUMN IF NOT EXISTS primary_type TEXT DEFAULT 'IN_HOUSE',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'FREELANCER',
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"FREELANCER"}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- 2. Upgrade fw_team_members table
ALTER TABLE IF EXISTS public.fw_team_members
  ADD COLUMN IF NOT EXISTS member_types TEXT[] DEFAULT '{"IN_HOUSE"}',
  ADD COLUMN IF NOT EXISTS primary_type TEXT DEFAULT 'IN_HOUSE';

-- 3. Upgrade member_permissions table
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  leads_access VARCHAR(50) DEFAULT 'NONE',
  team_manager_access VARCHAR(50) DEFAULT 'ASSIGNED_ONLY_VIEW',
  quotations_access VARCHAR(50) DEFAULT 'NONE',
  post_production_access VARCHAR(50) DEFAULT 'ASSIGNED_ONLY',
  finance_access VARCHAR(50) DEFAULT 'NONE',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT member_permissions_member_id_key UNIQUE (member_id)
);

-- Upgrade existing columns in member_permissions if table existed
ALTER TABLE IF EXISTS public.member_permissions
  ADD COLUMN IF NOT EXISTS leads_access VARCHAR(50) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS team_manager_access VARCHAR(50) DEFAULT 'ASSIGNED_ONLY_VIEW',
  ADD COLUMN IF NOT EXISTS quotations_access VARCHAR(50) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS post_production_access VARCHAR(50) DEFAULT 'ASSIGNED_ONLY',
  ADD COLUMN IF NOT EXISTS finance_access VARCHAR(50) DEFAULT 'NONE';

-- 4. Enable Row Level Security & Non-blocking Policies
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read workspace_members" ON public.workspace_members;
    CREATE POLICY "Allow authenticated read workspace_members"
      ON public.workspace_members FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "Allow authenticated manage workspace_members" ON public.workspace_members;
    CREATE POLICY "Allow authenticated manage workspace_members"
      ON public.workspace_members FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow authenticated read member_permissions" ON public.member_permissions;
    CREATE POLICY "Allow authenticated read member_permissions"
      ON public.member_permissions FOR SELECT
      TO authenticated
      USING (true);

    DROP POLICY IF EXISTS "Allow authenticated manage member_permissions" ON public.member_permissions;
    CREATE POLICY "Allow authenticated manage member_permissions"
      ON public.member_permissions FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    -- Continue safely
END $$;
