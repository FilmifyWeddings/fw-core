-- ==========================================================================
-- Migration: 20260620000002_whatsapp_queue_trigger.sql
-- BRAHMASTRA LAW 1 ENFORCED: Multi-Tenant RLS compliance
-- BRAHMASTRA LAW 3 ENFORCED: Asynchronous Queueing for Workflow Drips
-- ==========================================================================

-- 1. Add status column to whatsapp_custom_workflows table (if not exists)
ALTER TABLE public.whatsapp_custom_workflows 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- 2. Create the workflow trigger function
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_workflow()
RETURNS TRIGGER AS $$
DECLARE
  r_workflow RECORD;
  r_step RECORD;
  clean_phone TEXT;
  v_variables JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
BEGIN
  -- Prevent redundant execution if group ID has not changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Ensure we have a valid group and phone number
  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  -- Clean phone number (keep digits only)
  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Get workspace ID context
  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build placeholder variables payload (for dynamic template injection)
  v_variables := jsonb_build_object(
    'Name', COALESCE(NEW.name, 'Guest'),
    'Name_1', COALESCE(NEW.name, 'Guest'), -- fallback alias
    'lead_name', COALESCE(NEW.name, 'Guest'),
    'phone', COALESCE(NEW.phone, ''),
    'email', COALESCE(NEW.email, '')
  );

  -- Merge with lead's custom raw payload if it exists
  IF NEW.raw_payload IS NOT NULL AND jsonb_typeof(NEW.raw_payload) = 'object' THEN
    v_variables := v_variables || NEW.raw_payload;
  END IF;

  -- Scan for Active Workflows mapped to the target group and tenant
  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id = NEW.tenant_id
      AND status = 'Active'
  LOOP
    -- Increment workflow execution count
    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    -- Unnest workflow steps JSONB array
    -- Step schema: [{ template_id, template_name, delay_value, delay_unit, sort_index }]
    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(
        template_id UUID, 
        template_name TEXT, 
        delay_value INT, 
        delay_unit TEXT, 
        sort_index INT
      )
      ORDER BY sort_index ASC
    LOOP
      -- Calculate next_retry_at scheduling timestamp based on delay configuration
      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      -- De-duplication check: Skip if the exact same template is already pending for this contact
      IF EXISTS (
        SELECT 1 FROM public.baileys_action_queue
        WHERE workspace_id = v_workspace_id
          AND status = 'pending'
          AND payload->>'to' = (clean_phone || '@s.whatsapp.net')
          AND payload->>'templateId' = r_step.template_id::text
      ) THEN
        CONTINUE;
      END IF;

      -- Insert step into baileys_action_queue
      INSERT INTO public.baileys_action_queue (
        workspace_id,
        action_type,
        payload,
        status,
        next_retry_at,
        priority
      ) VALUES (
        v_workspace_id,
        'send_template',
        jsonb_build_object(
          'to', clean_phone || '@s.whatsapp.net',
          'templateId', r_step.template_id,
          'variables', v_variables
        ),
        'pending',
        v_scheduled_at,
        5
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger to leads table
DROP TRIGGER IF EXISTS trg_on_lead_group_changed ON public.leads;

CREATE TRIGGER trg_on_lead_group_changed
  AFTER INSERT OR UPDATE OF whatsapp_group_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_whatsapp_workflow();
