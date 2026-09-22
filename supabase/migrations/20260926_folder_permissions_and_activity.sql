-- Migration: 20260926_folder_permissions_and_activity.sql
-- Description: Add member edit permissions to folders and create task/folder activity audit logs table

-- 1. Ensure allow_member_edits and pinned_by columns in fw_task_folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'allow_member_edits'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN allow_member_edits BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fw_task_folders' AND column_name = 'pinned_by'
    ) THEN
        ALTER TABLE public.fw_task_folders ADD COLUMN pinned_by TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
END $$;

-- 2. Create fw_task_activity_logs table for card-wise & day-by-day history
CREATE TABLE IF NOT EXISTS public.fw_task_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID,
    folder_id UUID NOT NULL,
    task_id UUID,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_email TEXT,
    actor_avatar TEXT,
    action_type TEXT NOT NULL, -- 'TASK_COMPLETED', 'TASK_UNCHECKED', 'TASK_CREATED', 'TASK_DELETED', 'DEADLINE_UPDATED', 'MEMBER_ASSIGNED', 'CARD_PINNED', 'PERMISSION_CHANGED', 'FOLDER_RENAMED'
    description TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for high-speed chronological lookups
CREATE INDEX IF NOT EXISTS idx_fw_task_activity_logs_folder_id ON public.fw_task_activity_logs(folder_id);
CREATE INDEX IF NOT EXISTS idx_fw_task_activity_logs_created_at ON public.fw_task_activity_logs(created_at DESC);
