-- Migration to create Team Manager & Operations Workstation Tables

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.fw_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    client_name TEXT NOT NULL,
    main_date DATE NOT NULL,
    main_venue TEXT NOT NULL,
    quotation_files TEXT[] DEFAULT '{}'::text[],
    itinerary_doc_id TEXT,
    is_archived BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.fw_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    active_status BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Assignments Table
CREATE TABLE IF NOT EXISTS public.fw_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID REFERENCES public.fw_projects(id) ON DELETE CASCADE NOT NULL,
    sub_event_name TEXT NOT NULL,
    sub_event_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    required_role TEXT NOT NULL,
    assigned_member_id UUID REFERENCES public.fw_team_members(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create WhatsApp Logs Table
CREATE TABLE IF NOT EXISTS public.fw_whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    assignment_id UUID REFERENCES public.fw_assignments(id) ON DELETE CASCADE NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    response_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.fw_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fw_whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_projects' AND policyname = 'Users can manage their own projects') THEN
    CREATE POLICY "Users can manage their own projects" ON public.fw_projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_team_members' AND policyname = 'Users can manage their own team members') THEN
    CREATE POLICY "Users can manage their own team members" ON public.fw_team_members FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_assignments' AND policyname = 'Users can manage their own assignments') THEN
    CREATE POLICY "Users can manage their own assignments" ON public.fw_assignments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fw_whatsapp_logs' AND policyname = 'Users can manage their own whatsapp logs') THEN
    CREATE POLICY "Users can manage their own whatsapp logs" ON public.fw_whatsapp_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $do$;
