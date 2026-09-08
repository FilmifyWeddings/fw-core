-- Migration: Add Sales Person (SP) crew role and automatic trigger for new studios
-- Date: 2026-09-08

-- 1. Ensure crew roles table exists & has unique constraint per user
CREATE TABLE IF NOT EXISTS public.studio_crew_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_crew_role UNIQUE (user_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_studio_crew_roles_user 
ON public.studio_crew_roles(user_id);

-- 2. Insert 'Sales Person' for ALL existing studio owners
INSERT INTO public.studio_crew_roles (user_id, role_name, short_code, is_default)
SELECT id, 'Sales Person', 'SP', TRUE 
FROM auth.users
ON CONFLICT (user_id, role_name) DO NOTHING;

-- 3. Automatic Trigger: New studio registrations get 'Sales Person' role by default
CREATE OR REPLACE FUNCTION public.handle_new_studio_default_roles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.studio_crew_roles (user_id, role_name, short_code, is_default)
    VALUES 
        (NEW.id, 'Sales Person', 'SP', TRUE),
        (NEW.id, 'Senior Cinematographer', 'SC', TRUE),
        (NEW.id, 'Traditional Photographer', 'TP', TRUE),
        (NEW.id, 'Candid Photographer', 'CP', TRUE),
        (NEW.id, 'Drone Pilot', 'DP', TRUE),
        (NEW.id, 'Cinematographer', 'CV', TRUE)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_seed_default_crew_roles ON auth.users;
CREATE TRIGGER tr_seed_default_crew_roles
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_studio_default_roles();
