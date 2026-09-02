-- ==============================================================================
-- SQL MIGRATION: CREATE / HEAL PROFILES TABLE & GRANT PERMISSIONS
-- Run this script in your Supabase SQL Editor to resolve all 400 Bad Requests on profiles
-- ==============================================================================

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    workspace_name TEXT DEFAULT 'My Studio',
    business_name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    logo_url TEXT,
    address TEXT,
    instagram_handle TEXT,
    youtube_handle TEXT,
    facebook_handle TEXT,
    whastboost_api_url TEXT,
    whastboost_token TEXT,
    whastboost_status TEXT DEFAULT 'disconnected',
    whastboost_device_id TEXT,
    meta_access_token TEXT,
    studio_settings JSONB DEFAULT '{}'::JSONB,
    leads_table_preferences JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add any potentially missing columns safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'workspace_name') THEN
        ALTER TABLE public.profiles ADD COLUMN workspace_name TEXT DEFAULT 'My Studio';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'logo_url') THEN
        ALTER TABLE public.profiles ADD COLUMN logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'studio_settings') THEN
        ALTER TABLE public.profiles ADD COLUMN studio_settings JSONB DEFAULT '{}'::JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'leads_table_preferences') THEN
        ALTER TABLE public.profiles ADD COLUMN leads_table_preferences JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

-- 3. Enable RLS and add idempotent policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 4. Grant full permissions
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated, anon;

-- 5. Auto-populate profiles from auth.users if missing
INSERT INTO public.profiles (id, email, full_name, workspace_name, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Studio Owner'),
    COALESCE(raw_user_meta_data->>'workspace_name', 'My Studio'),
    NOW(), 
    NOW()
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
