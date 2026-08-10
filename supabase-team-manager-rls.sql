-- ====================================================================
-- SUPABASE SQL MIGRATION: TEAM MANAGER WORKSPACE & USER DATA ISOLATION
-- Ensures user_id columns exist and enables RLS policies on all 4 tables.
-- ====================================================================

-- 1. Ensure user_id column exists on fw_team_members
ALTER TABLE IF EXISTS fw_team_members
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- 2. Ensure user_id column exists on fw_projects
ALTER TABLE IF EXISTS fw_projects
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- 3. Ensure user_id column exists on fw_sub_events
ALTER TABLE IF EXISTS fw_sub_events
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- 4. Ensure user_id column exists on fw_assignments
ALTER TABLE IF EXISTS fw_assignments
ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

-- Create Indexes for High Performance User Querying
CREATE INDEX IF NOT EXISTS idx_fw_team_members_user_id ON fw_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_projects_user_id ON fw_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_sub_events_user_id ON fw_sub_events(user_id);
CREATE INDEX IF NOT EXISTS idx_fw_assignments_user_id ON fw_assignments(user_id);

-- Enable Row Level Security (RLS) on all 4 tables
ALTER TABLE fw_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fw_assignments ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- RLS POLICIES FOR fw_team_members
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own team members" ON fw_team_members;
CREATE POLICY "Users can manage their own team members"
ON fw_team_members
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- RLS POLICIES FOR fw_projects
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own projects" ON fw_projects;
CREATE POLICY "Users can manage their own projects"
ON fw_projects
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- RLS POLICIES FOR fw_sub_events
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own sub events" ON fw_sub_events;
CREATE POLICY "Users can manage their own sub events"
ON fw_sub_events
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- RLS POLICIES FOR fw_assignments
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own assignments" ON fw_assignments;
CREATE POLICY "Users can manage their own assignments"
ON fw_assignments
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);
