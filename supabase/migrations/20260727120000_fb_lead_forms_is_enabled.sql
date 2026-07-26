-- Add is_enabled boolean column to fb_lead_forms
ALTER TABLE public.fb_lead_forms ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT TRUE;

-- Add unique constraint to support UPSERT with onConflict
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fb_lead_forms_workspace_form_key'
  ) THEN
    ALTER TABLE public.fb_lead_forms ADD CONSTRAINT fb_lead_forms_workspace_form_key UNIQUE (workspace_id, form_id);
  END IF;
END;
$$;

-- Also ensure fb_form_mappings has its unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fb_form_mappings_workspace_form_key'
  ) THEN
    ALTER TABLE public.fb_form_mappings ADD CONSTRAINT fb_form_mappings_workspace_form_key UNIQUE (workspace_id, form_id);
  END IF;
END;
$$;
