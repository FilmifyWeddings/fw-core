-- =====================================================================
-- MIGRATION: 20260816000000_auth_otps_and_password_resets.sql
-- Description: Creates tables for WhatsApp OTPs and Password Reset Tokens
-- =====================================================================

-- 1. Ensure phone column exists on profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index on phone for fast login by phone lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. Create auth_otps table for WhatsApp verification
CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    email TEXT,
    otp TEXT NOT NULL,
    type TEXT DEFAULT 'signup' NOT NULL CHECK (type IN ('signup', 'login', 'reset', 'verify')),
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    verified BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying active OTPs
CREATE INDEX IF NOT EXISTS idx_auth_otps_phone_expires ON public.auth_otps(phone, expires_at);

-- 3. Create password_resets table
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    used BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying reset tokens
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email);

-- Enable RLS (Service role can read/write everything)
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on auth_otps" ON public.auth_otps
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on password_resets" ON public.password_resets
    FOR ALL TO service_role USING (true) WITH CHECK (true);
