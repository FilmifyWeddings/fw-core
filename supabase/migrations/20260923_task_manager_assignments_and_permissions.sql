-- Migration: 20260923_task_manager_assignments_and_permissions.sql
-- Description: Multi-member assignment support, In-House team visibility, strict personal vault isolation, and assignment-based RLS.

-- 1. Ensure assigned_members column exists in fw_tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fw_tasks' 
        AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN assigned_members UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- 2. Ensure assigned_members column exists in fw_task_folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fw_task_folders' 
        AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN assigned_members UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- 3. Create index on assigned_members using GIN
CREATE INDEX IF NOT EXISTS idx_fw_tasks_assigned_members ON public.fw_tasks USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_assigned_members ON public.fw_task_folders USING GIN(assigned_members);

-- 4. Re-configure Row-Level Security (RLS) for fw_task_folders
ALTER TABLE public.fw_task_folders ENABLE ROW LEVEL SECURITY;

-- Personal Folders: Strictly creator only (invisible to workspace owner and everyone else)
DROP POLICY IF EXISTS "Personal Folders Isolation" ON public.fw_task_folders;
CREATE POLICY "Personal Folders Isolation" ON public.fw_task_folders
    FOR ALL
    USING (
        is_personal = TRUE AND auth.uid() = created_by
    )
    WITH CHECK (
        is_personal = TRUE AND auth.uid() = created_by
    );

-- Studio/Shared Folders:
-- - Workspace Owner can see all studio folders in their workspace
-- - Folder creator can see the folder
-- - Assigned members can see the folder
DROP POLICY IF EXISTS "Studio Folders Shared Access" ON public.fw_task_folders;
CREATE POLICY "Studio Folders Shared Access" ON public.fw_task_folders
    FOR ALL
    USING (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            workspace_id = auth.uid() OR
            created_by = auth.uid() OR
            auth.uid() = ANY(assigned_members)
        )
    )
    WITH CHECK (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            workspace_id = auth.uid() OR
            created_by = auth.uid() OR
            auth.uid() = ANY(assigned_members)
        )
    );

-- 5. Re-configure Row-Level Security (RLS) for fw_tasks
ALTER TABLE public.fw_tasks ENABLE ROW LEVEL SECURITY;

-- Personal Tasks: Strictly creator only (invisible to workspace owner and everyone else)
DROP POLICY IF EXISTS "Personal Tasks Isolation" ON public.fw_tasks;
CREATE POLICY "Personal Tasks Isolation" ON public.fw_tasks
    FOR ALL
    USING (
        is_personal = TRUE AND auth.uid() = created_by
    )
    WITH CHECK (
        is_personal = TRUE AND auth.uid() = created_by
    );

-- Studio/Shared Tasks:
-- - Workspace Owner can see all studio tasks in their workspace
-- - Task creator can see the task
-- - Assigned user (assigned_to) can see the task
-- - Users in assigned_members can see the task
-- - Users assigned to the folder can see the task
DROP POLICY IF EXISTS "Studio Tasks Shared Access" ON public.fw_tasks;
CREATE POLICY "Studio Tasks Shared Access" ON public.fw_tasks
    FOR ALL
    USING (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            workspace_id = auth.uid() OR
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            auth.uid() = ANY(assigned_members) OR
            folder_id IN (
                SELECT id FROM public.fw_task_folders 
                WHERE auth.uid() = ANY(assigned_members)
            )
        )
    )
    WITH CHECK (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            workspace_id = auth.uid() OR
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            auth.uid() = ANY(assigned_members) OR
            folder_id IN (
                SELECT id FROM public.fw_task_folders 
                WHERE auth.uid() = ANY(assigned_members)
            )
        )
    );
