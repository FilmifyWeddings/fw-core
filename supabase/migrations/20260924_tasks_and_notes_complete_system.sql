-- Migration: 20260924_tasks_and_notes_complete_system.sql
-- Description: Complete Production-Ready Task Management + Notes Workspace for StudioCore
-- Includes: Subtasks, Nested Tasks, Google Keep / Apple Notes style Notes, Labels, Comments, Activity History, Reminders, Templates

-- 1. Enhance fw_tasks table with subtask, nesting, priority, and pinning columns
DO $$
BEGIN
    -- parent_task_id for nested / hierarchical subtasks
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN parent_task_id UUID REFERENCES public.fw_tasks(id) ON DELETE CASCADE;
    END IF;

    -- is_pinned
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    END IF;

    -- is_archived
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;

    -- color (for pastel note tints: white, cream, beige, soft-yellow, soft-blue, soft-green, soft-pink, soft-lavender)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'color'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN color TEXT DEFAULT 'white';
    END IF;

    -- labels (array of string tags: e.g. Filmify Weddings, Post Production, Album, Personal)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'labels'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN labels TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- due_time (e.g. "19:00", "7:00 PM")
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'due_time'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN due_time TEXT;
    END IF;

    -- reminders (JSONB array of reminder triggers: e.g. [{ "time": "2026-09-22T19:00:00Z", "type": "1h_before" }])
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'reminders'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN reminders JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- position (for manual drag-and-drop ordering)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'position'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN position INTEGER DEFAULT 0;
    END IF;
END $$;

-- Indexes on fw_tasks
CREATE INDEX IF NOT EXISTS idx_fw_tasks_parent_task_id ON public.fw_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_is_pinned ON public.fw_tasks(is_pinned);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_is_archived ON public.fw_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_labels ON public.fw_tasks USING GIN(labels);

-- 2. Table: fw_notes (Google Keep & Apple Notes style standalone notes)
CREATE TABLE IF NOT EXISTS public.fw_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.workspace_clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE SET NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    checklist_items JSONB DEFAULT '[]'::jsonb, -- [{ "id": "uuid", "text": "Couple entry", "done": false }]
    color TEXT DEFAULT 'white', -- 'white', 'cream', 'beige', 'soft-yellow', 'soft-blue', 'soft-green', 'soft-pink', 'soft-lavender'
    labels TEXT[] DEFAULT ARRAY[]::TEXT[],
    attachments JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fw_notes_workspace_id ON public.fw_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fw_notes_created_by ON public.fw_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_fw_notes_is_pinned ON public.fw_notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_fw_notes_is_archived ON public.fw_notes(is_archived);
CREATE INDEX IF NOT EXISTS idx_fw_notes_labels ON public.fw_notes USING GIN(labels);

-- 3. Table: fw_task_comments (Discussion thread & @mentions)
CREATE TABLE IF NOT EXISTS public.fw_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.fw_tasks(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    mentions TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fw_task_comments_task_id ON public.fw_task_comments(task_id);

-- 4. Table: fw_task_activity (Automated Audit Timeline)
CREATE TABLE IF NOT EXISTS public.fw_task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.fw_tasks(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'CREATED', 'COMPLETED', 'UNCOMPLETED', 'DEADLINE_CHANGED', 'ASSIGNEE_CHANGED', 'PRIORITY_CHANGED', 'COMMENT_ADDED', 'SUBTASK_ADDED'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fw_task_activity_task_id ON public.fw_task_activity(task_id);

-- 5. Table: fw_task_labels (Custom workspace labels)
CREATE TABLE IF NOT EXISTS public.fw_task_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT 'neutral', -- 'amber', 'rose', 'emerald', 'sky', 'indigo', 'purple', 'neutral'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fw_task_labels_workspace_id ON public.fw_task_labels(workspace_id);

-- 6. Enable RLS
ALTER TABLE public.fw_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_task_labels ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Workspace Notes Access" ON public.fw_notes;
CREATE POLICY "Workspace Notes Access" ON public.fw_notes
    FOR ALL
    USING (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid()
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR
        workspace_id = auth.uid() OR
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "Workspace Comments Access" ON public.fw_task_comments;
CREATE POLICY "Workspace Comments Access" ON public.fw_task_comments
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Workspace Activity Access" ON public.fw_task_activity;
CREATE POLICY "Workspace Activity Access" ON public.fw_task_activity
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Workspace Labels Access" ON public.fw_task_labels;
CREATE POLICY "Workspace Labels Access" ON public.fw_task_labels
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);
