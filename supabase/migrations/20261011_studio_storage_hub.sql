-- ==============================================================================
-- StudioCore Storage Hub & Media Asset Lifecycle Management Migration
-- ==============================================================================

-- 1. Memory Cards Inventory (SD Cards, CFexpress, MicroSD)
CREATE TABLE IF NOT EXISTS storage_memory_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  card_name TEXT NOT NULL, -- e.g. "Sony Tough 128GB #1", "SanDisk Extreme 256GB #3"
  card_type TEXT DEFAULT 'SD_CARD', -- 'SD_CARD', 'CFEXPRESS_A', 'CFEXPRESS_B', 'MICRO_SD', 'OTHER'
  capacity_gb NUMERIC DEFAULT 128,
  speed_class TEXT DEFAULT 'V90 300MB/s',
  serial_number TEXT,
  color_tag TEXT DEFAULT '#F59E0B',
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'ASSIGNED', 'DUMP_PENDING', 'FORMATTED'
  assigned_to_crew_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, card_name)
);

-- 2. Physical Storage Disks (HDDs, SSDs, NAS with Hardware Catalog)
CREATE TABLE IF NOT EXISTS storage_physical_disks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  disk_name TEXT NOT NULL, -- e.g. "Samsung T7 2TB #1", "Lacie 4TB Rugged #2"
  disk_serial TEXT,
  disk_label TEXT,
  drive_letter TEXT,
  disk_type TEXT DEFAULT 'EXTERNAL_SSD', -- 'EXTERNAL_SSD', 'EXTERNAL_HDD', 'NVME_SSD', 'INTERNAL_HDD', 'NAS_SERVER'
  physical_location TEXT, -- e.g. "Desk 1", "Locker Shelf 2", "Edit Rig 1"
  total_capacity_gb NUMERIC DEFAULT 2000,
  free_capacity_gb NUMERIC DEFAULT 1500,
  total_capacity_bytes BIGINT DEFAULT 0,
  free_capacity_bytes BIGINT DEFAULT 0,
  assigned_to_user_name TEXT,
  is_currently_mounted BOOLEAN DEFAULT true,
  last_scanned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, disk_name)
);

-- 3. Connected Google Drive Accounts
CREATE TABLE IF NOT EXISTS storage_drive_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  account_email TEXT NOT NULL,
  account_label TEXT, -- e.g. "Primary Raw Backup", "Client Delivery Drive"
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

-- 4. Storage Project Assets (The Core Client Storage Cards)
CREATE TABLE IF NOT EXISTS storage_project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id TEXT, -- Linked Lead ID
  client_id TEXT, -- Linked Workspace Client ID
  client_name TEXT NOT NULL, -- e.g. "Pooja & Rahul Wedding"
  event_date TEXT,
  package_amount NUMERIC DEFAULT 0,
  booking_status TEXT DEFAULT 'booked',
  
  -- Sub-events with crew & assigned memory cards + copy checkmark
  sub_events JSONB DEFAULT '[]'::jsonb,
  
  -- Assigned physical hard drives/SSDs + local folder paths
  assigned_disks JSONB DEFAULT '[]'::jsonb,
  
  -- Google Drive cloud backup info + folder link
  google_drive_backup JSONB DEFAULT '{}'::jsonb,
  
  overall_storage_status TEXT DEFAULT 'INGESTING', -- 'INGESTING', 'COPIED_LOCAL', 'BACKED_UP_CLOUD', 'ARCHIVED'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, lead_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_cards_ws ON storage_memory_cards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_disks_ws ON storage_physical_disks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_drives_ws ON storage_drive_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_ws ON storage_project_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_lead ON storage_project_assets(lead_id);
CREATE INDEX IF NOT EXISTS idx_storage_assets_client ON storage_project_assets(client_id);

-- Enable Row Level Security (RLS)
ALTER TABLE storage_memory_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_physical_disks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_project_assets ENABLE ROW LEVEL SECURITY;

-- Permissive policies for workspace data
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace memory cards access') THEN
    CREATE POLICY "Allow workspace memory cards access" ON storage_memory_cards FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace physical disks access') THEN
    CREATE POLICY "Allow workspace physical disks access" ON storage_physical_disks FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace drive accounts access') THEN
    CREATE POLICY "Allow workspace drive accounts access" ON storage_drive_accounts FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow workspace project assets access') THEN
    CREATE POLICY "Allow workspace project assets access" ON storage_project_assets FOR ALL USING (true);
  END IF;
END $$;
