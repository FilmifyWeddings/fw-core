-- Migration: Create integration_credentials table with multi-tenant RLS isolation
-- Enables storage of Meta OAuth, Google Workspace OAuth, and Custom WordPress/Elementor Webhook keys

CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('meta', 'google', 'custom_website')),
    access_token TEXT,
    refresh_token TEXT,
    webhook_secret_key TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider)
);

-- Enable Row Level Security (RLS) for isolated multi-tenant access (Law 1)
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for user isolated management
CREATE POLICY "Users can manage their own credentials" 
    ON public.integration_credentials 
    FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster webhook key lookups on unauthenticated routes
CREATE INDEX IF NOT EXISTS idx_integration_credentials_webhook_secret ON public.integration_credentials(webhook_secret_key);
