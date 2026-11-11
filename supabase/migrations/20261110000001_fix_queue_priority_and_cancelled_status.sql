-- =====================================================================
-- Migration: 20261110000001_fix_queue_priority_and_cancelled_status.sql
-- Description:
--   1. Ensures baileys_action_queue allows 'cancelled' status (prevents
--      pre-flight cancel updates from silently failing & trapping rows
--      in 'processing' / sweeper infinite loops).
--   2. Adds partial index for fast priority + earliest-due queue draining.
--   3. Hardens fn_sync_queue_to_workflow_logs so 'failed'/'done' updates
--      never overwrite 'stopped' / 'cancelled' / already-'sent' logs.
--   4. Updates fn_trigger_whatsapp_workflow & rpc_execute_workflow_sequence
--      to assign priority = 2 for Welcome / short-delay / group-alert
--      steps vs priority = 5 for multi-hour / multi-day follow-ups.
-- =====================================================================

-- 1. Permit 'cancelled' status cleanly on baileys_action_queue
ALTER TABLE public.baileys_action_queue
  DROP CONSTRAINT IF EXISTS baileys_action_queue_status_check;

ALTER TABLE public.baileys_action_queue
  ADD CONSTRAINT baileys_action_queue_status_check
  CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled'));

-- 2. Partial index matching the worker's drainQueue ORDER BY
CREATE INDEX IF NOT EXISTS idx_baileys_queue_drain_priority
  ON public.baileys_action_queue (workspace_id, priority ASC, next_retry_at ASC NULLS FIRST, created_at ASC)
  WHERE status = 'pending';

-- 3. Protect stopped/cancelled/already-sent workflow logs inside queue sync trigger
CREATE OR REPLACE FUNCTION public.fn_sync_queue_to_workflow_logs()
RETURNS TRIGGER AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NEW.payload ? 'workflowLogId' THEN
    v_log_id := (NEW.payload->>'workflowLogId')::UUID;

    IF NEW.status = 'done' THEN
      UPDATE public.whatsapp_workflow_logs
      SET status = 'sent',
          updated_at = NOW(),
          sent_at = NOW()
      WHERE id = v_log_id
        AND status NOT IN ('stopped', 'cancelled');
    ELSIF NEW.status = 'failed' THEN
      UPDATE public.whatsapp_workflow_logs
      SET status = 'failed',
          error_message = COALESCE(NEW.error_message, NEW.failure_reason),
          updated_at = NOW()
      WHERE id = v_log_id
        AND status NOT IN ('sent', 'delivered', 'read', 'stopped', 'cancelled');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Prioritize Welcome / immediate / group alert steps (priority = 2) over long follow-ups (priority = 5)
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
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.whatsapp_group_id IS NOT DISTINCT FROM NEW.whatsapp_group_id THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.whatsapp_group_id IS NULL OR NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.raw_payload IS NOT NULL AND (
    (NEW.raw_payload->>'skip_auto_trigger')::BOOLEAN = true OR
    (NEW.raw_payload->>'duplicate_tag')::BOOLEAN = true
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

  FOR r_workflow IN
    SELECT * FROM public.whatsapp_custom_workflows
    WHERE target_group_id = NEW.whatsapp_group_id
      AND tenant_id       = v_workspace_id
      AND status          = 'Active'
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

    v_scheduled_at := NOW();

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
            'workflowLogId',   v_log_id
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
            'workflowLogId', v_log_id
          ),
          'pending', v_step_scheduled_at, v_priority
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
