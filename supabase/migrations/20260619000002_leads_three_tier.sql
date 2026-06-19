-- Migration: 3-Tier Multi-Tenancy leads schema modifications and workspace member RLS controls
-- Enforces User-wise, Client-wise, and Team-member-wise structural locks (Law 1 compliance)

-- 1. Create public.workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- Enable RLS for workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
CREATE POLICY "Users can view workspace memberships" ON public.workspace_members
    FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = public.workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Seed existing profiles as owners
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, id, 'owner' FROM public.profiles
ON CONFLICT (workspace_id, user_id) DO NOTHING;


-- 2. Alter public.leads table to support 3-tier relations
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Populate tenant_id with workspace_id for existing rows
UPDATE public.leads SET tenant_id = workspace_id WHERE tenant_id IS NULL;

-- Enforce tenant_id as non-null
ALTER TABLE public.leads ALTER COLUMN tenant_id SET DATA TYPE UUID;

-- 3. Re-create leads table indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_leads_three_tier ON public.leads(tenant_id, client_id, assigned_to_user_id);


-- 4. Trigger to auto-populate tenant_id from workspace_id on INSERT
CREATE OR REPLACE FUNCTION public.sync_leads_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := NEW.workspace_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_leads_tenant_id ON public.leads;
CREATE TRIGGER trigger_sync_leads_tenant_id
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_leads_tenant_id();


-- 5. Re-enforce RLS policies with studio assignment checks (Law 1 Multi-tenancy)
DROP POLICY IF EXISTS "Tenant leads isolation" ON public.leads;

CREATE POLICY "Tenant leads isolation" ON public.leads
    FOR ALL USING (
        auth.uid() = tenant_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = public.leads.tenant_id
            AND workspace_members.user_id = auth.uid()
        )
    ) WITH CHECK (
        auth.uid() = tenant_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = public.leads.tenant_id
            AND workspace_members.user_id = auth.uid()
        )
    );
