-- Add unique constraint for workspace_id and form_id on fb_lead_forms
ALTER TABLE fb_lead_forms
ADD CONSTRAINT fb_lead_forms_workspace_id_form_id_key UNIQUE (workspace_id, form_id);

-- Also add unique constraint on fb_form_mappings just in case since it's upserted similarly
ALTER TABLE fb_form_mappings
ADD CONSTRAINT fb_form_mappings_workspace_id_form_id_key UNIQUE (workspace_id, form_id);
