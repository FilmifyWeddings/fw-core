-- Migration: 20260722000000_granular_team_manager.sql
-- Granular Supabase Relational Data Model for FW Team Manager & Operations Workstation

-- 1. Create or update fw_projects (Client / Card Level)
CREATE TABLE IF NOT EXISTS public.fw_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    client_name TEXT NOT NULL,
    status TEXT DEFAULT 'Active' NOT NULL,
    shipping_hdd_status TEXT DEFAULT 'None' NOT NULL,
    shipping_hdd_state TEXT DEFAULT 'PENDING' NOT NULL,
    main_date DATE,
    main_venue TEXT,
    quotation_files TEXT[] DEFAULT '{}'::text[],
    itinerary_doc_id TEXT,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table was previously created
ALTER TABLE public.fw_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.fw_projects ADD COLUMN IF NOT EXISTS shipping_hdd_status TEXT DEFAULT 'None';
ALTER TABLE public.fw_projects ADD COLUMN IF NOT EXISTS shipping_hdd_state TEXT DEFAULT 'PENDING';
ALTER TABLE public.fw_projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Create fw_sub_events (Card Sub-Event Level)
CREATE TABLE IF NOT EXISTS public.fw_sub_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE CASCADE NOT NULL,
    event_title TEXT NOT NULL,
    event_date DATE NOT NULL,
    venue_name TEXT,
    venue_map_link TEXT,
    roll_call_time TEXT,
    dismissal_estimate_time TEXT,
    shift_hours_slot TEXT,
    operational_notes TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create or update fw_team_members (Directory Registry Level)
CREATE TABLE IF NOT EXISTS public.fw_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    country_code TEXT DEFAULT '+91' NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    active_status BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fw_team_members ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91';
ALTER TABLE public.fw_team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. Create or update fw_assignments (Event-Wise Crew Allocation Level)
CREATE TABLE IF NOT EXISTS public.fw_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE CASCADE NOT NULL,
    sub_event_id UUID REFERENCES public.fw_sub_events(id) ON DELETE CASCADE,
    sub_event_name TEXT,
    sub_event_date DATE,
    start_time TEXT,
    end_time TEXT,
    required_role TEXT NOT NULL,
    assigned_member_id UUID REFERENCES public.fw_team_members(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS sub_event_id UUID REFERENCES public.fw_sub_events(id) ON DELETE CASCADE;
ALTER TABLE public.fw_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Enable RLS on all tables
ALTER TABLE public.fw_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_assignments ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies for authenticated / anonymous access
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_projects' AND policyname = 'Public projects access') THEN
    CREATE POLICY "Public projects access" ON public.fw_projects FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_sub_events' AND policyname = 'Public sub_events access') THEN
    CREATE POLICY "Public sub_events access" ON public.fw_sub_events FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_team_members' AND policyname = 'Public team_members access') THEN
    CREATE POLICY "Public team_members access" ON public.fw_team_members FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_assignments' AND policyname = 'Public assignments access') THEN
    CREATE POLICY "Public assignments access" ON public.fw_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $do$;
