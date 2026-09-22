-- Migration: 20260922_luxury_task_manager_system.sql
-- Description: Apple Notes & Google Keep style Luxury Cream Task & Post-Production Management System
-- Features: Group Folders, Action Items, Bidirectional Client Sync, Strict Privacy Isolation (Personal Vault vs Studio Tasks)

-- 1. Table: fw_task_folders (Group / Project Folders)
CREATE TABLE IF NOT EXISTS public.fw_task_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.workspace_clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    color_theme TEXT DEFAULT 'amber', -- 'amber', 'rose', 'emerald', 'sky', 'indigo', 'neutral'
    icon TEXT DEFAULT 'folder',
    is_personal BOOLEAN DEFAULT FALSE, -- If TRUE, owned strictly by creator, hidden from workspace owner
    is_pinned BOOLEAN DEFAULT FALSE,
    assigned_members UUID[] DEFAULT ARRAY[]::UUID[], -- Array of user IDs permitted to access this folder
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Table: fw_tasks (Individual Checklist / Action Items)
CREATE TABLE IF NOT EXISTS public.fw_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES public.fw_task_folders(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.workspace_clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'POST_PRODUCTION', -- 'POST_PRODUCTION', 'DELIVERABLE', 'SHOOT_PREP', 'PAYMENT', 'GENERAL'
    sub_category TEXT, -- 'RAW_BACKUP', 'SELECTION', 'COLOR_GRADING', 'TEASER', 'ALBUM_DESIGN', 'PRINTING'
    priority TEXT DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'
    status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'completed'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_personal BOOLEAN DEFAULT FALSE, -- If TRUE, completely invisible to workspace owner
    checklist_items JSONB DEFAULT '[]'::jsonb, -- Mini nested checklist: [{ "id": "uuid", "text": "Teaser Cut", "done": false }]
    attachments JSONB DEFAULT '[]'::jsonb, -- Reference links or storage paths
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Performance Indices
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_workspace_id ON public.fw_task_folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_client_id ON public.fw_task_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_created_by_personal ON public.fw_task_folders(created_by, is_personal);

CREATE INDEX IF NOT EXISTS idx_fw_tasks_workspace_client ON public.fw_tasks(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_due_completed ON public.fw_tasks(due_date, is_completed);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_created_by_personal ON public.fw_tasks(created_by, is_personal);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_folder_id ON public.fw_tasks(folder_id);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.fw_task_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for fw_task_folders
-- Personal Folders: Creator only (Workspace owner CANNOT view)
DROP POLICY IF EXISTS "Personal Folders Isolation" ON public.fw_task_folders;
CREATE POLICY "Personal Folders Isolation" ON public.fw_task_folders
    FOR ALL
    USING (
        is_personal = TRUE AND auth.uid() = created_by
    )
    WITH CHECK (
        is_personal = TRUE AND auth.uid() = created_by
    );

-- Studio/Shared Folders: Workspace Owner or Assigned Members or Creator
DROP POLICY IF EXISTS "Studio Folders Shared Access" ON public.fw_task_folders;
CREATE POLICY "Studio Folders Shared Access" ON public.fw_task_folders
    FOR ALL
    USING (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            created_by = auth.uid() OR
            auth.uid() = ANY(assigned_members)
        )
    )
    WITH CHECK (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            created_by = auth.uid() OR
            auth.uid() = ANY(assigned_members)
        )
    );

-- 6. RLS Policies for fw_tasks
-- Personal Tasks: Creator only (Workspace owner CANNOT view)
DROP POLICY IF EXISTS "Personal Tasks Isolation" ON public.fw_tasks;
CREATE POLICY "Personal Tasks Isolation" ON public.fw_tasks
    FOR ALL
    USING (
        is_personal = TRUE AND auth.uid() = created_by
    )
    WITH CHECK (
        is_personal = TRUE AND auth.uid() = created_by
    );

-- Studio/Shared Tasks: Workspace Owner or Assigned User or Creator or Folder Member
DROP POLICY IF EXISTS "Studio Tasks Shared Access" ON public.fw_tasks;
CREATE POLICY "Studio Tasks Shared Access" ON public.fw_tasks
    FOR ALL
    USING (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            folder_id IN (SELECT id FROM public.fw_task_folders WHERE auth.uid() = ANY(assigned_members))
        )
    )
    WITH CHECK (
        is_personal = FALSE AND (
            workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
            created_by = auth.uid() OR
            assigned_to = auth.uid() OR
            folder_id IN (SELECT id FROM public.fw_task_folders WHERE auth.uid() = ANY(assigned_members))
        )
    );
