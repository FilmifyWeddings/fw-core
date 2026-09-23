-- Migration: Add Soft Delete / Trash support across Clients, Finance, and Post-Production
-- Created: 2026-09-23

-- 1. workspace_clients
ALTER TABLE IF EXISTS workspace_clients 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_clients_is_deleted ON workspace_clients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_workspace_clients_status ON workspace_clients(status);

-- 2. client_finance_records
ALTER TABLE IF EXISTS client_finance_records 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_client_finance_records_is_deleted ON client_finance_records(is_deleted);
CREATE INDEX IF NOT EXISTS idx_client_finance_records_status ON client_finance_records(status);

-- 3. post_production_projects
ALTER TABLE IF EXISTS post_production_projects 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_post_production_projects_is_deleted ON post_production_projects(is_deleted);
CREATE INDEX IF NOT EXISTS idx_post_production_projects_overall_status ON post_production_projects(overall_status);
