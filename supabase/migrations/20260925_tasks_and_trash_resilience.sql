-- Migration: 20260925_tasks_and_trash_resilience.sql
-- Description: Add trash/soft-delete support and ensure foreign keys and columns do not block task creation

-- 1. Ensure is_trashed and trashed_at in fw_task_folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'is_trashed'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN is_trashed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'trashed_at'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN trashed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN assigned_members TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Drop rigid foreign key on created_by for folders so team members and staff can create folders without constraint failure
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'fw_task_folders' 
          AND constraint_name = 'fw_task_folders_created_by_fkey'
    ) THEN
        ALTER TABLE public.fw_task_folders DROP CONSTRAINT fw_task_folders_created_by_fkey;
    END IF;
END $$;

-- 2. Ensure is_trashed and trashed_at in fw_tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'is_trashed'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN is_trashed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'trashed_at'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN trashed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'assigned_members'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN assigned_members TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE public.fw_tasks ADD COLUMN parent_task_id UUID;
    END IF;

    -- Drop rigid foreign keys on fw_tasks so team members/freelancers can create and be assigned tasks without FK errors
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'fw_tasks' 
          AND constraint_name = 'fw_tasks_assigned_to_fkey'
    ) THEN
        ALTER TABLE public.fw_tasks DROP CONSTRAINT fw_tasks_assigned_to_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'fw_tasks' 
          AND constraint_name = 'fw_tasks_created_by_fkey'
    ) THEN
        ALTER TABLE public.fw_tasks DROP CONSTRAINT fw_tasks_created_by_fkey;
    END IF;
END $$;

-- 3. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_is_trashed ON public.fw_task_folders(is_trashed);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_is_trashed ON public.fw_tasks(is_trashed);
CREATE INDEX IF NOT EXISTS idx_fw_task_folders_assigned_members ON public.fw_task_folders USING GIN(assigned_members);
CREATE INDEX IF NOT EXISTS idx_fw_tasks_assigned_members ON public.fw_tasks USING GIN(assigned_members);
