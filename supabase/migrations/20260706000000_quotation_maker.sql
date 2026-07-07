-- Migration: Canva-Like Quotation Maker Schema
-- Description: Creates quotation_templates, quotations, and quotation_presets tables with strict RLS policies.

-- 1. Create quotation_templates table
CREATE TABLE IF NOT EXISTS public.quotation_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    thumbnail_url text,
    default_config jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on quotation_templates
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow all authenticated users to read templates
DROP POLICY IF EXISTS "Allow authenticated read templates" ON public.quotation_templates;
CREATE POLICY "Allow authenticated read templates" ON public.quotation_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Write policy: Allow all authenticated users to manage templates for convenience (or restrict to service role / admin)
DROP POLICY IF EXISTS "Allow authenticated manage templates" ON public.quotation_templates;
CREATE POLICY "Allow authenticated manage templates" ON public.quotation_templates
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- 2. Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    client_name text NOT NULL,
    couple_names text,
    current_page_index integer DEFAULT 0 NOT NULL,
    canvas_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    pricing_summary jsonb DEFAULT '{"regular_price": 0, "offer_price": 0, "savings": 0}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Owner isolation policies for quotations
DROP POLICY IF EXISTS "Tenant quotations isolation" ON public.quotations;
CREATE POLICY "Tenant quotations isolation" ON public.quotations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations(user_id);


-- 3. Create quotation_presets table
CREATE TABLE IF NOT EXISTS public.quotation_presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
    package_name text NOT NULL,
    data_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on quotation_presets
ALTER TABLE public.quotation_presets ENABLE ROW LEVEL SECURITY;

-- Owner isolation policies for quotation_presets
DROP POLICY IF EXISTS "Tenant presets isolation" ON public.quotation_presets;
CREATE POLICY "Tenant presets isolation" ON public.quotation_presets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON public.quotation_presets(user_id);


-- 4. Triggers to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quotation_templates_updated_at
    BEFORE UPDATE ON public.quotation_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trigger_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trigger_quotation_presets_updated_at
    BEFORE UPDATE ON public.quotation_presets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
