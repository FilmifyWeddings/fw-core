-- Create app_features table for remote toggle releases
CREATE TABLE IF NOT EXISTS public.app_features (
    key text PRIMARY KEY,
    value_boolean boolean NOT NULL DEFAULT false,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public select (everyone needs to read the flags)
CREATE POLICY "Allow public read-only access to features" 
ON public.app_features FOR SELECT 
TO authenticated, anon
USING (true);

-- Create policy to allow service role write access to features
CREATE POLICY "Allow service role write access to features" 
ON public.app_features FOR ALL 
TO service_role
USING (true);

-- Create policy to allow sushantnawale700@gmail.com to update/insert flags directly
CREATE POLICY "Allow admin email update access to features"
ON public.app_features FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com');

CREATE POLICY "Allow admin email insert access to features"
ON public.app_features FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'sushantnawale700@gmail.com');

-- Seed value if it doesn't exist
INSERT INTO public.app_features (key, value_boolean)
VALUES ('is_baileys_feature_released', false)
ON CONFLICT (key) DO NOTHING;
