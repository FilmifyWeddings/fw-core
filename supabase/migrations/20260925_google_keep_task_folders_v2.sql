-- Migration: 20260925_google_keep_task_folders_v2.sql
-- Description: Robust Google Keep style Task & Folder Cards with TEXT[] assigned_members, team & freelancer access by ID & email, and resilient RLS

-- ==============================================================================
-- 1. DROP ALL EXISTING POLICIES ON fw_task_folders & fw_tasks
-- (PostgreSQL requires dropping policies before altering column data types)
-- ==============================================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('fw_task_folders', 'fw_tasks')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ==============================================================================
-- 2. ENSURE COLUMNS & DATA TYPES IN fw_task_folders
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN assigned_members TEXT[] DEFAULT ARRAY[]::TEXT[];
    ELSE
        ALTER TABLE public.fw_task_folders ALTER COLUMN assigned_members TYPE TEXT[] USING assigned_members::TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'color_theme'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN color_theme TEXT DEFAULT 'white';
    END IF;
END $$;

-- ==============================================================================
-- 3. ENSURE COLUMNS & DATA TYPES IN fw_tasks
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN assigned_members TEXT[] DEFAULT ARRAY[]::TEXT[];
    ELSE
        ALTER TABLE public.fw_tasks ALTER COLUMN assigned_members TYPE TEXT[] USING assigned_members::TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'due_time'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN due_time TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    -- Drop foreign key constraint on assigned_to if it exists, so assigning a team member or freelancer doesn't fail
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'fw_tasks' 
          AND constraint_name = 'fw_tasks_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.fw_tasks DROP CONSTRAINT fw_tasks_assigned_to_fkey;
    END IF;
END $$;

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_assigned_members ON public.fw_task_folders USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_assigned_members ON public.fw_tasks USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_folder_completed ON public.fw_tasks(folder_id, is_completed);

-- ==============================================================================
-- 5. HELPER FUNCTION: CHECK USER ACCESS (BY UID, EMAIL, OR MEMBER ID)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_user_task_access(assigned_list TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        auth.uid()::TEXT = ANY(assigned_list)
        OR LOWER(COALESCE(auth.jwt()->>'email', '')) = ANY(SELECT LOWER(x) FROM unnest(assigned_list) x)
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE (wm.auth_user_id = auth.uid() OR LOWER(wm.email) = LOWER(auth.jwt()->>'email'))
              AND wm.id::TEXT = ANY(assigned_list)
        )
        OR EXISTS (
            SELECT 1 FROM public.fw_team_members ftm
            WHERE (ftm.auth_user_id = auth.uid() OR ftm.user_id = auth.uid() OR LOWER(ftm.email) = LOWER(auth.jwt()->>'email'))
              AND ftm.id::TEXT = ANY(assigned_list)
        );
$$;

-- ==============================================================================
-- 6. RLS POLICIES FOR fw_task_folders
-- ==============================================================================
ALTER TABLE public.fw_task_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Google Keep Task Folders Policy" ON public.fw_task_folders
    FOR ALL
    USING (
        -- Workspace Owner / Admin
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        -- Creator
        created_by = auth.uid() OR
        -- Assigned Team Member or Freelancer
        public.check_user_task_access(assigned_members)
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid() OR
        public.check_user_task_access(assigned_members)
    );

-- ==============================================================================
-- 7. RLS POLICIES FOR fw_tasks
-- ==============================================================================
ALTER TABLE public.fw_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Google Keep Tasks Policy" ON public.fw_tasks
    FOR ALL
    USING (
        -- Workspace Owner / Admin
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        -- Creator
        created_by = auth.uid() OR
        -- Assigned to user
        assigned_to = auth.uid() OR
        -- In task assigned_members array
        public.check_user_task_access(assigned_members) OR
        -- In folder's assigned_members array
        folder_id IN (
            SELECT id FROM public.fw_task_folders 
            WHERE public.check_user_task_access(assigned_members)
        )
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid() OR
        assigned_to = auth.uid() OR
        public.check_user_task_access(assigned_members) OR
        folder_id IN (
            SELECT id FROM public.fw_task_folders 
            WHERE public.check_user_task_access(assigned_members)
        )
    );
