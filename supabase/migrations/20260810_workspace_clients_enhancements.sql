-- ====================================================================
-- MIGRATION: WORKSPACE CLIENTS ENHANCEMENTS & LEAD CONVERSION SUPPORT
-- Migration File: supabase/migrations/20260810_workspace_clients_enhancements.sql
-- ====================================================================

-- 1. Ensure table workspace_clients exists
CREATE TABLE IF NOT EXISTS workspace_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  workspace_id UUID DEFAULT auth.uid(),
  lead_id UUID,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  event_type TEXT DEFAULT 'Wedding',
  event_date DATE,
  total_package_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if table already existed
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS workspace_id UUID DEFAULT auth.uid();
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'Wedding';
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS total_package_amount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS workspace_clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_clients_user_id ON workspace_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_workspace_id ON workspace_clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_lead_id ON workspace_clients(lead_id);

-- 4. Enable RLS
ALTER TABLE workspace_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own workspace clients" ON workspace_clients;
CREATE POLICY "Users can manage their own workspace clients"
ON workspace_clients
FOR ALL
USING (auth.uid() = user_id OR auth.uid() = workspace_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = workspace_id);
