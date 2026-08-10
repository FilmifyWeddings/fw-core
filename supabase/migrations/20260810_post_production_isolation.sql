-- ====================================================================
-- MIGRATION: POST-PRODUCTION PROJECTS USER ISOLATION & RLS POLICIES
-- Migration File: supabase/migrations/20260810_post_production_isolation.sql
-- ====================================================================

-- 1. Ensure table post_production_projects exists
CREATE TABLE IF NOT EXISTS post_production_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  workspace_id UUID DEFAULT auth.uid(),
  client_id UUID REFERENCES workspace_clients(id) ON DELETE CASCADE,
  project_manager_id TEXT,
  project_manager_name TEXT DEFAULT 'Sushant (Lead Manager)',
  overall_status TEXT DEFAULT 'active',
  deliverables JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if table already existed
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS workspace_id UUID DEFAULT auth.uid();
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES workspace_clients(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS project_manager_id TEXT;
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS project_manager_name TEXT DEFAULT 'Sushant (Lead Manager)';
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS overall_status TEXT DEFAULT 'active';
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS deliverables JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS post_production_projects ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_post_prod_user_id ON post_production_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_post_prod_workspace_id ON post_production_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_prod_client_id ON post_production_projects(client_id);

-- 4. Enable Row Level Security (RLS) for 100% User Isolation
ALTER TABLE post_production_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own post-production projects" ON post_production_projects;
DROP POLICY IF EXISTS "Strict user isolation for post_production_projects" ON post_production_projects;

CREATE POLICY "Strict user isolation for post_production_projects"
ON post_production_projects
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = workspace_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);
