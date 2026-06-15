-- Migration: Advanced Leads Schema & Layout Prefs
-- Stores customized column layouts per workspace and dynamic lead attributes

-- 1. Create table_layouts table
CREATE TABLE IF NOT EXISTS public.table_layouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    layout_name text DEFAULT 'default',
    columns jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(workspace_id, layout_name)
);

-- Enable RLS for table_layouts
ALTER TABLE public.table_layouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant layouts isolation" ON public.table_layouts;
CREATE POLICY "Tenant layouts isolation" ON public.table_layouts 
  FOR ALL USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);

-- 2. Extend leads table schema with color mapping, comments list, and automation flags
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS custom_color text,
  ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wa_welcome_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_synced boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wgl_dispatched boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_timeline jsonb DEFAULT '[]'::jsonb;
