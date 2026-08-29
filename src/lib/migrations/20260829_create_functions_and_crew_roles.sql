-- ==============================================================================
-- WORKSPACE FUNCTIONS (EVENT TYPES) & CREW ROLES (WITH SHORT CODES) MIGRATION
-- Workspace Isolation & Row Level Security (RLS) Active
-- ==============================================================================

-- 1. Create workspace_event_types table
CREATE TABLE IF NOT EXISTS public.workspace_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Wedding',
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_workspace_event_types_name UNIQUE (workspace_id, name)
);

-- 2. Create workspace_crew_roles table (with short_code column)
CREATE TABLE IF NOT EXISTS public.workspace_crew_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    short_code TEXT NOT NULL,
    category TEXT DEFAULT 'Photography',
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_workspace_crew_roles_name UNIQUE (workspace_id, name)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.workspace_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_crew_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for workspace_event_types
DROP POLICY IF EXISTS "Users can view their workspace event types" ON public.workspace_event_types;
CREATE POLICY "Users can view their workspace event types"
ON public.workspace_event_types FOR SELECT
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert their workspace event types" ON public.workspace_event_types;
CREATE POLICY "Users can insert their workspace event types"
ON public.workspace_event_types FOR INSERT
WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their workspace event types" ON public.workspace_event_types;
CREATE POLICY "Users can update their workspace event types"
ON public.workspace_event_types FOR UPDATE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their workspace event types" ON public.workspace_event_types;
CREATE POLICY "Users can delete their workspace event types"
ON public.workspace_event_types FOR DELETE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- 5. RLS Policies for workspace_crew_roles
DROP POLICY IF EXISTS "Users can view their workspace crew roles" ON public.workspace_crew_roles;
CREATE POLICY "Users can view their workspace crew roles"
ON public.workspace_crew_roles FOR SELECT
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert their workspace crew roles" ON public.workspace_crew_roles;
CREATE POLICY "Users can insert their workspace crew roles"
ON public.workspace_crew_roles FOR INSERT
WITH CHECK (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their workspace crew roles" ON public.workspace_crew_roles;
CREATE POLICY "Users can update their workspace crew roles"
ON public.workspace_crew_roles FOR UPDATE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their workspace crew roles" ON public.workspace_crew_roles;
CREATE POLICY "Users can delete their workspace crew roles"
ON public.workspace_crew_roles FOR DELETE
USING (auth.uid() = workspace_id OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));
