-- =====================================================================
-- BRAHMASTRA CRITICAL FIX: tenant_id NULL bug in workflow trigger
-- Migration: 20260620000004_fix_trigger_tenant_id_null.sql
-- 
-- ROOT CAUSE:
--   leads.tenant_id is NULL for most rows.
--   leads.workspace_id has the actual tenant UUID.
--   fn_trigger_whatsapp_workflow used NEW.tenant_id which was NULL,
--   causing zero workflows to match and zero messages to be queued.
--
-- FIX:
--   Use COALESCE(NEW.workspace_id, NEW.tenant_id) as v_workspace_id
--   Same fix applied to rpc_execute_workflow_sequence.
-- =====================================================================

-- ── 1. Fix fn_trigger_whatsapp_workflow ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_workflow()
RETURNS TRIGGER AS $$
DECLARE
  r_workflow RECORD;
  r_step     RECORD;
  clean_phone    TEXT;
  v_variables    JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id       UUID;
BEGIN
  -- Skip if group didn't change (UPDATE case)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Guard: must have group and phone
  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN RETURN NEW; END IF;

  -- FIX: Use COALESCE(workspace_id, tenant_id) to handle NULL tenant_id
  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN RETURN NEW; END IF;

  -- Build template variables from lead fields
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

  -- Scan for active workflows matching this group and workspace
  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id       = v_workspace_id
      AND status          = 'Active'
  LOOP
    -- Duplicate prevention: skip if already enrolled
    IF EXISTS (
      SELECT 1 FROM public.whatsapp_workflow_logs
      WHERE lead_id = NEW.id AND workflow_id = r_workflow.id
    ) THEN
      CONTINUE;
    END IF;

    -- Bump execution counter
    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    -- Queue each step
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

-- Ensure trigger is re-attached (idempotent)
DROP TRIGGER IF EXISTS trg_whatsapp_workflow ON public.leads;
CREATE TRIGGER trg_whatsapp_workflow
  AFTER INSERT OR UPDATE OF whatsapp_group_id
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_whatsapp_workflow();

-- ── 2. Fix rpc_execute_workflow_sequence ─────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_execute_workflow_sequence(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r_workflow     RECORD;
  r_lead         RECORD;
  r_step         RECORD;
  clean_phone    TEXT;
  v_variables    JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id       UUID;
  v_triggered    INT := 0;
  v_skipped      INT := 0;
BEGIN
  SELECT * INTO r_workflow FROM public.whatsapp_custom_workflows WHERE id = p_workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow not found');
  END IF;

  FOR r_lead IN
    SELECT * FROM public.leads
    WHERE whatsapp_group_id = r_workflow.target_group_id
      AND COALESCE(workspace_id, tenant_id) = r_workflow.tenant_id
  LOOP
    clean_phone := regexp_replace(r_lead.phone, '[^0-9]', '', 'g');
    IF clean_phone = '' THEN CONTINUE; END IF;

    v_workspace_id := COALESCE(r_lead.workspace_id, r_lead.tenant_id);

    v_variables := jsonb_build_object(
      'Name',      COALESCE(r_lead.name, 'Guest'),
      'Name_1',    COALESCE(r_lead.name, 'Guest'),
      'lead_name', COALESCE(r_lead.name, 'Guest'),
      'phone',     COALESCE(r_lead.phone, ''),
      'email',     COALESCE(r_lead.email, '')
    );
    IF r_lead.raw_payload IS NOT NULL AND jsonb_typeof(r_lead.raw_payload) = 'object' THEN
      v_variables := v_variables || r_lead.raw_payload;
    END IF;

    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(template_id UUID, template_name TEXT, delay_value INT, delay_unit TEXT, sort_index INT)
      ORDER BY sort_index ASC
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.whatsapp_workflow_logs
        WHERE lead_id = r_lead.id AND workflow_id = r_workflow.id AND step_index = r_step.sort_index
      ) THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;

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
        v_log_id, r_workflow.tenant_id, r_lead.id, r_workflow.id, r_step.sort_index,
        clean_phone, r_step.template_name, 'pending', v_scheduled_at
      );

      INSERT INTO public.baileys_action_queue (
        workspace_id, action_type, payload, status, next_retry_at, priority
      ) VALUES (
        v_workspace_id, 'send_template',
        jsonb_build_object(
          'to',            clean_phone || '@s.whatsapp.net',
          'templateId',    r_step.template_id,
          'variables',     v_variables,
          'workflowLogId', v_log_id
        ),
        'pending', v_scheduled_at, 5
      );

      v_triggered := v_triggered + 1;
    END LOOP;
  END LOOP;

  UPDATE public.whatsapp_custom_workflows
  SET execution_count = execution_count + 1
  WHERE id = p_workflow_id;

  RETURN jsonb_build_object(
    'success',              true,
    'triggered_steps_count', v_triggered,
    'skipped_steps_count',  v_skipped
  );
END;
$$;
