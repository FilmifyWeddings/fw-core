-- ==============================================================================
-- SQL MIGRATION: 100% SAFE CREATE / HEAL PROFILES TABLE & GRANT PERMISSIONS
-- Run this script in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Add ALL required columns safely (native IF NOT EXISTS)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workspace_name TEXT DEFAULT 'My Studio';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whastboost_api_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whastboost_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whastboost_status TEXT DEFAULT 'disconnected';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whastboost_device_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studio_settings JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leads_table_preferences JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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
ON CONFLICT (id) DO UPDATE 
SET 
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    workspace_name = COALESCE(public.profiles.workspace_name, EXCLUDED.workspace_name);

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
