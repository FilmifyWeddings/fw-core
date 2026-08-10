-- ====================================================================
-- MIGRATION: TEAM MANAGER COMPLETE MULTI-TENANT WORKSPACE ISOLATION
-- Migration File: supabase/migrations/20260810_team_manager_isolation.sql
-- ====================================================================

-- 1. Ensure user_id column exists on all 4 tables
ALTER TABLE IF EXISTS fw_team_members
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE IF EXISTS fw_projects
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE IF EXISTS fw_sub_events
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

ALTER TABLE IF EXISTS fw_assignments
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- 2. SAFE BACKFILL MIGRATION FOR LEGACY NULL ROWS
-- Legacy NULL rows in Team Manager belong to primary admin user sushantnawale700@gmail.com (37c63a54-d4f1-4b99-b546-3d965cd23a37)
UPDATE fw_team_members
SET user_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
WHERE user_id IS NULL;

UPDATE fw_projects
SET user_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
WHERE user_id IS NULL;

UPDATE fw_sub_events
SET user_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
WHERE user_id IS NULL;

UPDATE fw_assignments
SET user_id = '37c63a54-d4f1-4b99-b546-3d965cd23a37'
WHERE user_id IS NULL;

-- 3. Create Performance Indexes for User-Owned Queries
CREATE INDEX IF NOT EXISTS idx_fw_team_members_user_id ON fw_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_projects_user_id ON fw_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_sub_events_user_id ON fw_sub_events(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_assignments_user_id ON fw_assignments(user_id);

-- 4. Enable Row Level Security (RLS) on all 4 tables
ALTER TABLE fw_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Drop any existing insecure policies
DROP POLICY IF EXISTS "Users can manage their own team members" ON fw_team_members;
DROP POLICY IF EXISTS "Users can manage their own projects" ON fw_projects;
DROP POLICY IF EXISTS "Users can manage their own sub events" ON fw_sub_events;
DROP POLICY IF EXISTS "Users can manage their own assignments" ON fw_assignments;
DROP POLICY IF EXISTS "Users manage own team members" ON fw_team_members;
DROP POLICY IF EXISTS "Users manage own projects" ON fw_projects;
DROP POLICY IF EXISTS "Users manage own sub events" ON fw_sub_events;
DROP POLICY IF EXISTS "Users manage own assignments" ON fw_assignments;

-- 6. Create Strict Non-Bypass RLS Security Policies (NO "OR user_id IS NULL")
CREATE POLICY "Strict user isolation for fw_team_members"
ON fw_team_members
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Strict user isolation for fw_projects"
ON fw_projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Strict user isolation for fw_sub_events"
ON fw_sub_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Strict user isolation for fw_assignments"
ON fw_assignments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
