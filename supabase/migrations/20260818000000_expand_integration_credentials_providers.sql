-- Migration: Expand integration_credentials provider support for distinct Google Services
-- Allows 'google_contacts', 'google_sheets', 'google_calendar', 'whatsapp', 'smtp', 'meta', 'custom_website', 'google'

DO $$
BEGIN
    -- Drop old check constraint if it exists
    ALTER TABLE public.integration_credentials 
    DROP CONSTRAINT IF EXISTS integration_credentials_provider_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Ensure RLS is active and policy is intact
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'integration_credentials' 
        AND policyname = 'Users can manage their own credentials'
    ) THEN
        CREATE POLICY "Users can manage their own credentials" 
            ON public.integration_credentials 
            FOR ALL 
            USING (auth.uid() = user_id) 
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
