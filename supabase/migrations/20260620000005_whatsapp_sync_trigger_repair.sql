-- =====================================================================
-- Migration: 20260620000005_whatsapp_sync_trigger_repair.sql
-- 
-- ROOT CAUSE:
--   Automated or webhook ingests mapping contacts to groups might fail
--   to trigger if the trigger is restricted to specific columns or if
--   the phone number is populated after the initial insert.
--
-- FIX:
--   1. Drop column-specific update triggers.
--   2. Define trg_on_lead_group_changed AFTER INSERT OR UPDATE on ALL columns.
--   3. Handle late-incoming phone numbers safely by checking if old phone was different from new phone.
-- =====================================================================

-- ── 1. Recreate fn_trigger_whatsapp_workflow ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_workflow()
RETURNS TRIGGER AS $$
DECLARE
  r_workflow     RECORD;
  r_step         RECORD;
  clean_phone    TEXT;
  v_variables    JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id       UUID;
BEGIN
  -- Guard: must have a target group assigned
  IF NEW.whatsapp_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Guard: must have a phone number
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Tenancy isolation context
  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, check if group or phone changed. If neither changed, exit early.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id 
       AND OLD.phone IS NOT DISTINCT FROM NEW.phone THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Build variables mapping
  v_variables := jsonb_build_object(
    'Name',      COALESCE(NEW.name, 'Guest'),
    'Name_1',    COALESCE(NEW.name, 'Guest'),
    'lead_name', COALESCE(NEW.name, 'Guest'),
    'phone',     COALESCE(NEW.phone, ''),
    'email',     COALESCE(NEW.email, '')
  );
  IF NEW.raw_payload IS NOT NULL AND jsonb_typeof(NEW.raw_payload) = 'object' THEN
    v_variables := v_variables || NEW.raw_payload;
  END IF;

  -- Loop workflows
  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id       = v_workspace_id
      AND status          = 'Active'
  LOOP
    -- Duplicate prevention check
    IF EXISTS (
      SELECT 1 FROM public.whatsapp_workflow_logs
      WHERE lead_id = NEW.id AND workflow_id = r_workflow.id
    ) THEN
      CONTINUE;
    END IF;

    -- Update workflow executions counter
    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    -- Insert steps
    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(template_id UUID, template_name TEXT, delay_value INT, delay_unit TEXT, sort_index INT)
      ORDER BY sort_index ASC
    LOOP
      v_scheduled_at := NOW();
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
      END IF;

      v_log_id := gen_random_uuid();

      INSERT INTO public.whatsapp_workflow_logs (
        id, tenant_id, lead_id, workflow_id, step_index,
        phone_number, template_name, status, sent_at
      ) VALUES (
        v_log_id, v_workspace_id, NEW.id, r_workflow.id, r_step.sort_index,
        clean_phone, r_step.template_name, 'pending', v_scheduled_at
      );

      INSERT INTO public.baileys_action_queue (
        workspace_id, action_type, payload, status, next_retry_at, priority
      ) VALUES (
        v_workspace_id,
        'send_template',
        jsonb_build_object(
          'to',            clean_phone || '@s.whatsapp.net',
          'templateId',    r_step.template_id,
          'variables',     v_variables,
          'workflowLogId', v_log_id
        ),
        'pending', v_scheduled_at, 5
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Re-bind the trigger without column constraints ────────────────
DROP TRIGGER IF EXISTS trg_whatsapp_workflow ON public.leads;
DROP TRIGGER IF EXISTS trg_on_lead_group_changed ON public.leads;

CREATE TRIGGER trg_on_lead_group_changed
  AFTER INSERT OR UPDATE
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_whatsapp_workflow();
