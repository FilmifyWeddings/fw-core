-- ==============================================================================
-- StudioCore / FW-Core Multi-Device Cloud Persistence & Backend Integrity Migration
-- Date: 2026-10-23
-- Fixes:
-- 1. Team Manager Commercials & Member Rates (payout_frequency & UUID defaults)
-- 2. WhatsApp Contact Groups
-- 3. Partner & Vendor Deliverables
-- 4. Guest Album Photo Selections (gallery_album_selections table)
-- 5. Storage Physical Disk Allocations
-- 6. Leads Kanban Column & Filter Preferences (user_table_preferences table)
-- 7. Client & Project PM ID Text type safety
-- ==============================================================================

-- 1. Guest Album Photo Selections table (Real-time heart/star photo selection sync)
CREATE TABLE IF NOT EXISTS public.gallery_album_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gallery_id TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_name TEXT DEFAULT 'Guest Client',
    client_phone TEXT,
    selected_photo_ids JSONB DEFAULT '[]'::jsonb,
    max_limit INTEGER DEFAULT 50,
    total_count INTEGER DEFAULT 0,
    is_submitted BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(gallery_id, client_email)
);

CREATE INDEX IF NOT EXISTS idx_gallery_album_selections_lookup 
ON public.gallery_album_selections(gallery_id, client_email);

-- 2. User Table & Filter Preferences table (Multi-device leads/crm column sync)
CREATE TABLE IF NOT EXISTS public.user_table_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    table_key TEXT NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, table_key)
);

CREATE INDEX IF NOT EXISTS idx_user_table_preferences_user 
ON public.user_table_preferences(user_id, table_key);

-- 3. Workspace Team Member Rates: Add payout_frequency column
ALTER TABLE IF EXISTS public.workspace_team_member_rates 
ADD COLUMN IF NOT EXISTS payout_frequency TEXT DEFAULT 'daily';

-- 4. Ensure UUID generation defaults on team records
ALTER TABLE IF EXISTS public.team_salary_records 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS public.team_event_payouts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 5. Project Manager ID Text type safety (prevents UUID syntax errors with custom/prefixed PM IDs)
ALTER TABLE IF EXISTS public.workspace_clients 
ALTER COLUMN project_manager_id TYPE TEXT USING project_manager_id::text;

ALTER TABLE IF EXISTS public.fw_projects 
ALTER COLUMN project_manager_id TYPE TEXT USING project_manager_id::text;

-- 6. Row-Level Security & Access Policies
ALTER TABLE public.gallery_album_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Policies for gallery_album_selections
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gallery_album_selections' AND policyname = 'Allow public read access on gallery_album_selections'
    ) THEN
        CREATE POLICY "Allow public read access on gallery_album_selections" 
        ON public.gallery_album_selections FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gallery_album_selections' AND policyname = 'Allow public insert/update on gallery_album_selections'
    ) THEN
        CREATE POLICY "Allow public insert/update on gallery_album_selections" 
        ON public.gallery_album_selections FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policies for user_table_preferences
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_table_preferences' AND policyname = 'Allow all access to user_table_preferences'
    ) THEN
        CREATE POLICY "Allow all access to user_table_preferences" 
        ON public.user_table_preferences FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Grant Table Permissions to roles
GRANT ALL ON public.gallery_album_selections TO anon, authenticated, service_role;
GRANT ALL ON public.user_table_preferences TO anon, authenticated, service_role;
GRANT ALL ON public.workspace_team_member_rates TO anon, authenticated, service_role;
GRANT ALL ON public.team_salary_records TO anon, authenticated, service_role;
GRANT ALL ON public.team_event_payouts TO anon, authenticated, service_role;
GRANT ALL ON public.partner_album_orders TO anon, authenticated, service_role;
GRANT ALL ON public.storage_physical_disks TO anon, authenticated, service_role;
GRANT ALL ON public.storage_project_assets TO anon, authenticated, service_role;
