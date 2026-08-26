-- ==============================================================================
-- ENTERPRISE MULTI-TENANT ARCHITECTURE: CROSS-WORKSPACE RBAC & PARTNER PORTAL
-- ==============================================================================

-- 0. WORKSPACES TABLE (Ensures central workspace registry)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Studio',
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill workspaces from profiles if missing
INSERT INTO public.workspaces (id, owner_id, name, created_at, updated_at)
SELECT id, id, COALESCE(workspace_name, 'My Studio'), created_at, updated_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, updated_at = now();

-- 1. WORKSPACE MEMBERSHIPS (Links 1 User Email to Multiple Studio Workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  primary_role TEXT DEFAULT 'FREELANCER', -- 'OWNER', 'MANAGER', 'PHOTOGRAPHER', 'CINEMATOGRAPHER', 'EDITOR', 'ALBUM_LAB', 'FREELANCER'
  roles TEXT[] DEFAULT '{}', -- Multi-tagging: ['Photographer', 'Cinematographer', 'Drone Pilot', 'Editor', 'Album Designer', 'Printing Lab']
  status TEXT DEFAULT 'ACTIVE', -- 'INVITED', 'ACTIVE', 'SUSPENDED'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- 2. GRANULAR PERMISSION MATRIX (Configurable Per Studio Member)
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.workspace_members(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  leads_access TEXT DEFAULT 'NONE', -- 'NONE', 'ASSIGNED_ONLY', 'VIEW_ALL', 'FULL_EDIT'
  quotations_access TEXT DEFAULT 'NONE', -- 'NONE', 'VIEW_ONLY', 'MANAGE'
  team_manager_access TEXT DEFAULT 'NONE', -- 'NONE', 'VIEW_ASSIGNED', 'MANAGE_ALL'
  post_production_access TEXT DEFAULT 'ASSIGNED_ONLY', -- 'NONE', 'ASSIGNED_ONLY', 'FULL_ACCESS'
  finance_access TEXT DEFAULT 'NONE', -- 'NONE', 'VIEW_ONLY', 'MANAGE'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id)
);

-- 3. PROJECT DELIVERABLES & LAB VENDOR PIPELINE
CREATE TABLE IF NOT EXISTS public.project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID,
  project_name TEXT,
  assigned_member_id UUID REFERENCES public.workspace_members(id) ON DELETE SET NULL,
  deliverable_type TEXT NOT NULL, -- 'VIDEO_EDIT', 'PHOTO_EDIT', 'ALBUM_DESIGN', 'ALBUM_PRINTING'
  title TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'REVIEW_READY', 'CHANGES_REQUESTED', 'PRINTING', 'DISPATCHED', 'COMPLETED'
  drive_folder_url TEXT,
  preview_url TEXT,
  sheet_count INT DEFAULT 0,
  paper_finish TEXT DEFAULT 'MATTE', -- 'MATTE', 'GLOSS', 'METALLIC', 'VELVET'
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

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check membership in current active workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
    AND (user_id = auth.uid() OR email = auth.jwt() ->> 'email')
    AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy: Workspaces
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'Workspaces Owner & Member Access') THEN
    CREATE POLICY "Workspaces Owner & Member Access" ON public.workspaces FOR ALL
    USING (owner_id = auth.uid() OR is_workspace_member(id));
  END IF;
END $do$;

-- Policy: Workspace Members Isolation
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'Workspace Members Isolation Policy') THEN
    CREATE POLICY "Workspace Members Isolation Policy" ON public.workspace_members FOR ALL
    USING (
      user_id = auth.uid() 
      OR email = auth.jwt() ->> 'email'
      OR is_workspace_member(workspace_id)
    );
  END IF;
END $do$;

-- Policy: Member Permissions Isolation
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'member_permissions' AND policyname = 'Member Permissions Isolation Policy') THEN
    CREATE POLICY "Member Permissions Isolation Policy" ON public.member_permissions FOR ALL
    USING (is_workspace_member(workspace_id));
  END IF;
END $do$;

-- Policy: Deliverables Access
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_deliverables' AND policyname = 'Deliverables Access Policy') THEN
    CREATE POLICY "Deliverables Access Policy" ON public.project_deliverables FOR ALL
    USING (is_workspace_member(workspace_id));
  END IF;
END $do$;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_member_permissions_member ON public.member_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_ws ON public.project_deliverables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_assigned ON public.project_deliverables(assigned_member_id);
