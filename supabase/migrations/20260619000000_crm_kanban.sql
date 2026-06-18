-- Migration: CRM Kanban stages & Lead stage association
-- Description: Creates the crm_stages table, drops the status check constraint on leads, adds stage_id and stage_position to leads, and sets up RLS and default stages.

-- 1. Create crm_stages table
CREATE TABLE IF NOT EXISTS public.crm_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    color text, -- hex code or style identifier
    position integer NOT NULL, -- sorting position
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(workspace_id, name),
    UNIQUE(workspace_id, position)
);

-- 2. Enable RLS on crm_stages
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Tenant stages isolation" ON public.crm_stages;

-- Create policy for tenant isolation
CREATE POLICY "Tenant stages isolation" ON public.crm_stages
    FOR ALL USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_stages_workspace_id ON public.crm_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_position ON public.crm_stages(position);

-- 3. Modify leads table
-- Add columns for stage association and column ordering
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.crm_stages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS stage_position numeric DEFAULT 0 NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_position ON public.leads(stage_id, stage_position);

-- Drop status check constraint to allow custom stages or status values
-- First, find the constraint name. In init_schema it is defined inline, which PostgreSQL typically names "leads_status_check".
-- We do a safety check and drop it if exists.
DO $$
BEGIN
    ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 4. Function to seed default stages for a workspace
CREATE OR REPLACE FUNCTION public.seed_default_crm_stages(p_workspace_id uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO public.crm_stages (workspace_id, name, color, position) VALUES
        (p_workspace_id, 'Inquiry', '#3b82f6', 0),            -- Blue
        (p_workspace_id, 'Contacted', '#8b5cf6', 1),          -- Purple
        (p_workspace_id, 'Meeting Scheduled', '#ec4899', 2),   -- Pink
        (p_workspace_id, 'Proposal Sent', '#f59e0b', 3),      -- Yellow/Amber
        (p_workspace_id, 'Contract Signed', '#10b981', 4),    -- Green
        (p_workspace_id, 'Retainer Paid', '#06b6d4', 5),       -- Cyan
        (p_workspace_id, 'Completed', '#6366f1', 6),           -- Indigo
        (p_workspace_id, 'Closed/Lost', '#6b7280', 7)          -- Gray
    ON CONFLICT (workspace_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger/function to automatically seed default crm stages when a new profile is created
CREATE OR REPLACE FUNCTION public.handle_profile_created_stages()
RETURNS trigger AS $$
BEGIN
    PERFORM public.seed_default_crm_stages(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created_stages
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_created_stages();

-- 6. Seed default stages for all existing profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        PERFORM public.seed_default_crm_stages(r.id);
        
        -- Map existing leads status to their corresponding new stage_id
        -- 'new' -> 'Inquiry'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Inquiry')
        WHERE l.workspace_id = r.id AND l.status = 'new' AND l.stage_id IS NULL;
        
        -- 'contacted' -> 'Contacted'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Contacted')
        WHERE l.workspace_id = r.id AND l.status = 'contacted' AND l.stage_id IS NULL;
        
        -- 'warm' -> 'Meeting Scheduled'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Meeting Scheduled')
        WHERE l.workspace_id = r.id AND l.status = 'warm' AND l.stage_id IS NULL;
        
        -- 'hot' -> 'Proposal Sent'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Proposal Sent')
        WHERE l.workspace_id = r.id AND l.status = 'hot' AND l.stage_id IS NULL;
        
        -- 'closed' -> 'Contract Signed'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Contract Signed')
        WHERE l.workspace_id = r.id AND l.status = 'closed' AND l.stage_id IS NULL;
        
        -- 'lost' -> 'Closed/Lost'
        UPDATE public.leads l
        SET stage_id = (SELECT id FROM public.crm_stages s WHERE s.workspace_id = l.workspace_id AND s.name = 'Closed/Lost')
        WHERE l.workspace_id = r.id AND l.status = 'lost' AND l.stage_id IS NULL;
    END LOOP;
END $$;
