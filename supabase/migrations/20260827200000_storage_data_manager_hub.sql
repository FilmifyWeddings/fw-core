-- ==============================================================================
-- StudioCore Data Manager & Multi-PC Storage Hub Migration
-- ==============================================================================

-- 1. Connected Google Drive Accounts
CREATE TABLE IF NOT EXISTS storage_drive_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  account_email TEXT NOT NULL,
  account_label TEXT, -- e.g., "Primary Raw Backup", "Teasers Drive"
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  total_storage_bytes BIGINT DEFAULT 0,
  used_storage_bytes BIGINT DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, account_email)
);

-- 2. Studio Machines Registry (For Background Windows Agents)
CREATE TABLE IF NOT EXISTS storage_agent_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  machine_name TEXT NOT NULL, -- e.g., "Editing-Rig-01 (Rohit)"
  machine_os TEXT DEFAULT 'Windows',
  agent_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT true,
  ip_address TEXT,
  active_drives_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Physical Storage Media (HDDs, SSDs, NAS with Hardware Fingerprint)
CREATE TABLE IF NOT EXISTS storage_physical_disks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  disk_name TEXT NOT NULL, -- e.g., "Lacie 4TB Rugged #1"
  disk_serial TEXT, -- Permanent hardware serial (e.g., "WD-WCC4N7...")
  disk_label TEXT, -- Volume label (e.g., "WEDDINGS_RAW_2026")
  drive_letter TEXT, -- Last mounted drive letter (e.g., "E:")
  disk_type TEXT DEFAULT 'EXTERNAL_HDD', -- 'EXTERNAL_HDD', 'NVME_SSD', 'INTERNAL', 'NAS', 'SD_CARD'
  physical_location TEXT, -- e.g., "Office Rack 2 - Shelf B"
  total_capacity_bytes BIGINT DEFAULT 0,
  free_capacity_bytes BIGINT DEFAULT 0,
  total_capacity_gb NUMERIC DEFAULT 0,
  free_capacity_gb NUMERIC DEFAULT 0,
  assigned_to_user_id TEXT, -- Member name or ID
  assigned_to_user_name TEXT,
  last_connected_machine_id UUID REFERENCES storage_agent_machines(id) ON DELETE SET NULL,
  is_currently_mounted BOOLEAN DEFAULT true,
  last_scanned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, disk_name)
);

-- 4. Unified Indexed Folders & Data Items (For Sub-millisecond Instant Search)
CREATE TABLE IF NOT EXISTS storage_indexed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  storage_source_type TEXT NOT NULL DEFAULT 'PHYSICAL_DISK', -- 'GOOGLE_DRIVE' | 'PHYSICAL_DISK'
  drive_account_id UUID REFERENCES storage_drive_accounts(id) ON DELETE CASCADE,
  physical_disk_id UUID REFERENCES storage_physical_disks(id) ON DELETE CASCADE,
  client_id TEXT, -- Linked client ID
  client_name TEXT, -- Client / Couple Name for instant search
  
  folder_name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  relative_path TEXT,
  external_folder_id TEXT, -- Google Drive folder ID or file path
  web_view_link TEXT, -- Direct link to open in Google Drive
  
  total_size_bytes BIGINT DEFAULT 0,
  photo_count INT DEFAULT 0,
  video_count INT DEFAULT 0,
  other_files_count INT DEFAULT 0,
  
  event_category TEXT DEFAULT 'RAW_PHOTOS', -- 'RAW_PHOTOS', 'RAW_VIDEOS', 'SELECTION', 'EDITS', 'DELIVERABLES'
  tags TEXT[] DEFAULT '{}',
  
  last_modified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fast Index for sub-millisecond full text search
CREATE INDEX IF NOT EXISTS idx_storage_items_workspace ON storage_indexed_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_items_search ON storage_indexed_items USING gin(to_tsvector('english', folder_name || ' ' || folder_path));
CREATE INDEX IF NOT EXISTS idx_storage_disks_workspace ON storage_physical_disks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_drives_workspace ON storage_drive_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_machines_workspace ON storage_agent_machines(workspace_id);

-- Enable RLS and permissive policies for multi-tenant workspace
ALTER TABLE storage_drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_agent_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_physical_disks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_indexed_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace drive accounts access') THEN
    CREATE POLICY "Allow workspace drive accounts access" ON storage_drive_accounts FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace agent machines access') THEN
    CREATE POLICY "Allow workspace agent machines access" ON storage_agent_machines FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace physical disks access') THEN
    CREATE POLICY "Allow workspace physical disks access" ON storage_physical_disks FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace indexed items access') THEN
    CREATE POLICY "Allow workspace indexed items access" ON storage_indexed_items FOR ALL USING (true);
  END IF;
END $$;
