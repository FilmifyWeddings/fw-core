-- Migration: 20261117000001_fix_whatsapp_stop_group_and_sequencing.sql
-- Description:
--   1. Ensures fn_trigger_whatsapp_workflow respects CRM stopped flag (stop_followup / workflow_status = 'stopped').
--   2. Enforces Welcome workflows to execute strictly before follow-up sequences without overlapping.
--   3. Adds leadId, workflowId, and stepIndex directly to baileys_action_queue payload for strict sequence integrity.

CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_workflow()
RETURNS TRIGGER AS $$
DECLARE
  r_workflow RECORD;
  r_step     RECORD;
  clean_phone    TEXT;
  v_variables    JSONB;
  v_scheduled_at TIMESTAMPTZ;
  v_step_scheduled_at TIMESTAMPTZ;
  v_workspace_id UUID;
  v_log_id       UUID;
  v_jitter_mins  INT;
  v_jitter_secs  INT;
  v_priority     INT;
  v_is_first_wf  BOOLEAN := true;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  -- 1. Strictly ignore leads flagged as stopped or skipped in CRM
  IF NEW.raw_payload IS NOT NULL AND (
    (NEW.raw_payload->>'skip_auto_trigger')::BOOLEAN = true OR
    (NEW.raw_payload->>'duplicate_tag')::BOOLEAN = true OR
    (NEW.raw_payload->>'stop_followup')::BOOLEAN = true OR
    NEW.raw_payload->>'workflow_status' = 'stopped'
  ) THEN
    RETURN NEW;
  END IF;

  clean_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF clean_phone = '' THEN RETURN NEW; END IF;

  v_workspace_id := COALESCE(NEW.workspace_id, NEW.tenant_id);
  IF v_workspace_id IS NULL THEN RETURN NEW; END IF;

  v_variables := jsonb_build_object(
    'Name',          COALESCE(NEW.name, 'Guest'),
    'Name_1',        COALESCE(NEW.name, 'Guest'),
    'lead_name',     COALESCE(NEW.name, 'Guest'),
    'first_name',    split_part(COALESCE(NEW.name, 'Guest'), ' ', 1),
    'last_name',     regexp_replace(COALESCE(NEW.name, ''), '^[^ ]+ *', ''),
    'full_name',     COALESCE(NEW.name, 'Guest'),
    'phone',         COALESCE(NEW.phone, ''),
    'phone_number',  COALESCE(NEW.phone, ''),
    'email',         COALESCE(NEW.email, ''),
    'timestamp',     to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'current_date',  to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY')
  );
  IF NEW.raw_payload IS NOT NULL AND jsonb_typeof(NEW.raw_payload) = 'object' THEN
    v_variables := v_variables || NEW.raw_payload;
  END IF;

  -- 2. Sort workflows: Welcome workflows always come first!
  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id       = v_workspace_id
      AND status          = 'Active'
    ORDER BY
      CASE WHEN LOWER(COALESCE(workflow_name, '')) LIKE '%welcome%' THEN 0 ELSE 1 END,
      created_at ASC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.whatsapp_workflow_logs
      WHERE lead_id = NEW.id AND workflow_id = r_workflow.id
    ) THEN
      CONTINUE;
    END IF;

    UPDATE public.whatsapp_custom_workflows
    SET execution_count = execution_count + 1
    WHERE id = r_workflow.id;

    -- For the first workflow (Welcome), start at NOW().
    -- For subsequent workflows (Follow-up), ensure base time starts after previous workflow (+ 1 hour minimum buffer)
    IF v_is_first_wf THEN
      v_scheduled_at := NOW();
      v_is_first_wf := false;
    ELSE
      v_scheduled_at := GREATEST(v_scheduled_at, NOW() + INTERVAL '1 hour');
    END IF;

    FOR r_step IN
      SELECT * FROM jsonb_to_recordset(r_workflow.workflow_steps)
      AS steps(
        template_id UUID,
        template_name TEXT,
        delay_value INT,
        delay_unit TEXT,
        sort_index INT,
        target_type TEXT,
        target_group_jid TEXT,
        target_group_name TEXT
      )
      ORDER BY sort_index ASC
    LOOP
      IF r_step.delay_unit = 'seconds' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' seconds')::INTERVAL;
        v_step_scheduled_at := v_scheduled_at + ((floor(random() * 5) + 2) || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'minutes' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' minutes')::INTERVAL;
        v_jitter_secs := ((case when random() < 0.5 then 1 else -1 end) * (floor(random() * 31) + 20))::INT;
        v_step_scheduled_at := v_scheduled_at + (v_jitter_secs || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'hours' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' hours')::INTERVAL;
        v_jitter_mins := ((case when random() < 0.5 then 1 else -1 end) * (floor(random() * 4) + 7))::INT;
        v_jitter_secs := floor(random() * 60)::INT;
        v_step_scheduled_at := v_scheduled_at + (v_jitter_mins || ' minutes')::INTERVAL + (v_jitter_secs || ' seconds')::INTERVAL;
      ELSIF r_step.delay_unit = 'days' AND r_step.delay_value > 0 THEN
        v_scheduled_at := v_scheduled_at + (r_step.delay_value || ' days')::INTERVAL;
        v_jitter_mins := ((case when random() < 0.5 then 1 else -1 end) * (floor(random() * 4) + 7))::INT;
        v_jitter_secs := floor(random() * 60)::INT;
        v_step_scheduled_at := v_scheduled_at + (v_jitter_mins || ' minutes')::INTERVAL + (v_jitter_secs || ' seconds')::INTERVAL;
      ELSE
        v_step_scheduled_at := v_scheduled_at + ((floor(random() * 4) + 2) || ' seconds')::INTERVAL;
      END IF;

      v_priority := CASE
        WHEN LOWER(COALESCE(r_workflow.workflow_name, '')) LIKE '%welcome%'
          OR LOWER(COALESCE(r_step.delay_unit, '')) IN ('seconds', 'minutes')
          OR r_step.target_type = 'group'
          OR (r_step.target_group_jid IS NOT NULL AND r_step.target_group_jid <> '')
        THEN 2
        ELSE 5
      END;

      v_log_id := gen_random_uuid();

      INSERT INTO public.whatsapp_workflow_logs (
        id, tenant_id, lead_id, workflow_id, step_index,
        phone_number, template_name, status, sent_at
      ) VALUES (
        v_log_id, v_workspace_id, NEW.id, r_workflow.id, r_step.sort_index,
        CASE WHEN r_step.target_type = 'group' OR (r_step.target_group_jid IS NOT NULL AND r_step.target_group_jid <> '')
          THEN r_step.target_group_jid
          ELSE clean_phone
        END,
        r_step.template_name, 'pending', v_step_scheduled_at
      );

      IF r_step.target_type = 'group' OR (r_step.target_group_jid IS NOT NULL AND r_step.target_group_jid <> '') THEN
        INSERT INTO public.baileys_action_queue (
          workspace_id, action_type, payload, status, next_retry_at, priority
        ) VALUES (
          v_workspace_id,
          'group_dispatch',
          jsonb_build_object(
            'to',              r_step.target_group_jid,
            'groupJid',        r_step.target_group_jid,
            'groupId',         r_step.target_group_jid,
            'targetGroupName', r_step.target_group_name,
            'leadData',        v_variables,
            'variables',       v_variables,
            'template_name',   r_step.template_name,
            'templateId',      r_step.template_id,
            'workflowLogId',   v_log_id,
            'workflowId',      r_workflow.id,
            'leadId',          NEW.id,
            'stepIndex',       r_step.sort_index
          ),
          'pending', v_step_scheduled_at, v_priority
        );
      ELSE
        INSERT INTO public.baileys_action_queue (
          workspace_id, action_type, payload, status, next_retry_at, priority
        ) VALUES (
          v_workspace_id,
          'send_template',
          jsonb_build_object(
            'to', clean_phone || '@s.whatsapp.net',
            'templateId', r_step.template_id,
            'template_name', r_step.template_name,
            'variables', v_variables,
            'workflowLogId', v_log_id,
            'workflowId', r_workflow.id,
            'leadId', NEW.id,
            'stepIndex', r_step.sort_index
          ),
          'pending', v_step_scheduled_at, v_priority
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
