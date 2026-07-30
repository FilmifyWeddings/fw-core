-- ============================================================
-- MIGRATION: 20260730000000_baileys_user_isolation.sql
-- Enforce Strict 1:1 User-ID Isolation on baileys_sessions Table
-- ============================================================

-- 1. ADD user_id column IF NOT EXISTS
ALTER TABLE baileys_sessions ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Backfill user_id = workspace_id for existing rows where user_id is NULL
UPDATE baileys_sessions
SET user_id = workspace_id
WHERE user_id IS NULL;

-- 3. PURGE invalid, corrupt, mock, or empty workspace_id / user_id rows
DELETE FROM baileys_sessions
WHERE user_id IS NULL
   OR workspace_id IS NULL
   OR workspace_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
   OR user_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
   OR workspace_id = '00000000-0000-0000-0000-000000000000'
   OR user_id = '00000000-0000-0000-0000-000000000000';

-- 4. Add UNIQUE constraint on user_id (drop old constraint if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'baileys_sessions_user_id_key'
    ) THEN
        ALTER TABLE baileys_sessions ADD CONSTRAINT baileys_sessions_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE baileys_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if any
DROP POLICY IF EXISTS "baileys_sessions_select_policy" ON baileys_sessions;
DROP POLICY IF EXISTS "baileys_sessions_insert_policy" ON baileys_sessions;
DROP POLICY IF EXISTS "baileys_sessions_update_policy" ON baileys_sessions;
DROP POLICY IF EXISTS "baileys_sessions_delete_policy" ON baileys_sessions;

-- 7. Create Strict 1:1 RLS Policies enforcing auth.uid() = user_id
CREATE POLICY "baileys_sessions_select_policy" ON baileys_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "baileys_sessions_insert_policy" ON baileys_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "baileys_sessions_update_policy" ON baileys_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "baileys_sessions_delete_policy" ON baileys_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
