-- ==============================================================================
-- ENTERPRISE MULTI-TENANT ARCHITECTURE: CROSS-WORKSPACE RBAC & PARTNER PORTAL
-- ==============================================================================

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  name TEXT NOT NULL DEFAULT 'My Studio',
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE IF EXISTS public.workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

-- Ensure all workspaces columns exist
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'My Studio',
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill workspaces from profiles
INSERT INTO public.workspaces (id, owner_id, name, created_at, updated_at)
SELECT id, id, COALESCE(workspace_name, 'My Studio'), created_at, updated_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE
SET name = COALESCE(EXCLUDED.name, public.workspaces.name), updated_at = now();

-- 2. WORKSPACE MEMBERS TABLE (Add all missing columns if table already exists)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID,
  email TEXT,
  phone TEXT,
  name TEXT DEFAULT 'Team Member',
  avatar_url TEXT,
  primary_role TEXT DEFAULT 'FREELANCER',
  roles TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade existing workspace_members table with all enterprise columns
ALTER TABLE public.workspace_members 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Team Member',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'FREELANCER',
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. MEMBER PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  leads_access TEXT DEFAULT 'NONE',
  quotations_access TEXT DEFAULT 'NONE',
  team_manager_access TEXT DEFAULT 'NONE',
  post_production_access TEXT DEFAULT 'ASSIGNED_ONLY',
  finance_access TEXT DEFAULT 'NONE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id)
);

ALTER TABLE public.member_permissions
  ADD COLUMN IF NOT EXISTS leads_access TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS quotations_access TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS team_manager_access TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS post_production_access TEXT DEFAULT 'ASSIGNED_ONLY',
  ADD COLUMN IF NOT EXISTS finance_access TEXT DEFAULT 'NONE';

-- 4. PROJECT DELIVERABLES TABLE
CREATE TABLE IF NOT EXISTS public.project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  project_id UUID,
  project_name TEXT,
  assigned_member_id UUID REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  deliverable_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  drive_folder_url TEXT,
  preview_url TEXT,
  sheet_count INT DEFAULT 0,
  paper_finish TEXT DEFAULT 'MATTE',
  tracking_number TEXT,
  courier_partner TEXT,
  delivery_address TEXT,
  lab_bill_amount NUMERIC(10, 2) DEFAULT 0,
  lab_invoice_url TEXT,
  due_date TIMESTAMPTZ,
  notes TEXT,
  revision_comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
    AND (
      (user_id IS NOT NULL AND user_id = auth.uid())
      OR (email IS NOT NULL AND email = (auth.jwt() ->> 'email'))
    )
    AND (status = 'ACTIVE' OR status IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND (owner_id = auth.uid() OR id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 7. CLEAN RLS POLICIES (DROP & RECREATE)
DROP POLICY IF EXISTS "Workspaces Owner & Member Access" ON public.workspaces;
CREATE POLICY "Workspaces Owner & Member Access" ON public.workspaces FOR ALL
USING (owner_id = auth.uid() OR id = auth.uid() OR public.is_workspace_member(id));

DROP POLICY IF EXISTS "Workspace Members Isolation Policy" ON public.workspace_members;
CREATE POLICY "Workspace Members Isolation Policy" ON public.workspace_members FOR ALL
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (email IS NOT NULL AND email = (auth.jwt() ->> 'email'))
  OR public.is_workspace_member(workspace_id)
);

DROP POLICY IF EXISTS "Member Permissions Isolation Policy" ON public.member_permissions;
CREATE POLICY "Member Permissions Isolation Policy" ON public.member_permissions FOR ALL
USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Deliverables Access Policy" ON public.project_deliverables;
CREATE POLICY "Deliverables Access Policy" ON public.project_deliverables FOR ALL
USING (public.is_workspace_member(workspace_id));

-- 8. INDEXES FOR LIGHTNING FAST QUERIES
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_member_permissions_member ON public.member_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_ws ON public.project_deliverables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_assigned ON public.project_deliverables(assigned_member_id);
