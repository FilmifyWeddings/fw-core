-- Migration: WhatsApp Welcome and Follow-ups Automation tables
-- Stores dynamic multi-step rules and execution delivery logs per tenant

-- 1. Create whatsapp_automations table
CREATE TABLE IF NOT EXISTS public.whatsapp_automations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    automation_type text NOT NULL CHECK (automation_type IN ('welcome', 'followup')),
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(workspace_id, automation_type)
);

-- 2. Create whatsapp_automation_logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_automation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    automation_type text NOT NULL CHECK (automation_type IN ('welcome', 'followup')),
    step_number integer NOT NULL,
    template_name text NOT NULL,
    phone text NOT NULL,
    scheduled_for timestamptz NOT NULL,
    sent_at timestamptz,
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Tenant automations isolation" ON public.whatsapp_automations;
CREATE POLICY "Tenant automations isolation" ON public.whatsapp_automations
    FOR ALL USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);

DROP POLICY IF EXISTS "Tenant automation logs isolation" ON public.whatsapp_automation_logs;
CREATE POLICY "Tenant automation logs isolation" ON public.whatsapp_automation_logs
    FOR ALL USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
