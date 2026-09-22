-- Migration: 20260925_google_keep_task_folders.sql
-- Description: Pure Google Keep style Task & Folder Cards with multi-member assignment and assignment-based RLS permissions

-- 1. Ensure required columns in fw_task_folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN assigned_members UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'color_theme'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN color_theme TEXT DEFAULT 'white';
    END IF;
END $$;

-- 2. Ensure required columns in fw_tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN assigned_members UUID[] DEFAULT ARRAY[]::UUID[];
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
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_assigned_members ON public.fw_task_folders USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_assigned_members ON public.fw_tasks USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_folder_completed ON public.fw_tasks(folder_id, is_completed);

-- 4. RLS Policies for fw_task_folders
ALTER TABLE public.fw_task_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace Admin and Assigned Team Folders Access" ON public.fw_task_folders;
CREATE POLICY "Workspace Admin and Assigned Team Folders Access" ON public.fw_task_folders
    FOR ALL
    USING (
        -- Workspace Owner / Admin
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        -- Creator
        created_by = auth.uid() OR
        -- Assigned Team Member
        auth.uid() = ANY(assigned_members)
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid() OR
        auth.uid() = ANY(assigned_members)
    );

-- 5. RLS Policies for fw_tasks
ALTER TABLE public.fw_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace Admin and Assigned Team Tasks Access" ON public.fw_tasks;
CREATE POLICY "Workspace Admin and Assigned Team Tasks Access" ON public.fw_tasks
    FOR ALL
    USING (
        -- Workspace Owner / Admin
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        -- Creator
        created_by = auth.uid() OR
        -- Assigned to user
        assigned_to = auth.uid() OR
        -- In assigned_members array
        auth.uid() = ANY(assigned_members) OR
        -- In folder's assigned_members array
        folder_id IN (
            SELECT id FROM public.fw_task_folders 
            WHERE auth.uid() = ANY(assigned_members)
        )
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid() OR
        assigned_to = auth.uid() OR
        auth.uid() = ANY(assigned_members) OR
        folder_id IN (
            SELECT id FROM public.fw_task_folders 
            WHERE auth.uid() = ANY(assigned_members)
        )
    );
