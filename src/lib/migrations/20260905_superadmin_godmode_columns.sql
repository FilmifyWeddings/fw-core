-- ==============================================================================
-- SQL MIGRATION: SUPERADMIN GOD-MODE COLUMNS & ACCESS GOVERNANCE
-- Run in Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Add SuperAdmin God-Mode columns safely
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'tenant';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Set platform_role = 'superadmin' for Sushant's explicit UID and administrator emails
UPDATE public.profiles 
SET platform_role = 'superadmin' 
WHERE id = 'f9359a12-3f2e-430c-9cec-2ec9841ec83e' 
   OR email ILIKE 'sushantnawale700@gmail.com' 
   OR email ILIKE 'filmifyweddings@gmail.com';

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_platform_role ON public.profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_platform_blocked ON public.profiles(is_platform_blocked);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
